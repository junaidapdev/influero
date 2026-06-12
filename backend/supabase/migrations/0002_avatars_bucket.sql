-- avatars storage bucket: profile photos at avatars/{user_id}/avatar.{ext}.
-- Pulled forward from Feature 04's storage slice because Feature 06 (Settings
-- save) is the first consumer. The remaining Feature 04 tables follow from 0003+.
--
-- DELIBERATE DEVIATION (developer-approved): this bucket is PUBLIC-READ, unlike
-- the "own paths only (select too)" line in architecture.md. Avatars are
-- low-sensitivity, the app already renders Google's public avatar URL stored at
-- bootstrap, and signed-URL-per-render adds real complexity for a profile photo.
-- WRITES stay locked to the caller's own folder via the policies below, so a
-- user can never overwrite another user's avatar. RLS on storage.objects is the
-- real boundary for writes; public read only ever exposes profile images.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- storage.objects already has RLS enabled by Supabase. Guard the policy creates
-- so re-applying this migration doesn't error on an existing policy.
drop policy if exists "avatars insert own" on storage.objects;
drop policy if exists "avatars update own" on storage.objects;
drop policy if exists "avatars delete own" on storage.objects;

-- The object name within the bucket is `{user_id}/avatar.{ext}`, so the first
-- path segment must equal the caller's uid for any write.
create policy "avatars insert own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars update own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars delete own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
