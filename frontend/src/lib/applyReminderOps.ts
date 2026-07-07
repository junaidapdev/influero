import { logger } from "@/lib/logger";
import { createReminder, deleteReminderForRef } from "@/lib/createReminder";
import type { ReminderOp } from "@/features/reminders/plan";

// The ONE executor for reminder plans (companion to lib/createReminder, the
// one write path): applies the ops from features/reminders/plan and owns
// nothing but I/O and the failure stance the calling mutation picked —
//   'swallow' — log each failure, keep applying the remaining ops (per-op
//     independence: one kind failing must not skip the others), and report
//     via reminderFailed so create/edit flows can surface the "saved, but…"
//     toast. Toggle flows use the same stance and ignore the flag (the action
//     is the checkmark; reminders are housekeeping).
//   'throw'  — abort on the first failure. The clear-before-write paths
//     (cancel deal, delete meeting) run this BEFORE the source-row write so a
//     failed clear aborts the whole action — never a terminal row still
//     nagging on Today.
type ApplyReminderOpsOptions = {
  failure: "swallow" | "throw";
  // Logger context, e.g. "[useMarkShot]" — failures stay attributable now
  // that the branches no longer live in the hooks.
  label: string;
};

export async function applyReminderOps(
  userId: string,
  ops: ReminderOp[],
  { failure, label }: ApplyReminderOpsOptions,
): Promise<{ reminderFailed: boolean }> {
  let reminderFailed = false;

  for (const op of ops) {
    try {
      if (op.op === "upsert") {
        await createReminder({
          userId,
          kind: op.kind,
          refId: op.refId,
          refTable: op.refTable,
          dueAt: op.dueAt,
          messageEn: op.messageEn,
          messageAr: op.messageAr,
        });
      } else {
        await deleteReminderForRef(userId, op.kind, op.refId);
      }
    } catch (error) {
      if (failure === "throw") throw error;
      reminderFailed = true;
      logger.error(`${label} reminder ${op.op} (${op.kind})`, error);
    }
  }

  return { reminderFailed };
}
