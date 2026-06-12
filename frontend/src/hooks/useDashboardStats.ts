import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { addMonths } from "@/features/meetings/calendar";
import type { DashboardStats } from "@shared/types/dashboard.types";

// The five top-line month numbers in ONE round trip — the get_dashboard_stats
// RPC (0009) aggregates server-side, so the dashboard never fetches rows to
// count them client-side. The caller passes the month as local YYYY-MM
// (features/meetings/calendar.currentMonth): "this month" is the VIEWER'S
// calendar month, and only the client knows its timezone. security invoker +
// RLS scope the read; deal/payment mutations invalidate the DASHBOARD prefix.
export function useDashboardStats(month: string) {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: [...QUERY_KEYS.DASHBOARD, "stats", month],
    enabled: Boolean(userId),
    queryFn: async (): Promise<DashboardStats> => {
      if (!userId) throw new Error("[useDashboardStats] No authenticated user");

      const { data, error } = await supabase.rpc("get_dashboard_stats", {
        month_start: `${month}-01`,
        month_end: `${addMonths(month, 1)}-01`,
      });
      if (error) throw error;

      return data as DashboardStats;
    },
  });
}
