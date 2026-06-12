import type { Meeting } from "@shared/types/meeting.types";
import { REMINDER_KIND, type Reminder } from "@shared/types/reminder.types";

// Pure merge/dedupe/sort for the dashboard Today panel (React-free,
// Supabase-free per the features/ boundary). The hook fetches the two row
// sets (meetings in the 24h window, open reminders due by the window's end);
// this module turns them into one chronological list.

// A Today row is either the meeting itself or a reminder. Discriminated on
// `type` so the panel can render the right card (meetings link to /meetings;
// reminders carry the bilingual message and a dismiss action).
export type TodayItem =
  | { type: "meeting"; dueAt: string; meeting: Meeting }
  | { type: "reminder"; dueAt: string; reminder: Reminder };

// One chronological list, soonest first. Dedupe rule: a kind='meeting'
// reminder whose meeting is ALREADY in the window is dropped — otherwise
// every near meeting appears twice (once as itself at scheduled_at, once as
// its lead-time reminder). A meeting reminder whose meeting lies beyond the
// window survives: it's the only signal the user gets today.
export function mergeTodayItems(
  meetings: Meeting[],
  reminders: Reminder[],
): TodayItem[] {
  const meetingIds = new Set(meetings.map((meeting) => meeting.id));

  const items: TodayItem[] = [
    ...meetings.map(
      (meeting): TodayItem => ({
        type: "meeting",
        dueAt: meeting.scheduled_at,
        meeting,
      }),
    ),
    ...reminders
      .filter(
        (reminder) =>
          !(
            reminder.kind === REMINDER_KIND.MEETING &&
            reminder.ref_id !== null &&
            meetingIds.has(reminder.ref_id)
          ),
      )
      .map(
        (reminder): TodayItem => ({
          type: "reminder",
          dueAt: reminder.due_at,
          reminder,
        }),
      ),
  ];

  return items.sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}

// Whether a Today row is already past due (drives the error-toned stripe for
// overdue payment reminders and the "Overdue" time label). ISO timestamps
// compare correctly lexicographically only within one format, so compare as
// dates.
export function isTodayItemOverdue(item: TodayItem, nowIso: string): boolean {
  return new Date(item.dueAt).getTime() < new Date(nowIso).getTime();
}
