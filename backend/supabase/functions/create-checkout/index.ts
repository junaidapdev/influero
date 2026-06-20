// create-checkout: mints a LemonSqueezy hosted checkout for the Pro plan for the
// CALLING user (createSupabaseAsUser → auth.uid()/email), embedding the user_id as
// custom data so the webhook can map the resulting subscription back to them.
// 409 if the caller is already Pro (nothing to buy). Returns { url }; the frontend
// redirects the browser to it. No request body — the plan is the single Pro variant.

import { corsPreflight, fail, ok } from "../_shared/api.ts";
import { ERROR_CODE, HTTP } from "../_shared/constants.ts";
import { createSupabaseAsUser } from "../_shared/supabase-server.ts";
import { logger } from "../_shared/logger.ts";
import { ENV } from "../../../config/env.ts";
import { createCheckout } from "../_shared/lemonsqueezy.ts";
import type { Entitlement } from "../../../shared/types/subscription.types.ts";

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
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return fail(ERROR_CODE.UNAUTHENTICATED, "Invalid session", HTTP.UNAUTHORIZED);
    }
    const { id: userId, email } = userData.user;
    if (!email) {
      return fail(ERROR_CODE.VALIDATION, "Account has no email", HTTP.BAD_REQUEST);
    }

    // Already Pro? Don't let them buy a second subscription.
    const { data: ent, error: entErr } = await supabase.rpc("get_my_entitlement");
    if (entErr) {
      logger.error("[create-checkout] entitlement", entErr);
      return fail(ERROR_CODE.INTERNAL, "Unexpected error", HTTP.INTERNAL_SERVER_ERROR);
    }
    const entitlement = (Array.isArray(ent) ? ent[0] : ent) as Entitlement | undefined;
    if (entitlement?.is_pro) {
      return fail(ERROR_CODE.CONFLICT, "Already subscribed", HTTP.CONFLICT);
    }

    let url: string;
    try {
      url = await createCheckout({
        email,
        userId,
        redirectUrl: `${ENV.APP_URL}/settings?checkout=success`,
      });
    } catch (lsErr) {
      // Surface the LS rejection detail (variant / store / mode mismatch) in the
      // response so checkout misconfig is debuggable, not an opaque 500. (Tighten
      // to a generic message before public launch.)
      logger.error("[create-checkout] LS", lsErr);
      return fail(
        ERROR_CODE.INTERNAL,
        lsErr instanceof Error ? lsErr.message : "Checkout creation failed",
        HTTP.INTERNAL_SERVER_ERROR,
      );
    }

    return ok({ url }, HTTP.OK);
  } catch (err) {
    logger.error("[create-checkout]", err);
    return fail(ERROR_CODE.INTERNAL, "Unexpected error", HTTP.INTERNAL_SERVER_ERROR);
  }
});
