-- 0028_effective_post_at.sql
-- ===========================================================================
-- Fix: deals with no PLANNED post_date belonged to no month at all.
--
-- Every "which month does this deal count in" query bucketed by `post_date` —
-- the OPTIONAL planned publish date. Most users leave it blank, so a deal could
-- be marked Posted (or Paid) and still be invisible on the Dashboard, in
-- Reports, and in the /deals month filter — in every month, forever. Reported
-- from production: a dashboard showing "Total invoiced SAR 0 · Posted 1" for a
-- month with 4 posted deals worth SAR 3,650, because only one of them happened
-- to carry a planned date (and that one was a barter deal priced at 0).
--
-- The rule, defined ONCE here as a generated column:
--
--   effective_post_at = coalesce(posted_at, post_date, created_at)
--
--   posted_at  — when it ACTUALLY went live. Wins when present: the dashboard
--                answers "what happened this month", and this is the honest
--                answer for a deal that is already out.
--   post_date  — the PLAN. Still the only signal for deals not yet posted
--                (they have no posted_at), so upcoming work buckets exactly as
--                it always did. No regression there.
--   created_at — last resort, `not null`, so effective_post_at is NEVER null.
--                That is the point: every deal now lands in exactly one month,
--                which is what makes the monthly series finally reconcile with
--                get_per_brand_report's lifetime totals (that fn has no date
--                filter, so today it counts deals the monthly series drops).
--
-- WHY A GENERATED COLUMN and not the coalesce inlined into each predicate:
--   1. The rule is written once. get_dashboard_stats and get_monthly_totals
--      MUST agree — every migration touching them since 0017 says so — and a
--      single column is the only version of that which cannot drift.
--   2. PostgREST cannot filter on a SQL expression. The /deals month filter is
--      a PostgREST range query, so without a real column the dashboard's Posted
--      tile would read 4 while the page it links to still showed 1.
--   3. Postgres computes it for every existing row on its own. No backfill
--      script, no UPDATE, no user data touched.
--
-- The expression is immutable (coalesce over three stored timestamptz columns),
-- which is what `stored` requires. NOTE: adding a stored generated column
-- rewrites ad_deals under an ACCESS EXCLUSIVE lock — a blink at current size,
-- but it is a rewrite.
--
-- DELIBERATELY NOT CHANGED — planned-date semantics are correct as they are:
--   • features/reminders/plan.ts — a post reminder should exist only if a post
--     was actually PLANNED. A blank post_date means no reminder, by design.
--   • useNeedsAttention / NeedsAttentionPanel — "behind schedule" is only
--     meaningful against a plan.
--   • get_users_with_outstanding + the daily digest (0027) — same.
--   • The deal card/panel date display — shows the planned date. Correct.
-- The scope line: post_date answers "should this have happened by now";
-- effective_post_at answers "which month do I count it in".
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. The column + its index.
-- ---------------------------------------------------------------------------
alter table public.ad_deals
  add column if not exists effective_post_at timestamptz
  generated always as (coalesce(posted_at, post_date, created_at)) stored;

comment on column public.ad_deals.effective_post_at is
  'Generated: coalesce(posted_at, post_date, created_at). The ONE answer to '
  '"which month does this deal count in" — read by get_dashboard_stats, '
  'get_monthly_totals and the /deals month filter. Never null (created_at is '
  'not null), so every deal belongs to exactly one month. Read-only: writes to '
  'a generated column are rejected by Postgres.';

-- Serves the /deals month filter, which compares raw instants (no tz cast) and
-- so can actually use this. The RPCs below cast to the Riyadh-local day, which
-- is not index-able (`at time zone` is STABLE, not IMMUTABLE) — unchanged from
-- how post_date behaved, and a per-user scan of one user's deals is tiny.
create index if not exists ad_deals_user_effective_post_at_idx
  on public.ad_deals (user_id, effective_post_at);

-- ---------------------------------------------------------------------------
-- 2. get_dashboard_stats — v3.
--    Recreated from the CURRENT live definition (0020, which added
--    total_expenses to 0017's shape). The ONLY change: the three ad_deals
--    predicates bucket by effective_post_at instead of post_date. The Riyadh
--    -local-day cast is preserved verbatim — post_date/posted_at/created_at are
--    all timestamptz, and comparing one raw to a date param coerces at the
--    session tz (UTC on Supabase), misbucketing month-edge deals. The payments
--    and expenses sub-selects are untouched (received_date / expense_date are
--    plain dates and were never part of this bug).
--
--    deals_pending changes too, for internal coherence — nothing in the
--    frontend renders it today.
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
        and (effective_post_at at time zone 'Asia/Riyadh')::date >= month_start
        and (effective_post_at at time zone 'Asia/Riyadh')::date < month_end
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
    'total_expenses', coalesce((
      select sum(amount_sar)
      from expenses
      where user_id = auth.uid()
        and expense_date >= month_start
        and expense_date < month_end
    ), 0),
    'deals_posted', (
      select count(*)
      from ad_deals
      where user_id = auth.uid()
        and status in ('posted', 'paid')
        and (effective_post_at at time zone 'Asia/Riyadh')::date >= month_start
        and (effective_post_at at time zone 'Asia/Riyadh')::date < month_end
    ),
    'deals_pending', (
      select count(*)
      from ad_deals
      where user_id = auth.uid()
        and status in ('pending', 'shot')
        and (effective_post_at at time zone 'Asia/Riyadh')::date >= month_start
        and (effective_post_at at time zone 'Asia/Riyadh')::date < month_end
    )
  );
$$;

revoke all on function public.get_dashboard_stats(date, date) from public;
revoke all on function public.get_dashboard_stats(date, date) from anon;
grant execute on function public.get_dashboard_stats(date, date) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. get_monthly_totals — same swap, SAME MIGRATION.
--    Recreated from the current live definition (0017). The invoiced series
--    buckets by effective_post_at in all three places (the date_trunc that
--    picks the bucket, and both window bounds); the collected series
--    (received_date) is untouched. This fn ships beside get_dashboard_stats
--    on purpose — Dashboard and Reports disagreeing is the failure mode every
--    migration since 0017 has been guarding against, and deploying one without
--    the other would cause exactly that.
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
    select date_trunc('month', (effective_post_at at time zone 'Asia/Riyadh'))::date as month_start,
           sum(agreed_amount_sar) as invoiced_sar
    from ad_deals
    where user_id = auth.uid()
      and status <> 'cancelled'
      and (effective_post_at at time zone 'Asia/Riyadh')::date >= window_start
      and (effective_post_at at time zone 'Asia/Riyadh')::date < window_end
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
