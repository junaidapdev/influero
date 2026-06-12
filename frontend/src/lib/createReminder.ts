import { supabase } from "@/lib/supabase";
import {
  REMINDER_CHANNEL,
  type Reminder,
  type ReminderKind,
  type ReminderRefTable,
} from "@shared/types/reminder.types";

// THE one write path for reminders (build-plan: "createReminder is the ONE
// helper that creates reminders"). Like lib/logActivity it's a sanctioned
// cross-cutting writer that touches Supabase outside a hook — call it from
// mutation hooks, never from a component. UNLIKE logActivity it THROWS:
// a missing reminder is user-visible state (the Today panel), not best-effort
// telemetry, so callers must decide how a failure surfaces.
//
// Semantics are upsert-by-ref: if an open reminder for (kind, ref_id) already
// exists it is MOVED (due_at + messages refreshed, re-armed via is_done=false)
// instead of duplicated. That one behavior covers all three call sites:
//   - meeting create → no row yet → insert
//   - meeting edit   → row exists → moves with the new time/title (and
//     self-heals by inserting if the create-time reminder write had failed)
//   - payment "Send reminder" double-tap → second tap updates, never stacks
// Every statement carries the user_id convenience filter per code-standards
// (RLS is the real check); a partial unique index on (user_id, kind, ref_id)
// backstops the check-then-insert against a concurrent double-write.

type CreateReminderInput = {
  userId: string;
  kind: ReminderKind;
  refId: string;
  refTable: ReminderRefTable;
  dueAt: string;
  messageEn: string;
  messageAr: string;
};

export async function createReminder({
  userId,
  kind,
  refId,
  refTable,
  dueAt,
  messageEn,
  messageAr,
}: CreateReminderInput): Promise<void> {
  const { data: moved, error: updateError } = await supabase
    .from("reminders")
    .update({
      due_at: dueAt,
      message_en: messageEn,
      message_ar: messageAr,
      is_done: false,
    })
    .eq("user_id", userId)
    .eq("kind", kind)
    .eq("ref_id", refId)
    .select("id");
  if (updateError) throw updateError;
  if ((moved as Pick<Reminder, "id">[] | null)?.length) return;

  const { error: insertError } = await supabase.from("reminders").insert({
    user_id: userId,
    kind,
    ref_id: refId,
    ref_table: refTable,
    due_at: dueAt,
    message_en: messageEn,
    message_ar: messageAr,
    channel: REMINDER_CHANNEL.IN_APP,
  });
  if (insertError) throw insertError;
}

// Clears the reminder(s) pointing at a source row — the cancel path (decision:
// a reminder is derived scheduling state, not history, so cancel DELETES it;
// is_done=true would mean "the user handled it"). Throws so the caller can run
// it BEFORE the source-row write and abort the whole action on failure.
export async function deleteReminderForRef(
  userId: string,
  kind: ReminderKind,
  refId: string,
): Promise<void> {
  const { error } = await supabase
    .from("reminders")
    .delete()
    .eq("user_id", userId)
    .eq("kind", kind)
    .eq("ref_id", refId);
  if (error) throw error;
}
