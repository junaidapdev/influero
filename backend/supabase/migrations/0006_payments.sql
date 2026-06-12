-- payments: installments belonging to a deal — a deal commonly splits into an
-- advance + balance in the Saudi market, so money is tracked per installment.
-- Pulled forward from Feature 04's schema slice by Feature 11 (Atomic
-- Mark-Received). RLS ships in the SAME migration as the table. Every policy
-- gates on `user_id = auth.uid()`.
--
-- `status`: 'received' is ONLY ever written by the mark_payment_received RPC
-- (0007) — never by a direct PostgREST update. 'overdue' is legal in the CHECK
-- (per the architecture schema) but v1 never writes it: overdue is derived at
-- display time (pending + expected_date < today), since nothing runs on a
-- schedule to flip statuses. deal_id is RESTRICT so a deal with money history
-- cannot be deleted out from under it (mirrors ad_deals.brand_id).

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  deal_id uuid not null references public.ad_deals (id) on delete restrict,
  amount_sar numeric not null,
  expected_date date,
  received_date date,
  status text not null default 'pending'
    check (status in ('pending', 'received', 'overdue')),
  method text
    check (method in ('bank', 'cash', 'other')),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.payments enable row level security;

create policy "payments select own"
  on public.payments for select
  using (user_id = auth.uid());

create policy "payments insert own"
  on public.payments for insert
  with check (user_id = auth.uid());

create policy "payments update own"
  on public.payments for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "payments delete own"
  on public.payments for delete
  using (user_id = auth.uid());

-- Serves the /payments tabs (filter by status, sort by expected_date) scoped
-- to the caller's rows — the index shape named in the architecture's index list.
create index if not exists payments_user_status_expected_idx
  on public.payments (user_id, status, expected_date);

-- Base table privileges. RLS decides WHICH rows; these decide whether the role
-- may touch the table at all. Explicit so access doesn't depend on the project's
-- default-privilege config. anon (unauthenticated) gets nothing.
grant select, insert, update, delete on public.payments to authenticated;
revoke all on public.payments from anon;
