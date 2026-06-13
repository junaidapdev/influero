// Shared reminder types — the canonical shape of a reminders row plus the
// closed kind / channel / ref_table sets. Framework-agnostic (no React, Vite,
// or Deno imports) so the web app and the future React Native app reuse them
// untouched. Keep REMINDER_KIND and REMINDER_CHANNEL in sync with the CHECK
// constraints in 0008_meetings_reminders.sql.
//
// v1 only ever writes channel 'in_app'; 'whatsapp' + is_sent_at exist so v2
// delivery is purely additive. 'custom' is in the closed set but has no writer.
// 'shoot' / 'post' are the deal-lifecycle date reminders (due shoot_date /
// post_date); 'deliverable' is the +24h Snap-analytics nudge, armed when a deal
// is marked Posted. All three can coexist on one deal — the reminders unique
// index keys on (user_id, kind, ref_id), so distinct kinds never collide.

export const REMINDER_KIND = {
  MEETING: "meeting",
  PAYMENT: "payment",
  DELIVERABLE: "deliverable",
  CUSTOM: "custom",
  SHOOT: "shoot",
  POST: "post",
} as const;

export type ReminderKind = (typeof REMINDER_KIND)[keyof typeof REMINDER_KIND];

export const REMINDER_CHANNEL = {
  IN_APP: "in_app",
  WHATSAPP: "whatsapp",
} as const;

export type ReminderChannel =
  (typeof REMINDER_CHANNEL)[keyof typeof REMINDER_CHANNEL];

// The tables a reminder may point back at via ref_id/ref_table.
export const REMINDER_REF_TABLE = {
  MEETINGS: "meetings",
  PAYMENTS: "payments",
  AD_DEALS: "ad_deals",
} as const;

export type ReminderRefTable =
  (typeof REMINDER_REF_TABLE)[keyof typeof REMINDER_REF_TABLE];

// The canonical shape of a reminders row.
export type Reminder = {
  id: string;
  user_id: string;
  kind: ReminderKind;
  ref_id: string | null;
  ref_table: string | null;
  due_at: string;
  message_en: string;
  message_ar: string;
  channel: ReminderChannel;
  is_done: boolean;
  is_sent_at: string | null;
  created_at: string;
};
