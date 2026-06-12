-- snap_reports + the snap-uploads bucket: the last Feature 04 schema slice,
-- landing with Feature 15 (its first consumer). RLS ships in the SAME migration
-- as the table. Every policy gates on `user_id = auth.uid()`.
--
-- Columns follow architecture.md. The six extracted fields are nullable on
-- purpose: Snap Insights UI variants genuinely omit some numbers, and the
-- extraction contract lets the model return null rather than invent a value.
-- `source_file_url` stores the storage PATH inside the snap-uploads bucket
-- ({user_id}/<file>.png), not a URL — the bucket is private, so a public URL
-- never exists; the edge function downloads by path under the caller's JWT and
-- the UI renders via short-lived signed URLs.
--
-- `deal_id` is `on delete set null` (the meetings precedent): a convenience
-- link, not money history — a report must never block its deal.

create table if not exists public.snap_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  deal_id uuid references public.ad_deals (id) on delete set null,
  report_date date,
  source_file_url text not null,
  views integer,
  reach integer,
  story_views integer,
  screenshot_count integer,
  swipe_ups integer,
  raw_ai_json jsonb,
  extraction_status text not null default 'pending' check (
    extraction_status in ('pending', 'extracted', 'failed', 'manual')
  ),
  created_at timestamptz not null default now()
);

alter table public.snap_reports enable row level security;

create policy "snap_reports select own"
  on public.snap_reports for select
  using (user_id = auth.uid());

create policy "snap_reports insert own"
  on public.snap_reports for insert
  with check (user_id = auth.uid());

create policy "snap_reports update own"
  on public.snap_reports for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "snap_reports delete own"
  on public.snap_reports for delete
  using (user_id = auth.uid());

-- Serves the history list (newest first) AND the edge function's per-hour
-- rate-limit count — both scan the caller's rows by created_at.
create index if not exists snap_reports_user_created_idx
  on public.snap_reports (user_id, created_at desc);

-- The deal expanded row reads a deal's linked reports on expand.
create index if not exists snap_reports_user_deal_idx
  on public.snap_reports (user_id, deal_id);

grant select, insert, update, delete on public.snap_reports to authenticated;
revoke all on public.snap_reports from anon;

-- Realtime: the UI subscribes to UPDATEs so the extraction result streams in
-- without polling. postgres_changes respects RLS, so a user only ever receives
-- events for their own rows. Guarded so re-applying this migration doesn't
-- error on "already member of publication" (every other migration is
-- idempotent; a partial apply must be safe to re-run).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'snap_reports'
  ) then
    alter publication supabase_realtime add table public.snap_reports;
  end if;
end $$;

-- snap-uploads bucket: PRIVATE (unlike avatars' documented public-read
-- deviation) — Snap Insights screenshots are business data. Reads AND writes
-- are own-path only; the first path segment must equal the caller's uid.
insert into storage.buckets (id, name, public)
values ('snap-uploads', 'snap-uploads', false)
on conflict (id) do nothing;

drop policy if exists "snap-uploads select own" on storage.objects;
drop policy if exists "snap-uploads insert own" on storage.objects;
drop policy if exists "snap-uploads delete own" on storage.objects;

create policy "snap-uploads select own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'snap-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "snap-uploads insert own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'snap-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "snap-uploads delete own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'snap-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
