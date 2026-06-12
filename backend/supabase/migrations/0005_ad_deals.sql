-- ad_deals: the operational heart — one row per brand deal. Pulled forward from
-- Feature 04's schema slice because Feature 10 builds the /deals CRUD now; the
-- remaining Feature 04 tables follow from 0006+. RLS ships in the SAME migration
-- as the table. Every policy gates on `user_id = auth.uid()`.
--
-- `deliverables` is a jsonb array of checklist lines
-- `[{ type: 'story'|'post'|'reel', count: int, posted_at?: timestamptz }]`,
-- zod-validated on every write (dealSchema) — the DB stores, the app validates.
-- `status` carries the machine's output (features/deals/status.ts derives
-- pending/in_progress/posted from the deliverables; 'paid' is set by Feature 11's
-- RPC; 'cancelled' is manual) — the CHECK rejects anything outside the closed set.
-- `updated_at` is set in application code on every write (no triggers, per the
-- project's "code, not triggers" stance). brand_id is RESTRICT so a brand with
-- deal history (money records) cannot be deleted out from under it.

create table if not exists public.ad_deals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  brand_id uuid not null references public.brands (id) on delete restrict,
  title text not null,
  deliverables jsonb not null default '[]'::jsonb,
  agreed_amount_sar numeric not null,
  deadline date,
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'posted', 'paid', 'cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ad_deals enable row level security;

create policy "ad_deals select own"
  on public.ad_deals for select
  using (user_id = auth.uid());

create policy "ad_deals insert own"
  on public.ad_deals for insert
  with check (user_id = auth.uid());

create policy "ad_deals update own"
  on public.ad_deals for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "ad_deals delete own"
  on public.ad_deals for delete
  using (user_id = auth.uid());

-- Serves the /deals list (filter by status, sort by deadline) scoped to the
-- caller's rows — the index shape named in the architecture's index list.
create index if not exists ad_deals_user_status_deadline_idx
  on public.ad_deals (user_id, status, deadline);

-- Base table privileges. RLS decides WHICH rows; these decide whether the role
-- may touch the table at all. Explicit so access doesn't depend on the project's
-- default-privilege config. anon (unauthenticated) gets nothing.
grant select, insert, update, delete on public.ad_deals to authenticated;
revoke all on public.ad_deals from anon;
