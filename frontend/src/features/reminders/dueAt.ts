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

// A deal's shoot/post reminder fires at the EXACT planned time. shoot_date /
// post_date are full timestamptz instants the user enters, so the reminder's
// due_at is that instant verbatim — the dashboard Today panel then shows the
// real time the user set, and a row only reads "Overdue" once that time has
// actually passed. (Previously these were collapsed to day-granular midnight /
// creation-time, which hid the planned time and made a same-day task read
// Overdue the moment it was created.) Normalized to a canonical UTC ISO string.
// Every call site guards on the date being set; the null branch is defensive.
export function dealDateReminderDueAt(targetIso: string | null): string {
  if (!targetIso) return new Date().toISOString();
  return new Date(targetIso).toISOString();
}
