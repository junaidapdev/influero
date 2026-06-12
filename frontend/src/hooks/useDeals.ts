import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/logActivity";
import { logger } from "@/lib/logger";
import { createReminder } from "@/lib/createReminder";
import { useSession } from "@/hooks/useSession";
import { QUERY_KEYS } from "@/constants/queryKeys";
import {
  becamePosted,
  deriveDealStatus,
  isChecklistLocked,
  isDeliverablePosted,
  toggleDeliverable,
} from "@/features/deals/status";
import { buildSnapAnalyticsReminderMessages } from "@/features/reminders/messages";
import { snapAnalyticsReminderDueAt } from "@/features/reminders/dueAt";
import type { DealFormInput } from "@/features/deals/deal.schema";
import { ACTIVITY_KIND } from "@shared/types/activity.types";
import { DEAL_STATUS, type Deal, type Deliverable } from "@shared/types/deal.types";
import { REMINDER_KIND, REMINDER_REF_TABLE } from "@shared/types/reminder.types";

const ACTIVITY_REF_TABLE = "ad_deals";

// /deals list filters. All optional — absent means "all". `month` is YYYY-MM
// and filters by DEADLINE month (the operationally meaningful date), which
// inherently excludes deals with no deadline.
export type DealFilters = {
  brandId?: string;
  status?: Deal["status"];
  month?: string;
};

// The lightweight unfiltered projection serving the brand-directory counts and
// the month-filter options — one round-trip, never a per-brand count query.
export type DealIndexRow = Pick<Deal, "brand_id" | "deadline">;

type ToggleDeliverableInput = {
  deal: Deal;
  index: number;
};

// [start, end) deadline range for a YYYY-MM month filter.
function monthRange(month: string): { start: string; end: string } {
  const [year, monthNumber] = month.split("-").map(Number);
  const next =
    monthNumber === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(monthNumber + 1).padStart(2, "0")}-01`;
  return { start: `${month}-01`, end: next };
}

// Maps the all-string form input to ad_deals columns: trims, converts the
// validated numeric strings to numbers, and turns the empty optional fields
// into null. Deliverable lines start unposted (no posted_at).
function toDealColumns(input: DealFormInput): {
  brand_id: string;
  title: string;
  deliverables: Deliverable[];
  agreed_amount_sar: number;
  deadline: string | null;
  notes: string | null;
} {
  const notes = input.notes.trim();
  const deadline = input.deadline.trim();
  return {
    brand_id: input.brandId,
    title: input.title.trim(),
    deliverables: input.deliverables.map((line) => ({
      type: line.type,
      count: Number(line.count),
    })),
    agreed_amount_sar: Number(input.agreedAmount),
    deadline: deadline === "" ? null : deadline,
    notes: notes === "" ? null : notes,
  };
}

// The filtered /deals list, DB-filtered per build-plan ("filters wired to DB
// queries") with the filter state in the queryKey so each combination caches
// independently. Deadline ascending, null deadlines last, newest-created as
// the tiebreaker. RLS scopes the read; the user_id filter is convenience.
export function useDeals(filters: DealFilters) {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: [...QUERY_KEYS.DEALS, "list", filters],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Deal[]> => {
      if (!userId) throw new Error("[useDeals] No authenticated user");

      let query = supabase
        .from("ad_deals")
        .select("*")
        .eq("user_id", userId)
        .order("deadline", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (filters.brandId) query = query.eq("brand_id", filters.brandId);
      if (filters.status) query = query.eq("status", filters.status);
      if (filters.month) {
        const { start, end } = monthRange(filters.month);
        query = query.gte("deadline", start).lt("deadline", end);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data ?? []) as Deal[];
    },
  });
}

// One unfiltered select of brand_id + deadline for every deal the user owns.
// Serves the directory's per-brand counts (grouped client-side) and the month
// filter's options — the no-N+1 query from the architecture.
export function useDealsIndex() {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: [...QUERY_KEYS.DEALS, "index"],
    enabled: Boolean(userId),
    queryFn: async (): Promise<DealIndexRow[]> => {
      if (!userId) throw new Error("[useDealsIndex] No authenticated user");

      const { data, error } = await supabase
        .from("ad_deals")
        .select("brand_id, deadline")
        .eq("user_id", userId);
      if (error) throw error;

      return (data ?? []) as DealIndexRow[];
    },
  });
}

// All deals for one brand — the brand-detail Deals section + count.
export function useDealsForBrand(brandId: string | undefined) {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: [...QUERY_KEYS.DEALS, "brand", brandId],
    enabled: Boolean(userId && brandId),
    queryFn: async (): Promise<Deal[]> => {
      if (!userId || !brandId) {
        throw new Error("[useDealsForBrand] Missing user or brand id");
      }

      const { data, error } = await supabase
        .from("ad_deals")
        .select("*")
        .eq("user_id", userId)
        .eq("brand_id", brandId)
        .order("deadline", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;

      return (data ?? []) as Deal[];
    },
  });
}

// Insert a deal under the caller's id, then log deal_created (fire-and-forget —
// logActivity never throws, so a logging failure can't break the create).
export function useCreateDeal() {
  const queryClient = useQueryClient();
  const { session } = useSession();

  return useMutation({
    mutationFn: async (input: DealFormInput): Promise<Deal> => {
      const userId = session?.user.id;
      if (!userId) throw new Error("[useCreateDeal] No authenticated user");

      const { data, error } = await supabase
        .from("ad_deals")
        .insert({
          ...toDealColumns(input),
          user_id: userId,
          status: DEAL_STATUS.PENDING,
        })
        .select("*")
        .single();
      if (error) throw error;

      const deal = data as Deal;
      void logActivity({
        kind: ACTIVITY_KIND.DEAL_CREATED,
        summary: deal.title,
        refId: deal.id,
        refTable: ACTIVITY_REF_TABLE,
      });
      return deal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DEALS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.REPORTS });
    },
  });
}

// Toggle one checklist line. The status machine derives the new status from the
// new deliverables array — status is NEVER written ad-hoc. Activity logs fire on
// forward transitions only: deliverable_posted when a line is marked, plus
// deal_posted when that mark completes the checklist. Unmarking logs nothing.
//
// 16B: marking a line ALSO arms the deal's 24h "Capture Snap analytics"
// reminder (kind='deliverable' — its first writer). createReminder's
// upsert-by-(kind, ref) dedup means one live reminder per deal, re-armed by
// each posting (latest post wins). Best-effort by decision: the reminder is a
// nudge, not the action — a failure is logged, never fails the visible toggle
// (unlike meetings, where the reminder IS part of the feature contract).
// Unmarking leaves the reminder — it's dismissible, and the OTHER posted
// content on the deal still has a 24h window worth capturing.
export function useToggleDeliverable() {
  const queryClient = useQueryClient();
  const { session } = useSession();

  return useMutation({
    mutationFn: async ({ deal, index }: ToggleDeliverableInput): Promise<Deal> => {
      const userId = session?.user.id;
      if (!userId) throw new Error("[useToggleDeliverable] No authenticated user");
      if (isChecklistLocked(deal.status)) {
        throw new Error("[useToggleDeliverable] Checklist is locked");
      }

      const line = deal.deliverables[index];
      if (!line) throw new Error("[useToggleDeliverable] No deliverable at index");

      const now = new Date().toISOString();
      const isMarking = !isDeliverablePosted(line);
      const nextDeliverables = toggleDeliverable(deal.deliverables, index, now);
      const nextStatus = deriveDealStatus(nextDeliverables, deal.status);

      const { data, error } = await supabase
        .from("ad_deals")
        .update({
          deliverables: nextDeliverables,
          status: nextStatus,
          updated_at: now,
        })
        .eq("id", deal.id)
        .eq("user_id", userId)
        .select("*")
        .single();
      if (error) throw error;

      const updated = data as Deal;
      if (isMarking) {
        void logActivity({
          kind: ACTIVITY_KIND.DELIVERABLE_POSTED,
          summary: `${updated.title} · ${line.type}`,
          refId: updated.id,
          refTable: ACTIVITY_REF_TABLE,
        });
        if (becamePosted(deal.status, nextStatus)) {
          void logActivity({
            kind: ACTIVITY_KIND.DEAL_POSTED,
            summary: updated.title,
            refId: updated.id,
            refTable: ACTIVITY_REF_TABLE,
          });
        }

        // Arm the 24h Snap-analytics reminder (best-effort — see hook note).
        const messages = buildSnapAnalyticsReminderMessages(updated.title);
        try {
          await createReminder({
            userId,
            kind: REMINDER_KIND.DELIVERABLE,
            refId: updated.id,
            refTable: REMINDER_REF_TABLE.AD_DEALS,
            dueAt: snapAnalyticsReminderDueAt(now),
            messageEn: messages.messageEn,
            messageAr: messages.messageAr,
          });
        } catch (reminderError) {
          logger.error("[useToggleDeliverable] snap reminder", reminderError);
        }
      }
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DEALS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.REPORTS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.REMINDERS });
    },
  });
}

// Manual cancel — the one status the machine doesn't derive. Terminal in v1
// (no un-cancel) and blocked on paid deals (money has moved). No activity kind
// exists for cancellation in the closed v1 set, so nothing is logged.
export function useCancelDeal() {
  const queryClient = useQueryClient();
  const { session } = useSession();

  return useMutation({
    mutationFn: async (deal: Deal): Promise<Deal> => {
      const userId = session?.user.id;
      if (!userId) throw new Error("[useCancelDeal] No authenticated user");
      if (isChecklistLocked(deal.status)) {
        throw new Error("[useCancelDeal] Deal is already paid or cancelled");
      }

      const { data, error } = await supabase
        .from("ad_deals")
        .update({
          status: DEAL_STATUS.CANCELLED,
          updated_at: new Date().toISOString(),
        })
        .eq("id", deal.id)
        .eq("user_id", userId)
        .select("*")
        .single();
      if (error) throw error;

      return data as Deal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DEALS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.REPORTS });
    },
  });
}
