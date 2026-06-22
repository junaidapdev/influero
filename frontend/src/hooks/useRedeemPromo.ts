import { useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { isAlreadyProError } from "@/features/billing/entitlement";
import type { Entitlement } from "@shared/types/subscription.types";

// Redeems a promo code via the redeem_promo() RPC (migration 0022), which mints an
// entitlement grant and returns the caller's fresh entitlement. On success we
// invalidate ENTITLEMENT so the whole app flips to Pro — there is intentionally NO
// realtime channel for grants (the one in useEntitlementRealtime watches the
// subscriptions table only, and a second channel on the same topic crashes the
// app); the redeem path owns its own refresh instead. Errors surface as bare token
// messages (ALREADY_PRO, INVALID_CODE, …) the caller maps to localized copy.
export function useRedeemPromo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string): Promise<Entitlement> => {
      const { data, error } = await supabase.rpc("redeem_promo", {
        p_code: code,
      });
      if (error) throw error;
      const rows = (data ?? []) as Entitlement[];
      const entitlement = rows[0];
      if (!entitlement) {
        // redeem_promo always returns exactly one row on success; treat a missing
        // row as a failure rather than handing back undefined.
        throw new Error("redeem_promo returned no entitlement row");
      }
      return entitlement;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ENTITLEMENT });
    },
    onError: (error) => {
      // An ALREADY_PRO rejection means our cached entitlement is stale (e.g. a
      // checkout completed in another tab, or a grant arrived) — refresh so the UI
      // catches up to the real Pro state instead of staying on the redeem form.
      if (isAlreadyProError(error)) {
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ENTITLEMENT });
      }
    },
  });
}
