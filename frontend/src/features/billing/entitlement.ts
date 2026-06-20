import type { Entitlement } from "@shared/types/subscription.types";

import { DEAL_LIMIT_ERROR } from "@/constants/billing";

// React-free entitlement helpers — the single place the client decides what an
// entitlement MEANS, so gate logic isn't scattered across components. The server
// (is_pro / get_my_entitlement, migration 0018) is authoritative; the client just
// trusts the is_pro it returns.

export function isPro(entitlement: Entitlement | undefined | null): boolean {
  return entitlement?.is_pro === true;
}

// True when a thrown error is the deal-limit trigger's DEAL_LIMIT (a free user
// exceeding the cap) — so the deal-create path can show the upgrade copy instead
// of a generic failure. Works whether the throw is an Error or a PostgrestError.
export function isDealLimitError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String((error as { message: unknown }).message)
        : String(error);
  return message.includes(DEAL_LIMIT_ERROR);
}
