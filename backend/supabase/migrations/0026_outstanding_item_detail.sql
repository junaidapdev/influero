-- Name what's pending in the daily web-push digest (not just count it).
--
-- 0016's get_users_with_outstanding() returned only per-category counts, so the
-- push body could only say "1 to shoot · 1 to post · 1 payment to follow up".
-- This migration ADDS the most-urgent item's display detail per category
-- alongside the counts, so the edge function can build a body that
-- NAMES the work: "Shoot: Nike summer campaign +2 more · Pay: Adidas · SAR 5,000".
--
-- No table change — function signature only. Every "outstanding today"
-- (Asia/Riyadh) predicate is preserved BYTE-IDENTICAL to 0016 (including the
-- meetings `scheduled_at >= now()` clause — the parked-bug audit is out of scope
-- here, no silent fixes). The "first" item per category is the most urgent one:
-- earliest due date, tiebroken by newest created_at, via `distinct on (user_id)`.
--
-- What detail each category returns (only what the push body renders):
--   meeting  — title only
--   shoot    — deal title only (the title is descriptive; brand omitted to keep
--              the body inside the ~2-line mobile truncation)
--   post     — deal title only
--   payment  — brand (BOTH name_en + name_ar so the edge fn picks per-locale) +
--              amount (payments carry no title, so the brand is the identifier)
--
-- SECURITY: unchanged from 0016 — security invoker, no auth.uid() predicate,
-- granted to service_role ONLY (the documented cross-tenant system reader; the
-- send job calls it with the service-role client). No other role may execute it.

-- Adding return columns changes the OUT-parameter row type, which `create or
-- replace` cannot do — drop first. Safe: nothing in the DB depends on it (the
-- send job calls it over PostgREST RPC, not via a DB-level dependency).
drop function if exists public.get_users_with_outstanding();

create function public.get_users_with_outstanding()
returns table (
  user_id uuid,
  locale text,
  meeting_count integer,
  shoot_count integer,
  post_count integer,
  payment_count integer,
  meeting_first_title text,
  shoot_first_title text,
  post_first_title text,
  payment_first_brand_en text,
  payment_first_brand_ar text,
  payment_first_amount numeric
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
  -- Per-category counts (unchanged from 0016).
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
  -- The most urgent item per category (earliest due, newest-created tiebreak).
  -- Same predicates as the *_due CTEs above; distinct on picks one row per user.
  meetings_first as (
    select distinct on (m.user_id)
      m.user_id,
      m.title as first_title
    from meetings m, bounds b
    where m.status = 'upcoming'
      and m.scheduled_at >= b.now_ts
      and m.scheduled_at < b.today_end
    order by m.user_id, m.scheduled_at asc, m.created_at desc
  ),
  shoots_first as (
    select distinct on (d.user_id)
      d.user_id,
      d.title as first_title
    from ad_deals d, bounds b
    where d.status = 'pending'
      and d.shoot_date is not null
      and d.shoot_date <= b.today
    order by d.user_id, d.shoot_date asc, d.created_at desc
  ),
  posts_first as (
    select distinct on (d.user_id)
      d.user_id,
      d.title as first_title
    from ad_deals d, bounds b
    where d.status in ('pending', 'shot')
      and d.post_date is not null
      and d.post_date <= b.today
    order by d.user_id, d.post_date asc, d.created_at desc
  ),
  payments_first as (
    select distinct on (p.user_id)
      p.user_id,
      br.name_en as brand_en,
      br.name_ar as brand_ar,
      p.amount_sar as first_amount
    from payments p
    join ad_deals d on d.id = p.deal_id
    join brands br on br.id = d.brand_id
    cross join bounds b
    where p.status = 'pending'
      and p.expected_date is not null
      and p.expected_date <= b.today
    order by p.user_id, p.expected_date asc, p.created_at desc
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
    coalesce(pay.cnt, 0) as payment_count,
    mf.first_title as meeting_first_title,
    sf.first_title as shoot_first_title,
    pf.first_title as post_first_title,
    payf.brand_en as payment_first_brand_en,
    payf.brand_ar as payment_first_brand_ar,
    payf.first_amount as payment_first_amount
  from all_users u
  left join app_users au on au.user_id = u.user_id
  left join meetings_due m on m.user_id = u.user_id
  left join shoots_due s on s.user_id = u.user_id
  left join posts_due po on po.user_id = u.user_id
  left join payments_due pay on pay.user_id = u.user_id
  left join meetings_first mf on mf.user_id = u.user_id
  left join shoots_first sf on sf.user_id = u.user_id
  left join posts_first pf on pf.user_id = u.user_id
  left join payments_first payf on payf.user_id = u.user_id;
$$;

-- Privileges unchanged from 0016: this is the one sanctioned cross-tenant reader,
-- locked down by the grant (service_role only), not by RLS.
revoke all on function public.get_users_with_outstanding() from public;
revoke all on function public.get_users_with_outstanding() from anon;
revoke all on function public.get_users_with_outstanding() from authenticated;
grant execute on function public.get_users_with_outstanding() to service_role;
