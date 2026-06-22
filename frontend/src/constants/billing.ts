// LemonSqueezy billing client constants (Subscription Billing). Edge-function
// names live here, not as string literals at call sites (the snap/payments
// convention). No publishable LS key in the browser — checkout is server-created.

export const BILLING_EDGE_FUNCTION = {
  CREATE_CHECKOUT: "create-checkout",
  CUSTOMER_PORTAL: "customer-portal",
} as const;

// create-checkout's redirect_url returns to /settings with this param after a
// successful LS checkout — BillingSection's host route consumes it (toast +
// refresh entitlement), then strips it.
export const CHECKOUT_SUCCESS_PARAM = "checkout";
export const CHECKOUT_SUCCESS_VALUE = "success";

// The bare message the enforce_deal_limit() trigger raises (SQLSTATE P0001) when
// a free user exceeds the deal cap; the client matches it to show the upgrade copy.
export const DEAL_LIMIT_ERROR = "DEAL_LIMIT";

// The bare token messages redeem_promo() raises (SQLSTATE P0001, migration 0022).
// The client matches these to localized toast copy — same convention as DEAL_LIMIT.
export const PROMO_REDEEM_ERROR = {
  NOT_AUTHENTICATED: "NOT_AUTHENTICATED",
  ALREADY_PRO: "ALREADY_PRO",
  INVALID_CODE: "INVALID_CODE",
  ALREADY_REDEEMED: "ALREADY_REDEEMED",
  CODE_EXHAUSTED: "CODE_EXHAUSTED",
} as const;
