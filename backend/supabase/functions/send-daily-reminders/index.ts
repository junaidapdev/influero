// send-daily-reminders: the twice-daily web-push job (Phase B). Invoked by
// pg_cron via pg_net — NOT a logged-in user — so it authenticates with a shared
// CRON_SECRET header (deploy with --no-verify-jwt) and runs as service-role (the
// documented system / cross-user exception in supabase-server.ts): it reads
// EVERY user's outstanding work and pushes to their devices.
//
// Per user it (1) CLAIMS a notification_sends row first — if it already exists,
// this slot fired today, so skip (idempotent against cron retries), (2) builds a
// localized digest, (3) pushes to each subscription, pruning any the relay
// reports gone (410/404). One user's failure never sinks the batch.

import { z } from "npm:zod@3";

import { corsPreflight, fail, ok } from "../_shared/api.ts";
import { ERROR_CODE, HTTP } from "../_shared/constants.ts";
import { createSupabaseAdmin } from "../_shared/supabase-server.ts";
import { logger } from "../_shared/logger.ts";
import { ENV } from "../../../config/env.ts";
import { NOTIFICATION_SLOT } from "../../../shared/types/pushSubscription.types.ts";
import {
  getApplicationServer,
  isSubscriptionGone,
  sendPush,
} from "../_shared/webpush.ts";
import { buildDigestMessage } from "./digest.ts";

const inputSchema = z.object({
  slot: z.enum([NOTIFICATION_SLOT.MORNING, NOTIFICATION_SLOT.EVENING] as const),
});

// Shapes of the untyped service-role query results (no generated Database types).
type OutstandingUser = {
  user_id: string;
  locale: string;
  meeting_count: number;
  shoot_count: number;
  post_count: number;
  payment_count: number;
};

type Subscription = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

// The current calendar day in Riyadh (all users share one timezone), as
// YYYY-MM-DD for notification_sends.sent_on. en-CA formats as ISO.
function riyadhToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsPreflight();

  try {
    if (req.method !== "POST") {
      return fail(ERROR_CODE.NOT_FOUND, "Not found", HTTP.NOT_FOUND);
    }

    // Gate: only pg_cron (or a manual test) carrying the shared secret may run.
    const secret = req.headers.get("x-cron-secret");
    if (!secret || secret !== ENV.CRON_SECRET) {
      return fail(
        ERROR_CODE.UNAUTHENTICATED,
        "Invalid cron secret",
        HTTP.UNAUTHORIZED,
      );
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
    const slot = parsed.data.slot;
    const today = riyadhToday();

    // service-role: a scheduled job has no logged-in user and must read across
    // ALL users (the documented createSupabaseAdmin exception).
    const supabase = createSupabaseAdmin();

    const { data: users, error } = await supabase.rpc(
      "get_users_with_outstanding",
    );
    if (error) {
      logger.error("[send-daily-reminders] rpc", error);
      return fail(
        ERROR_CODE.INTERNAL,
        "Unexpected error",
        HTTP.INTERNAL_SERVER_ERROR,
      );
    }

    const outstanding = (users ?? []) as OutstandingUser[];
    if (outstanding.length === 0) {
      return ok({ usersNotified: 0, pushesSent: 0, pruned: 0 }, HTTP.OK);
    }

    const appServer = await getApplicationServer();
    let usersNotified = 0;
    let pushesSent = 0;
    let pruned = 0;

    for (const user of outstanding) {
      try {
        const itemCount = user.meeting_count + user.shoot_count +
          user.post_count + user.payment_count;

        // Claim this (user, slot, day) FIRST. If the row already exists the slot
        // fired today → skip (idempotent against a cron retry). ignoreDuplicates
        // = ON CONFLICT DO NOTHING, so a conflict returns no row.
        const { data: claim, error: claimError } = await supabase
          .from("notification_sends")
          .upsert(
            { user_id: user.user_id, slot, sent_on: today, item_count: itemCount },
            { onConflict: "user_id,slot,sent_on", ignoreDuplicates: true },
          )
          .select("id");
        if (claimError) throw claimError;
        if (!claim || claim.length === 0) continue;

        const { data: subs, error: subsError } = await supabase
          .from("push_subscriptions")
          .select("id, endpoint, p256dh, auth")
          .eq("user_id", user.user_id);
        if (subsError) throw subsError;

        const message = buildDigestMessage(user.locale, user);
        const payload = JSON.stringify({
          title: message.title,
          body: message.body,
          url: message.url,
          lang: message.lang,
          tag: `influero-${slot}`,
        });

        for (const sub of (subs ?? []) as Subscription[]) {
          try {
            await sendPush(appServer, sub, payload, `influero-${slot}`);
            pushesSent += 1;
          } catch (pushError) {
            if (isSubscriptionGone(pushError)) {
              await supabase.from("push_subscriptions").delete().eq("id", sub.id);
              pruned += 1;
            } else {
              logger.error("[send-daily-reminders] push", pushError);
            }
          }
        }
        usersNotified += 1;
      } catch (userError) {
        // One user's failure must not sink the batch.
        logger.error("[send-daily-reminders] user", userError);
      }
    }

    return ok({ usersNotified, pushesSent, pruned }, HTTP.OK);
  } catch (err) {
    logger.error("[send-daily-reminders]", err);
    return fail(
      ERROR_CODE.INTERNAL,
      "Unexpected error",
      HTTP.INTERNAL_SERVER_ERROR,
    );
  }
});
