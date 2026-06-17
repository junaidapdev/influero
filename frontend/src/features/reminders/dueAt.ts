// Pure due_at derivations for the reminder kinds (React-free, Supabase-free per
// the features/ boundary). Callers supply "now" and "today" so the functions
// stay deterministic and testable.

const MS_PER_MINUTE = 60_000;

// A meeting's reminder fires lead-minutes before the meeting — the user's
// app_users.reminder_lead_minutes at creation/edit time ("affects future
// reminders only" is literal: nothing recomputes when the setting changes).
export function meetingReminderDueAt(
  scheduledAtIso: string,
  leadMinutes: number,
): string {
  return new Date(
    new Date(scheduledAtIso).getTime() - leadMinutes * MS_PER_MINUTE,
  ).toISOString();
}

// "Surface this in Today when it's due": due_at is the target date at the start
// of the viewer's LOCAL day (the todayIsoLocal convention), falling back to now
// when the date is null or already past so the reminder appears immediately.
function dateReminderDueAt(
  targetDate: string | null,
  todayLocal: string,
  nowIso: string,
): string {
  if (!targetDate || targetDate <= todayLocal) return nowIso;
  const [year, month, day] = targetDate.split("-").map(Number);
  return new Date(year, month - 1, day).toISOString();
}

// A deal's shoot/post reminder is DAY-GRANULAR: shoot_date / post_date now carry
// a time, but it's display-only — the reminder still fires at the start of the
// planned day (or now if past). targetIso is the planned timestamptz; we take
// its viewer-LOCAL calendar day and apply the same start-of-local-day-or-now
// rule as the date kinds. Kept import-free (no lib/date) so this stays a pure,
// deterministic feature module; the two kinds differ only by which timestamp +
// message the caller passes.
export function dealDateReminderDueAt(
  targetIso: string | null,
  todayLocal: string,
  nowIso: string,
): string {
  if (!targetIso) return nowIso;
  const planned = new Date(targetIso);
  const month = String(planned.getMonth() + 1).padStart(2, "0");
  const day = String(planned.getDate()).padStart(2, "0");
  const localDay = `${planned.getFullYear()}-${month}-${day}`;
  return dateReminderDueAt(localDay, todayLocal, nowIso);
}

const MS_PER_HOUR = 3_600_000;
// The 24h analytics window (Feature 16B): brands ask for a piece of content's
// Insights 24 hours after it was posted.
const SNAP_ANALYTICS_DELAY_HOURS = 24;

// The Snap-analytics reminder fires 24 hours after the deal was marked posted —
// when the content's 24h Insights window closes and the numbers are worth
// screenshotting.
export function snapAnalyticsReminderDueAt(nowIso: string): string {
  return new Date(
    new Date(nowIso).getTime() + SNAP_ANALYTICS_DELAY_HOURS * MS_PER_HOUR,
  ).toISOString();
}
