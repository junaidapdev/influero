// /payments page constants. The two tabs map 1:1 onto how the list is queried:
// Pending = everything not yet received (sorted by expected_date), Received =
// status received (sorted by received_date). Tab values live here so they
// never appear as literals in components or hooks.

export const PAYMENTS_TAB = {
  PENDING: "pending",
  RECEIVED: "received",
} as const;

export type PaymentsTab = (typeof PAYMENTS_TAB)[keyof typeof PAYMENTS_TAB];

// Edge function slugs — invoked by name, so the name is a constant.
export const EDGE_FUNCTION = {
  MARK_PAYMENT_RECEIVED: "mark-payment-received",
} as const;
