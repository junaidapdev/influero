-- 0023_snap_monthly.sql — Monthly Snapchat report (metric-dictionary model).
--
-- The original snap_reports model (0010 + 0012) is one row per screenshot with
-- a FIXED set of metric columns. Snapchat's monthly Insights is split across
-- three separate dashboards (Profile / Public Stories / Spotlight), each with
-- its own metrics — no single fixed schema matches them, which is why the old
-- monthly extraction came back empty. This migration adds a FLEXIBLE,
-- surface-tagged model ALONGSIDE the existing one:
--
--   platform     — 'snapchat' (forward-looking; TikTok/Instagram out of scope)
--   scope        — 'monthly'  (the new-model flag; NULL on every legacy row)
--   period_label — display period, e.g. "June 2026" or "25 May – 21 Jun"
--   metrics      — jsonb nested BY SURFACE, each value + optional _change_pct:
--                  { "profile": { "followers": 88028, "followers_change_pct": 6.7 },
--                    "public_stories": { "snap_views": 14102, ... },
--                    "spotlight": { "views": 9210, "favourites": 88, ... } }
--   images       — jsonb manifest [{ "surface": "profile", "path": "<uid>/<group>/profile-0.png" }]
--                  so the edge function reads the per-surface paths FROM THE ROW
--                  (the locked no-client-path stance), not from the client call.
--
-- ADDITIVE + idempotent (the project invariant): every column is nullable and
-- added `if not exists`, so re-applying is a no-op and existing post / legacy
-- monthly rows are untouched (scope stays NULL → they keep rendering via the
-- existing code path; the old fixed columns are simply never written for the
-- new model). RLS, grants, indexes, the realtime publication, and the
-- snap-uploads bucket all carry over unchanged — every policy already gates on
-- user_id = auth.uid(), and that covers these columns too.

alter table public.snap_reports
  add column if not exists platform text
    check (platform is null or platform in ('snapchat'));

alter table public.snap_reports
  add column if not exists scope text
    check (scope is null or scope in ('monthly'));

alter table public.snap_reports
  add column if not exists period_label text;

alter table public.snap_reports
  add column if not exists metrics jsonb;

alter table public.snap_reports
  add column if not exists images jsonb;
