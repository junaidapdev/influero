-- Web-push notifications — the data slice (Phase A).
-- Two tables ship together with the standard 4-policy own-row RLS in THIS
-- migration (the project invariant): every user-owned table gates on
-- `user_id = auth.uid()` in the same migration as the table, never a follow-up.
--
-- push_subscriptions: one row per browser/device that opted in. The Push API
-- hands the client an `endpoint` (minted by the browser's push service) plus two
-- keys (p256dh, auth) the server later needs to encrypt a push. The subscribe
-- flow writes these via PostgREST under the user's own session — no edge
-- function needed to STORE a subscription (single-table write, like settings).
--
-- notification_sends: the idempotency + observability log the twice-daily send
-- job writes in Phase B (one row per user per slot per day) so a cron retry
-- can't double-send and delivery is debuggable. It has no writer yet — created
-- now alongside its sibling, the same way activity_log shipped before its
-- writers (Feature 08).
--
-- The actual sending (the get-outstanding RPC + the send-daily-reminders edge
-- function + the pg_cron schedule) lands in the next migration with its
-- consumer. This migration only stores what the browser subscribe flow writes.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions select own"
  on public.push_subscriptions for select
  using (user_id = auth.uid());

create policy "push_subscriptions insert own"
  on public.push_subscriptions for insert
  with check (user_id = auth.uid());

create policy "push_subscriptions update own"
  on public.push_subscriptions for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "push_subscriptions delete own"
  on public.push_subscriptions for delete
  using (user_id = auth.uid());

-- endpoint is globally unique (the push service mints it), so the subscribe
-- upsert keys on it: a device that re-enables overwrites its keys + last_seen_at
-- in place instead of piling up stale rows. (RLS still gates the update — an
-- endpoint owned by another user can't be hijacked.)
create unique index if not exists push_subscriptions_endpoint_unique
  on public.push_subscriptions (endpoint);

-- The Phase-B send job reads every subscription for a user.
create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

grant select, insert, update, delete on public.push_subscriptions to authenticated;
revoke all on public.push_subscriptions from anon;

create table if not exists public.notification_sends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  slot text not null check (slot in ('morning', 'evening')),
  sent_on date not null,
  item_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.notification_sends enable row level security;

create policy "notification_sends select own"
  on public.notification_sends for select
  using (user_id = auth.uid());

create policy "notification_sends insert own"
  on public.notification_sends for insert
  with check (user_id = auth.uid());

create policy "notification_sends update own"
  on public.notification_sends for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "notification_sends delete own"
  on public.notification_sends for delete
  using (user_id = auth.uid());

-- One send per user per slot per day → a cron retry for the same slot is a
-- no-op insert (ON CONFLICT DO NOTHING in Phase B). This is the idempotency
-- backstop for the twice-daily job.
create unique index if not exists notification_sends_user_slot_day_unique
  on public.notification_sends (user_id, slot, sent_on);

grant select, insert, update, delete on public.notification_sends to authenticated;
revoke all on public.notification_sends from anon;
