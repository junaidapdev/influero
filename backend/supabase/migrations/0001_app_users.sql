-- app_users: profile extension for an authenticated user, keyed by auth.users.id.
-- This is the only table created in this migration (the auth bundle); the rest
-- of the schema lands in Feature 04. RLS ships in the SAME migration as the
-- table — never a follow-up. Every policy gates on `user_id = auth.uid()`,
-- which is the real tenant-isolation boundary.

create table if not exists public.app_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  locale text not null default 'ar' check (locale in ('ar', 'en')),
  default_currency text not null default 'SAR',
  avatar_url text,
  reminder_lead_minutes integer not null default 60,
  created_at timestamptz not null default now()
);

alter table public.app_users enable row level security;

create policy "app_users select own"
  on public.app_users for select
  using (user_id = auth.uid());

create policy "app_users insert own"
  on public.app_users for insert
  with check (user_id = auth.uid());

create policy "app_users update own"
  on public.app_users for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "app_users delete own"
  on public.app_users for delete
  using (user_id = auth.uid());

-- Base table privileges. RLS decides WHICH rows; these grants decide whether
-- the role may touch the table at all. Explicit so access doesn't depend on the
-- project's default-privilege config. anon (unauthenticated) gets nothing —
-- app_users is strictly per-signed-in-user.
grant select, insert, update, delete on public.app_users to authenticated;
revoke all on public.app_users from anon;
