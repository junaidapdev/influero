import type { Deal } from "@shared/types/deal.types";
import type { Meeting } from "@shared/types/meeting.types";
import {
  REMINDER_KIND,
  REMINDER_REF_TABLE,
  type ReminderKind,
  type ReminderRefTable,
} from "@shared/types/reminder.types";

import { isLifecycleLocked } from "@/features/deals/status";
import { dealDateReminderDueAt, meetingReminderDueAt } from "./dueAt";
import {
  buildMeetingReminderMessages,
  buildPostReminderMessages,
  buildShootReminderMessages,
} from "./messages";

// The reminder POLICY module (React-free, Supabase-free per the features/
// boundary): given the current state of a deal or meeting, declare which
// lifecycle reminders should exist — then diff two such declarations into the
// operations that make the database match. Hooks never encode reminder rules;
// they plan from state and hand the ops to lib/applyReminderOps.
//
// State-based on purpose (approved design): every mutation syncs to the row it
// just wrote, so the rules live once and the sync self-heals from any prior
// partial failure, instead of five hand-coded transition branches.

// One reminder that should exist right now. Mirrors createReminder's input —
// an upsert op is exactly this tuple.
export type DesiredReminder = {
  kind: ReminderKind;
  refId: string;
  refTable: ReminderRefTable;
  dueAt: string;
  messageEn: string;
  messageAr: string;
};

export type ReminderOp =
  | ({ op: "upsert" } & DesiredReminder)
  | { op: "delete"; kind: ReminderKind; refId: string };

// A plan = the desired set plus the closed list of kinds this entity is
// responsible for. Managed-but-undesired kinds become deletes in the diff.
export type ReminderPlan = {
  refId: string;
  desired: DesiredReminder[];
  managedKinds: readonly ReminderKind[];
};

// DELIVERABLE is managed but never desired: the auto +24h Snap-analytics nudge
// was removed (6a89d11), so the planner's only job for it is draining legacy
// rows. Emitting its delete on every deal sync (not just unpost/cancel, as the
// old branches did) is an approved deviation — idempotent and RLS-scoped.
const MANAGED_DEAL_KINDS = [
  REMINDER_KIND.SHOOT,
  REMINDER_KIND.POST,
  REMINDER_KIND.DELIVERABLE,
] as const;

const MANAGED_MEETING_KINDS = [REMINDER_KIND.MEETING] as const;

// The slice of a deal the reminder policy reads. Narrow so tests fabricate
// only what matters.
export type DealReminderState = Pick<
  Deal,
  "id" | "title" | "status" | "shoot_date" | "shot_at" | "post_date" | "posted_at"
>;

// The rules, in one place:
//   - a terminal (paid/cancelled) deal desires NO reminders — editing one must
//     never revive the rows the cancel flow deleted;
//   - shoot exists iff a shoot_date is planned and the deal isn't shot yet;
//   - post exists iff a post_date is planned and the deal isn't posted yet.
// Cancel passes the INTENDED next state ({ ...deal, status: CANCELLED }) to
// get the clear-everything plan before the status flip is written.
export function planDealReminders(deal: DealReminderState): ReminderPlan {
  const desired: DesiredReminder[] = [];

  if (!isLifecycleLocked(deal.status)) {
    if (deal.shoot_date && deal.shot_at == null) {
      const messages = buildShootReminderMessages(deal.title);
      desired.push({
        kind: REMINDER_KIND.SHOOT,
        refId: deal.id,
        refTable: REMINDER_REF_TABLE.AD_DEALS,
        dueAt: dealDateReminderDueAt(deal.shoot_date),
        messageEn: messages.messageEn,
        messageAr: messages.messageAr,
      });
    }
    if (deal.post_date && deal.posted_at == null) {
      const messages = buildPostReminderMessages(deal.title);
      desired.push({
        kind: REMINDER_KIND.POST,
        refId: deal.id,
        refTable: REMINDER_REF_TABLE.AD_DEALS,
        dueAt: dealDateReminderDueAt(deal.post_date),
        messageEn: messages.messageEn,
        messageAr: messages.messageAr,
      });
    }
  }

  return { refId: deal.id, desired, managedKinds: MANAGED_DEAL_KINDS };
}

export type MeetingReminderState = Pick<Meeting, "id" | "title" | "scheduled_at">;

// A live meeting always desires its one reminder, due lead-minutes before the
// meeting (the caller resolves the CURRENT app_users.reminder_lead_minutes —
// "affects future reminders only" stays literal). Deletion goes through
// planMeetingReminderClear, so no status logic is needed here.
export function planMeetingReminders(
  meeting: MeetingReminderState,
  leadMinutes: number,
): ReminderPlan {
  const messages = buildMeetingReminderMessages(meeting.title);
  return {
    refId: meeting.id,
    desired: [
      {
        kind: REMINDER_KIND.MEETING,
        refId: meeting.id,
        refTable: REMINDER_REF_TABLE.MEETINGS,
        dueAt: meetingReminderDueAt(meeting.scheduled_at, leadMinutes),
        messageEn: messages.messageEn,
        messageAr: messages.messageAr,
      },
    ],
    managedKinds: MANAGED_MEETING_KINDS,
  };
}

// The desire-nothing plan for a meeting about to be hard-deleted.
export function planMeetingReminderClear(meetingId: string): ReminderPlan {
  return { refId: meetingId, desired: [], managedKinds: MANAGED_MEETING_KINDS };
}

// Diff a previous plan (null = "no prior knowledge": create, and edit flows
// that lack the pre-write row) against the next one:
//   - DELETE every managed kind the next state doesn't desire — always emitted,
//     never skipped: deletes are idempotent, can't resurrect anything, and keep
//     the sync self-healing;
//   - UPSERT every desired reminder, EXCEPT when the previous plan desired the
//     identical tuple. That exception is the dismissed-reminder guard:
//     createReminder's upsert re-arms is_done=false, so re-writing an unchanged
//     reminder on an unrelated transition (marking Shot while a dismissed post
//     reminder sits on the deal) would resurrect it. Unchanged ⇒ untouched.
export function diffReminderOps(
  prev: ReminderPlan | null,
  next: ReminderPlan,
): ReminderOp[] {
  const ops: ReminderOp[] = [];

  const desiredKinds = new Set(next.desired.map((reminder) => reminder.kind));
  for (const kind of next.managedKinds) {
    if (!desiredKinds.has(kind)) {
      ops.push({ op: "delete", kind, refId: next.refId });
    }
  }

  for (const reminder of next.desired) {
    const unchanged = prev?.desired.some(
      (previous) =>
        previous.kind === reminder.kind &&
        previous.refId === reminder.refId &&
        previous.refTable === reminder.refTable &&
        previous.dueAt === reminder.dueAt &&
        previous.messageEn === reminder.messageEn &&
        previous.messageAr === reminder.messageAr,
    );
    if (!unchanged) ops.push({ op: "upsert", ...reminder });
  }

  return ops;
}
