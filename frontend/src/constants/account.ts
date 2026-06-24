// Account-management edge function + the bare error tokens it returns, matched by
// the client to localized copy (the DEAL_LIMIT / PROMO_REDEEM_ERROR convention).
// Function names live here, never as string literals at call sites.

export const ACCOUNT_EDGE_FUNCTION = {
  DELETE_ACCOUNT: "delete-account",
} as const;

export const ACCOUNT_DELETE_ERROR = {
  // delete-account aborted erasure because it could not cancel an active paid
  // subscription — the user must cancel via Manage billing first, then retry.
  SUBSCRIPTION_ACTIVE: "SUBSCRIPTION_ACTIVE",
  // Any other failure (network, RPC, auth-user delete) → generic retry copy.
  GENERIC: "GENERIC",
} as const;
