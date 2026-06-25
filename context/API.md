# Inflero API Reference

**The backend Inflero owns.** This documents the server-side API surface of Inflero — the Supabase **Edge Functions** (the only "API we own"), the **data layer** (PostgREST + RLS) the frontend reads/writes directly, and the **storage** buckets. It is the contract between the React SPA (and a future React Native client) and the backend. 🎯

- **Base URL (Edge Functions):** `https://uvueoypezcjtyazzibbu.supabase.co/functions/v1`
- **Base URL (Data / PostgREST + RPC):** `https://uvueoypezcjtyazzibbu.supabase.co/rest/v1`
- **Auth:** Supabase JWT (per logged-in user) for user-facing endpoints; HMAC signature for the LemonSqueezy webhook; a shared secret for the cron job.
- **Transport:** JSON over HTTPS. Every edge function is `POST` only and answers CORS preflight (`OPTIONS`).

> Unlike a public product API (e.g. GenreX), Inflero's API is **not opened to third-party developers**. There is no API-key/secret signature scheme for app users — identity is the Supabase session JWT, and the real security boundary is Postgres **Row-Level Security** (`user_id = auth.uid()`), enforced on every table. The three secret-gated endpoints below (webhook, cron) are server-to-server only.

---

## Authentication

There are **three** distinct auth modes. Each endpoint below states which one it uses.

### 1. User JWT (most endpoints)

User-facing edge functions and all data-layer calls run as the **logged-in user**. The Supabase client attaches the session JWT automatically:

```js
// frontend/src/lib/supabase.ts — the single browser client
import { supabase } from "@/lib/supabase";

// Invoking an edge function — the Authorization: Bearer <jwt> header is added for you
const { data, error } = await supabase.functions.invoke("mark-payment-received", {
  body: { paymentId: "8f1c…-uuid" },
});
```

Calling raw (e.g. from a non-Supabase client), you set the header yourself:

```
POST https://uvueoypezcjtyazzibbu.supabase.co/functions/v1/mark-payment-received
Authorization: Bearer <SUPABASE_USER_JWT>
apikey: <SUPABASE_ANON_KEY>
Content-Type: application/json

{ "paymentId": "8f1c…-uuid" }
```

The edge function reads the JWT, creates a per-request Supabase client **as the caller**, and every query runs under that identity — so RLS + `auth.uid()` enforce ownership end to end. A missing/invalid token returns `401 UNAUTHENTICATED`.

### 2. HMAC signature (`lemonsqueezy-webhook` only)

LemonSqueezy signs each webhook with a shared secret. The function reads the **raw** body and verifies `X-Signature` = `HMAC-SHA256(rawBody, WEBHOOK_SECRET)` with a constant-time compare. A mismatch returns `401`. This endpoint is inbound-only (called by LemonSqueezy, never by our client) and is deployed `--no-verify-jwt`.

### 3. Shared secret (`send-daily-reminders` only)

The cron job carries an `x-cron-secret` header that must equal the server's `CRON_SECRET`. Invoked by `pg_cron` via `pg_net`, never by a user; deployed `--no-verify-jwt`.

---

## Response Envelope

**Every edge function** returns the same envelope — never raw data.

**Success:**

```json
{ "ok": true, "data": { /* endpoint-specific payload */ } }
```

**Failure:**

```json
{ "ok": false, "error": { "code": "VALIDATION", "message": "Human-readable detail" } }
```

### HTTP status codes

| Code | Meaning |
| --- | --- |
| `200` | Success |
| `400` | Bad request — invalid JSON or failed input validation |
| `401` | Unauthenticated — missing/invalid JWT, bad webhook signature, or bad cron secret |
| `403` | Forbidden — Pro plan required |
| `404` | Not found — wrong method, missing row, or not owned by the caller |
| `409` | Conflict — already in the target state |
| `429` | Too many requests — rate limit reached |
| `500` | Internal error — unexpected failure |

### Error codes (`error.code`)

`VALIDATION` · `UNAUTHENTICATED` · `FORBIDDEN` · `NOT_FOUND` · `CONFLICT` · `RATE_LIMITED` · `UPGRADE_REQUIRED` · `INTERNAL`

> **No cross-tenant probing:** "missing" and "not owned by you" are deliberately indistinguishable — both return `404`/`NOT_FOUND`. RLS scopes the lookup to the caller, so you cannot tell whether another user's row exists.

---

# Edge Functions

## 1. Mark Payment Received

The canonical **atomic** write. Marks one payment received and — if it was the deal's last outstanding installment — flips the deal to `paid`, in **one transaction** (both happen, or neither).

```
POST /functions/v1/mark-payment-received
```

**Auth:** User JWT.

### Request body

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `paymentId` | string (uuid) | ✅ | The payment to mark received. Ownership is enforced by the RPC (`user_id = auth.uid()`) — never trust this id to imply ownership. |

```json
{ "paymentId": "8f1c2d3e-4a5b-6c7d-8e9f-0a1b2c3d4e5f" }
```

### Response — `data`

| Field | Type | Notes |
| --- | --- | --- |
| `payment_id` | string | The payment that was updated |
| `deal_id` | string | The deal it belongs to |
| `amount_sar` | number | The payment amount |
| `deal_title` | string | For the activity-feed summary |
| `deal_paid` | boolean | `true` if this installment completed the deal (deal flipped to `paid`) |

```json
{
  "ok": true,
  "data": {
    "payment_id": "8f1c…",
    "deal_id": "2b9a…",
    "amount_sar": 5000,
    "deal_title": "Summer menu launch",
    "deal_paid": true
  }
}
```

### Errors

| HTTP | code | When |
| --- | --- | --- |
| 401 | `UNAUTHENTICATED` | Missing JWT |
| 400 | `VALIDATION` | Invalid JSON / `paymentId` not a uuid |
| 404 | `NOT_FOUND` | Payment missing, not owned, or already received |
| 500 | `INTERNAL` | Unexpected error |

> Side effect: writes `payment_received` to `activity_log`, plus `deal_paid` when `deal_paid` is `true`. Logging is best-effort and never fails the request.

---

## 2. Extract Snap Report  · *Pro*

Runs **GPT-4o vision** over an uploaded Snap Insights screenshot and writes the extracted metrics back to the row. The result also reaches the UI via Supabase **realtime** (no polling). **Two report types** (`post` / `monthly`) are selected by the *row's* `report_type` — never by the client.

```
POST /functions/v1/extract-snap-report
```

**Auth:** User JWT. **Pro plan required.**

**Prerequisite:** the client first uploads the image to `snap-uploads/{user_id}/…` and `INSERT`s a `snap_reports` row with `extraction_status='pending'`. This call then extracts that row.

### Request body

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `snapReportId` | string (uuid) | ✅ | The pending `snap_reports` row to extract. **The storage path is read from the row, never sent by the client** (no SSRF/IDOR surface). |

```json
{ "snapReportId": "a1b2c3d4-…-uuid" }
```

### Guards (in order of cost)

1. **Pro check** → `403 UPGRADE_REQUIRED` if not Pro (rejected before any storage download or OpenAI spend).
2. **Row exists** (and owned) → else `404`.
3. **Still `pending`** → else `409` (a second invoke can't double-spend or clobber a manual edit).
4. **Per-user hourly rate limit** → else `429` (paid API; cost + DoS guard).
5. Only then: download (under the caller's JWT, private-bucket RLS applies) → OpenAI → write.

### Response — `data`

| Field | Type | Notes |
| --- | --- | --- |
| `snapReportId` | string | Echoed |
| `extraction` | object | The fields written to the row (varies by type) |

**`post` type** `extraction`: `views`, `reach`, `story_views`, `screenshot_count`, `swipe_ups`, `report_date` (snap date, `YYYY-MM-DD`, or `null`).
**`monthly` type** `extraction`: `views`, `reach`, `story_views`, `profile_views`, `new_followers`, `watch_time_minutes`, `report_date` (first of the covered month, or `null`).

Any metric not visible in the screenshot is returned as `null` (the model never guesses). The row's `extraction_status` becomes `extracted`; the user can edit any field afterward → `manual`.

```json
{
  "ok": true,
  "data": {
    "snapReportId": "a1b2…",
    "extraction": {
      "views": 124300, "reach": 98100, "story_views": 110200,
      "screenshot_count": 84, "swipe_ups": 1290, "report_date": "2026-06-18"
    }
  }
}
```

### Errors

| HTTP | code | When |
| --- | --- | --- |
| 401 | `UNAUTHENTICATED` | Missing JWT |
| 400 | `VALIDATION` | Invalid JSON / `snapReportId` not a uuid |
| 403 | `UPGRADE_REQUIRED` | Caller is not Pro |
| 404 | `NOT_FOUND` | Row missing or not owned |
| 409 | `CONFLICT` | Row not `pending` (already extracted/failed/manual) |
| 429 | `RATE_LIMITED` | Hourly extraction cap reached |
| 500 | `INTERNAL` | Upload unreadable, OpenAI failure, or unparseable extraction. The row is flipped to `failed` so the UI offers manual entry. |

> **Prompt-injection defense:** text inside the screenshot is untrusted *data* the model transcribes, never instructions. The fixed structured-output JSON schema is the only contract the model can satisfy, and the result is zod-validated again before any write.

---

## 3. Create Checkout

Mints a LemonSqueezy **hosted checkout** for the Pro plan for the calling user, embedding their `user_id` as custom data so the webhook can map the resulting subscription back to them.

```
POST /functions/v1/create-checkout
```

**Auth:** User JWT.

### Request body

*None.* The plan is the single Pro variant. (Send `{}` or an empty body.)

### Response — `data`

| Field | Type | Notes |
| --- | --- | --- |
| `url` | string | The LemonSqueezy hosted-checkout URL. The frontend redirects the browser to it. On success LS redirects back to `${APP_URL}/settings?checkout=success`. |

```json
{ "ok": true, "data": { "url": "https://inflero.lemonsqueezy.com/checkout/…" } }
```

### Errors

| HTTP | code | When |
| --- | --- | --- |
| 401 | `UNAUTHENTICATED` | Missing/invalid JWT |
| 400 | `VALIDATION` | Account has no email |
| 409 | `CONFLICT` | Caller is already Pro (nothing to buy) |
| 500 | `INTERNAL` | Could not start checkout (LS detail logged server-side, not leaked) |

---

## 4. Customer Portal

Returns the LemonSqueezy hosted **customer-portal** URL for the caller's subscription (cancel / update card / view invoices). The signed URL is fetched fresh on demand (they expire ~24h) and **never stored**.

```
POST /functions/v1/customer-portal
```

**Auth:** User JWT.

### Request body

*None.*

### Response — `data`

| Field | Type | Notes |
| --- | --- | --- |
| `url` | string | The fresh LS customer-portal URL |

```json
{ "ok": true, "data": { "url": "https://inflero.lemonsqueezy.com/billing?…" } }
```

### Errors

| HTTP | code | When |
| --- | --- | --- |
| 401 | `UNAUTHENTICATED` | Missing JWT |
| 404 | `NOT_FOUND` | No real LS subscription to manage (free users, or **grandfathered comp** accounts whose id starts `comp:`), or LS returned no portal URL |
| 500 | `INTERNAL` | Unexpected error |

---

## 5. LemonSqueezy Webhook  · *server-to-server*

The **source of truth** for entitlement. LemonSqueezy posts subscription-lifecycle events here; the function verifies them and upserts the `subscriptions` row. **Not called by our client.** Deployed `--no-verify-jwt`, runs as service-role.

```
POST /functions/v1/lemonsqueezy-webhook
```

**Auth:** HMAC `X-Signature` (see Authentication §2). Invalid signature → `401`.

### Request body

The LemonSqueezy JSON:API webhook payload. Fields read: `meta.event_name`, `meta.custom_data.user_id`, `data.id`, and `data.attributes.{store_id, customer_id, order_id, variant_id, status, renews_at, ends_at, trial_ends_at, card_brand, card_last_four, test_mode, updated_at}`.

### Processing rules

- **Filtered to our account:** an event is ignored unless `store_id` = our store **and** `variant_id` = the Pro variant **and** `test_mode` matches the environment (the LS account is the reused "Narrate AI" account — legacy products share the store and must be filtered out).
- **Handled events:** `subscription_created/updated/cancelled/resumed/expired/paused/unpaused`. Invoice events (`subscription_payment_*`) and everything else are acknowledged without touching the row.
- **User resolution:** `meta.custom_data.user_id` on the first event; later events match by LS subscription id, then by LS customer id.
- **Newest-LS-write wins:** the `updated_at` column stores the LS event's `updated_at`, so retried/out-of-order deliveries that are equal-or-older are skipped — except a grandfather `comp:` row, which any real event replaces.

### Responses

| HTTP | Body | When |
| --- | --- | --- |
| 200 | `{ ok: true, data: { event, status } }` | Handled (row upserted) |
| 200 | `{ ok: true, data: { ignored: "<reason>" } }` | Deliberately ignored (`foreign`, `stale`, `incomplete`, `unmatched-user`, or the event name). **Always 2xx so LS doesn't retry.** |
| 401 | `{ ok: false, error: { code: "UNAUTHENTICATED" } }` | Bad signature |
| 400 | `{ ok: false, error: { code: "VALIDATION" } }` | Unparseable body |
| 500 | `{ ok: false, error: { code: "INTERNAL" } }` | DB upsert failed — returned **on purpose** so LS retries |

---

## 6. Send Daily Reminders  · *server-to-server, Pro*

The twice-daily web-push digest job. Reads every user's outstanding work and pushes a localized digest to their devices. **Not called by our client** — invoked by `pg_cron`. Deployed `--no-verify-jwt`, runs as service-role.

```
POST /functions/v1/send-daily-reminders
```

**Auth:** `x-cron-secret` header == `CRON_SECRET` (see Authentication §3). Otherwise `401`.

### Request body

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `slot` | enum `"morning"` \| `"evening"` | ✅ | Which daily slot is firing. Idempotent per `(user, slot, day)` — a retry the same day is skipped. |

```json
{ "slot": "morning" }
```

### Response — `data`

| Field | Type | Notes |
| --- | --- | --- |
| `usersNotified` | number | Pro users a digest was pushed to |
| `pushesSent` | number | Individual device pushes sent |
| `pruned` | number | Dead push subscriptions removed (relay reported `410`/`404`) |

```json
{ "ok": true, "data": { "usersNotified": 12, "pushesSent": 18, "pruned": 1 } }
```

> The digest is a **Pro** feature — non-Pro users are skipped (`is_pro` per user). One user's failure never sinks the batch.

---

# Data Layer (PostgREST + RLS)

Plain CRUD does **not** go through an edge function. The frontend talks to Supabase PostgREST directly via `supabase-js`, and **RLS is the security boundary** — every user-owned row is gated by `user_id = auth.uid()` on select/insert/update/delete. Reminders are created in application code; deal status is derived in the status module.

```js
// Example: list the caller's brands (RLS scopes the result to them automatically)
const { data } = await supabase.from("brands").select("*").order("name_en");
```

| Table | Client access | Notes |
| --- | --- | --- |
| `app_users` | select/insert/update own | Profile + settings; idempotent upsert on first login |
| `brands` | full CRUD own | Bilingual `name_ar`/`name_en` |
| `ad_deals` | full CRUD own | Insert blocked past the free deal limit by the `enforce_deal_limit` trigger → raises `DEAL_LIMIT` (client maps to the upgrade modal) |
| `payments` | select/insert/update own | Mark-received goes through the edge function (atomic), not a direct update |
| `meetings` | full CRUD own | Creating one also writes a `reminders` row in code |
| `reminders` | select/update own | `is_done` toggled from the Today panel |
| `snap_reports` | select/insert/update own | Extraction goes through the edge function; manual edits are direct updates → `manual` |
| `activity_log` | select own | Written only by `logActivity` (hooks + edge fns) |
| `subscriptions` | **select own only** | Written **only** by the webhook (service-role). Users can read entitlement, never forge it. |
| `push_subscriptions` | insert/delete own | Web-push device registrations |
| `notification_sends` | — | Service-role only (cron idempotency ledger) |

### Callable RPCs (PostgREST `rpc`)

| RPC | Args | Returns | Notes |
| --- | --- | --- | --- |
| `get_dashboard_stats` | `month_start`, `month_end` | 5 month totals | Caller passes its viewer-local month range |
| `get_monthly_totals` | `window_start`, `window_end` | 12 ordered rows | Invoiced vs collected; shared with the free dashboard sparkline |
| `get_per_brand_report` | — | per-brand all-time rows | Reports page (Pro, UI-gated) |
| `get_my_entitlement` | — | `{ plan, status, is_pro, active_until }` | The frontend's entitlement read; backs `useEntitlement` (+realtime on `subscriptions`) |
| `mark_payment_received` | `payment_id` | result row | Called by the edge function only (atomic transaction) |
| `is_pro` | `p_user_id` | boolean | `SECURITY DEFINER` predicate; server-internal |
| `get_users_with_outstanding` | — | per-user counts | Cron-internal (service-role) |

---

# Storage

| Bucket | Path | Access |
| --- | --- | --- |
| `avatars` | `avatars/{user_id}/avatar.{ext}` | **Public read**, own-path write. Profile images only. |
| `snap-uploads` | `snap-uploads/{user_id}/<file>` | **Private**, own-path only (select/insert/delete). PNG only — PDFs are converted client-side. |

Uploads are validated on the client by **MIME + magic bytes + size cap** before they ever reach a bucket; the buckets only ever store images.

---

# Environment (server-side secrets)

Set via `supabase secrets set` — **never** in the browser bundle.

`OPENAI_API_KEY` · `SNAP_RATE_LIMIT_PER_HOUR` · `SUPABASE_SERVICE_ROLE_KEY` · `LEMONSQUEEZY_API_KEY` · `LEMONSQUEEZY_WEBHOOK_SECRET` · `LEMONSQUEEZY_STORE_ID` · `LEMONSQUEEZY_PRO_VARIANT_ID` · `LEMONSQUEEZY_TEST_MODE` · `APP_URL` · `CRON_SECRET` · VAPID web-push keys.

The browser only ever holds the public `SUPABASE_URL` + `SUPABASE_ANON_KEY`.

---

*Every edge function follows one template: CORS preflight → `POST`-only → auth check → zod-validated input → work as the correct identity → the common envelope with the correct HTTP status. No `console.log`, no `any`, no hand-built `Response`.*
