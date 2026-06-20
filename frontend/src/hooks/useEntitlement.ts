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

// The caller's plan/entitlement (get_my_entitlement RPC) + realtime: the LS
// webhook writes the subscriptions row, and postgres_changes (RLS-scoped to the
// caller's own row) invalidates this query — so the UI flips to Pro within
// seconds of payment, with no polling (the snap-reports realtime pattern). Listen
// to "*" because a brand-new subscriber is an INSERT while a grandfathered/comp
// user is an UPDATE.
export function useEntitlement() {
  const { session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEYS.ENTITLEMENT,
    enabled: Boolean(userId),
    queryFn: async (): Promise<Entitlement> => {
      const { data, error } = await supabase.rpc("get_my_entitlement");
      if (error) throw error;
      const rows = (data ?? []) as Entitlement[];
      return rows[0] ?? FREE_ENTITLEMENT;
    },
  });

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

  return query;
}
