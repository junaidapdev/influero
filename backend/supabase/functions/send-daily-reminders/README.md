# send-daily-reminders — deploy & schedule

The four-times-daily web-push job (Phase B of the reminders feature). pg_cron
calls it via pg_net at fixed Riyadh times (noon / 4pm / 6pm / 9pm); it reads
every user's outstanding work (`get_users_with_outstanding`) and pushes a
localized digest to their devices, sending nothing to users with nothing.
Idempotent per `(user, slot, day)` — the four slots (`noon`, `afternoon`,
`evening`, `night`) must stay distinct, or two sends would dedupe into one push.

These steps embed your project ref + secrets, so they live here (run once) rather
than in a committed migration.

## 1. Generate VAPID keys (once)

```bash
npx web-push generate-vapid-keys
```

Use the **same key pair** the frontend uses:

- **Public** → `frontend/.env.local` as `VITE_VAPID_PUBLIC_KEY` **and** the edge
  secret `VAPID_PUBLIC_KEY` below.
- **Private** → the edge secret `VAPID_PRIVATE_KEY` only. **Never** in the frontend.

## 2. Set edge secrets

```bash
supabase secrets set \
  VAPID_PUBLIC_KEY="<base64url public key>" \
  VAPID_PRIVATE_KEY="<base64url private key>" \
  VAPID_SUBJECT="mailto:you@yourdomain.com" \
  CRON_SECRET="<a long random string>"
```

`SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` are injected by
the platform — do not set them.

## 3. Apply migrations & deploy

```bash
supabase db push                         # applies 0015 (tables) + 0016 (RPC + extensions)
supabase functions deploy send-daily-reminders --no-verify-jwt
```

`--no-verify-jwt`: the caller is pg_cron, not a logged-in user. The function
gates itself on the `x-cron-secret` header instead.

If `0016` couldn't create the extensions, enable **pg_cron** and **pg_net** under
Dashboard → Database → Extensions.

## 4. Schedule the four daily sends

pg_cron runs in **UTC**; Riyadh is UTC+3 (no DST). Targets:
noon → 09:00 UTC, 4pm → 13:00 UTC, 6pm → 15:00 UTC, 9pm → 18:00 UTC.

First clear any earlier two-slot jobs so they don't double-fire:

```sql
select cron.unschedule('send-daily-reminders-morning');
select cron.unschedule('send-daily-reminders-evening');
```

Then schedule the four. Each `slot` must match a `NOTIFICATION_SLOT` value:

```sql
select cron.schedule('send-daily-reminders-noon', '0 9 * * *', $$
  select net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-daily-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', '<CRON_SECRET>'),
    body    := jsonb_build_object('slot', 'noon'));$$);

select cron.schedule('send-daily-reminders-afternoon', '0 13 * * *', $$
  select net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-daily-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', '<CRON_SECRET>'),
    body    := jsonb_build_object('slot', 'afternoon'));$$);

select cron.schedule('send-daily-reminders-evening', '0 15 * * *', $$
  select net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-daily-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', '<CRON_SECRET>'),
    body    := jsonb_build_object('slot', 'evening'));$$);

select cron.schedule('send-daily-reminders-night', '0 18 * * *', $$
  select net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-daily-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', '<CRON_SECRET>'),
    body    := jsonb_build_object('slot', 'night'));$$);
```

Inspect / remove:

```sql
select * from cron.job;
select cron.unschedule('send-daily-reminders-noon');
```

If the gateway rejects the call, add `'apikey', '<ANON_KEY>'` to the `headers`
object (the anon key is public).

## 5. Manual test

```bash
curl -i -X POST 'https://<PROJECT_REF>.supabase.co/functions/v1/send-daily-reminders' \
  -H 'Content-Type: application/json' \
  -H 'x-cron-secret: <CRON_SECRET>' \
  -d '{"slot":"noon"}'
```

Expected: `{"ok":true,"data":{"usersNotified":N,"pushesSent":M,"pruned":K}}`, a push
on any device that enabled reminders **and** has outstanding items today, and one
`notification_sends` row per notified user. Re-running the same slot the same day
is a no-op (idempotency). A wrong/missing `x-cron-secret` → 401.
