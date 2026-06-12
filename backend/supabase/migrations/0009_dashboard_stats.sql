-- Dashboard top-line stats: ONE read-only RPC returning all five month numbers
-- in a single round trip (build-plan: "one query returning all five top-line
-- numbers", never per-row client fetching). Called directly from the browser
-- client via supabase.rpc — it's a read, so no edge function is needed;
-- `security invoker` keeps RLS in force and the explicit auth.uid() predicates
-- enforce ownership per code-standards.
--
-- The month boundaries come from the CALLER as a [month_start, month_end)
-- date range: "this month" means the viewer's LOCAL calendar month, and only
-- the client knows its timezone — Postgres now() is UTC and would misbucket
-- the first/last hours of every month for a Riyadh viewer.
--
-- Definitions (agreed in the Feature 14 plan):
--   total_invoiced  — sum of agreed_amount_sar over non-cancelled deals whose
--                     deadline falls in the month (the deals month filter's
--                     bucketing; null-deadline deals are not in any month).
--   total_collected — sum of received payments whose received_date falls in
--                     the month: money counts in the month it arrived.
--   outstanding     — sum of ALL non-received installments, all time (the
--                     Payments pending-tab convention; deliberately NOT
--                     invoiced − collected — outstanding money doesn't stop
--                     mattering when the month rolls over).
--   deals_posted / deals_pending — counts over the month's deals:
--                     posted|paid vs pending|in_progress. Cancelled is neither.

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
        and deadline >= month_start
        and deadline < month_end
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
        and deadline >= month_start
        and deadline < month_end
    ),
    'deals_pending', (
      select count(*)
      from ad_deals
      where user_id = auth.uid()
        and status in ('pending', 'in_progress')
        and deadline >= month_start
        and deadline < month_end
    )
  );
$$;

revoke all on function public.get_dashboard_stats(date, date) from public;
revoke all on function public.get_dashboard_stats(date, date) from anon;
grant execute on function public.get_dashboard_stats(date, date) to authenticated;
