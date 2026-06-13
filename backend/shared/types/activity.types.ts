// Shared activity-log types + the canonical event-kind set. Framework-agnostic
// (no React, Vite, or Deno imports) so the web app's logActivity helper writes
// now, and the future edge-function helper (Feature 11) writes the exact same
// kinds and row shape later. The kinds are the closed set — add to
// code-standards before introducing a new one, and keep this list in sync with
// the CHECK constraint (originally 0003_activity_log.sql; deal_shot added in
// 0013_deal_lifecycle.sql). DELIVERABLE_POSTED is retained for historical rows
// but is no longer written — the deal-lifecycle redesign logs DEAL_SHOT /
// DEAL_POSTED off the two deal checkmarks instead.
export const ACTIVITY_KIND = {
  DEAL_CREATED: "deal_created",
  DELIVERABLE_POSTED: "deliverable_posted",
  DEAL_SHOT: "deal_shot",
  DEAL_POSTED: "deal_posted",
  PAYMENT_RECEIVED: "payment_received",
  DEAL_PAID: "deal_paid",
  MEETING_SCHEDULED: "meeting_scheduled",
  SNAP_EXTRACTED: "snap_extracted",
} as const;

export type ActivityKind = (typeof ACTIVITY_KIND)[keyof typeof ACTIVITY_KIND];

// The canonical shape of an activity_log row.
export type ActivityLog = {
  id: string;
  user_id: string;
  kind: ActivityKind;
  summary: string;
  ref_id: string | null;
  ref_table: string | null;
  created_at: string;
};
