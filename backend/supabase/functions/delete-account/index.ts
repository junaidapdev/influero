// delete-account: permanently erases the CALLING user (PDPL/GDPR right to
// erasure). Order is chosen so the operation is retriable and never reports
// success — or destroys data — while an abort is still possible:
//   1. Cancel any active LemonSqueezy subscription FIRST — it's the abortable,
//      non-destructive precondition. Abort if it can't be cancelled, so a still-
//      alive account is never left being billed AND its uploaded files are never
//      wiped while the account survives ("cancel your sub first" stays recoverable).
//   2. Remove storage objects (idempotent) — not cascaded by the auth.users
//      delete, so they would orphan otherwise.
//   3. Delete every owned row in one transaction (delete_my_account RPC).
//   4. Remove the auth.users row itself.
//
// Ownership: the user's identity is verified from the JWT (createSupabaseAsUser →
// getUser). The subscription read + the RPC run as the caller (RLS / auth.uid()).
// createSupabaseAdmin is the ONE sanctioned admin use here — storage cleanup +
// auth-user removal — strictly scoped to the JWT-verified userId, never a
// client-supplied id.
//
// DEPLOY with default JWT verification (NOT --no-verify-jwt like the webhook): this
// is a user-facing function; the manual getUser() check is a backstop, not the gate.

import { corsPreflight, fail, ok } from "../_shared/api.ts";
import { ERROR_CODE, HTTP } from "../_shared/constants.ts";
import {
  createSupabaseAdmin,
  createSupabaseAsUser,
} from "../_shared/supabase-server.ts";
import { logger } from "../_shared/logger.ts";
import { cancelSubscription } from "../_shared/lemonsqueezy.ts";
import { SUBSCRIPTION_STATUS } from "../../../shared/types/subscription.types.ts";
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

// Bare token the client maps to "cancel your subscription first" copy (the
// DEAL_LIMIT / PROMO_REDEEM_ERROR convention). Returned as the envelope error
// message so the frontend can distinguish this recoverable case from a generic
// failure and tell the user to cancel via Manage billing, then retry.
const SUBSCRIPTION_ACTIVE = "SUBSCRIPTION_ACTIVE";

const STORAGE_BUCKETS = ["avatars", "snap-uploads"] as const;
const STORAGE_PAGE = 1000;

// Removes every object under `${userId}/` in a bucket, paginating so a heavy
// account (many snap uploads) is fully cleared. THROWS on a storage error — the
// caller aborts the erasure rather than leave the user's files behind. Re-running
// is safe: removing already-removed paths is a no-op.
async function removeUserFolder(
  admin: SupabaseClient,
  bucket: string,
  userId: string,
): Promise<void> {
  while (true) {
    const { data: objects, error: listErr } = await admin.storage
      .from(bucket)
      .list(userId, { limit: STORAGE_PAGE });
    if (listErr) {
      throw new Error(`storage list ${bucket}: ${listErr.message}`);
    }
    if (!objects || objects.length === 0) return;

    const paths = objects.map((object) => `${userId}/${object.name}`);
    const { error: rmErr } = await admin.storage.from(bucket).remove(paths);
    if (rmErr) {
      throw new Error(`storage remove ${bucket}: ${rmErr.message}`);
    }
    // Fewer than a full page back ⇒ nothing left after this removal.
    if (objects.length < STORAGE_PAGE) return;
  }
}

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
    const userId = userData.user.id;

    const admin = createSupabaseAdmin();

    // 1. Cancel an active paid subscription FIRST — the abortable, non-destructive
    //    precondition. RLS limits the read to the caller's own row. Comp/grant
    //    users have no real LS sub (null or comp:*); an already-cancelled/expired
    //    sub needs no second cancel (keeps retries clean). Doing this before any
    //    irreversible step means a cancel failure never wipes a still-alive
    //    account's files.
    const { data: sub, error: subErr } = await supabase
      .from("subscriptions")
      .select("lemonsqueezy_subscription_id, status")
      .maybeSingle();
    if (subErr) {
      logger.error("[delete-account] read sub", subErr);
      return fail(ERROR_CODE.INTERNAL, "Unexpected error", HTTP.INTERNAL_SERVER_ERROR);
    }
    const subId = sub?.lemonsqueezy_subscription_id as string | undefined;
    const alreadyEnded =
      sub?.status === SUBSCRIPTION_STATUS.CANCELLED ||
      sub?.status === SUBSCRIPTION_STATUS.EXPIRED;
    if (subId && !subId.startsWith("comp:") && !alreadyEnded) {
      try {
        await cancelSubscription(subId);
      } catch (lsErr) {
        // Don't erase an account whose recurring charge we couldn't stop.
        logger.error("[delete-account] LS cancel", lsErr);
        return fail(ERROR_CODE.CONFLICT, SUBSCRIPTION_ACTIVE, HTTP.CONFLICT);
      }
    }

    // 2. Remove storage objects (idempotent). Not cascaded by the auth.users
    //    delete, so they would orphan otherwise. The abortable sub-cancel has
    //    passed, so the remaining steps are all retry-safe to completion.
    try {
      for (const bucket of STORAGE_BUCKETS) {
        await removeUserFolder(admin, bucket, userId);
      }
    } catch (storageErr) {
      logger.error("[delete-account] storage", storageErr);
      return fail(ERROR_CODE.INTERNAL, "Unexpected error", HTTP.INTERNAL_SERVER_ERROR);
    }

    // 3. Atomically delete every owned row (RESTRICT-safe order), as the caller.
    const { error: rpcErr } = await supabase.rpc("delete_my_account");
    if (rpcErr) {
      logger.error("[delete-account] rpc", rpcErr);
      return fail(ERROR_CODE.INTERNAL, "Unexpected error", HTTP.INTERNAL_SERVER_ERROR);
    }

    // 4. Remove the auth user itself (+ its sessions/identities). Public rows are
    //    already gone, so the FK cascade is a no-op here. If this fails after the
    //    RPC, re-running completes it: the RPC no-ops and this retries.
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) {
      logger.error("[delete-account] auth delete", delErr);
      return fail(ERROR_CODE.INTERNAL, "Unexpected error", HTTP.INTERNAL_SERVER_ERROR);
    }

    return ok({ deleted: true }, HTTP.OK);
  } catch (err) {
    logger.error("[delete-account]", err);
    return fail(ERROR_CODE.INTERNAL, "Unexpected error", HTTP.INTERNAL_SERVER_ERROR);
  }
});
