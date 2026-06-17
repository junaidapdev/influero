# Memory — Influero post-v1: Web-Push Daily Reminders (PWA) — BUILT + LIVE-CONFIRMED

Last updated: 2026-06-17

## What was built / done this session
A full **web-push twice-daily reminder system** (PWA): `/architect`-planned → developer-approved → built in two phases → static-verified → **live-confirmed on real devices (macOS Chrome + iPhone iOS 18.7)** → committed + pushed to `main`. It's a notification *delivery* layer distinct from the in-app `reminders` table.
- **Phase A (subscribe + install):** migration `0015_push_notifications.sql` (`push_subscriptions` + `notification_sends`, both standard 4-policy own-row RLS). Hand-rolled PWA: `frontend/public/manifest.webmanifest` + minimal `sw.js` (push + notificationclick→/dashboard, NO precache) + placeholder icons (`frontend/scripts/gen-icons.cjs`). `lib/pushClient.ts`; hooks `usePushNotifications` + `useInstallPrompt`; `components/settings/{NotificationsSection,InstallAppButton}.tsx` mounted in `/settings`; optional `VITE_VAPID_PUBLIC_KEY` in `config/env.ts`; SW registered in `main.tsx`; i18n `settings.notifications.*` (en+ar). Shared `backend/shared/types/pushSubscription.types.ts`.
- **Phase B (scheduled send):** migration `0016_daily_reminders_rpc.sql` (`get_users_with_outstanding()` — security invoker, granted to `service_role` ONLY, computes "today" in Asia/Riyadh; + enables pg_cron/pg_net). `backend/config/env.ts` gains lazy `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT`/`CRON_SECRET`. `_shared/webpush.ts` (uses `jsr:@negrel/webpush@0.5.0`; base64→JWK conversion; `getApplicationServer`/`sendPush`/`isSubscriptionGone`). Edge fn `send-daily-reminders/index.ts` (CRON_SECRET header gate; service-role; per-user idempotent claim; bilingual `digest.ts`; prune gone subs). Ops `README.md`.
- **Commits on `main`:** `f814b21` (feature) → `4f174c5` (VAPID decoder hardening + tracker). **Local-uncommitted at session end:** README time fix (→10 AM), tracker park note, and this memory file — offered to commit, developer hadn't said yes yet.

## Decisions made (still in force)
- **Web push now; email fallback later** (designed into the same `send-daily-reminders` loop beside `sendPush`). The WhatsApp-to-BRAND payment reminder is a SEPARATE parked feature (outbound to the client) — NOT this.
- **Library = `@negrel/webpush`** (Deno/Web-Crypto-native) over `npm:web-push` (Node stack, unreliable on the edge). VAPID keys kept as the base64url pair from `npx web-push generate-vapid-keys`; converted base64→JWK in `_shared/webpush.ts`.
- **Scheduling = fixed 2 cron jobs at 10:00 & 18:00 Riyadh** (07:00 & 15:00 UTC). Per-user configurable times PARKED (backlog).
- Idempotency via `notification_sends (user_id, slot, sent_on)` unique + claim-first.
- The cron job runs as **service-role** (documented system/cross-user exception); the RPC is granted to service_role only. No `auth.uid()` in it.
- Per send = "today's outstanding" (meetings + shoot/post due + payment awareness), same payload both slots; nothing sent to users with nothing.

## Problems solved (don't re-debug — the live-gate gauntlet; all ENVIRONMENT, not logic)
1. A VAPID key secret carried a stray char → `atob InvalidCharacterError`. Fixed by (a) hardening `base64UrlToBytes` to strip non-base64url chars (committed `4f174c5`) AND (b) regenerating keys cleanly by capturing into shell vars (never hand-paste).
2. `VAPID_SUBJECT` wasn't set — it's a required lazy getter, throws right after the keys. Must be a `mailto:`.
3. `supabase` CLI must run from **`backend/`** (the only `supabase/config.toml`), NOT the repo root — else deploy/secrets silently target nothing.
4. **macOS suppresses Chrome notifications at the OS level** even when web `Notification.permission` is `granted` → enable System Settings → Notifications → Chrome. (Chrome DevTools → Application → Service Workers → **Push** button = fastest local display test.)
5. **iOS web push requires the PWA installed from Safari** (Share → Add to Home Screen). Chrome's "Add to Home Screen" on iOS yields a non-push-capable shortcut (`Notification`/`showNotification` are `undefined` there).
6. A user only gets a push if **their own** account has outstanding items that day — the long final red herring: devices subscribed under one account while test data sat under another (`pushesSent:0`, no log error).

## Current state
- Feature **done + live-confirmed** — a real push delivered "Today's tasks · 1 meeting" to Mac Chrome AND iPhone.
- **Cron NOT yet scheduled** — developer runs the 10 AM/6 PM `cron.schedule(...)` SQL from the editor (in the function README; consolidated SQL also given in chat). Until then it fires only on a manual curl.
- Test meetings titled `'Push test'` / `'Test reminder meeting'` may still exist (cleanup SQL provided, scoped to the junaidap.dev account).
- `CRON_SECRET` is a **throwaway test value — rotate before real use** (value intentionally not stored here; no VAPID keys/secrets in this file).

## Next session starts with
- Confirm cron is scheduled + firing at 10 AM/6 PM Riyadh (`select jobname, schedule, active from cron.job;`); run the schedule SQL if not yet done.
- Run the test-data cleanup if not done; rotate `CRON_SECRET`.
- (Optional) commit the local doc changes (README time + tracker park + this memory).
- **Backlog (needs `/architect`): per-user reminder times in Settings** — swap the 2 fixed crons for a 15–30 min heartbeat + a `get_users_due_now()` RPC + `reminder_morning_at`/`reminder_evening_at` on `app_users` + two Settings time pickers. Cost negligible (~1,440 invocations/mo at 30-min; scales with ticks not users; push is free). Full sketch in `progress-tracker.md`.
- Email fallback channel is the other documented next phase.

## Open questions / parked
- **Per-user reminder times** — parked, build later (architecture sketched in the tracker).
- WhatsApp-to-brand payment reminder — separate future feature.
- Whether to commit `seed_demo_data.sql` (still intentionally local-only, pre-existing).
