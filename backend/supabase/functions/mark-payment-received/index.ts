// mark-payment-received: the app's first edge function and the template every
// later one copies (code-standards "Edge Functions"). Validates input with
// zod, calls the mark_payment_received RPC (one transaction — payment →
// received, deal → paid when all received), logs activity, and returns the
// common envelope with the correct HTTP status. Runs as the CALLER
// (createSupabaseAsUser) so RLS + auth.uid() enforce ownership end to end.

import { z } from "npm:zod@3";

import { corsPreflight, fail, ok } from "../_shared/api.ts";
import { ERROR_CODE, HTTP } from "../_shared/constants.ts";
import { createSupabaseAsUser } from "../_shared/supabase-server.ts";
import { logActivity } from "../_shared/logActivity.ts";
import { logger } from "../_shared/logger.ts";
import { ACTIVITY_KIND } from "../../../shared/types/activity.types.ts";
import type { MarkPaymentReceivedResult } from "../../../shared/types/payment.types.ts";

const inputSchema = z.object({ paymentId: z.string().uuid() });

// The RPC raises this message for missing / not-owned / already-received —
// all indistinguishable to the caller on purpose (no cross-tenant probing).
const RPC_NOT_FOUND_MESSAGE = "payment not found";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return corsPreflight();
  }

  try {
    if (req.method !== "POST") {
      return fail(ERROR_CODE.NOT_FOUND, "Not found", HTTP.NOT_FOUND);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return fail(ERROR_CODE.UNAUTHENTICATED, "Missing auth", HTTP.UNAUTHORIZED);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return fail(ERROR_CODE.VALIDATION, "Invalid JSON body", HTTP.BAD_REQUEST);
    }

    const parsed = inputSchema.safeParse(body);
    if (!parsed.success) {
      return fail(ERROR_CODE.VALIDATION, parsed.error.message, HTTP.BAD_REQUEST);
    }

    const supabase = createSupabaseAsUser(authHeader);
    const { data, error } = await supabase.rpc("mark_payment_received", {
      payment_id: parsed.data.paymentId,
    });

    if (error) {
      if (error.message.includes(RPC_NOT_FOUND_MESSAGE)) {
        return fail(ERROR_CODE.NOT_FOUND, "Payment not found", HTTP.NOT_FOUND);
      }
      logger.error("[mark-payment-received]", error);
      return fail(
        ERROR_CODE.INTERNAL,
        "Unexpected error",
        HTTP.INTERNAL_SERVER_ERROR,
      );
    }

    const result = data as MarkPaymentReceivedResult;

    // Fire-and-forget (logActivity never throws): payment_received always,
    // deal_paid only when this installment completed the deal.
    await logActivity(supabase, {
      kind: ACTIVITY_KIND.PAYMENT_RECEIVED,
      summary: `${result.deal_title} · SAR ${result.amount_sar}`,
      refId: result.payment_id,
      refTable: "payments",
    });
    if (result.deal_paid) {
      await logActivity(supabase, {
        kind: ACTIVITY_KIND.DEAL_PAID,
        summary: result.deal_title,
        refId: result.deal_id,
        refTable: "ad_deals",
      });
    }

    return ok(result, HTTP.OK);
  } catch (err) {
    logger.error("[mark-payment-received]", err);
    return fail(
      ERROR_CODE.INTERNAL,
      "Unexpected error",
      HTTP.INTERNAL_SERVER_ERROR,
    );
  }
});
