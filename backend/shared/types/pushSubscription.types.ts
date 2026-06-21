// Shared web-push types: the canonical push_subscriptions row plus the closed
// notification-slot set. Framework-agnostic (no React, Vite, or Deno imports)
// so the web app's subscribe flow and the future React Native client reuse them
// untouched, and the Phase-B edge sender imports the same row shape. Keep
// NOTIFICATION_SLOT in sync with the `slot` CHECK in 0019_notification_slots_four.sql.

// The four fixed daily sends. All users are in one timezone (Asia/Riyadh), so a
// slot maps to a fixed wall-clock time (noon / 4pm / 6pm / 9pm Riyadh); the value
// also keys the per-day idempotency row in notification_sends, so the four names
// must stay distinct — reusing one would dedupe two sends into one push.
export const NOTIFICATION_SLOT = {
  NOON: "noon",
  AFTERNOON: "afternoon",
  EVENING: "evening",
  NIGHT: "night",
} as const;

export type NotificationSlot =
  (typeof NOTIFICATION_SLOT)[keyof typeof NOTIFICATION_SLOT];

// The canonical shape of a push_subscriptions row. endpoint + the two keys are
// what the Web Push protocol needs to deliver an encrypted push to one device.
export type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: string;
  last_seen_at: string;
};
