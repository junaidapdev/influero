import type { Entitlement } from "@shared/types/subscription.types";

// React-free entitlement helpers — the single place the client decides what an
// entitlement MEANS, so gate logic isn't scattered across components. The server
// (is_pro / get_my_entitlement, migration 0018) is authoritative; the client just
// trusts the is_pro it returns.

export function isPro(entitlement: Entitlement | undefined | null): boolean {
  return entitlement?.is_pro === true;
}
