// Shared deal types — the canonical shape of an ad_deals row, its status set,
// and the deliverables checklist line. Framework-agnostic (no React, Vite, or
// Deno imports) so the web app now, Feature 11's edge function/RPC ('paid'), and
// the future React Native app all reuse them untouched. Keep DEAL_STATUS in sync
// with the CHECK constraint in 0005_ad_deals.sql.

export const DEAL_STATUS = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
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

// One checklist line: `count` units of `type`, posted as a whole (one checkbox).
// `posted_at` present = the line is posted; absent/null = not yet.
export type Deliverable = {
  type: DeliverableType;
  count: number;
  posted_at?: string | null;
};

// The canonical shape of an ad_deals row. `deliverables` is the jsonb column,
// zod-validated on every write so no arbitrary shapes reach the DB.
export type Deal = {
  id: string;
  user_id: string;
  brand_id: string;
  title: string;
  deliverables: Deliverable[];
  agreed_amount_sar: number;
  deadline: string | null;
  status: DealStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
