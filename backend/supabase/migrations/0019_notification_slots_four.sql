-- Move the daily web-push job from two sends/day to four.
--
-- The send job (send-daily-reminders) keys idempotency on
-- (user_id, slot, sent_on) and validates `slot` against this CHECK + the
-- NOTIFICATION_SLOT enum. So adding sends means adding slot values — scheduling
-- more cron jobs on the existing two slots would just no-op (one push per slot
-- per day). The four active slots map to Riyadh noon / 4pm / 6pm / 9pm.
--
-- Keep this list in sync with NOTIFICATION_SLOT in
-- backend/shared/types/pushSubscription.types.ts and the zod enum in
-- send-daily-reminders/index.ts.

alter table public.notification_sends
  drop constraint if exists notification_sends_slot_check;

-- NOT VALID: enforce the new set on inserts/updates only. Historical send-log
-- rows written under the old 'morning'/'evening' slots stay valid as-is — we
-- don't rewrite the observability log.
alter table public.notification_sends
  add constraint notification_sends_slot_check
  check (slot in ('noon', 'afternoon', 'evening', 'night')) not valid;
