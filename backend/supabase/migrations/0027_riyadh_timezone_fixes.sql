-- Two Riyadh-timezone correctness fixes found in the pre-launch audit. Both are
-- recreate-only (no table/signature change), so they re-apply cleanly on prod.
--
-- 1. mark_payment_received stamped received_date with now() — a UTC instant cast
--    to a date. Collected money is bucketed everywhere else by the Riyadh-LOCAL
--    day (get_dashboard_stats / get_monthly_totals, 0017). So a payment marked
--    received between 00:00–03:00 Riyadh (= the previous UTC day) landed in the
--    PREVIOUS calendar month on the dashboard + reports. Stamp the Riyadh-local
--    day instead, matching how the money is read back.
--
-- 2. 0026 recreated get_users_with_outstanding and — preserving 0016 "byte for
--    byte" — reverted the shoot/post predicates to `<= today`. But 0017 had
--    converted shoot_date/post_date to timestamptz and fixed those predicates to
--    `< today_end` (the Riyadh end-of-today instant). With timestamptz columns,
--    `<= today` (a date → UTC midnight) drops every shoot/post after 00:00 UTC
--    (= 03:00 Riyadh), so same-day work was silently missing from the daily push
--    digest. Restore `< b.today_end` (payments stay `<= b.today` — still a date
--    column; meetings already use today_end). The 0026 detail columns are kept.

-- ---------------------------------------------------------------------------
-- 1. mark_payment_received — received_date in Asia/Riyadh local day.
--    Body is otherwise byte-identical to 0007.
-- ---------------------------------------------------------------------------
create or replace function public.mark_payment_received(payment_id uuid)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_payment_id uuid;
  v_deal_id uuid;
  v_amount_sar numeric;
  v_deal_title text;
  v_deal_paid boolean := false;
begin
  update public.payments p
     set status = 'received',
         received_date = (now() at time zone 'Asia/Riyadh')::date
   where p.id = mark_payment_received.payment_id
     and p.user_id = auth.uid()
     and p.status <> 'received'
  returning p.id, p.deal_id, p.amount_sar
    into v_payment_id, v_deal_id, v_amount_sar;

  if v_payment_id is null then
    raise exception 'payment not found, not owned by caller, or already received';
  end if;

  perform 1 from public.ad_deals d
   where d.id = v_deal_id and d.user_id = auth.uid()
   for update;

  if not exists (
    select 1 from public.payments p
    where p.deal_id = v_deal_id and p.status <> 'received'
  ) then
    update public.ad_deals d
       set status = 'paid', updated_at = now()
     where d.id = v_deal_id
       and d.user_id = auth.uid()
       and d.status <> 'cancelled'
    returning true into v_deal_paid;

    v_deal_paid := coalesce(v_deal_paid, false);
  end if;

  select d.title into v_deal_title
    from public.ad_deals d
   where d.id = v_deal_id and d.user_id = auth.uid();

  return jsonb_build_object(
    'payment_id', v_payment_id,
    'deal_id', v_deal_id,
    'amount_sar', v_amount_sar,
    'deal_title', v_deal_title,
    'deal_paid', v_deal_paid
  );
end;
$$;

revoke all on function public.mark_payment_received(uuid) from public, anon;
grant execute on function public.mark_payment_received(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. get_users_with_outstanding — restore the Riyadh `< today_end` predicate
--    on the four shoot/post clauses (counts + first-item). Identical to 0026
--    otherwise; signature unchanged, so create or replace is safe.
-- ---------------------------------------------------------------------------
create or replace function public.get_users_with_outstanding()
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
      and d.shoot_date < b.today_end
    order by d.user_id, d.shoot_date asc, d.created_at desc
  ),
  posts_first as (
    select distinct on (d.user_id)
      d.user_id,
      d.title as first_title
    from ad_deals d, bounds b
    where d.status in ('pending', 'shot')
      and d.post_date is not null
      and d.post_date < b.today_end
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

revoke all on function public.get_users_with_outstanding() from public;
revoke all on function public.get_users_with_outstanding() from anon;
revoke all on function public.get_users_with_outstanding() from authenticated;
grant execute on function public.get_users_with_outstanding() to service_role;
