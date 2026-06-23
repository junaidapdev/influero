// Shared snap report types — the canonical shape of a snap_reports row and its
// extraction-status set. Framework-agnostic (no React, Vite, or Deno imports)
// so the web app, the extract-snap-report edge function, and the future React
// Native app all reuse them untouched. Keep SNAP_EXTRACTION_STATUS in sync with
// the CHECK constraint in 0010_snap_reports.sql, SNAP_REPORT_TYPE with the
// CHECK in 0012_snap_report_types.sql, and the metric-dictionary columns
// (platform/scope/period_label/metrics/images) with 0023_snap_monthly.sql. The
// `scope` CHECK accepts 'monthly' (0023) and 'campaign_24h' (0024).

import type {
  SnapPlatform,
  SnapReportImage,
  SnapReportMetrics,
  SnapScope,
} from "../analytics/snapMetricDictionary.ts";
//
// The extracted fields are nullable: Snap Insights UI variants omit some
// numbers, and the extraction contract lets the model return null rather than
// invent a value. `source_file_url` is the storage PATH inside the private
// snap-uploads bucket ({user_id}/<file>.png), never a public URL.

export const SNAP_EXTRACTION_STATUS = {
  PENDING: "pending",
  EXTRACTED: "extracted",
  FAILED: "failed",
  MANUAL: "manual",
} as const;

export type SnapExtractionStatus =
  (typeof SNAP_EXTRACTION_STATUS)[keyof typeof SNAP_EXTRACTION_STATUS];

// The two report kinds (Feature 16B). 'post' = one piece of content's
// Insights captured ~24h after posting; 'monthly' = the account's monthly
// Insights page. `report_date` semantics follow the type: the snap date for
// 'post', the FIRST DAY of the covered month for 'monthly'.
export const SNAP_REPORT_TYPE = {
  POST: "post",
  MONTHLY: "monthly",
} as const;

export type SnapReportType =
  (typeof SNAP_REPORT_TYPE)[keyof typeof SNAP_REPORT_TYPE];

// The canonical shape of a snap_reports row.
//
// Models coexist by `scope`. LEGACY (post + old monthly): the fixed integer
// columns below, `scope` NULL. NEW monthly (metric-dictionary): `scope =
// 'monthly'`, `metrics` nested by surface, `images` manifest, `period_label`.
// NEW campaign (0024): `scope = 'campaign_24h'`, `metrics = { frames, computed }`,
// `images` = the story frames, an optional `deal_id` (may stand alone). For both new models the
// fixed columns are left null/unwritten; narrow by `scope`.
export type SnapReport = {
  id: string;
  user_id: string;
  deal_id: string | null;
  report_type: SnapReportType;
  report_date: string | null;
  source_file_url: string;
  views: number | null;
  reach: number | null;
  story_views: number | null;
  screenshot_count: number | null;
  swipe_ups: number | null;
  profile_views: number | null;
  new_followers: number | null;
  watch_time_minutes: number | null;
  raw_ai_json: unknown;
  extraction_status: SnapExtractionStatus;
  created_at: string;
  // Monthly metric-dictionary model (0023). NULL on every legacy row.
  platform: SnapPlatform | null;
  scope: SnapScope | null;
  period_label: string | null;
  metrics: SnapReportMetrics | null;
  images: SnapReportImage[] | null;
};

// What the GPT-4o structured-output call returns for a 'post' report — every
// key present, any value null when not visible. snap_date is YYYY-MM-DD.
export type SnapExtractionResult = {
  views: number | null;
  reach: number | null;
  story_views: number | null;
  screenshot_count: number | null;
  swipe_ups: number | null;
  snap_date: string | null;
};

// What the call returns for a 'monthly' report. `month` is YYYY-MM-DD (the
// first day of the month shown on the Insights page), null when not visible.
export type MonthlySnapExtractionResult = {
  views: number | null;
  reach: number | null;
  story_views: number | null;
  profile_views: number | null;
  new_followers: number | null;
  watch_time_minutes: number | null;
  month: string | null;
};
