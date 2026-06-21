// Shared dashboard types — the shape get_dashboard_stats (the Feature 14 RPC)
// returns. Framework-agnostic (no React, Vite, or Deno imports) so the web app
// and the future React Native app reuse it untouched. Keep the keys in sync
// with the jsonb_build_object in 0009_dashboard_stats.sql (the deadline→post_date
// rename + status set live in 0013_deal_lifecycle.sql, which recreates the RPC).
//
// Money fields are SAR amounts; deal fields are counts over the month's deals
// (bucketed by post_date). `outstanding` is all-time, not month-scoped — the
// agreed definition, deliberately not total_invoiced − total_collected.
// `total_expenses` (0020) is the month's expenses, bucketed by expense_date —
// the dashboard derives net = total_collected − total_expenses on the client and
// gates that display to Pro (a free user has no expense rows, so it is 0). It is
// OPTIONAL on purpose: the RPC only returns it once 0020 is applied, so between a
// frontend deploy and that migration the key is absent — the `?` forces every
// reader to coalesce (`?? 0`) and never render NaN.

export type DashboardStats = {
  total_invoiced: number;
  total_collected: number;
  outstanding: number;
  total_expenses?: number;
  deals_posted: number;
  deals_pending: number;
};
