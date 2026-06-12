// Shared meeting types — the canonical shape of a meetings row, its status
// set, and the attendees jsonb line shape. Framework-agnostic (no React, Vite,
// or Deno imports) so the web app and the future React Native app reuse them
// untouched. Keep MEETING_STATUS in sync with the CHECK constraint in
// 0008_meetings_reminders.sql.
//
// 'done' is legal in the DB CHECK but never written in v1 — nothing reads it
// yet (the Today panel cares about upcoming reminders, and a past meeting is
// visually past). Cancel is the terminal action, mirroring deals.

export const MEETING_STATUS = {
  UPCOMING: "upcoming",
  DONE: "done",
  CANCELLED: "cancelled",
} as const;

export type MeetingStatus = (typeof MEETING_STATUS)[keyof typeof MEETING_STATUS];

// One line of the attendees jsonb array — name required, contact free-form
// (phone, email, or handle; only stored when non-empty). Shape is enforced by
// meetingSchema at the write layer.
export type MeetingAttendee = {
  name: string;
  contact?: string;
};

// The canonical shape of a meetings row.
export type Meeting = {
  id: string;
  user_id: string;
  brand_id: string | null;
  deal_id: string | null;
  title: string;
  scheduled_at: string;
  location_or_link: string | null;
  attendees: MeetingAttendee[];
  notes: string | null;
  status: MeetingStatus;
  created_at: string;
};
