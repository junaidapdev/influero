// Fire-and-forget activity_log writer for edge functions — the Deno
// counterpart of frontend/src/lib/logActivity.ts (deferred from Feature 08 to
// its first consumer, here). Writes the exact same kinds and row shape via the
// shared activity.types.ts.
//
// It NEVER throws: a logging failure must not break the user's action
// (code-standards), so the insert is wrapped and any error is swallowed +
// logged. The caller passes its client: under createSupabaseAsUser the JWT is
// present, so activity_log's `user_id default auth.uid()` fills the column —
// `userId` stays omitted. A future createSupabaseAdmin caller has no JWT
// (auth.uid() is null) and MUST pass `userId` explicitly.

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

import type { ActivityKind } from "../../../shared/types/activity.types.ts";
import { logger } from "./logger.ts";

type LogActivityInput = {
  kind: ActivityKind;
  summary: string;
  refId?: string;
  refTable?: string;
  userId?: string;
};

export async function logActivity(
  supabase: SupabaseClient,
  { kind, summary, refId, refTable, userId }: LogActivityInput,
): Promise<void> {
  try {
    const { error } = await supabase.from("activity_log").insert({
      kind,
      summary,
      ref_id: refId ?? null,
      ref_table: refTable ?? null,
      ...(userId ? { user_id: userId } : {}),
    });
    if (error) throw error;
  } catch (err) {
    logger.error("[logActivity]", err);
  }
}
