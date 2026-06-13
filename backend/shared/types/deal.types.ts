// Shared deal types — the canonical shape of an ad_deals row, its status set,
// and the deliverables descriptor line. Framework-agnostic (no React, Vite, or
// Deno imports) so the web app now, Feature 11's edge function/RPC ('paid'), and
// the future React Native app all reuse them untouched. Keep DEAL_STATUS in sync
// with the CHECK constraint in 0013_deal_lifecycle.sql.
//
// The deal is a pipeline To-do → Shot → Posted → Paid (+ Cancelled). Status is
// derived from the two completion stamps (see features/deals/status.ts):
//   posted_at set → 'posted'; else shot_at set → 'shot'; else 'pending'.
// 'paid' (Feature 11's RPC, once all payments land) and 'cancelled' (manual) are
// terminal. The deliverables list is a READ-ONLY "what's owed" descriptor.

export const DEAL_STATUS = {
  PENDING: "pending",
  SHOT: "shot",
  POSTED: "posted",
  PAID: "paid",
  CANCELLED: "cancelled",
} as const;

export type DealStatus = (typeof DEAL_STATUS)[keyof typeof DEAL_STATUS];

export const DELIVERABLE_TYPE = {
  STORY: "story",
  POST: "post",
  REEL: "reel",
} as const;

export type DeliverableType =
  (typeof DELIVERABLE_TYPE)[keyof typeof DELIVERABLE_TYPE];

// One descriptor line: `count` units of `type` (e.g. "2 × story"). Purely
// "what's owed" now — the per-line posted_at checkbox is gone (the deal's single
// posted_at stamp carries posting state). Historical rows may still carry a
// posted_at key in the jsonb; it is no longer read or written.
export type Deliverable = {
  type: DeliverableType;
  count: number;
};

// The canonical shape of an ad_deals row. `deliverables` is the jsonb column,
// zod-validated on every write so no arbitrary shapes reach the DB.
//   shoot_date / post_date — PLANNED dates (drive the shoot/post reminders).
//   shot_at / posted_at    — ACTUAL completion stamps (set when the boxes tick).
export type Deal = {
  id: string;
  user_id: string;
  brand_id: string;
  title: string;
  deliverables: Deliverable[];
  agreed_amount_sar: number;
  shoot_date: string | null;
  post_date: string | null;
  shot_at: string | null;
  posted_at: string | null;
  status: DealStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
