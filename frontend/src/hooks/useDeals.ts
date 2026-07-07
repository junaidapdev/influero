import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/logActivity";
import { applyReminderOps } from "@/lib/applyReminderOps";
import { startOfLocalDayIso } from "@/lib/date";
import { useSession } from "@/hooks/useSession";
import { QUERY_KEYS } from "@/constants/queryKeys";
import {
  becamePosted,
  becameShot,
  canToggleShot,
  isLifecycleLocked,
  togglePosted,
  toggleShot,
} from "@/features/deals/status";
import { diffReminderOps, planDealReminders } from "@/features/reminders/plan";
import type { DealFormInput } from "@/features/deals/deal.schema";
import { ACTIVITY_KIND } from "@shared/types/activity.types";
import { DEAL_STATUS, type Deal, type Deliverable } from "@shared/types/deal.types";

const ACTIVITY_REF_TABLE = "ad_deals";

// /deals list filters. All optional — absent means "all". `month` is YYYY-MM
// and filters by POST_DATE month (the publish date — the operationally
// meaningful one), which inherently excludes deals with no post date.
export type DealFilters = {
  brandId?: string;
  status?: Deal["status"];
  month?: string;
};

// The lightweight unfiltered projection serving the brand-directory counts and
// the month-filter options — one round-trip, never a per-brand count query.
export type DealIndexRow = Pick<Deal, "brand_id" | "post_date">;

// The result of a create/edit: the deal plus whether a shoot/post reminder
// write failed (the deal still saved). The route surfaces the failure as a
// soft toast — no silent missing reminder, no lost deal (the meetings contract).
export type DealMutationResult = { deal: Deal; reminderFailed: boolean };

type UpdateDealInput = { dealId: string; input: DealFormInput };

// [start, end) post_date range for a YYYY-MM month filter, as viewer-local
// (Riyadh) midnight ISO instants — post_date is now a timestamptz, so the
// bounds are instants, not bare dates, and bucket by the local calendar month
// (matching the dashboard/reports RPCs) rather than the UTC month.
function monthRange(month: string): { start: string; end: string } {
  const [year, monthNumber] = month.split("-").map(Number);
  const nextMonthFirst =
    monthNumber === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(monthNumber + 1).padStart(2, "0")}-01`;
  return {
    start: startOfLocalDayIso(`${month}-01`),
    end: startOfLocalDayIso(nextMonthFirst),
  };
}

// Maps the all-string form input to ad_deals columns: trims, converts the
// validated numeric strings to numbers, the datetime-local shoot/post strings
// to ISO UTC (the timestamptz columns), and turns the empty optional fields
// into null. Deliverables are pure {type, count} descriptors (no posted_at).
function toDealColumns(input: DealFormInput): {
  brand_id: string;
  title: string;
  deliverables: Deliverable[];
  agreed_amount_sar: number;
  shoot_date: string | null;
  post_date: string | null;
  notes: string | null;
} {
  const notes = input.notes.trim();
  const shootDate = input.shootDate.trim();
  const postDate = input.postDate.trim();
  return {
    brand_id: input.brandId,
    title: input.title.trim(),
    deliverables: input.deliverables.map((line) => ({
      type: line.type,
      count: Number(line.count),
    })),
    agreed_amount_sar: Number(input.agreedAmount),
    shoot_date: shootDate === "" ? null : new Date(shootDate).toISOString(),
    post_date: postDate === "" ? null : new Date(postDate).toISOString(),
    notes: notes === "" ? null : notes,
  };
}

// Reminder policy lives in features/reminders/plan (planDealReminders — which
// reminders a deal in this state should have; diffReminderOps — the ops that
// get there without resurrecting dismissed reminders); lib/applyReminderOps
// executes them under the failure stance each mutation picks. The hooks below
// only choose prev/next states, a stance, and a label.
async function syncDealReminders(
  userId: string,
  prev: Deal | null,
  next: Deal,
  label: string,
): Promise<{ reminderFailed: boolean }> {
  const ops = diffReminderOps(
    prev ? planDealReminders(prev) : null,
    planDealReminders(next),
  );
  return applyReminderOps(userId, ops, { failure: "swallow", label });
}

// The filtered /deals list, DB-filtered with the filter state in the queryKey so
// each combination caches independently. post_date ascending, null post dates
// last, newest-created as the tiebreaker. RLS scopes the read; the user_id
// filter is convenience.
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
        .order("post_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (filters.brandId) query = query.eq("brand_id", filters.brandId);
      if (filters.status) query = query.eq("status", filters.status);
      if (filters.month) {
        const { start, end } = monthRange(filters.month);
        query = query.gte("post_date", start).lt("post_date", end);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data ?? []) as Deal[];
    },
  });
}

// One unfiltered select of brand_id + post_date for every deal the user owns.
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
        .select("brand_id, post_date")
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
        .order("post_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;

      return (data ?? []) as Deal[];
    },
  });
}

function invalidateDealViews(
  queryClient: ReturnType<typeof useQueryClient>,
): void {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DEALS });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.REPORTS });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.REMINDERS });
}

// Insert a deal under the caller's id (To-do — no stamps yet), log deal_created,
// then arm the shoot/post reminders for whatever dates were set.
export function useCreateDeal() {
  const queryClient = useQueryClient();
  const { session } = useSession();

  return useMutation({
    mutationFn: async (input: DealFormInput): Promise<DealMutationResult> => {
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

      // prev=null (create): every desired reminder is armed fresh.
      const { reminderFailed } = await syncDealReminders(
        userId,
        null,
        deal,
        "[useCreateDeal]",
      );
      return { deal, reminderFailed };
    },
    onSuccess: () => invalidateDealViews(queryClient),
  });
}

// Edit a deal's fields (the F10-deferred edit flow, designed now that the
// lifecycle dates need to be editable). Status + the completion stamps are NOT
// touched here — they're owned by the two checkmarks. Re-syncs the shoot/post
// reminders to the new dates (move/clear via the upsert).
export function useUpdateDeal() {
  const queryClient = useQueryClient();
  const { session } = useSession();

  return useMutation({
    mutationFn: async ({
      dealId,
      input,
    }: UpdateDealInput): Promise<DealMutationResult> => {
      const userId = session?.user.id;
      if (!userId) throw new Error("[useUpdateDeal] No authenticated user");

      const { data, error } = await supabase
        .from("ad_deals")
        .update({
          ...toDealColumns(input),
          updated_at: new Date().toISOString(),
        })
        .eq("id", dealId)
        .eq("user_id", userId)
        .select("*")
        .single();
      if (error) throw error;

      const deal = data as Deal;
      // prev=null: the mutation input carries no pre-write row, so every still-
      // desired reminder is (re)upserted — the pre-refactor edit behavior.
      const { reminderFailed } = await syncDealReminders(
        userId,
        null,
        deal,
        "[useUpdateDeal]",
      );
      return { deal, reminderFailed };
    },
    onSuccess: () => invalidateDealViews(queryClient),
  });
}

// Tick/untick ☐ Shot. Marking stamps shot_at and logs deal_shot + clears the
// shoot reminder (task done). Unticking clears shot_at and re-arms the shoot
// reminder (if a shoot_date is set) — only allowed when not posted (posting
// implies shot; canToggleShot guards the write, the UI disables the box).
export function useMarkShot() {
  const queryClient = useQueryClient();
  const { session } = useSession();

  return useMutation({
    mutationFn: async (deal: Deal): Promise<Deal> => {
      const userId = session?.user.id;
      if (!userId) throw new Error("[useMarkShot] No authenticated user");
      if (!canToggleShot(deal)) {
        throw new Error("[useMarkShot] Shot is locked for this deal");
      }

      const now = new Date().toISOString();
      const next = toggleShot(deal, now);

      const { data, error } = await supabase
        .from("ad_deals")
        .update({ shot_at: next.shot_at, status: next.status, updated_at: now })
        .eq("id", deal.id)
        .eq("user_id", userId)
        .select("*")
        .single();
      if (error) throw error;
      const updated = data as Deal;

      if (becameShot(deal, next)) {
        void logActivity({
          kind: ACTIVITY_KIND.DEAL_SHOT,
          summary: updated.title,
          refId: updated.id,
          refTable: ACTIVITY_REF_TABLE,
        });
      }

      // Ticking clears the shoot reminder (task done); unticking re-arms it
      // for the planned date — both fall out of the state diff. Best-effort:
      // a reminder failure must never fail the visible checkmark, so the
      // returned flag is deliberately ignored.
      await syncDealReminders(userId, deal, updated, "[useMarkShot]");
      return updated;
    },
    onSuccess: () => invalidateDealViews(queryClient),
  });
}

// Tick/untick ☐ Posted. Marking stamps posted_at (back-stamping shot_at if
// unset), logs deal_posted (+ deal_shot if it back-stamped), clears the shoot +
// post reminders, and arms the +24h Snap-analytics reminder. Unticking clears
// posted_at (keeping shot_at), clears the now-stale Snap-analytics reminder, and
// re-arms the post reminder for the planned date.
export function useMarkPosted() {
  const queryClient = useQueryClient();
  const { session } = useSession();

  return useMutation({
    mutationFn: async (deal: Deal): Promise<Deal> => {
      const userId = session?.user.id;
      if (!userId) throw new Error("[useMarkPosted] No authenticated user");
      if (isLifecycleLocked(deal.status)) {
        throw new Error("[useMarkPosted] Deal is paid or cancelled");
      }

      const now = new Date().toISOString();
      const next = togglePosted(deal, now);

      const { data, error } = await supabase
        .from("ad_deals")
        .update({
          shot_at: next.shot_at,
          posted_at: next.posted_at,
          status: next.status,
          updated_at: now,
        })
        .eq("id", deal.id)
        .eq("user_id", userId)
        .select("*")
        .single();
      if (error) throw error;
      const updated = data as Deal;

      if (becamePosted(deal, next)) {
        if (becameShot(deal, next)) {
          void logActivity({
            kind: ACTIVITY_KIND.DEAL_SHOT,
            summary: updated.title,
            refId: updated.id,
            refTable: ACTIVITY_REF_TABLE,
          });
        }
        void logActivity({
          kind: ACTIVITY_KIND.DEAL_POSTED,
          summary: updated.title,
          refId: updated.id,
          refTable: ACTIVITY_REF_TABLE,
        });
      }

      // Posting clears shoot + post reminders (both tasks done); unticking
      // keeps the shot stamp and re-arms the post reminder for the planned
      // date. The diff also drains any legacy 'deliverable' row (the removed
      // auto 24h Snap nudge). Best-effort — flag deliberately ignored.
      await syncDealReminders(userId, deal, updated, "[useMarkPosted]");
      return updated;
    },
    onSuccess: () => invalidateDealViews(queryClient),
  });
}

// Manual cancel — terminal in v1 (no un-cancel) and blocked on paid deals. A
// cancelled deal must stop feeding Today, so its reminders are deleted FIRST
// (a failure aborts the cancel — never a cancelled deal still nagging). The two
// writes aren't atomic, so if the status flip FAILS after the deletes commit,
// the deal is still ACTIVE with no reminders — we re-arm them before surfacing
// the error so it isn't stranded off the worklist. No activity kind exists for
// cancellation in the closed set, so nothing is logged.
export function useCancelDeal() {
  const queryClient = useQueryClient();
  const { session } = useSession();

  return useMutation({
    mutationFn: async (deal: Deal): Promise<Deal> => {
      const userId = session?.user.id;
      if (!userId) throw new Error("[useCancelDeal] No authenticated user");
      if (isLifecycleLocked(deal.status)) {
        throw new Error("[useCancelDeal] Deal is already paid or cancelled");
      }

      // Plan for the INTENDED terminal state — desires nothing, so the diff
      // clears every managed kind — and run it with 'throw' BEFORE the status
      // flip: a failed clear aborts the cancel.
      const cancelledPlan = planDealReminders({
        ...deal,
        status: DEAL_STATUS.CANCELLED,
      });
      await applyReminderOps(userId, diffReminderOps(null, cancelledPlan), {
        failure: "throw",
        label: "[useCancelDeal]",
      });

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
      if (error) {
        // Status flip failed but the reminders are already gone — diff back
        // to the still-active deal's plan to re-arm them (best-effort), then
        // surface the failure so the cancel toast still fires and the user
        // can retry.
        await applyReminderOps(
          userId,
          diffReminderOps(cancelledPlan, planDealReminders(deal)),
          { failure: "swallow", label: "[useCancelDeal] rollback" },
        );
        throw error;
      }

      return data as Deal;
    },
    onSuccess: () => invalidateDealViews(queryClient),
  });
}
