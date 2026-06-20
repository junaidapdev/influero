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
