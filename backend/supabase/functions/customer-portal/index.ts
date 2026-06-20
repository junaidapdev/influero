// customer-portal: returns the LemonSqueezy hosted customer-portal URL for the
// CALLING user's subscription (cancel / update card / view invoices). Reads the
// user's OWN subscriptions row (createSupabaseAsUser → the SELECT-own RLS policy),
// then fetches the FRESH portal URL from LS on demand — those signed URLs expire
// ~24h, so they are never stored. 404 for free / grandfathered-comp users (no real
// LS subscription to manage).

import { corsPreflight, fail, ok } from "../_shared/api.ts";
import { ERROR_CODE, HTTP } from "../_shared/constants.ts";
import { createSupabaseAsUser } from "../_shared/supabase-server.ts";
import { logger } from "../_shared/logger.ts";
import { getCustomerPortalUrl } from "../_shared/lemonsqueezy.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsPreflight();

  try {
    if (req.method !== "POST") {
      return fail(ERROR_CODE.NOT_FOUND, "Not found", HTTP.NOT_FOUND);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return fail(ERROR_CODE.UNAUTHENTICATED, "Missing auth", HTTP.UNAUTHORIZED);
    }

    const supabase = createSupabaseAsUser(authHeader);
    // RLS limits this to the caller's own row, so no explicit user filter needed.
    const { data: sub, error } = await supabase
      .from("subscriptions")
      .select("lemonsqueezy_subscription_id")
      .maybeSingle();
    if (error) {
      logger.error("[customer-portal] read", error);
      return fail(ERROR_CODE.INTERNAL, "Unexpected error", HTTP.INTERNAL_SERVER_ERROR);
    }

    const subId = sub?.lemonsqueezy_subscription_id;
    if (!subId || subId.startsWith("comp:")) {
      return fail(ERROR_CODE.NOT_FOUND, "No active subscription", HTTP.NOT_FOUND);
    }

    const url = await getCustomerPortalUrl(subId);
    if (!url) {
      return fail(ERROR_CODE.NOT_FOUND, "Portal unavailable", HTTP.NOT_FOUND);
    }

    return ok({ url }, HTTP.OK);
  } catch (err) {
    logger.error("[customer-portal]", err);
    return fail(ERROR_CODE.INTERNAL, "Unexpected error", HTTP.INTERNAL_SERVER_ERROR);
  }
});
