-- Add a time-of-day to a deal's PLANNED shoot/post (post-v1).
--
-- shoot_date and post_date carried only a calendar day; the user now sets a
-- date AND a time for each. Both columns convert date -> timestamptz so one
-- value carries both, mirroring meetings.scheduled_at. The shot_at / posted_at
-- completion stamps are unrelated and untouched.
--
-- Behaviour stays DAY-GRANULAR by decision: the stored time is shown in the UI,
-- but the shoot/post reminders, Needs-attention, and the twice-daily push digest
-- still bucket by the planned DAY. The one rule everywhere is that the day is the
-- Asia/Riyadh calendar day of the timestamp (all users are in one timezone, as
-- the push RPC already assumes) — so a 1 AM Riyadh value counts as that Riyadh
-- day, not the UTC day. The RPCs below are recreated only to honour that rule;
-- for the existing date-only rows (backfilled to Riyadh midnight) every number
-- is identical to before.

-- ---------------------------------------------------------------------------
-- 1. Convert the two planned-date columns to timestamptz. Existing date-only
--    values become MIDNIGHT Asia/Riyadh (faithful to the old "start of that
--    day" meaning); nulls stay null. The (user_id, status, post_date) index
--    rebuilds automatically with the type change.
-- ---------------------------------------------------------------------------
alter table public.ad_deals
  alter column shoot_date type timestamptz
    using (shoot_date::timestamp at time zone 'Asia/Riyadh');

alter table public.ad_deals
  alter column post_date type timestamptz
    using (post_date::timestamp at time zone 'Asia/Riyadh');

-- ---------------------------------------------------------------------------
-- 2. Recreate get_dashboard_stats: bucket invoiced + posted/pending deals by the
--    RIYADH-LOCAL month of post_date (was a plain date). Definition is otherwise
--    verbatim — the payments halves (received_date / expected_date, still date
--    columns) are unchanged, so the numbers hold.
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
        and (post_date at time zone 'Asia/Riyadh')::date >= month_start
        and (post_date at time zone 'Asia/Riyadh')::date < month_end
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
        and (post_date at time zone 'Asia/Riyadh')::date >= month_start
        and (post_date at time zone 'Asia/Riyadh')::date < month_end
    ),
    'deals_pending', (
      select count(*)
      from ad_deals
      where user_id = auth.uid()
        and status in ('pending', 'shot')
        and (post_date at time zone 'Asia/Riyadh')::date >= month_start
        and (post_date at time zone 'Asia/Riyadh')::date < month_end
    )
  );
$$;

revoke all on function public.get_dashboard_stats(date, date) from public;
revoke all on function public.get_dashboard_stats(date, date) from anon;
grant execute on function public.get_dashboard_stats(date, date) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Recreate get_monthly_totals: same Riyadh-local-month bucketing for the
--    invoiced series. The collected series (received_date) is unchanged.
-- ---------------------------------------------------------------------------
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
    select date_trunc('month', (post_date at time zone 'Asia/Riyadh'))::date as month_start,
           sum(agreed_amount_sar) as invoiced_sar
    from ad_deals
    where user_id = auth.uid()
      and status <> 'cancelled'
      and (post_date at time zone 'Asia/Riyadh')::date >= window_start
      and (post_date at time zone 'Asia/Riyadh')::date < window_end
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

-- ---------------------------------------------------------------------------
-- 4. Recreate get_users_with_outstanding (the push digest aggregate): shoot/post
--    are now timestamptz, so "due today" becomes `< today_end` (the Riyadh
--    end-of-today instant already in the CTE — the same predicate meetings use)
--    instead of `<= today`. Everything else is verbatim. Still security invoker,
--    granted to service_role ONLY.
--
--    "Outstanding today" =
--      meetings  — status 'upcoming', scheduled_at from now() until end of today
--      shoot     — deals still 'pending' (unshot), shoot_date < end of today
--      post      — deals 'pending'/'shot' (unposted), post_date < end of today
--      payment   — pending payments with expected_date <= today (incl. overdue)
-- ---------------------------------------------------------------------------
create or replace function public.get_users_with_outstanding()
returns table (
  user_id uuid,
  locale text,
  meeting_count integer,
  shoot_count integer,
  post_count integer,
  payment_count integer
)
language sql
stable
security invoker
set search_path = public
as $$
  with bounds as (
    select
      (now() at time zone 'Asia/Riyadh')::date as today,
      ((((now() at time zone 'Asia/Riyadh')::date + 1)::timestamp)
        at time zone 'Asia/Riyadh') as today_end,
      now() as now_ts
  ),
  meetings_due as (
    select m.user_id, count(*)::int as cnt
    from meetings m, bounds b
    where m.status = 'upcoming'
      and m.scheduled_at >= b.now_ts
      and m.scheduled_at < b.today_end
    group by m.user_id
  ),
  shoots_due as (
    select d.user_id, count(*)::int as cnt
    from ad_deals d, bounds b
    where d.status = 'pending'
      and d.shoot_date is not null
      and d.shoot_date < b.today_end
    group by d.user_id
  ),
  posts_due as (
    select d.user_id, count(*)::int as cnt
    from ad_deals d, bounds b
    where d.status in ('pending', 'shot')
      and d.post_date is not null
      and d.post_date < b.today_end
    group by d.user_id
  ),
  payments_due as (
    select p.user_id, count(*)::int as cnt
    from payments p, bounds b
    where p.status = 'pending'
      and p.expected_date is not null
      and p.expected_date <= b.today
    group by p.user_id
  ),
  all_users as (
    select user_id from meetings_due
    union
    select user_id from shoots_due
    union
    select user_id from posts_due
    union
    select user_id from payments_due
  )
  select
    u.user_id,
    coalesce(au.locale, 'ar') as locale,
    coalesce(m.cnt, 0) as meeting_count,
    coalesce(s.cnt, 0) as shoot_count,
    coalesce(po.cnt, 0) as post_count,
    coalesce(pay.cnt, 0) as payment_count
  from all_users u
  left join app_users au on au.user_id = u.user_id
  left join meetings_due m on m.user_id = u.user_id
  left join shoots_due s on s.user_id = u.user_id
  left join posts_due po on po.user_id = u.user_id
  left join payments_due pay on pay.user_id = u.user_id;
$$;

revoke all on function public.get_users_with_outstanding() from public;
revoke all on function public.get_users_with_outstanding() from anon;
revoke all on function public.get_users_with_outstanding() from authenticated;
grant execute on function public.get_users_with_outstanding() to service_role;
