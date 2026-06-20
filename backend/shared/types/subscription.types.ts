// Subscription / entitlement shapes shared by the LemonSqueezy billing edge
// functions and the frontend, so both agree on what "Pro" means. Entitlement is
// DECIDED in SQL (is_pro / get_my_entitlement, migration 0018) — these types
// mirror those rows; nothing here re-implements the grace logic.

export const PLAN = {
  PRO: "pro",
} as const;
export type Plan = (typeof PLAN)[keyof typeof PLAN];

// LemonSqueezy subscription statuses, verbatim (the table's CHECK enumerates the
// same set).
export const SUBSCRIPTION_STATUS = {
  ON_TRIAL: "on_trial",
  ACTIVE: "active",
  PAUSED: "paused",
  PAST_DUE: "past_due",
  UNPAID: "unpaid",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
} as const;
export type SubscriptionStatus =
  (typeof SUBSCRIPTION_STATUS)[keyof typeof SUBSCRIPTION_STATUS];

// Statuses that are entitled OUTRIGHT. cancelled/past_due are entitled only while
// still inside the paid period (ends_at > now) — that grace rule lives in SQL
// is_pro(); keep this list in sync for any client-side display hint.
export const ENTITLED_STATUSES: readonly SubscriptionStatus[] = [
  SUBSCRIPTION_STATUS.ACTIVE,
  SUBSCRIPTION_STATUS.ON_TRIAL,
];

// One row of public.subscriptions (written ONLY by the webhook, read-own by users).
export type Subscription = {
  user_id: string;
  lemonsqueezy_subscription_id: string;
  lemonsqueezy_customer_id: string | null;
  lemonsqueezy_order_id: string | null;
  variant_id: string | null;
  plan: Plan;
  status: SubscriptionStatus;
  renews_at: string | null;
  ends_at: string | null;
  trial_ends_at: string | null;
  card_brand: string | null;
  card_last_four: string | null;
  created_at: string;
  updated_at: string;
};

// get_my_entitlement() RPC shape — the frontend read (always returns one row,
// even for free users, where plan/status are null and is_pro is false).
export type Entitlement = {
  plan: Plan | null;
  status: SubscriptionStatus | null;
  is_pro: boolean;
  active_until: string | null;
};
