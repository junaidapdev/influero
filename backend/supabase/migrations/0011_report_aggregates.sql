-- Reports aggregates: two read-only RPCs that roll up the /reports page (and the
-- dashboard hero sparkline) server-side, in ONE round trip each — never per-row
-- client fetching (the no-N+1 invariant). Same shape as get_dashboard_stats
-- (0009): `security invoker` keeps RLS in force and the explicit auth.uid()
-- predicates enforce ownership, so these are safe to call straight from the
-- browser client via supabase.rpc — they're reads, no edge function needed.
--
-- Definitions reuse the get_dashboard_stats conventions verbatim so Reports and
-- the Dashboard never disagree:
--   invoiced  — sum of agreed_amount_sar over NON-CANCELLED deals, bucketed by
--               DEADLINE month (null-deadline deals fall in no month).
--   collected — sum of RECEIVED payments, bucketed by RECEIVED_DATE month.

-- ---------------------------------------------------------------------------
-- get_monthly_totals(window_start, window_end)
-- ---------------------------------------------------------------------------
-- Invoiced-vs-collected for each month in the [window_start, window_end) range
-- (the last 12 months). The CALLER passes the window as LOCAL first-of-month
-- dates — "the last 12 months" means the VIEWER'S local calendar, and only the
-- client knows its timezone (Postgres now() is UTC and would misbucket a Riyadh
-- viewer's month edges). generate_series builds every month in the window and
-- LEFT JOINs the two groupings, so months with no activity still return a row
-- with zeros — the chart always renders a full 12 bars. Oldest month first (the
-- chart's contract).
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
    select date_trunc('month', deadline)::date as month_start,
           sum(agreed_amount_sar) as invoiced_sar
    from ad_deals
    where user_id = auth.uid()
      and status <> 'cancelled'
      and deadline >= window_start
      and deadline < window_end
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
-- get_per_brand_report()
-- ---------------------------------------------------------------------------
-- ALL-TIME per-brand performance (not windowed) — matches the brand-detail
-- "lifetime total" convention. Only brands with at least one non-cancelled deal
-- appear; biggest invoiced first. deal_count + invoiced_sar cover non-cancelled
-- deals; collected_sar sums received payments on those same non-cancelled deals
-- (kept on the SAME deal set as invoiced so the collection rate reads cleanly —
-- a cancelled deal's stray payment never inflates the rate). The em-dash guard
-- for a zero-invoiced rate lives in the UI (features/dashboard/stats).
create or replace function public.get_per_brand_report()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with deal_agg as (
    select brand_id,
           count(*) as deal_count,
           sum(agreed_amount_sar) as invoiced_sar
    from ad_deals
    where user_id = auth.uid()
      and status <> 'cancelled'
    group by brand_id
  ),
  collected_agg as (
    select d.brand_id,
           sum(p.amount_sar) as collected_sar
    from payments p
    join ad_deals d on d.id = p.deal_id
    where p.user_id = auth.uid()
      and p.status = 'received'
      and d.status <> 'cancelled'
    group by d.brand_id
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'brand_id', da.brand_id,
        'deal_count', da.deal_count,
        'invoiced_sar', da.invoiced_sar,
        'collected_sar', coalesce(ca.collected_sar, 0)
      )
      order by da.invoiced_sar desc, da.deal_count desc
    ),
    '[]'::jsonb
  )
  from deal_agg da
  left join collected_agg ca on ca.brand_id = da.brand_id;
$$;

revoke all on function public.get_per_brand_report() from public;
revoke all on function public.get_per_brand_report() from anon;
grant execute on function public.get_per_brand_report() to authenticated;
