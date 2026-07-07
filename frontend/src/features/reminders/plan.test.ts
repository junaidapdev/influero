import { describe, expect, it } from "vitest";

import { DEAL_STATUS } from "@shared/types/deal.types";
import { REMINDER_KIND, REMINDER_REF_TABLE } from "@shared/types/reminder.types";

import {
  diffReminderOps,
  planDealReminders,
  planMeetingReminderClear,
  planMeetingReminders,
  type DealReminderState,
} from "./plan";

const DEAL_ID = "deal-1";
const SHOOT_AT = "2026-07-10T15:00:00.000Z";
const POST_AT = "2026-07-12T18:30:00.000Z";

// A pending deal with both lifecycle dates planned and nothing done yet.
function makeDeal(overrides: Partial<DealReminderState> = {}): DealReminderState {
  return {
    id: DEAL_ID,
    title: "Summer launch",
    status: DEAL_STATUS.PENDING,
    shoot_date: SHOOT_AT,
    shot_at: null,
    post_date: POST_AT,
    posted_at: null,
    ...overrides,
  };
}

function desiredKinds(deal: DealReminderState): string[] {
  return planDealReminders(deal).desired.map((reminder) => reminder.kind);
}

describe("planDealReminders", () => {
  it("desires shoot + post for a pending deal with both dates", () => {
    expect(desiredKinds(makeDeal())).toEqual([
      REMINDER_KIND.SHOOT,
      REMINDER_KIND.POST,
    ]);
  });

  it("drops the shoot reminder once the deal is shot", () => {
    expect(desiredKinds(makeDeal({ shot_at: "2026-07-10T16:00:00.000Z", status: DEAL_STATUS.SHOT }))).toEqual([
      REMINDER_KIND.POST,
    ]);
  });

  it("desires nothing once the deal is posted", () => {
    expect(
      desiredKinds(
        makeDeal({
          shot_at: "2026-07-10T16:00:00.000Z",
          posted_at: "2026-07-12T19:00:00.000Z",
          status: DEAL_STATUS.POSTED,
        }),
      ),
    ).toEqual([]);
  });

  it("desires nothing when no dates are planned", () => {
    expect(desiredKinds(makeDeal({ shoot_date: null, post_date: null }))).toEqual([]);
  });

  it.each([DEAL_STATUS.PAID, DEAL_STATUS.CANCELLED])(
    "desires nothing for a terminal (%s) deal even with dates set",
    (status) => {
      expect(desiredKinds(makeDeal({ status }))).toEqual([]);
    },
  );

  it("re-desires the shoot reminder when Shot is unticked", () => {
    // Untick path: shot_at cleared while the planned date remains.
    expect(desiredKinds(makeDeal({ shot_at: null }))).toContain(REMINDER_KIND.SHOOT);
  });

  it("anchors due_at to the planned instants and carries bilingual messages", () => {
    const plan = planDealReminders(makeDeal());
    expect(plan.desired).toEqual([
      expect.objectContaining({
        kind: REMINDER_KIND.SHOOT,
        refId: DEAL_ID,
        refTable: REMINDER_REF_TABLE.AD_DEALS,
        dueAt: SHOOT_AT,
        messageEn: "Shoot — Summer launch",
        messageAr: "تصوير — Summer launch",
      }),
      expect.objectContaining({
        kind: REMINDER_KIND.POST,
        dueAt: POST_AT,
        messageEn: "Post — Summer launch",
        messageAr: "نشر — Summer launch",
      }),
    ]);
  });
});

describe("diffReminderOps — deal transitions", () => {
  it("create: upserts both reminders and drains the legacy deliverable kind", () => {
    const ops = diffReminderOps(null, planDealReminders(makeDeal()));
    expect(ops).toEqual([
      { op: "delete", kind: REMINDER_KIND.DELIVERABLE, refId: DEAL_ID },
      expect.objectContaining({ op: "upsert", kind: REMINDER_KIND.SHOOT }),
      expect.objectContaining({ op: "upsert", kind: REMINDER_KIND.POST }),
    ]);
  });

  it("mark shot: clears the shoot reminder without touching the unchanged post reminder", () => {
    const prev = makeDeal();
    const next = makeDeal({ shot_at: "2026-07-10T16:00:00.000Z", status: DEAL_STATUS.SHOT });
    const ops = diffReminderOps(planDealReminders(prev), planDealReminders(next));
    // No post upsert: re-writing it would reset is_done and resurrect a
    // dismissed reminder — the guard this diff exists for.
    expect(ops).toEqual([
      { op: "delete", kind: REMINDER_KIND.SHOOT, refId: DEAL_ID },
      { op: "delete", kind: REMINDER_KIND.DELIVERABLE, refId: DEAL_ID },
    ]);
  });

  it("mark posted (back-stamping shot): clears every managed kind", () => {
    const prev = makeDeal();
    const next = makeDeal({
      shot_at: "2026-07-12T19:00:00.000Z",
      posted_at: "2026-07-12T19:00:00.000Z",
      status: DEAL_STATUS.POSTED,
    });
    const ops = diffReminderOps(planDealReminders(prev), planDealReminders(next));
    expect(ops).toEqual([
      { op: "delete", kind: REMINDER_KIND.SHOOT, refId: DEAL_ID },
      { op: "delete", kind: REMINDER_KIND.POST, refId: DEAL_ID },
      { op: "delete", kind: REMINDER_KIND.DELIVERABLE, refId: DEAL_ID },
    ]);
  });

  it("untick posted: re-arms the post reminder for the planned date", () => {
    const prev = makeDeal({
      shot_at: "2026-07-12T19:00:00.000Z",
      posted_at: "2026-07-12T19:00:00.000Z",
      status: DEAL_STATUS.POSTED,
    });
    const next = makeDeal({ shot_at: "2026-07-12T19:00:00.000Z", status: DEAL_STATUS.SHOT });
    const ops = diffReminderOps(planDealReminders(prev), planDealReminders(next));
    expect(ops).toEqual([
      { op: "delete", kind: REMINDER_KIND.SHOOT, refId: DEAL_ID },
      { op: "delete", kind: REMINDER_KIND.DELIVERABLE, refId: DEAL_ID },
      expect.objectContaining({ op: "upsert", kind: REMINDER_KIND.POST, dueAt: POST_AT }),
    ]);
  });

  it("date edit: moves the changed reminder even when previously desired", () => {
    const moved = "2026-07-20T18:30:00.000Z";
    const ops = diffReminderOps(
      planDealReminders(makeDeal()),
      planDealReminders(makeDeal({ post_date: moved })),
    );
    expect(ops).toEqual([
      { op: "delete", kind: REMINDER_KIND.DELIVERABLE, refId: DEAL_ID },
      expect.objectContaining({ op: "upsert", kind: REMINDER_KIND.POST, dueAt: moved }),
    ]);
  });

  it("cancel: planning the intended terminal state clears every managed kind", () => {
    const ops = diffReminderOps(
      null,
      planDealReminders(makeDeal({ status: DEAL_STATUS.CANCELLED })),
    );
    expect(ops).toEqual([
      { op: "delete", kind: REMINDER_KIND.SHOOT, refId: DEAL_ID },
      { op: "delete", kind: REMINDER_KIND.POST, refId: DEAL_ID },
      { op: "delete", kind: REMINDER_KIND.DELIVERABLE, refId: DEAL_ID },
    ]);
  });

  it("cancel rollback: diffing back to the live state re-arms both reminders", () => {
    const live = planDealReminders(makeDeal());
    const cancelled = planDealReminders(makeDeal({ status: DEAL_STATUS.CANCELLED }));
    const ops = diffReminderOps(cancelled, live);
    expect(ops).toEqual([
      { op: "delete", kind: REMINDER_KIND.DELIVERABLE, refId: DEAL_ID },
      expect.objectContaining({ op: "upsert", kind: REMINDER_KIND.SHOOT }),
      expect.objectContaining({ op: "upsert", kind: REMINDER_KIND.POST }),
    ]);
  });
});

describe("meeting plans", () => {
  const MEETING = {
    id: "meeting-1",
    title: "Kickoff call",
    scheduled_at: "2026-07-15T09:00:00.000Z",
  };

  it("desires one reminder due lead-minutes before the meeting", () => {
    const plan = planMeetingReminders(MEETING, 60);
    expect(plan.desired).toEqual([
      expect.objectContaining({
        kind: REMINDER_KIND.MEETING,
        refId: MEETING.id,
        refTable: REMINDER_REF_TABLE.MEETINGS,
        dueAt: "2026-07-15T08:00:00.000Z",
        messageEn: "Meeting — Kickoff call",
        messageAr: "اجتماع — Kickoff call",
      }),
    ]);
  });

  it("create + move: upserts on prev=null, upserts again only when the time changes", () => {
    const created = planMeetingReminders(MEETING, 60);
    expect(diffReminderOps(null, created)).toEqual([
      expect.objectContaining({ op: "upsert", kind: REMINDER_KIND.MEETING }),
    ]);
    // Unchanged edit → untouched (a dismissed reminder stays dismissed).
    expect(diffReminderOps(created, planMeetingReminders(MEETING, 60))).toEqual([]);
    // Lead-minutes or schedule change → the reminder moves.
    expect(diffReminderOps(created, planMeetingReminders(MEETING, 30))).toEqual([
      expect.objectContaining({ op: "upsert", dueAt: "2026-07-15T08:30:00.000Z" }),
    ]);
  });

  it("clear: the desire-nothing plan deletes the meeting reminder", () => {
    expect(diffReminderOps(null, planMeetingReminderClear(MEETING.id))).toEqual([
      { op: "delete", kind: REMINDER_KIND.MEETING, refId: MEETING.id },
    ]);
  });
});
