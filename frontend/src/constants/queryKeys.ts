// TanStack Query cache keys. One source of truth so a mutation can invalidate
// exactly the keys it affects. Keys are added as each feature introduces its
// first cached query — APP_USER lands with Feature 06 (Settings), BRANDS with
// Feature 09. The brand detail query keys off [...BRANDS, id], so invalidating
// BRANDS covers both the directory list and every open detail.
export const QUERY_KEYS = {
  APP_USER: ["app-user"] as const,
  BRANDS: ["brands"] as const,
  // Prefix for all deal queries (Feature 10). The list keys off
  // [...DEALS, "list", filters], the lightweight index off [...DEALS, "index"],
  // and the per-brand list off [...DEALS, "brand", brandId] — so a deal
  // mutation invalidates the DEALS prefix once and every variant refetches.
  DEALS: ["deals"] as const,
  // Prefix for all payment queries (Feature 11). The tab lists key off
  // [...PAYMENTS, "list", tab]; a payment mutation invalidates the prefix once.
  PAYMENTS: ["payments"] as const,
  // Prefix for all meeting queries (Feature 13). The month view keys off
  // [...MEETINGS, "month", "YYYY-MM"]; a meeting mutation invalidates the
  // prefix once and every cached month refetches.
  MEETINGS: ["meetings"] as const,
  // Reminders have no reader until the Feature 14 Today panel — mutations
  // invalidate the prefix now so that first reader is always fresh.
  REMINDERS: ["reminders"] as const,
  // The dashboard stats RPC (Feature 14) — keys off [...DASHBOARD, "stats",
  // month]. Deal and payment mutations invalidate the prefix; the Today /
  // Needs-attention queries key off the domain prefixes above instead, so the
  // existing invalidations already cover them.
  DASHBOARD: ["dashboard"] as const,
  // Prefix for all snap report queries (Feature 15). The history list keys off
  // [...SNAP_REPORTS, "list"], the per-deal line off [...SNAP_REPORTS, "deal",
  // dealId]; a snap mutation (and the realtime patch) invalidates the prefix.
  SNAP_REPORTS: ["snap-reports"] as const,
  // The report aggregates (Feature 16) — the monthly series keys off
  // [...REPORTS, "monthly", month], the per-brand rollup off [...REPORTS,
  // "per-brand"]. Reports read from deals + payments, so the deal and payment
  // mutations invalidate this prefix (alongside DASHBOARD) to keep both the
  // /reports page and the dashboard hero sparkline fresh.
  REPORTS: ["reports"] as const,
  // Entitlement (Subscription Billing) — get_my_entitlement. The webhook write
  // (via realtime) and the ?checkout=success return both invalidate this, so the
  // UI flips to Pro within seconds of payment.
  ENTITLEMENT: ["entitlement"] as const,
};
