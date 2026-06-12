import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import { useBrands } from "@/hooks/useBrands";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { addMonths, currentMonth } from "@/features/meetings/calendar";
import type { MonthlyTotal, PerBrandRow } from "@/features/reports/report";
import type {
  MonthlyTotalRow,
  PerBrandReportRow,
} from "@shared/types/reports.types";

// Invoiced-vs-collected for the last 12 months in ONE round trip — the
// get_monthly_totals RPC (0011) aggregates server-side, so /reports (and the
// dashboard hero sparkline that shares this cache) never fetch rows to bucket
// them client-side. The window is the VIEWER'S local calendar: the current
// local month back through 11 earlier months, passed as first-of-month dates
// (only the client knows its timezone — the get_dashboard_stats discipline).
// The RPC always returns 12 rows oldest-first (empty months as 0), matching the
// chart's contract. security invoker + RLS scope the read; deal/payment
// mutations invalidate the REPORTS prefix.
export function useMonthlyTotals() {
  const { session } = useSession();
  const userId = session?.user.id;
  const month = currentMonth();

  return useQuery({
    queryKey: [...QUERY_KEYS.REPORTS, "monthly", month],
    enabled: Boolean(userId),
    queryFn: async (): Promise<MonthlyTotal[]> => {
      if (!userId) throw new Error("[useMonthlyTotals] No authenticated user");

      const { data, error } = await supabase.rpc("get_monthly_totals", {
        window_start: `${addMonths(month, -11)}-01`,
        window_end: `${addMonths(month, 1)}-01`,
      });
      if (error) throw error;

      return ((data ?? []) as MonthlyTotalRow[]).map((row) => ({
        month: row.month,
        invoicedSar: row.invoiced_sar,
        collectedSar: row.collected_sar,
      }));
    },
  });
}

// What usePerBrandReport exposes — the composed rows plus the merged
// loading/error of its two underlying queries (the aggregate + the brands list).
type PerBrandReport = {
  data: PerBrandRow[] | undefined;
  isLoading: boolean;
  isError: boolean;
};

// All-time per-brand performance (Feature 16). The get_per_brand_report RPC
// (0011) returns money totals keyed by brand_id; this hook joins them to the
// already-cached useBrands list to attach the full Brand each row needs (the
// avatar tint + ar/en names). Reusing the brand cache keeps the RPC lean and
// avoids a second brand fetch. Only brands the RPC returns (≥1 non-cancelled
// deal) appear; ad_deals.brand_id is on delete restrict, so a brand with deals
// can't vanish from under the join.
export function usePerBrandReport(): PerBrandReport {
  const { session } = useSession();
  const userId = session?.user.id;
  const brandsQuery = useBrands();

  const aggQuery = useQuery({
    queryKey: [...QUERY_KEYS.REPORTS, "per-brand"],
    enabled: Boolean(userId),
    queryFn: async (): Promise<PerBrandReportRow[]> => {
      if (!userId) throw new Error("[usePerBrandReport] No authenticated user");

      const { data, error } = await supabase.rpc("get_per_brand_report");
      if (error) throw error;

      return (data ?? []) as PerBrandReportRow[];
    },
  });

  const data = useMemo<PerBrandRow[] | undefined>(() => {
    if (!aggQuery.data || !brandsQuery.data) return undefined;

    const brandById = new Map(brandsQuery.data.map((brand) => [brand.id, brand]));
    return aggQuery.data.flatMap((row) => {
      const brand = brandById.get(row.brand_id);
      if (!brand) return [];
      return [
        {
          brand,
          dealCount: row.deal_count,
          invoicedSar: row.invoiced_sar,
          collectedSar: row.collected_sar,
        },
      ];
    });
  }, [aggQuery.data, brandsQuery.data]);

  return {
    data,
    isLoading: aggQuery.isLoading || brandsQuery.isLoading,
    isError: aggQuery.isError || brandsQuery.isError,
  };
}
