import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { todayIsoLocal } from "@/lib/date";
import { useSession } from "@/hooks/useSession";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { DEAL_STATUS, type Deal } from "@shared/types/deal.types";
import { PAYMENT_STATUS, type Payment } from "@shared/types/payment.types";

// The dashboard Needs-attention panel: two indexed queries against the
// viewer's LOCAL today (todayIsoLocal — the derived-overdue convention from
// features/payments/overdue). Keying off the PAYMENTS / DEALS prefixes means
// every payment/deal mutation's invalidations already refresh both for free.
// RLS scopes the reads; the user_id filter is convenience.

// Pending payments whose expected_date has passed — the same rule
// isPaymentOverdue derives at display time, filtered in the DB so the
// dashboard never fetches the full payment list to find them.
export function useOverduePayments() {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: [...QUERY_KEYS.PAYMENTS, "attention"],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Payment[]> => {
      if (!userId) throw new Error("[useOverduePayments] No authenticated user");

      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("user_id", userId)
        .eq("status", PAYMENT_STATUS.PENDING)
        .lt("expected_date", todayIsoLocal())
        .order("expected_date", { ascending: true });
      if (error) throw error;

      return (data ?? []) as Payment[];
    },
  });
}

// Deals past their deadline and still un-posted (pending | in_progress) —
// posted/paid deals met the deadline's point, cancelled ones are out of play.
export function usePastDeadlineDeals() {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: [...QUERY_KEYS.DEALS, "attention"],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Deal[]> => {
      if (!userId) throw new Error("[usePastDeadlineDeals] No authenticated user");

      const { data, error } = await supabase
        .from("ad_deals")
        .select("*")
        .eq("user_id", userId)
        .in("status", [DEAL_STATUS.PENDING, DEAL_STATUS.IN_PROGRESS])
        .lt("deadline", todayIsoLocal())
        .order("deadline", { ascending: true });
      if (error) throw error;

      return (data ?? []) as Deal[];
    },
  });
}
