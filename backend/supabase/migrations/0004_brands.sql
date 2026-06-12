-- brands: the brand directory. A brand is reused across many ad_deals, so totals
-- (lifetime, average, last engagement) roll up per brand (features 10 & 14).
-- Pulled forward from Feature 04's schema slice because Feature 09 builds the
-- /brands CRUD now; the remaining Feature 04 tables follow from 0005+. RLS ships
-- in the SAME migration as the table. Every policy gates on `user_id = auth.uid()`.
--
-- `user_id` defaults to auth.uid() as a safety net; the create hook also passes it
-- explicitly (convenience filter). name_en/name_ar are both NOT NULL — the app is
-- bilingual, so a brand always carries both names. Contact fields and notes are
-- nullable free text.

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name_en text not null,
  name_ar text not null,
  contact_name text,
  contact_email text,
  contact_phone text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.brands enable row level security;

create policy "brands select own"
  on public.brands for select
  using (user_id = auth.uid());

create policy "brands insert own"
  on public.brands for insert
  with check (user_id = auth.uid());

create policy "brands update own"
  on public.brands for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "brands delete own"
  on public.brands for delete
  using (user_id = auth.uid());

-- The directory lists a user's brands newest-first; this index serves that order
-- and scopes the scan to the caller's rows.
create index if not exists brands_user_created_idx
  on public.brands (user_id, created_at desc);

-- Base table privileges. RLS decides WHICH rows; these decide whether the role
-- may touch the table at all. Explicit so access doesn't depend on the project's
-- default-privilege config. anon (unauthenticated) gets nothing.
grant select, insert, update, delete on public.brands to authenticated;
revoke all on public.brands from anon;
