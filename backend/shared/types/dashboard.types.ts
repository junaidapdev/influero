// Shared dashboard types — the shape get_dashboard_stats (the Feature 14 RPC)
// returns. Framework-agnostic (no React, Vite, or Deno imports) so the web app
// and the future React Native app reuse it untouched. Keep the keys in sync
// with the jsonb_build_object in 0009_dashboard_stats.sql.
//
// Money fields are SAR amounts; deal fields are counts over the month's deals
// (bucketed by deadline). `outstanding` is all-time, not month-scoped — the
// agreed definition, deliberately not total_invoiced − total_collected.

export type DashboardStats = {
  total_invoiced: number;
  total_collected: number;
  outstanding: number;
  deals_posted: number;
  deals_pending: number;
};
