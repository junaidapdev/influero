-- VISIBLE-OUTPUT variant of test_mark_payment_received.sql — same proof, but
-- each phase records PASS into a temp results table that is SELECTed at the
-- very end, so the Supabase SQL editor's grid shows `ord | phase | result`
-- directly (the canonical test reports via RAISE NOTICE, which the web editor
-- does not render). Real failures still `raise exception 'TEST FAILED…'` and
-- abort loudly with a red error. Runs in one transaction, ends with ROLLBACK,
-- leaves no data behind. See test_mark_payment_received.sql for the full notes.

begin;

-- Simulate the signed-in user: auth.uid() reads request.jwt.claims ->> 'sub'.
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', (select id from auth.users order by created_at limit 1),
    'role', 'authenticated'
  )::text,
  true
);

-- Collects one PASS row per phase; SELECTed at the end so the grid shows it.
create temp table _results (ord int primary key, phase text, result text) on commit drop;

-- ---------------------------------------------------------------------------
-- Seed: one brand, one deal with two installments, one cancelled deal with one
-- installment (for the terminal-status guard check).
-- ---------------------------------------------------------------------------
create temp table _t (key text primary key, id uuid) on commit drop;

with b as (
  insert into public.brands (user_id, name_en, name_ar)
  values (auth.uid(), '__atomicity_test_brand', '__اختبار')
  returning id
)
insert into _t (key, id) select 'brand', id from b;

with d as (
  insert into public.ad_deals (user_id, brand_id, title, agreed_amount_sar)
  values (auth.uid(), (select id from _t where key = 'brand'),
          '__atomicity_test_deal', 1000)
  returning id
)
insert into _t (key, id) select 'deal', id from d;

with d as (
  insert into public.ad_deals (user_id, brand_id, title, agreed_amount_sar, status)
  values (auth.uid(), (select id from _t where key = 'brand'),
          '__atomicity_test_cancelled_deal', 500, 'cancelled')
  returning id
)
insert into _t (key, id) select 'deal_cancelled', id from d;

with p as (
  insert into public.payments (user_id, deal_id, amount_sar)
  values (auth.uid(), (select id from _t where key = 'deal'), 600)
  returning id
)
insert into _t (key, id) select 'payment1', id from p;

with p as (
  insert into public.payments (user_id, deal_id, amount_sar)
  values (auth.uid(), (select id from _t where key = 'deal'), 400)
  returning id
)
insert into _t (key, id) select 'payment2', id from p;

with p as (
  insert into public.payments (user_id, deal_id, amount_sar)
  values (auth.uid(), (select id from _t where key = 'deal_cancelled'), 500)
  returning id
)
insert into _t (key, id) select 'payment_cancelled', id from p;

-- ---------------------------------------------------------------------------
-- Phase 1 — first installment received: payment flips, deal does NOT.
-- ---------------------------------------------------------------------------
do $$
declare v jsonb;
begin
  select public.mark_payment_received((select id from _t where key = 'payment1')) into v;
  if (v ->> 'deal_paid')::boolean then
    raise exception 'TEST FAILED [phase 1]: deal_paid=true with an installment still pending';
  end if;
  if (select status from public.payments where id = (select id from _t where key = 'payment1')) <> 'received' then
    raise exception 'TEST FAILED [phase 1]: payment1 not marked received';
  end if;
  if (select status from public.ad_deals where id = (select id from _t where key = 'deal')) <> 'pending' then
    raise exception 'TEST FAILED [phase 1]: deal status changed before all installments received';
  end if;
  insert into _results values (1, 'phase 1', 'PASS — partial payment received, deal untouched');
end $$;

-- ---------------------------------------------------------------------------
-- Phase 2 — FAULT INJECTION (the gate). Reject status='paid' so the RPC's
-- second step fails, then verify the FIRST step rolled back with it.
-- ---------------------------------------------------------------------------
alter table public.ad_deals
  add constraint __atomicity_fault check (status <> 'paid') not valid;

do $$
declare v jsonb;
begin
  select public.mark_payment_received((select id from _t where key = 'payment2')) into v;
  raise exception 'TEST FAILED [phase 2]: RPC did not raise on the injected fault';
exception
  when check_violation then
    insert into _results values (2, 'phase 2a', 'PASS — injected fault raised inside the RPC');
end $$;

do $$
begin
  if (select status from public.payments where id = (select id from _t where key = 'payment2')) <> 'pending' then
    raise exception 'TEST FAILED [phase 2]: NOT ATOMIC — payment2 changed while the deal update failed';
  end if;
  if (select received_date from public.payments where id = (select id from _t where key = 'payment2')) is not null then
    raise exception 'TEST FAILED [phase 2]: NOT ATOMIC — received_date set while the deal update failed';
  end if;
  if (select status from public.ad_deals where id = (select id from _t where key = 'deal')) <> 'pending' then
    raise exception 'TEST FAILED [phase 2]: deal changed despite the fault';
  end if;
  insert into _results values (3, 'phase 2b', 'PASS — neither payment nor deal changed, atomic');
end $$;

alter table public.ad_deals drop constraint __atomicity_fault;

-- ---------------------------------------------------------------------------
-- Phase 3 — fault removed, happy path: last installment received → payment
-- AND deal flip together; RPC reports deal_paid=true.
-- ---------------------------------------------------------------------------
do $$
declare v jsonb;
begin
  select public.mark_payment_received((select id from _t where key = 'payment2')) into v;
  if not (v ->> 'deal_paid')::boolean then
    raise exception 'TEST FAILED [phase 3]: deal_paid=false on the final installment';
  end if;
  if (select status from public.payments where id = (select id from _t where key = 'payment2')) <> 'received' then
    raise exception 'TEST FAILED [phase 3]: payment2 not marked received';
  end if;
  if (select status from public.ad_deals where id = (select id from _t where key = 'deal')) <> 'paid' then
    raise exception 'TEST FAILED [phase 3]: deal not marked paid';
  end if;
  insert into _results values (4, 'phase 3', 'PASS — final installment flipped payment and deal together');
end $$;

-- ---------------------------------------------------------------------------
-- Phase 4 — cancelled is terminal: payment recorded, deal stays cancelled.
-- ---------------------------------------------------------------------------
do $$
declare v jsonb;
begin
  select public.mark_payment_received((select id from _t where key = 'payment_cancelled')) into v;
  if (v ->> 'deal_paid')::boolean then
    raise exception 'TEST FAILED [phase 4]: cancelled deal reported as paid';
  end if;
  if (select status from public.payments where id = (select id from _t where key = 'payment_cancelled')) <> 'received' then
    raise exception 'TEST FAILED [phase 4]: payment on cancelled deal not recorded';
  end if;
  if (select status from public.ad_deals where id = (select id from _t where key = 'deal_cancelled')) <> 'cancelled' then
    raise exception 'TEST FAILED [phase 4]: cancelled deal status overwritten';
  end if;
  insert into _results values (5, 'phase 4', 'PASS — cancelled deal survived, payment recorded, status terminal');
end $$;

-- ---------------------------------------------------------------------------
-- Phase 5 — double-mark rejected: marking an already-received payment raises.
-- ---------------------------------------------------------------------------
do $$
declare v jsonb;
begin
  select public.mark_payment_received((select id from _t where key = 'payment1')) into v;
  raise exception 'TEST FAILED [phase 5]: re-marking a received payment did not raise';
exception
  when raise_exception then
    if sqlerrm like 'TEST FAILED%' then raise; end if;
    insert into _results values (6, 'phase 5', 'PASS — already-received payment rejected');
end $$;

-- The visible proof: one PASS row per phase. Expect 6 rows.
select ord, phase, result from _results order by ord;

rollback;
