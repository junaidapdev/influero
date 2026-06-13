-- Deal lifecycle redesign (post-v1): model a deal as a legible pipeline
-- To-do → Shot → Posted → Paid (+ Cancelled), driven by TWO explicit checkmarks
-- (Shot / Posted) instead of per-deliverable "posted" checkboxes. This migration
-- reshapes ad_deals, opens the reminder + activity kind sets for the two new
-- date-driven reminders, and recreates the two RPCs that referenced the renamed
-- `deadline` column so Dashboard + Reports keep producing the same numbers.
--
-- What changes on ad_deals:
--   • `deadline` → renamed `post_date` (the planned publish date; still optional).
--   • + `shoot_date date`  — planned shoot date (optional); arms the shoot reminder.
--   • + `shot_at timestamptz`   — actual completion stamp set when ☐ Shot is ticked.
--   • + `posted_at timestamptz` — actual completion stamp set when ☐ Posted is ticked.
--   • status set: `in_progress` → `shot` (its old "some-but-not-all posted" meaning
--     disappears with the per-line checkboxes). Status now derives from the two
--     stamps (posted_at → posted, else shot_at → shot, else pending); paid +
--     cancelled stay terminal. The deliverables jsonb survives as a READ-ONLY
--     "what's owed" descriptor — its per-line `posted_at` keys are no longer read
--     or written (left in place on historical rows, harmless).
--
-- Reminders feed the dashboard Today worklist: a `shoot` reminder (due shoot_date)
-- and a `post` reminder (due post_date), plus the existing +24h `deliverable`
-- Snap-analytics reminder (now armed when Posted is ticked, not per deliverable).
-- The reminders unique index is (user_id, kind, ref_id) so shoot + post +
-- deliverable on one deal coexist as three distinct rows — no change needed there.

-- ---------------------------------------------------------------------------
-- 1. Reshape ad_deals: rename deadline, add the dates + completion stamps
-- ---------------------------------------------------------------------------
alter table public.ad_deals rename column deadline to post_date;

alter table public.ad_deals
  add column if not exists shoot_date date,
  add column if not exists shot_at timestamptz,
  add column if not exists posted_at timestamptz;

-- ---------------------------------------------------------------------------
-- 2. Backfill the completion stamps from existing state, so every deal's pill
--    and the two checkmarks stay consistent with its stored status. shoot_date
--    stays null (no historical source). Stamps derive from the deliverables'
--    existing posted_at values where present, falling back to updated_at.
-- ---------------------------------------------------------------------------
-- posted / paid → both stamps (the content was shot AND posted).
update public.ad_deals
set
  posted_at = coalesce(
    (select max((value->>'posted_at')::timestamptz)
       from jsonb_array_elements(deliverables)),
    updated_at
  ),
  shot_at = coalesce(
    (select min((value->>'posted_at')::timestamptz)
       from jsonb_array_elements(deliverables)),
    updated_at
  )
where status in ('posted', 'paid');

-- in_progress (→ shot) → shot only (some content was posted = it was shot).
update public.ad_deals
set shot_at = coalesce(
  (select max((value->>'posted_at')::timestamptz)
     from jsonb_array_elements(deliverables)),
  updated_at
)
where status = 'in_progress';

-- pending / cancelled keep both stamps null.

-- ---------------------------------------------------------------------------
-- 3. Swap the status CHECK and rename in_progress → shot. ORDER MATTERS: the
--    new value 'shot' is rejected by the OLD check, and leftover 'in_progress'
--    rows are rejected by the NEW check — so DROP the old check, CONVERT the
--    rows with no status check in force, then ADD the new check (by which point
--    every row already sits in the new closed set).
-- ---------------------------------------------------------------------------
alter table public.ad_deals drop constraint if exists ad_deals_status_check;

update public.ad_deals
set status = 'shot'
where status = 'in_progress';

alter table public.ad_deals
  add constraint ad_deals_status_check
  check (status in ('pending', 'shot', 'posted', 'paid', 'cancelled'));

-- The index named after the old column still serves (user_id, status, post_date);
-- rename it so the name matches the column.
alter index if exists ad_deals_user_status_deadline_idx
  rename to ad_deals_user_status_post_date_idx;

-- ---------------------------------------------------------------------------
-- 4. Open the reminder kind set for the two new date-driven reminders.
-- ---------------------------------------------------------------------------
alter table public.reminders drop constraint if exists reminders_kind_check;
alter table public.reminders
  add constraint reminders_kind_check
  check (kind in ('meeting', 'payment', 'deliverable', 'custom', 'shoot', 'post'));

-- ---------------------------------------------------------------------------
-- 5. Add the deal_shot activity kind. deliverable_posted stays in the set so
--    historical rows remain valid; the app simply stops writing it.
-- ---------------------------------------------------------------------------
alter table public.activity_log drop constraint if exists activity_log_kind_check;
alter table public.activity_log
  add constraint activity_log_kind_check
  check (
    kind in (
      'deal_created',
      'deliverable_posted',
      'deal_shot',
      'deal_posted',
      'payment_received',
      'deal_paid',
      'meeting_scheduled',
      'snap_extracted'
    )
  );

-- ---------------------------------------------------------------------------
-- 6. Recreate the two RPCs that bucketed by `deadline`. Definitions are verbatim
--    except `deadline` → `post_date` (the column rename) and the dashboard's
--    pending-deals predicate `in_progress` → `shot` (the status rename). The
--    invoiced-by-month meaning is unchanged, so Dashboard + Reports numbers hold.
--    get_per_brand_report() is untouched — it references neither column.
-- ---------------------------------------------------------------------------
create or replace function public.get_dashboard_stats(
  month_start date,
  month_end date
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'total_invoiced', coalesce((
      select sum(agreed_amount_sar)
      from ad_deals
      where user_id = auth.uid()
        and status <> 'cancelled'
        and post_date >= month_start
        and post_date < month_end
    ), 0),
    'total_collected', coalesce((
      select sum(amount_sar)
      from payments
      where user_id = auth.uid()
        and status = 'received'
        and received_date >= month_start
        and received_date < month_end
    ), 0),
    'outstanding', coalesce((
      select sum(amount_sar)
      from payments
      where user_id = auth.uid()
        and status <> 'received'
    ), 0),
    'deals_posted', (
      select count(*)
      from ad_deals
      where user_id = auth.uid()
        and status in ('posted', 'paid')
        and post_date >= month_start
        and post_date < month_end
    ),
    'deals_pending', (
      select count(*)
      from ad_deals
      where user_id = auth.uid()
        and status in ('pending', 'shot')
        and post_date >= month_start
        and post_date < month_end
    )
  );
$$;

revoke all on function public.get_dashboard_stats(date, date) from public;
revoke all on function public.get_dashboard_stats(date, date) from anon;
grant execute on function public.get_dashboard_stats(date, date) to authenticated;

create or replace function public.get_monthly_totals(
  window_start date,
  window_end date
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'month', to_char(gs.ts, 'YYYY-MM'),
        'invoiced_sar', coalesce(i.invoiced_sar, 0),
        'collected_sar', coalesce(c.collected_sar, 0)
      )
      order by gs.ts
    ),
    '[]'::jsonb
  )
  from generate_series(
    window_start,
    window_end - interval '1 month',
    interval '1 month'
  ) as gs(ts)
  left join (
    select date_trunc('month', post_date)::date as month_start,
           sum(agreed_amount_sar) as invoiced_sar
    from ad_deals
    where user_id = auth.uid()
      and status <> 'cancelled'
      and post_date >= window_start
      and post_date < window_end
    group by 1
  ) i on i.month_start = gs.ts::date
  left join (
    select date_trunc('month', received_date)::date as month_start,
           sum(amount_sar) as collected_sar
    from payments
    where user_id = auth.uid()
      and status = 'received'
      and received_date >= window_start
      and received_date < window_end
    group by 1
  ) c on c.month_start = gs.ts::date;
$$;

revoke all on function public.get_monthly_totals(date, date) from public;
revoke all on function public.get_monthly_totals(date, date) from anon;
grant execute on function public.get_monthly_totals(date, date) to authenticated;
