import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { createReminder } from "@/lib/createReminder";
import { formatSar } from "@/lib/currency";
import { todayIsoLocal } from "@/lib/date";
import { logger } from "@/lib/logger";
import { useSession } from "@/hooks/useSession";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { EDGE_FUNCTION, PAYMENTS_TAB, type PaymentsTab } from "@/constants/payments";
import { LOCALES } from "@/constants/locale";
import type { PaymentFormInput } from "@/features/payments/payment.schema";
import { getPaymentsSummary, type PaymentsSummary } from "@/features/payments/summary";
import { paymentReminderDueAt } from "@/features/reminders/dueAt";
import { buildPaymentReminderMessages } from "@/features/reminders/messages";
import {
  PAYMENT_STATUS,
  type MarkPaymentReceivedResult,
  type Payment,
} from "@shared/types/payment.types";
import { REMINDER_KIND, REMINDER_REF_TABLE } from "@shared/types/reminder.types";

// The envelope every edge function we own returns (backend/shared — mirrored
// here until a runtime-shared import lands). PostgREST responses are NOT this
// shape; only our functions are.
type Envelope =
  | { ok: true; data: MarkPaymentReceivedResult }
  | { ok: false; error: { code: string; message: string } };

// Maps the all-string form input to payments columns: trims, converts the
// validated amount string to a number, and turns empty optional fields into
// null. Status always starts pending — 'received' is only ever written by the
// mark_payment_received RPC.
function toPaymentColumns(input: PaymentFormInput): {
  deal_id: string;
  amount_sar: number;
  expected_date: string | null;
  method: string | null;
  notes: string | null;
} {
  const expectedDate = input.expectedDate.trim();
  const notes = input.notes.trim();
  return {
    deal_id: input.dealId,
    amount_sar: Number(input.amount),
    expected_date: expectedDate === "" ? null : expectedDate,
    method: input.method === "" ? null : input.method,
    notes: notes === "" ? null : notes,
  };
}

// One tab, one query. Pending = everything NOT received (robust if a stored
// 'overdue' ever appears; v1 derives overdue at display time), soonest
// expected_date first, nulls last. Received = most recently received first.
// RLS scopes the read; the user_id filter is convenience.
export function usePayments(tab: PaymentsTab) {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: [...QUERY_KEYS.PAYMENTS, "list", tab],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Payment[]> => {
      if (!userId) throw new Error("[usePayments] No authenticated user");

      let query = supabase.from("payments").select("*").eq("user_id", userId);
      query =
        tab === PAYMENTS_TAB.RECEIVED
          ? query
              .eq("status", PAYMENT_STATUS.RECEIVED)
              .order("received_date", { ascending: false })
              .order("created_at", { ascending: false })
          : query
              .neq("status", PAYMENT_STATUS.RECEIVED)
              .order("expected_date", { ascending: true, nullsFirst: false })
              .order("created_at", { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      return (data ?? []) as Payment[];
    },
  });
}

// What usePaymentsForDeal exposes as `data`: the rows plus the derived rollup
// (build-plan: "payments + a derived isFullyPaid flag").
type PaymentsForDeal = {
  payments: Payment[];
  summary: PaymentsSummary;
};

// Module-level so the function identity is stable: TanStack then only re-runs
// select when the fetched rows change, and the consumer keeps tracked-query
// render optimization (spreading the query result would read every property
// and opt out of it).
function selectPaymentsForDeal(payments: Payment[]): PaymentsForDeal {
  return { payments, summary: getPaymentsSummary(payments) };
}

// All installments for one deal plus the derived rollup (Feature 12) — feeds
// the deal expanded row's payment status line. Keys off the PAYMENTS prefix,
// so create/mark-received invalidations already cover it. Only mounted by an
// EXPANDED deal row, so the list never fans out into per-row queries. Same
// ordering as the pending tab: soonest expected_date first, nulls last.
export function usePaymentsForDeal(dealId: string | undefined) {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: [...QUERY_KEYS.PAYMENTS, "deal", dealId],
    enabled: Boolean(userId && dealId),
    queryFn: async (): Promise<Payment[]> => {
      if (!userId || !dealId) {
        throw new Error("[usePaymentsForDeal] Missing user or deal id");
      }

      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("user_id", userId)
        .eq("deal_id", dealId)
        .order("expected_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;

      return (data ?? []) as Payment[];
    },
    select: selectPaymentsForDeal,
  });
}

// What useCreatePayment resolves to. The payment is always created (a plain
// single-row insert); "already received" is layered on top. markFailed = the
// user asked to mark it received but the RPC call failed AFTER the insert —
// the row exists as pending, so the caller surfaces a "saved, finish from
// Pending" message rather than implying total failure (mirrors useUpdateDeal's
// reminderFailed soft-fail). dealPaid mirrors mark_payment_received's result.
type CreatePaymentResult = {
  payment: Payment;
  markedReceived: boolean;
  markFailed: boolean;
  dealPaid: boolean;
};

// Insert an installment under the caller's id (a plain single-row write), then
// — only when the form's "Already received?" toggle is on (the advance /
// reservation case) — mark it received through the SAME atomic edge fn / RPC
// the Pending tab uses. 'received' (and the deal 'paid' flip) is never written
// any other way. The mark step is best-effort: if it fails the row already
// exists as pending, so we don't throw (a retry would duplicate it).
export function useCreatePayment() {
  const queryClient = useQueryClient();
  const { session } = useSession();

  return useMutation({
    mutationFn: async (input: PaymentFormInput): Promise<CreatePaymentResult> => {
      const userId = session?.user.id;
      if (!userId) throw new Error("[useCreatePayment] No authenticated user");

      const columns = toPaymentColumns(input);
      const { data, error } = await supabase
        .from("payments")
        .insert({
          ...columns,
          // A received payment is stamped with received_date by the RPC; an
          // expected date is only meaningful while the money is still owed.
          expected_date: input.markReceived ? null : columns.expected_date,
          user_id: userId,
          status: PAYMENT_STATUS.PENDING,
        })
        .select("*")
        .single();
      if (error) throw error;

      const payment = data as Payment;
      if (!input.markReceived) {
        return { payment, markedReceived: false, markFailed: false, dealPaid: false };
      }

      try {
        const { data: invokeData, error: invokeError } =
          await supabase.functions.invoke(EDGE_FUNCTION.MARK_PAYMENT_RECEIVED, {
            body: { paymentId: payment.id },
          });
        if (invokeError) throw invokeError;

        const envelope = invokeData as Envelope;
        if (!envelope.ok) throw new Error(envelope.error.message);

        return {
          payment,
          markedReceived: true,
          markFailed: false,
          dealPaid: envelope.data.deal_paid,
        };
      } catch (markError) {
        logger.error("useCreatePayment.markReceived", markError);
        return { payment, markedReceived: false, markFailed: true, dealPaid: false };
      }
    },
    // onSettled (not onSuccess): the new row must appear even on a partial
    // mark-received failure. DEALS too — a received payment may flip the deal.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PAYMENTS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DEALS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.REPORTS });
    },
  });
}

type SendPaymentReminderInput = {
  payment: Payment;
  // Resolved by the caller from the cached deals list — undefined while the
  // deals query is in flight; the message falls back to the amount alone.
  dealTitle: string | undefined;
};

// The F12 "Send reminder" button, wired for real (Feature 13): drops an
// in-app kind='payment' reminder due on the payment's expected date (start of
// the viewer's local day), or immediately when there's no date / it's already
// past. Both message languages are denormalized at creation. createReminder's
// upsert-by-ref semantics make a double-tap MOVE the existing reminder instead
// of stacking a duplicate into Today.
export function useSendPaymentReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      payment,
      dealTitle,
    }: SendPaymentReminderInput): Promise<void> => {
      const messages = buildPaymentReminderMessages({
        dealTitle,
        amountEn: formatSar(payment.amount_sar, LOCALES.EN),
        amountAr: formatSar(payment.amount_sar, LOCALES.AR),
      });
      await createReminder({
        userId: payment.user_id,
        kind: REMINDER_KIND.PAYMENT,
        refId: payment.id,
        refTable: REMINDER_REF_TABLE.PAYMENTS,
        dueAt: paymentReminderDueAt(
          payment.expected_date,
          todayIsoLocal(),
          new Date().toISOString(),
        ),
        messageEn: messages.messageEn,
        messageAr: messages.messageAr,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.REMINDERS });
    },
  });
}

// Mark a payment received via the edge function → RPC (the ONLY write path for
// payment status — never a direct PostgREST update). Optimistic: the row
// leaves the Pending list immediately and is restored on error (build-plan:
// "optimistic update with rollback"). The edge function logs payment_received
// / deal_paid server-side. Invalidates payments AND deals — the deal may have
// flipped to paid.
export function useMarkPaymentReceived() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentId: string): Promise<MarkPaymentReceivedResult> => {
      const { data, error } = await supabase.functions.invoke(
        EDGE_FUNCTION.MARK_PAYMENT_RECEIVED,
        { body: { paymentId } },
      );
      if (error) throw error;

      const envelope = data as Envelope;
      if (!envelope.ok) {
        throw new Error(envelope.error.message);
      }
      return envelope.data;
    },
    onMutate: async (paymentId: string) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.PAYMENTS });
      const previous = queryClient.getQueriesData<Payment[]>({
        queryKey: QUERY_KEYS.PAYMENTS,
      });

      const pendingKey = [...QUERY_KEYS.PAYMENTS, "list", PAYMENTS_TAB.PENDING];
      queryClient.setQueryData<Payment[]>(pendingKey, (old) =>
        old?.filter((payment) => payment.id !== paymentId),
      );

      return { previous };
    },
    onError: (_error, _paymentId, context) => {
      for (const [key, data] of context?.previous ?? []) {
        queryClient.setQueryData(key, data);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PAYMENTS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DEALS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.REPORTS });
    },
  });
}
