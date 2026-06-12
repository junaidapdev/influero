// /meetings page constants. The two views render the SAME month-scoped query —
// list as a flat day-ordered stack, calendar as the month grid + selected-day
// cards. View values live here so they never appear as literals in components.

export const MEETINGS_VIEW = {
  LIST: "list",
  CALENDAR: "calendar",
} as const;

export type MeetingsView = (typeof MEETINGS_VIEW)[keyof typeof MEETINGS_VIEW];
