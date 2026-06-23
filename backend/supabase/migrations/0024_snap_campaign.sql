-- 0024_snap_campaign.sql — 24-hour CAMPAIGN Snap report (metric-dictionary model).
--
-- A campaign report is the third Snap scope, beside 'monthly' (0023) and the
-- legacy 'post' flow. The influencer screenshots only the 1–3 story FRAMES that
-- featured a brand; the edge function extracts each frame and a pure helper
-- (computeCampaignHeadline) fuses them into ONE honest headline:
--
--   metrics = {
--     "frames":  [ { "views":4641, "viewers":4370, "screenshots":0,
--                    "replies":2, "clicks":27, "tap_forwards":…, … }, … ],
--     "computed":{ "reach":4420,        -- MAX of frames' viewers (unique)
--                  "views_peak":4773,   -- MAX of frames' views (never summed)
--                  "frame_count":2,
--                  "screenshots":0, "replies":3, "clicks":94 }  -- SUMmed
--   }
--
-- This REUSES the columns 0023/0010 already added — `scope`, `metrics` jsonb,
-- `images` manifest, `platform`, `deal_id`, `report_date`. A campaign row sets
-- report_type='post' (already an allowed value — it IS a 24h content report)
-- and scope='campaign_24h'. `deal_id` is REQUIRED for a campaign (a campaign is
-- a brand deal's result) — enforced in application code; the FK + `on delete
-- set null` from 0010 already constrains it to the user's own ad_deals.
--
-- The ONLY DDL is widening the scope CHECK so 'campaign_24h' is accepted.
-- 0023 added `scope` with an inline column check, which Postgres auto-named
-- `snap_reports_scope_check`; drop-if-exists + re-add keeps this additive and
-- idempotent (re-applying is a no-op). RLS / grants / indexes / realtime / the
-- snap-uploads bucket all carry over unchanged — every policy gates on
-- user_id = auth.uid(), which covers these rows too.

alter table public.snap_reports
  drop constraint if exists snap_reports_scope_check;

alter table public.snap_reports
  add constraint snap_reports_scope_check
  check (scope is null or scope in ('monthly', 'campaign_24h'));
