-- activity_log: internal append-style event log powering the dashboard's
-- recent-activity feed (Feature 14) and an audit trail. NOT a third-party
-- analytics SDK — this is our own in-DB log. Pulled forward from Feature 04's
-- schema slice because Feature 08 builds the logActivity primitive now; the rest
-- of the Feature 04 tables follow from 0004+. RLS ships in the SAME migration as
-- the table. Every policy gates on `user_id = auth.uid()`.
--
-- `kind` is constrained to the closed v1 set (also listed in code-standards) so a
-- typo or an unsanctioned new kind is rejected at the DB layer. `user_id` defaults
-- to auth.uid() so the fire-and-forget insert never has to pass it; RLS still
-- checks it on write. `ref_id`/`ref_table` are free-text polymorphic pointers to
-- the related row (same shape as reminders), nullable because not every event
-- references a row.

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (
    kind in (
      'deal_created',
      'deliverable_posted',
      'deal_posted',
      'payment_received',
      'deal_paid',
      'meeting_scheduled',
      'snap_extracted'
    )
  ),
  summary text not null,
  ref_id text,
  ref_table text,
  created_at timestamptz not null default now()
);

alter table public.activity_log enable row level security;

create policy "activity_log select own"
  on public.activity_log for select
  using (user_id = auth.uid());

create policy "activity_log insert own"
  on public.activity_log for insert
  with check (user_id = auth.uid());

create policy "activity_log update own"
  on public.activity_log for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "activity_log delete own"
  on public.activity_log for delete
  using (user_id = auth.uid());

-- The feed reads a user's most recent events first; this index serves that order
-- and scopes the scan to the caller's rows.
create index if not exists activity_log_user_created_idx
  on public.activity_log (user_id, created_at desc);

-- Base table privileges. RLS decides WHICH rows; these decide whether the role
-- may touch the table at all. Explicit so access doesn't depend on the project's
-- default-privilege config. anon (unauthenticated) gets nothing.
grant select, insert, update, delete on public.activity_log to authenticated;
revoke all on public.activity_log from anon;
