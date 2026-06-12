-- snap_reports report types (Feature 16B — Snap Report Generation).
-- A snap report is now one of two kinds:
--   'post'    — a single piece of content's Insights, captured ~24h after
--               posting (the original Feature 15 shape; existing rows backfill
--               here via the column default).
--   'monthly' — one screenshot of Snapchat's MONTHLY Insights page covering a
--               calendar month of the influencer's own account.
--
-- `report_date` semantics are PER TYPE (documented here, enforced nowhere —
-- the value is display metadata, not a join key): for 'post' it is the snap
-- date; for 'monthly' it is the FIRST DAY of the month the screenshot covers.
--
-- The three new integer columns are the monthly-only metrics (account-level
-- numbers a single post's Insights never shows). Monthly's six extracted
-- fields = views, reach, story_views (shared columns) + these three. They are
-- nullable for the same reason as the original six: the model returns null
-- for anything not visible rather than inventing a number, and post rows
-- simply never fill them.
--
-- No RLS / grant / index changes: the policies gate on user_id (unchanged),
-- and both list + rate-limit reads still scan (user_id, created_at desc).
-- Idempotent like every migration: add column if not exists; the CHECK rides
-- the report_type column so it only ever lands once, with it.

alter table public.snap_reports
  add column if not exists report_type text not null default 'post'
    check (report_type in ('post', 'monthly'));

alter table public.snap_reports
  add column if not exists profile_views integer;

alter table public.snap_reports
  add column if not exists new_followers integer;

alter table public.snap_reports
  add column if not exists watch_time_minutes integer;
