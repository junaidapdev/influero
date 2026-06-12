import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import type { ActivityKind } from "@shared/types/activity.types";

// Fire-and-forget writer for the activity_log audit/feed table. Like lib/logger,
// this is a sanctioned cross-cutting side-effect that touches Supabase directly
// outside a hook — it's not cached server state, so it deliberately bypasses
// TanStack Query. Call it from mutation hooks (and, from Feature 11, edge
// functions) — never from a component.
//
// It NEVER throws: a logging failure must not break the user's action
// (code-standards), so the insert is wrapped and any error is swallowed + logged.
// `user_id` is omitted on purpose — the activity_log column defaults to
// auth.uid(), so the row carries the caller's id without a session lookup, and
// RLS still enforces ownership on write.

type LogActivityInput = {
  kind: ActivityKind;
  summary: string;
  refId?: string;
  refTable?: string;
};

export async function logActivity({
  kind,
  summary,
  refId,
  refTable,
}: LogActivityInput): Promise<void> {
  try {
    const { error } = await supabase.from("activity_log").insert({
      kind,
      summary,
      ref_id: refId ?? null,
      ref_table: refTable ?? null,
    });
    if (error) throw error;
  } catch (err) {
    logger.error("logActivity", err);
  }
}
