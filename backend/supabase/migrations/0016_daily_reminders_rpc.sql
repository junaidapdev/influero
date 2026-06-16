-- Twice-daily web-push reminders — Phase B (the scheduled send).
--
-- This migration ships the read-only aggregate the send job needs and enables
-- the two extensions the cron schedule uses. The cron schedule itself + its
-- secret/URL are NOT committed (they embed the project ref + CRON_SECRET) — run
-- them once from the SQL editor per the function's README
-- (backend/supabase/functions/send-daily-reminders/README.md).
--
-- get_users_with_outstanding(): returns ONE row per user who has at least one
-- thing outstanding "today" (Asia/Riyadh — all users are in one timezone), with
-- per-category counts so the edge function can build the digest text and skip
-- everyone else. This is the server-side mirror of the dashboard's Today +
-- Needs-attention logic, driven off the SOURCE tables (not the reminders table —
-- payments/deals don't always have a reminder row), the same shape as
-- get_dashboard_stats.
--
-- "Outstanding today" =
--   meetings  — status 'upcoming', scheduled_at from now() until end of today
--   shoot     — deals still 'pending' (unshot) with shoot_date <= today
--   post      — deals 'pending'/'shot' (unposted) with post_date <= today
--   payment   — pending payments with expected_date <= today (incl. overdue)
--
-- SECURITY: security invoker + granted to service_role ONLY. The send job calls
-- it with the service-role client (the documented system/cross-user exception),
-- which bypasses RLS and so sees every user; no other role may execute it. There
-- is deliberately no auth.uid() predicate — this is the one cross-tenant reader,
-- locked down by the grant, not by RLS.

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
      and d.shoot_date <= b.today
    group by d.user_id
  ),
  posts_due as (
    select d.user_id, count(*)::int as cnt
    from ad_deals d, bounds b
    where d.status in ('pending', 'shot')
      and d.post_date is not null
      and d.post_date <= b.today
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

-- Extensions the cron schedule uses (idempotent). If the migration can't create
-- them on your plan, enable them via Dashboard → Database → Extensions instead:
--   pg_cron (scheduler) and pg_net (HTTP from Postgres → the edge function).
create extension if not exists pg_cron;
create extension if not exists pg_net;
