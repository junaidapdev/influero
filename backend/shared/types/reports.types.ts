// Shared report types — the shapes the Feature 16 aggregate RPCs return
// (get_monthly_totals + get_per_brand_report in 0011). Framework-agnostic (no
// React, Vite, or Deno imports) so the web app and the future React Native app
// reuse them untouched, the dashboard.types.ts precedent. Keep the keys in sync
// with the jsonb_build_object calls in 0011_report_aggregates.sql.
//
// These are the raw snake_case rows; the hooks map them to the camelCase UI
// shapes in frontend/src/features/reports/report.ts (MonthlyTotal / PerBrandRow)
// — per-brand additionally joins the cached brands list to attach the Brand.

export type MonthlyTotalRow = {
  // Local YYYY-MM bucket, oldest first; empty months come back as 0/0.
  month: string;
  invoiced_sar: number;
  collected_sar: number;
};

export type PerBrandReportRow = {
  brand_id: string;
  deal_count: number;
  invoiced_sar: number;
  collected_sar: number;
};
