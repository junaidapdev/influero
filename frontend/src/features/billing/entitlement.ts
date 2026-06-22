import type { Entitlement } from "@shared/types/subscription.types";

import { DEAL_LIMIT_ERROR, PROMO_REDEEM_ERROR } from "@/constants/billing";

// React-free entitlement helpers — the single place the client decides what an
// entitlement MEANS, so gate logic isn't scattered across components. The server
// (is_pro / get_my_entitlement, migrations 0018 + 0022) is authoritative; the
// client just trusts the is_pro it returns.

export function isPro(entitlement: Entitlement | undefined | null): boolean {
  return entitlement?.is_pro === true;
}

// True when a thrown error is the deal-limit trigger's DEAL_LIMIT (a free user
// exceeding the cap) — so the deal-create path can show the upgrade copy instead
// of a generic failure. Works whether the throw is an Error or a PostgrestError.
export function isDealLimitError(error: unknown): boolean {
  return errorMessage(error).includes(DEAL_LIMIT_ERROR);
}

// Maps a redeem_promo() failure to its localized toast key. The function raises a
// bare token (ALREADY_PRO, INVALID_CODE, …); anything unrecognized (incl. network
// errors) falls back to the generic "couldn't redeem" copy.
export function promoRedeemErrorKey(error: unknown): string {
  const message = errorMessage(error);
  if (message.includes(PROMO_REDEEM_ERROR.NOT_AUTHENTICATED)) {
    return "billing.promo.toast.signedOut";
  }
  if (message.includes(PROMO_REDEEM_ERROR.ALREADY_PRO)) {
    return "billing.promo.toast.alreadyPro";
  }
  if (message.includes(PROMO_REDEEM_ERROR.ALREADY_REDEEMED)) {
    return "billing.promo.toast.alreadyRedeemed";
  }
  if (message.includes(PROMO_REDEEM_ERROR.CODE_EXHAUSTED)) {
    return "billing.promo.toast.exhausted";
  }
  if (message.includes(PROMO_REDEEM_ERROR.INVALID_CODE)) {
    return "billing.promo.toast.invalid";
  }
  return "billing.promo.toast.error";
}

// True when redeem_promo() rejected because the caller is ALREADY Pro. The redeem
// hook uses this to refresh entitlement — an "already Pro" rejection means our
// cached free state is stale (e.g. a checkout finished in another tab).
export function isAlreadyProError(error: unknown): boolean {
  return errorMessage(error).includes(PROMO_REDEEM_ERROR.ALREADY_PRO);
}

// Normalizes a thrown value (Error, PostgrestError, or anything) to its message
// string, so token matching works regardless of how the throw was shaped.
function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : typeof error === "object" && error !== null && "message" in error
      ? String((error as { message: unknown }).message)
      : String(error);
}
