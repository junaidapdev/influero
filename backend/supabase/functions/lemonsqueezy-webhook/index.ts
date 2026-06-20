// lemonsqueezy-webhook: the entitlement SOURCE OF TRUTH. LemonSqueezy posts
// subscription lifecycle events here server-to-server (NOT a logged-in user), so
// it runs with NO JWT (deploy `--no-verify-jwt`) and as service-role (the
// documented system / cross-user exception in supabase-server.ts) to write any
// user's subscriptions row — which RLS otherwise forbids the client from writing.
//
// Flow: read the RAW body → verify the X-Signature HMAC (401 on mismatch — this
// replaces the CRON_SECRET gate with a cryptographic one) → parse (400 if bad) →
// IGNORE anything not our store + Pro variant + test-mode (the LS account is the
// reused "Narrate AI" account, so legacy products share the store and MUST be
// filtered out) → resolve the user (custom_data.user_id on the first event, else by
// LS customer id) → upsert the row, newest-LS-write wins (idempotent against
// retries AND out-of-order delivery; a grandfather comp row is always replaced).
// ALWAYS 200 for handled + deliberately-ignored events (a non-2xx makes LS retry);
// 500 only on a genuine processing failure so LS retries that.

import { fail, ok } from "../_shared/api.ts";
import { ERROR_CODE, HTTP } from "../_shared/constants.ts";
import { createSupabaseAdmin } from "../_shared/supabase-server.ts";
import { logger } from "../_shared/logger.ts";
import { ENV } from "../../../config/env.ts";
import { verifyWebhookSignature } from "../_shared/lemonsqueezy.ts";
import { PLAN } from "../../../shared/types/subscription.types.ts";

// Untyped JSON:API payload (no generated LS types). Only the fields we read.
type LsAttributes = {
  store_id?: number | string;
  customer_id?: number | string;
  order_id?: number | string;
  variant_id?: number | string;
  status?: string;
  renews_at?: string | null;
  ends_at?: string | null;
  trial_ends_at?: string | null;
  card_brand?: string | null;
  card_last_four?: string | null;
  test_mode?: boolean;
  updated_at?: string;
};
type LsWebhook = {
  meta?: { event_name?: string; custom_data?: { user_id?: string } };
  data?: { id?: string; attributes?: LsAttributes };
};

const asString = (v: number | string | null | undefined): string | null =>
  v === null || v === undefined ? null : String(v);

Deno.serve(async (req) => {
  // Server-to-server only — no CORS / OPTIONS.
  if (req.method !== "POST") {
    return fail(ERROR_CODE.NOT_FOUND, "Not found", HTTP.NOT_FOUND);
  }

  const rawBody = await req.text();
  const valid = await verifyWebhookSignature(
    rawBody,
    req.headers.get("X-Signature"),
    ENV.LEMONSQUEEZY_WEBHOOK_SECRET,
  );
  if (!valid) {
    return fail(ERROR_CODE.UNAUTHENTICATED, "Invalid signature", HTTP.UNAUTHORIZED);
  }

  let payload: LsWebhook;
  try {
    payload = JSON.parse(rawBody) as LsWebhook;
  } catch {
    return fail(ERROR_CODE.VALIDATION, "Invalid JSON body", HTTP.BAD_REQUEST);
  }

  try {
    const eventName = payload.meta?.event_name ?? "";
    // Only subscription lifecycle events change entitlement; ack everything else
    // (including subscription_payment_* invoice events) without touching the row.
    if (
      !eventName.startsWith("subscription_") ||
      eventName.startsWith("subscription_payment")
    ) {
      return ok({ ignored: eventName || "unknown" }, HTTP.OK);
    }

    const attrs = payload.data?.attributes ?? {};
    const subscriptionId = payload.data?.id;
    if (!subscriptionId || !attrs.status) {
      return ok({ ignored: "incomplete" }, HTTP.OK);
    }

    // Reused-account hygiene: only OUR store + Pro variant + matching test-mode.
    if (
      asString(attrs.store_id) !== ENV.LEMONSQUEEZY_STORE_ID ||
      asString(attrs.variant_id) !== ENV.LEMONSQUEEZY_PRO_VARIANT_ID ||
      Boolean(attrs.test_mode) !== ENV.LEMONSQUEEZY_TEST_MODE
    ) {
      return ok({ ignored: "foreign" }, HTTP.OK);
    }

    const supabase = createSupabaseAdmin();

    // Resolve the user: custom_data.user_id is present on the FIRST event
    // (subscription_created); later events carry none, so match the existing row by
    // LS subscription id, falling back to LS customer id.
    let userId: string | null = payload.meta?.custom_data?.user_id ?? null;
    if (!userId) {
      const { data: bySub } = await supabase
        .from("subscriptions")
        .select("user_id")
        .eq("lemonsqueezy_subscription_id", subscriptionId)
        .maybeSingle();
      userId = bySub?.user_id ?? null;
      if (!userId && attrs.customer_id != null) {
        const { data: byCustomer } = await supabase
          .from("subscriptions")
          .select("user_id")
          .eq("lemonsqueezy_customer_id", String(attrs.customer_id))
          .maybeSingle();
        userId = byCustomer?.user_id ?? null;
      }
    }
    if (!userId) {
      logger.error("[lemonsqueezy-webhook] no user for sub", subscriptionId);
      return ok({ ignored: "unmatched-user" }, HTTP.OK);
    }

    // Newest-LS-write wins. The `updated_at` column holds the LS event's updated_at
    // (not our write time), so an out-of-order/retried delivery with an equal or
    // older stamp is skipped — EXCEPT a grandfather comp row, which any real LS
    // event must replace.
    const lsUpdatedAt = attrs.updated_at ?? new Date(0).toISOString();
    const { data: current } = await supabase
      .from("subscriptions")
      .select("updated_at, lemonsqueezy_subscription_id")
      .eq("user_id", userId)
      .maybeSingle();
    const isComp = current?.lemonsqueezy_subscription_id?.startsWith("comp:") ?? false;
    if (!isComp && current?.updated_at && current.updated_at >= lsUpdatedAt) {
      return ok({ ignored: "stale" }, HTTP.OK);
    }

    const { error } = await supabase.from("subscriptions").upsert(
      {
        user_id: userId,
        lemonsqueezy_subscription_id: subscriptionId,
        lemonsqueezy_customer_id: asString(attrs.customer_id),
        lemonsqueezy_order_id: asString(attrs.order_id),
        variant_id: asString(attrs.variant_id),
        plan: PLAN.PRO,
        status: attrs.status,
        renews_at: attrs.renews_at ?? null,
        ends_at: attrs.ends_at ?? null,
        trial_ends_at: attrs.trial_ends_at ?? null,
        card_brand: attrs.card_brand ?? null,
        card_last_four: attrs.card_last_four ?? null,
        raw_event: payload,
        updated_at: lsUpdatedAt,
      },
      { onConflict: "user_id" },
    );
    if (error) {
      // Real DB failure → 500 so LS retries.
      logger.error("[lemonsqueezy-webhook] upsert", error);
      return fail(ERROR_CODE.INTERNAL, "Unexpected error", HTTP.INTERNAL_SERVER_ERROR);
    }

    return ok({ event: eventName, status: attrs.status }, HTTP.OK);
  } catch (err) {
    logger.error("[lemonsqueezy-webhook]", err);
    return fail(ERROR_CODE.INTERNAL, "Unexpected error", HTTP.INTERNAL_SERVER_ERROR);
  }
});
