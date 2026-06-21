import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import { QUERY_KEYS } from "@/constants/queryKeys";
import type { Entitlement } from "@shared/types/subscription.types";

// Defensive fallback only — get_my_entitlement always returns exactly one row
// (free users get an explicit null/false row via its UNION ALL).
const FREE_ENTITLEMENT: Entitlement = {
  plan: null,
  status: null,
  is_pro: false,
  active_until: null,
};

// The caller's plan/entitlement (get_my_entitlement RPC). SAFE TO CALL FROM ANY
// NUMBER OF COMPONENTS — it's a plain TanStack query keyed on ENTITLEMENT, so
// concurrent consumers share one fetch. It does NOT open a realtime channel:
// that lives in useEntitlementRealtime (mounted exactly once, in AppLayout).
// Splitting them matters — the realtime channel topic is per-user, and two
// components opening `subscriptions:${userId}` both calling .on().subscribe()
// throws "cannot add postgres_changes callbacks after subscribe()" and crashes
// the app (regression when an always-mounted shell tile started reading this).
export function useEntitlement() {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: QUERY_KEYS.ENTITLEMENT,
    enabled: Boolean(userId),
    queryFn: async (): Promise<Entitlement> => {
      const { data, error } = await supabase.rpc("get_my_entitlement");
      if (error) throw error;
      const rows = (data ?? []) as Entitlement[];
      return rows[0] ?? FREE_ENTITLEMENT;
    },
  });
}

// The ONE realtime subscription for entitlement — call exactly once, from the
// app shell (AppLayout), never from a leaf/always-mounted-twice component. The LS
// webhook writes the subscriptions row, and postgres_changes (RLS-scoped to the
// caller's own row) invalidates the ENTITLEMENT query — so the UI flips to Pro
// within seconds of payment, with no polling (the snap-reports realtime pattern).
// Listen to "*": a brand-new subscriber is an INSERT, a grandfathered/comp user
// is an UPDATE.
export function useEntitlementRealtime(): void {
  const { session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`subscriptions:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "subscriptions",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ENTITLEMENT });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}
