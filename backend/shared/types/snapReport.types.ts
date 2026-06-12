// Shared snap report types — the canonical shape of a snap_reports row and its
// extraction-status set. Framework-agnostic (no React, Vite, or Deno imports)
// so the web app, the extract-snap-report edge function, and the future React
// Native app all reuse them untouched. Keep SNAP_EXTRACTION_STATUS in sync with
// the CHECK constraint in 0010_snap_reports.sql and SNAP_REPORT_TYPE with the
// CHECK in 0012_snap_report_types.sql.
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

// The canonical shape of a snap_reports row. The last three integer fields are
// the monthly-only metrics — always null on 'post' rows.
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
