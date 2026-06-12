-- meetings + reminders: the Feature 13 slice of the Feature 04 schema. The two
-- tables ship together (the architecture map pairs them) because a meeting's
-- reminder is created in application code in the same flow — reminders are
-- NEVER created by Postgres triggers (project stance: visible, testable,
-- debuggable). RLS ships in the SAME migration as each table. Every policy
-- gates on `user_id = auth.uid()`.
--
-- meetings.brand_id / deal_id are SET NULL on delete — nullable convenience
-- links, not money history (the RESTRICT precedent on ad_deals.brand_id and
-- payments.deal_id protects money lineage; a meeting survives losing its link).
-- `status`: 'done' is legal in the CHECK (architecture schema) but v1 ships no
-- UI that writes it — nothing reads it yet; cancel is the terminal action.

create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  brand_id uuid references public.brands (id) on delete set null,
  deal_id uuid references public.ad_deals (id) on delete set null,
  title text not null,
  scheduled_at timestamptz not null,
  location_or_link text,
  attendees jsonb not null default '[]'::jsonb,
  notes text,
  status text not null default 'upcoming'
    check (status in ('upcoming', 'done', 'cancelled')),
  created_at timestamptz not null default now()
);

alter table public.meetings enable row level security;

create policy "meetings select own"
  on public.meetings for select
  using (user_id = auth.uid());

create policy "meetings insert own"
  on public.meetings for insert
  with check (user_id = auth.uid());

create policy "meetings update own"
  on public.meetings for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "meetings delete own"
  on public.meetings for delete
  using (user_id = auth.uid());

-- Serves the /meetings month query (range on scheduled_at) scoped to the
-- caller's rows — the index shape named in the architecture's index list.
create index if not exists meetings_user_scheduled_idx
  on public.meetings (user_id, scheduled_at);

grant select, insert, update, delete on public.meetings to authenticated;
revoke all on public.meetings from anon;

-- reminders: the in-app reminder rows that feed the dashboard Today panel
-- (Feature 14 is the first reader). `channel` ships with 'whatsapp' in the
-- CHECK and `is_sent_at` nullable so v2 WhatsApp delivery is purely additive —
-- v1 only ever writes 'in_app'. ref_id is text (architecture schema): it
-- points at a meeting/payment/deal row without a hard FK, so clearing a
-- reminder never blocks (or cascades from) its source row.

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null
    check (kind in ('meeting', 'payment', 'deliverable', 'custom')),
  ref_id text,
  ref_table text,
  due_at timestamptz not null,
  message_en text not null,
  message_ar text not null,
  channel text not null default 'in_app'
    check (channel in ('in_app', 'whatsapp')),
  is_done boolean not null default false,
  is_sent_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.reminders enable row level security;

create policy "reminders select own"
  on public.reminders for select
  using (user_id = auth.uid());

create policy "reminders insert own"
  on public.reminders for insert
  with check (user_id = auth.uid());

create policy "reminders update own"
  on public.reminders for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "reminders delete own"
  on public.reminders for delete
  using (user_id = auth.uid());

-- Serves the Today panel (open reminders due soon) scoped to the caller's
-- rows — the index shape named in the architecture's index list.
create index if not exists reminders_user_due_done_idx
  on public.reminders (user_id, due_at, is_done);

-- One reminder per source row: the app's createReminder upserts by
-- (kind, ref_id) — update-if-exists, else insert. This backstops that
-- check-then-insert against a concurrent double-write (e.g. a racing
-- double-tap) at the DB layer. Partial: future kind='custom' reminders may
-- carry no ref_id and are exempt.
create unique index if not exists reminders_user_kind_ref_unique
  on public.reminders (user_id, kind, ref_id)
  where ref_id is not null;

grant select, insert, update, delete on public.reminders to authenticated;
revoke all on public.reminders from anon;
