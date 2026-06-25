# Build Plan

## Core Principle

Full page UI built with mock data first — verified visually before any logic is written. Then functionality is built and wired to the UI step by step. Every feature must be visible and testable before moving to the next. No invisible backend phases.

Two exceptions, named explicitly because mocking the UI for them would hide the bug you're trying to catch:

- **Feature 11 — Atomic Mark-Received.** Build the Postgres function + edge function + atomicity test first, then wire the UI. The value here is data integrity (payment and deal status can never disagree), not layout. A mock UI proves nothing.
- **Feature 15 — Snap Extraction.** Build the edge function (OpenAI vision + structured output + per-user rate limit + RLS) first, then wire the realtime subscription and the editable UI on top. Same reason.

Everywhere else, the JobPilot pattern holds: UI mock → verify visually → wire real data.

---

## Phase 1 — Foundation

### 01 Homepage / Entry

Build the entry behavior. No marketing site in v1 — Inflero is an authed app for one specific user type.

**UI:**

- `/` is a thin router page that decides where the user goes
- Skeleton placeholder during the auth check (no flash of unauthenticated content)

**Logic:**

- Logged-in users → redirect to `/dashboard`
- Logged-out users → redirect to `/login`

---

### 02 Auth

Supabase authentication — Google OAuth + email/password with email verification.

**UI:**

- Login page — Google OAuth button, email + password form, "Sign up" toggle, email-verification notice state
- Direction-aware (RTL when locale is Arabic)

**Logic:**

- Google OAuth via Supabase
- Email/password (with email verification) via Supabase
- OAuth + verification callback handlers
- JWT held in memory, refreshed via the SDK — never in localStorage in plaintext
- Session middleware protecting `/dashboard`, `/deals`, `/brands`, `/payments`, `/meetings`, `/analytics/snap`, `/reports`, `/settings`
- On first successful login, create the `app_users` row (locale `ar`, currency `SAR`, reminder lead time 60)
- After login → redirect to `/dashboard`

---

### 03 i18n + RTL Shell

Set up internationalization before any feature UI is built. Adding i18n later is a rewrite of every component; doing it now is a single setup task.

**Logic:**

- Create `lib/i18n.ts` — react-i18next bootstrap, `ar` and `en` catalogs in `src/locales/{ar,en}/common.json`
- Language toggle sets `<html dir="rtl|ltr" lang="ar|en">` and persists to `app_users.locale`
- Adopt logical Tailwind utilities (`ps-`/`pe-`, `ms-`/`me-`) across the codebase — no `left-`/`right-` for spacing
- Create `lib/date.ts` — format a stored ISO/Gregorian date to both Hijri (Intl, `islamic-umalqura`) and Gregorian; Hijri leads in `ar`
- Create `lib/currency.ts` — SAR formatter via `Intl.NumberFormat`
- Create `lib/numbers.ts` — number formatter that honors the active locale

---

### 04 Database Schema

All Supabase tables and storage bucket created before any data is written. Row-level security ships in the same migration as the table — never in a follow-up.

**Logic:**

- Create `app_users` table with all columns from `02-architecture.md`
- Create `brands`, `ad_deals`, `payments`, `meetings`, `reminders`, `snap_reports`, `activity_log` tables with all columns from `02-architecture.md`
- Create indexes:
  - `ad_deals (user_id, status, deadline)` — renamed `…, post_date` in the post-v1 deal-lifecycle redesign (0013)
  - `payments (user_id, status, expected_date)`
  - `meetings (user_id, scheduled_at)`
  - `reminders (user_id, due_at, is_done)`
- Create `snap-uploads` storage bucket with per-user path scoping (`/{user_id}/...`) and authenticated access only
- Row-level security policies on **every** user-owned table — `user_id = auth.uid()` on select/insert/update/delete. The RLS template is defined once in `02-architecture.md`; copy it for every table
- Verification: sign in as a second user and confirm they cannot read the first user's rows

---

## Phase 2 — Profile & Settings

### 05 Settings Page — Full UI

Build the complete settings page UI with mock data. No save logic yet.

**UI:**

- Language section — Arabic / English segmented control, live preview that flips `dir`
- Reminders section — default reminder lead time input (minutes), with helper text "Affects future reminders only"
- Profile section — display name input, avatar upload area ("Click to upload or drag and drop", image only)
- Sign-out button (destructive style)
- Saved-state toast and inline field errors

---

### 06 Settings Save Logic

Wire the settings form to Supabase.

**Logic:**

- Form fields validated with zod (`settingsSchema` in `shared/`)
- `useUpdateAppUser` mutation writes locale, `reminder_lead_minutes`, `display_name`, `avatar_url` to `app_users`
- Avatar uploaded to Supabase Storage at `avatars/{user_id}/avatar.{ext}` with upsert; `avatar_url` saved to `app_users` after upload
- Locale change updates the i18n active language and `<html dir lang>` immediately, then persists
- TanStack Query cache invalidated on success
- Form pre-fills with existing `app_users` data on return visits

---

### 07 Incomplete Profile Banner

Surface incomplete profiles on the dashboard.

**UI:**

- Dismissible banner above the dashboard top-line numbers — "Finish setting up your profile" with a "Go to settings" CTA, completion-ring style
- Lists missing fields as small tags (e.g. `DISPLAY NAME`, `AVATAR`)

**Logic:**

- Derived client-side from `app_users` — required: `display_name`, `avatar_url`. Completion percentage = filled ÷ required
- Banner hidden once all required fields are present

---

### 08 Activity Log

Internal event tracking that powers the dashboard's recent-activity feed and the audit trail. Inflero does not ship a third-party analytics SDK in v1 — this is an in-DB log.

**Logic:**

- Create `logActivity(kind, summary, refId?, refTable?)` helper that writes to `activity_log` scoped to the current user
- Wire log writes at the points named in `01-project-overview.md`:
  - `deal_created`, `deliverable_posted`, `deal_posted`, `payment_received`, `deal_paid`, `meeting_scheduled`, `snap_extracted` (post-v1: `deal_shot` added, `deliverable_posted` retired — see Post-v1 Features below)
- Helper called from edge functions and mutation hooks — never from UI components directly
- Errors in `logActivity` are caught and swallowed (logging must never break the user's action)

---

## Phase 3 — Brands & Deals

### 09 Brands Page — Full UI + Logic

Build `/brands` and `/brands/[id]` end-to-end. This establishes the **reusable CRUD pattern** every later feature copies: migration + RLS → zod schema → feature folder → TanStack Query hook → page with all states.

**UI:**

- `/brands` — directory list with each brand's name (ar + en), contact, deal count placeholder
- "Add brand" modal — name_en, name_ar, contact name/email/phone, notes
- Empty state — "No brands yet" + "Add your first brand" primary action
- `/brands/[id]` — brand detail with a placeholder section for deals + lifetime total + average deal size + last engagement (filled by features 10 and 14)

**Logic:**

- `useBrands` (list/create/update) via TanStack Query; query keys from `constants/queryKeys.ts`
- `brandSchema` (zod) validates name_en/name_ar required, email + phone validated if present
- All reads/writes scoped by `user_id = auth.uid()` (RLS does the actual enforcement; the filter is convenience)
- All user-entered text rendered as plain text — never HTML

---

### 10 Ad Deals Page — Full UI + Logic + Status Machine

Build `/deals` end-to-end including the deliverables checklist and the deal status machine. This is the operational heart of the app.

**UI:**

- Search controls card — filters: brand dropdown, status dropdown, month picker; "Add deal" button
- Deals list — each row: brand, title, status badge (color-coded), agreed amount (SAR formatted), deadline (Hijri + Gregorian), deliverables progress (e.g. "2 / 3 posted")
- Expandable row — deliverables checklist (story / post / reel × count, each with a "mark posted" checkbox); payment status placeholder (feature 12); linked Snap report placeholder (feature 15)
- "Add deal" modal — brand select, title, deliverables builder (add type + count), agreed amount, deadline, notes
- Status badge legend on hover

**Logic:**

- `useDeals` (list/create/update); `dealSchema` (zod) validates the deliverables array strictly (no arbitrary jsonb shapes)
- **Status machine** lives in **one** module, `features/deals/status.ts`:
  - `pending → in_progress` when at least one deliverable is `posted`
  - `in_progress → posted` when all deliverables are `posted`
  - `paid` set later by feature 11; `cancelled` is manual
- Status recomputed on every deliverable change — never written ad-hoc anywhere else
- Filters wired to DB queries; sort by deadline ascending by default
- `logActivity('deal_created' | 'deliverable_posted' | 'deal_posted')` at the right moments
- Brand detail page (from feature 09) now shows this brand's deals + a simple count

---

## Phase 4 — Money & Time

### 11 Atomic Mark-Received (SCHEMA-FIRST)

> Schema-first feature. Build the Postgres function + edge function + atomicity test before writing UI.

The canonical multi-row write: marking a payment received updates the payment and the deal status together, or not at all. This is the reference implementation; every later atomic write copies it.

**Logic (built first):**

- Create Postgres function `mark_payment_received(payment_id)` that, in **one transaction**:
  1. Sets the payment `status = 'received'` and `received_date = now()`
  2. If **all** payments for the deal are now received → sets the deal `status = 'paid'`
- Function enforces `payment.user_id = auth.uid()` — never trust an id from the client to imply ownership
- Edge function `mark-payment-received`:
  - Validates `{ payment_id }` with zod
  - Returns the common envelope: `{ ok: true, data }` or `{ ok: false, error: { code, message } }`
  - HTTP codes: 200 ok, 400 validation, 401/403 auth, 404 not found, 500 unexpected
- `logActivity('payment_received', ..., 'deal_paid' if applicable)`
- **Atomicity test (acceptance gate):** force a failure between step 1 and step 2 — verify neither the payment nor the deal changed

**UI (built second, on top of the proven logic):**

- `/payments` — two tabs: Pending (sorted by `expected_date`) and Received (sorted by `received_date`)
- "Add payment to deal" modal — deal select, amount, expected date, method (bank / cash / other), notes
- "Mark as received" button on each pending row → calls the edge function, optimistic update with rollback on error
- Status badges color-coded; overdue rows highlighted

---

### 12 Payment ↔ Deal ↔ Dashboard Wiring

Wire the deal expandable row (feature 10) to show real payment status, and the deals list to reflect the `paid` status set by feature 11.

**Logic:**

- `usePaymentsForDeal(dealId)` returns payments + a derived `isFullyPaid` flag
- Deal row now shows: "X of Y payments received · SAR Z outstanding"
- "Send reminder" button on a pending payment row drops an in-app reminders row (`kind='payment'`) — wired in feature 13 once the reminders table exists; until then the button is gated behind a "Coming with feature 13" tooltip

---

### 13 Meetings + Reminders

Calendar + list view for meetings, and the in-app reminder system that feeds the dashboard's Today panel. Reminders are created in **code**, not via Postgres triggers (visible, testable, debuggable).

**UI:**

- `/meetings` — month-grid calendar view + list view toggle
- "Add meeting" modal — title, scheduled at, location or link, attendees (jsonb: array of name + optional contact), optional brand link, optional deal link, notes

**Logic:**

- `meetingSchema` (zod) validates attendees jsonb strictly
- On meeting create — call `createReminder({ kind: 'meeting', refId, refTable: 'meetings', dueAt: scheduledAt − app_users.reminder_lead_minutes, message_en, message_ar })`
- `createReminder` is the **one** helper that creates reminders; reused by feature 12's "Send reminder" button (with `kind='payment'`) and by deliverable reminders
- Editing a meeting's time moves its reminder; cancelling clears/marks it
- `logActivity('meeting_scheduled')`

---

### 14 Dashboard — Stats + Today + Needs Attention

Wire the dashboard to real data. Rollups via a small set of aggregate queries or a Postgres view — never per-row client fetching (the N+1 problem).

**UI:**

- Top-line numbers (current month): Total Invoiced, Total Collected, Outstanding, Deals Posted, Deals Pending — five cards with the right number formatting per locale
- **Today panel** — meetings + reminders due in the next 24h, with type badges (meeting / payment / deliverable)
- **Needs attention panel** — overdue payments (past `expected_date`, not received) and deals past `deadline` still not `posted`/`paid`
- Empty states for each panel — "All clear" with a small icon

**Logic:**

- `useDashboardStats()` — one query returning all five top-line numbers, scoped by `user_id = auth.uid()`
- `useTodayItems()` — meetings within 24h + reminders due within 24h, merged and sorted
- `useNeedsAttention()` — overdue payments + past-deadline unposted deals
- Backed by a Postgres view or RPC where it removes N+1; lean on the indexes from feature 04
- Brand detail page (feature 09) lifetime total + last engagement now populated from the same aggregate pattern

---

## Phase 5 — Snap Analytics & Reports

### 15 Snap Extraction (SCHEMA-FIRST)

> Schema-first feature. Build the edge function + rate limit + RLS + structured-output schema before writing UI. This is the highest-risk feature in the project — file uploads + a paid external API + untrusted image content.

**Logic (built first):**

- Client-side PDF → PNG via pdf.js (first page only) — the edge function only ever receives an image. The Deno edge runtime cannot rasterize PDFs server-side
- Upload to `snap-uploads/{user_id}/...` — validate by MIME **and** magic bytes, cap file size, reject non-images
- Edge function `extract-snap-report`:
  - Input `{ file_url, snap_report_id }` validated with zod
  - **Per-user rate limit** — count this user's `snap_reports` created in the last hour; reject with 429 over the limit. Paid API + abusive tenant = both a cost attack and a DoS vector
  - Calls OpenAI vision with a **fixed structured-output JSON schema**: `{ views, reach, story_views, screenshot_count, swipe_ups, snap_date }`
  - Prompt explains the Snap Insights UI in **both** Arabic and English
  - **Prompt injection defense** — image text is treated as untrusted data, never instructions. The model's only job is to fill the schema; any "instructions" in the screenshot are ignored
  - Writes structured result to `snap_reports`, sets `extraction_status = 'extracted'` (or `'failed'`)
  - OpenAI API key lives **only** in edge function env (set via `supabase secrets set`) — never in the browser bundle
- `logActivity('snap_extracted')`

**UI (built second):**

- `/analytics/snap` — upload area with drag-and-drop, image-or-PDF, file-type and size guidance
- After upload — `snap_reports` row created with `extraction_status='pending'`; UI **subscribes via Supabase realtime** and updates when the edge function writes (no polling)
- Each extracted field rendered with an edit pencil — manual override sets `extraction_status='manual'` and persists across reload
- `'failed'` state shows "Couldn't read this — enter the numbers manually" path; the user always has the final word
- Optional "Link to deal" select — connects the report to a deal so brands see their campaign's performance

---

### 16 Reports — Monthly & Per-Brand

Build the full reports page UI with mock data, then wire to real aggregates.

**UI:**

- `/reports` — two cards stacked:
  - **Monthly total** — Recharts bar chart of invoiced vs collected per month, last 12 months. RTL-tolerant axis/legend orientation when locale is `ar`
  - **Per brand** — table of brand × month with deal count, total SAR, collection rate (collected ÷ invoiced)
- Empty state for each card
- Mock data first; verify visually; then wire

**Logic:**

- `useMonthlyTotals()` — one aggregate query, last 12 months, scoped by `user_id`
- `usePerBrandReport()` — one aggregate query, brand × month
- **Collection rate guard:** when invoiced is 0, return 0% or `—`, never NaN/Infinity
- Numbers/currency via the lib helpers — never ad-hoc formatting
- Acceptance: with two brands and three months of seeded deals, every number matches a hand calculation

---

### 16B Snap Report Generation (added 2026-06-12, developer-directed; built BEFORE 17)

Two report products on the Feature 15 extraction pipeline — no Snapchat API ever; screenshots + GPT-4o only. Developer decisions locked via a 4-question round: monthly = its own screenshot of Snapchat's monthly Insights page (not an aggregation); export = PNG of a branded report card (WhatsApp-native); both live on /analytics/snap behind an upload type picker; posting a deliverable auto-arms a 24h reminder.

**Logic:**

- Migration `0012`: `snap_reports.report_type` (`'post'` default — backfills existing rows — | `'monthly'`) + nullable `profile_views`, `new_followers`, `watch_time_minutes`. `report_date` semantics per type: snap date for post, FIRST day of the covered month for monthly
- `extract-snap-report` switches prompt + strict json_schema on the ROW's `report_type` (never client input): monthly extracts the account six (views, reach, story_views, profile_views, new_followers, watch_time_minutes) + month (normalized to first-of-month); guards/rate limit/zod re-validation unchanged
- **24h auto-reminder:** marking a deliverable posted arms the deal's `kind='deliverable'` reminder (its first writer) due now+24h — "Capture Snap analytics — {deal}" (bilingual, denormalized); `createReminder`'s upsert-by-(kind, ref) = one live reminder per deal, re-armed per posting; best-effort (a reminder failure never fails the toggle); unmarking leaves it (dismissible)
- **PNG export:** the branded `SnapReportCard` DOM captured via lazily-imported `html-to-image` (`toPng`, pixelRatio 2, own chunk) — captures the real DOM so Arabic/RTL/Hijri render exactly as shown

**UI:**

- /analytics/snap upload card gains a report-type `FilterChips` picker (+ per-type hint); history rows a neutral type chip; monthly rows title with the month
- Detail sheet renders the type's field set with the same pencil/manual-override flow; link-to-deal hidden for monthly; "Report preview" (`SnapReportCard`) + Download button once extracted/manual
- Acceptance: EN + AR monthly screenshots extract sane account numbers; the exported PNG renders Arabic correctly; marking a deliverable creates the reminder due exactly +24h (visible in Today when due); a second posting MOVES it (one row per deal)

---

### 17 Polish + Deploy

Final pass before shipping. This is the gate that catches everything the per-chunk reviews missed.

**Logic:**

- **375px pass** — every page fully usable at 375px width (dry-run for the future React Native port)
- **States pass** — every list/section has loading (skeleton), empty, and error states present
- **RTL pass** — directional icons and chevrons mirror correctly in Arabic
- **Standards sweep** — zero `console.log` in committed code; zero `any`; zero inline magic values; one response envelope + consistent HTTP status codes across all edge functions; one zod for all validation
- **Final RLS spot-check** — sign in as a second user, confirm zero cross-tenant data visible anywhere
- **Deploy** — frontend to Vercel; production env vars set; Google OAuth redirect URIs set to the **production domain** (the classic "login works locally, breaks in prod" bug); confirm Supabase production project config and edge function secrets (`supabase secrets set`) are in place
- After human review, merge `develop` → `main`. Update `06-progress-tracker.md` to "v1 shipped" with the deploy URL

---

## Feature Count

| Phase                                | Features |
| ------------------------------------ | -------- |
| Phase 1 — Foundation                 | 4        |
| Phase 2 — Profile & Settings         | 4        |
| Phase 3 — Brands & Deals             | 2        |
| Phase 4 — Money & Time               | 4        |
| Phase 5 — Snap Analytics & Reports   | 3        |
| **Total**                            | **17**   |

---

## Post-v1 Features

Shipped after the v1 launch (2026-06-13). Each was planned via `/architect` before code.

### Deal Lifecycle Redesign (2026-06-13)

Replaces the single-`deadline` + per-deliverable-"posted"-checkbox model with a legible pipeline **To-do → Shot → Posted → Paid** (+ Cancelled).

- **Schema (migration `0013_deal_lifecycle.sql`):** `ad_deals.deadline` → `post_date`; new `shoot_date` (date), `shot_at` / `posted_at` (timestamptz); status set `in_progress` → `shot`; status DERIVED from the two stamps (posted_at→posted, else shot_at→shot, else pending; paid/cancelled terminal). Deliverables jsonb becomes a read-only `{type,count}` descriptor. Backfill maps old rows; CHECK swap ordered drop→convert→add. `reminders.kind` gains `shoot`/`post`; `activity_log.kind` gains `deal_shot` (`deliverable_posted` retired). Recreates `get_dashboard_stats` + `get_monthly_totals` for the column rename (numbers unchanged).
- **Logic:** two checkmarks (☐ Shot / ☐ Posted) drive status (`useMarkShot` / `useMarkPosted`); Posted implies Shot. Two date-driven reminders (`shoot`/`post`) feed the dashboard Today **worklist**; ticking a box clears that reminder, unticking/edit re-arms it; Posted arms the +24h snap-analytics reminder. Deal **edit** flow added (reuses `DealForm`). Needs-attention = past-shoot-unshot OR past-post-unposted.
- **UI:** expanded row shows read-only deliverables + the two checkmarks + Edit; list/pill/filters use `shot` + `post_date`. Full EN+AR i18n.

---

### Subscription Billing — LemonSqueezy Pro (architected 2026-06-20; **build pending developer approval**)

Layers a paid **Pro** plan onto the (currently all-free) app via **LemonSqueezy (LS)** as Merchant of Record. This is the canonical *external-billing* feature, planned via `/architect`. **Schema-first** like Features 11 & 15: prove the webhook + entitlement + gates before wiring UI. Nothing is built yet — this entry is the approved-pending blueprint.

**Three load-bearing principles:**

1. **Webhook = source of truth.** Entitlement is whatever LS's signed webhook last wrote to `subscriptions`. The post-checkout redirect is cosmetic; never grant access from it.
2. **Cost/enforcement gates are server-side.** A deal-limit DB trigger and a Pro check in the `extract-snap-report` edge function (it guards the *paid* OpenAI call — the most important gate). **Reports gate in the UI**, on purpose: their aggregate RPC `get_monthly_totals` is shared with the *free* dashboard hero sparkline (Feature 16 folded it in), and report data is the user's own zero-marginal-cost data — a blanket RPC gate would break a free surface. UI gating over the server gates is convenience and can never be the sole barrier for the paid/limit features.
3. **Reused-account hygiene.** The LS account was formerly "Narrate AI" with old products. The webhook **filters every event by our `store_id` + Pro `variant_id`** and ignores everything else, so legacy events can't corrupt entitlement.

**Plan model (locked 2026-06-20):**

- **Free (default, no LS subscription):** unlimited brands / payments / meetings / manual data; **≤ 5 in-flight deals** (status `pending`/`shot`/`posted` — `paid`/`cancelled` don't count); **no** Snap AI extraction, **no** Reports, **no** web-push digest.
- **Pro — SAR 89/mo** (charged ≈ USD 23.70 at the 3.75 peg): unlimited deals + Snap AI extraction + Reports + reminder web-push.
- **Downgrade never deletes or hides data** — it only blocks *new* actions past the free limit. Existing accounts are **grandfathered** at launch (see Rollout).

**Schema — migration `0018_subscriptions.sql`:**

- `subscriptions` — one row per user, **written only by the webhook (service-role)**:
  `user_id uuid PK → auth.users(id) on delete cascade`, `lemonsqueezy_subscription_id text unique not null`, `lemonsqueezy_customer_id text`, `lemonsqueezy_order_id text`, `variant_id text`, `plan text not null default 'pro'`, `status text not null` (`on_trial|active|paused|past_due|unpaid|cancelled|expired`), `renews_at timestamptz`, `ends_at timestamptz`, `trial_ends_at timestamptz`, `card_brand text`, `card_last_four text`, `raw_event jsonb` (last payload, for debugging — mirrors `snap_reports.raw_ai_json`), `created_at`, `updated_at`.
- **RLS deviation (documented):** **SELECT-own only** — *no* insert/update/delete policies for users. The webhook writes via service-role (bypasses RLS). A user reads their entitlement but can never write it. (Architecture's 4-policy template is deliberately reduced here; note it in the migration.)
- `is_pro(p_user_id uuid) returns boolean` — **`SECURITY DEFINER`, fixed `search_path = public`**: `true` when status ∈ (`active`,`on_trial`) **OR** (status ∈ (`cancelled`,`past_due`) **AND** `ends_at > now()` → grace). The single entitlement predicate every gate calls.
- `get_my_entitlement()` — `security invoker` RPC → `{ plan, status, is_pro, active_until }` for `auth.uid()` (the frontend read).
- `enforce_deal_limit()` — **`BEFORE INSERT` trigger on `ad_deals`**: if `not is_pro(NEW.user_id)` and the user already has ≥ `FREE_DEAL_LIMIT` in-flight deals → `raise exception` with a coded message (`DEAL_LIMIT`) the client maps to an upgrade prompt. Server-side, unbypassable, and **keeps the existing PostgREST insert path** (no client rewrite of `useDeals`).
- **No** Pro gate inside `get_monthly_totals` / `get_per_brand_report` — `get_monthly_totals` is shared with the free dashboard sparkline, so Reports are gated at the UI/route layer instead (the data is the user's own and carries no marginal cost; the cost-critical gate is the Snap edge function).
- `alter publication supabase_realtime add table subscriptions` — so the UI flips the instant the webhook writes.
- `activity_log.kind` gains `subscription_changed` (optional feed row written by the webhook).

**Edge functions:**

- `lemonsqueezy-webhook/` — **public, deploy `--no-verify-jwt`, service-role, no CORS** (server-to-server, mirrors `send-daily-reminders`'s secret-gated/admin pattern): read the **raw** body via `req.text()`; verify `X-Signature` = HMAC-SHA256(rawBody, `WEBHOOK_SECRET`) via Web Crypto with a **constant-time compare** (401 on mismatch — this replaces the CRON_SECRET gate with a cryptographic one); parse; **filter by `store_id` + `test_mode`**; resolve `user_id` from `meta.custom_data.user_id` (first event) else by `lemonsqueezy_customer_id` lookup (renewals carry no custom_data); **upsert `subscriptions` keyed by subscription id, latest-wins guarded by LS `updated_at`** (idempotent against retries *and* out-of-order delivery); handle `subscription_{created,updated,cancelled,resumed,expired,paused,unpaused}` (+ optional `_payment_success/_failed`, `order_refunded`); **always 200** for handled *and* ignored events (non-2xx makes LS retry), 401 only on bad signature, 400 on unparseable body; best-effort `subscription_changed` activity insert.
- `create-checkout/` — authed (acts as user): resolve `auth.uid()` + email; **409 if already Pro**; call LS `POST /v1/checkouts` (store + Pro-variant relationships, `checkout_data.email`, `checkout_data.custom = { user_id }`, `product_options.redirect_url = ${APP_URL}/settings?checkout=success`, `test_mode` per env) with `LEMONSQUEEZY_API_KEY`; return `{ url }` (the hosted checkout). Frontend redirects.
- `customer-portal/` — authed (acts as user): read the user's `subscriptions` row → LS `GET /v1/subscriptions/{id}` → return the **fresh** signed `urls.customer_portal` (these are ~24h-expiring, so fetched on demand, **never stored**). Frontend opens it for cancel / update-card.
- `_shared/lemonsqueezy.ts` — all LS API specifics in one module: `verifyWebhookSignature(rawBody, sig, secret)`, `lsFetch(path, init)` (Bearer + `Accept/Content-Type: application/vnd.api+json`), `createCheckout(...)`, `getSubscription(id)`.
- `_shared/constants.ts`: add `ERROR_CODE.UPGRADE_REQUIRED`.
- **`extract-snap-report`**: add an entitlement check at the top (after auth, **before** the OpenAI call) → `403 UPGRADE_REQUIRED` if not Pro.
- **`send-daily-reminders` / `get_users_with_outstanding`**: skip non-Pro users (if web-push is Pro-gated).

**Shared / config:**

- `backend/config/env.ts`: `LEMONSQUEEZY_API_KEY`, `LEMONSQUEEZY_WEBHOOK_SECRET`, `LEMONSQUEEZY_STORE_ID`, `LEMONSQUEEZY_PRO_VARIANT_ID`, `APP_URL`, `LEMONSQUEEZY_TEST_MODE`. Secrets dev-managed via `supabase secrets set` — never in the bundle.
- `backend/shared/types/subscription.types.ts`: `Subscription`, `Entitlement`, `SubscriptionStatus`, `PLAN`, and the `ENTITLED_STATUSES` constant — shared by edge + frontend so both agree on what "Pro" means.

**Frontend:**

- `features/billing/entitlement.ts` (React-free): `isPro(entitlement)`, `planLabel`, and the **single registry of which features need Pro** (snap, reports, deal-limit) so gate logic isn't scattered across components.
- `hooks/useEntitlement.ts`: `useQuery` on `get_my_entitlement` **+ realtime** on the user's `subscriptions` row → invalidates `QUERY_KEYS.ENTITLEMENT`, so the UI flips to Pro within seconds of the webhook (the snap-realtime pattern).
- `hooks/useCheckout.ts` (invoke `create-checkout` → redirect to `data.url`) and `hooks/useCustomerPortal.ts` (invoke `customer-portal` → open `data.url`).
- `components/settings/BillingSection.tsx`: a Settings card — current plan, status, renews/ends date, card last-4; "Upgrade to Pro" (free) / "Manage billing" (pro); consumes `?checkout=success` → toast + invalidate entitlement.
- `components/billing/UpgradePrompt.tsx`: the reusable gate shown on `/analytics/snap` + `/reports` when free, and on the `DEAL_LIMIT` insert error. CTA → checkout.
- Gate wiring: `/analytics/snap` + `/reports` render `UpgradePrompt` for free users; the deals page shows "X / 5 deals" and surfaces the upgrade prompt on the `DEAL_LIMIT` error.
- `constants/queryKeys.ts`: `ENTITLEMENT`. i18n `billing.*` (en+ar). **No new public env** — server-created checkout + redirect means no LS publishable key in the browser.

**Data flow (checkout → entitlement):** Upgrade (Settings) → `create-checkout` embeds `custom.user_id` → LS hosted checkout (test mode) → redirect to `/settings?checkout=success` (optimistic "processing…") — **meanwhile** LS fires `subscription_created` → `lemonsqueezy-webhook` verifies HMAC → upserts `subscriptions` (status `active`, plan `pro`) → Postgres realtime UPDATE → `useEntitlement` flips → every gate (snap edge fn + deal trigger server-side, Reports in the UI) now sees `is_pro = true`.

**Rollout / cutover (locked — grandfather):** flipping gates on would *suddenly lock Snap + Reports for existing users*, so all current accounts (incl. the dev's own) are **grandfathered to Pro** via a one-time seeded `subscriptions` comp row (`plan='pro'`, `status='active'`, far-future `ends_at`, a sentinel `lemonsqueezy_subscription_id` like `comp:<user_id>`), written by the migration / a service-role backfill over existing `auth.users`. Gates only bite **new** signups. This keeps the live app working and keeps the dev account Pro for testing the gates. (A real LS subscription later overwrites the comp row by `user_id`.)

**Build order (after `/architect` approval — schema-first):**

1. **LS store setup (dev):** new Pro product + variant in the reused account (test mode); register the webhook endpoint + signing secret; create an API key. `supabase secrets set` the four LS vars + `APP_URL`.
2. **Verify current LS API shapes** (checkout body, webhook event names, signature header, subscription attributes) against **live LS docs** via Context7/MCP — per CLAUDE.md, don't code the external API from memory.
3. `0018` migration → apply → **2nd-user RLS test** (a user reads only their own subscription; *cannot* write any subscription row).
4. `_shared/lemonsqueezy.ts` + `backend/config/env.ts` + shared types + `UPGRADE_REQUIRED`.
5. `lemonsqueezy-webhook` (HMAC, store filter, idempotent upsert) → end-to-end test with LS test-mode events; confirm the row lands and entitlement flips via realtime.
6. `create-checkout` + the `extract-snap-report` Pro gate (the cost-critical server gate). The deal-limit trigger already ships in `0018`; Reports gate at the UI/route layer.
7. `customer-portal`.
8. Frontend: `useEntitlement` (+realtime), `useCheckout`, `useCustomerPortal`, `BillingSection`, `UpgradePrompt`, gate wiring, i18n; lint + build.
9. **Live gate:** full checkout in LS test mode → webhook → Pro flips; cancel in portal → reverts at period end; free user blocked at 5 deals + on Snap/Reports; webhook ignores legacy "Narrate AI" events; 2nd-user RLS holds. Then update `progress-tracker.md`.

**Acceptance:** a free user is blocked at 5 in-flight deals and on Snap/Reports; "Upgrade" → LS checkout → webhook flips them to Pro **within seconds** (realtime) → gates open; "Manage billing" → portal cancel → at period end entitlement reverts and gates re-close; the webhook ignores foreign/legacy events; a user can never write their own `subscriptions` row (RLS).

---

### Expense Tracker — Pro (architected + **Build 1 built** 2026-06-21)

The money-**out** counterpart to Payments — costs an influencer incurs (production, travel, equipment, operational, software, marketing, other). Turns the app from a deal tracker into a profitability tool. Planned via `/architect`; decisions locked with the developer. **A Pro feature, gated in the UI** (the Reports stance — expenses cost nothing to store and enforce no limit, so no server gate; RLS is plain user-owned, so a Pro→Free downgrade keeps the data, just hides the page). Single-table CRUD → **no edge function** (direct RLS-gated PostgREST, the Brands/Settings pattern).

**Shipped in slices (developer choice):** Build 1 = the ledger + dashboard net (built 2026-06-21, static-verified). Build 2 = the deeper profitability reporting (deferred — see below).

**Build 1 (DONE, static-verified — typecheck + lint + build clean):**

- **Schema — `0020_expenses.sql`:** `expenses` table (`id`, `user_id default auth.uid()`, **`deal_id` nullable FK → `ad_deals` `on delete set null`** [optional link; null = overhead; set-null not restrict because it isn't money-history], `amount_sar numeric check (>= 0)`, `category text check (in the 7 values)`, `title text not null`, `expense_date date not null`, `notes`, `created_at`, `updated_at`) + RLS select/insert/update/delete-own + `authenticated` grant / `anon` revoke + indexes `(user_id, expense_date desc)` and a partial `(user_id, deal_id) where deal_id is not null`. **Same migration recreates `get_dashboard_stats` with one additive key `total_expenses`** (month's expenses by `expense_date`; all other definitions verbatim from 0013).
- **Shared types:** `backend/shared/types/expense.types.ts` (`Expense`, `EXPENSE_CATEGORY`, `EXPENSE_CATEGORY_ORDER`); `dashboard.types.ts` gains `total_expenses`.
- **Logic:** `hooks/useExpenses.ts` = `useExpenses(filters)` (category + month, DB-filtered, keyed) / `useExpensesIndex` (month options) / `useCreateExpense` / `useUpdateExpense` / `useDeleteExpense` — all invalidate `EXPENSES` + `DASHBOARD`. `features/expenses/expense.schema.ts` (zod, i18n-key errors) + `category.ts` (per-category brand-tint).
- **UI:** `/expenses` route (Pro UI gate copied from `reports.tsx`; list + category `FilterChips` + month `Select` + add/edit `BottomSheet` + delete) with `ExpenseListItem` / `ExpenseForm` / `CategoryBadge`. Nav: profile-menu link + a 6th **Expense** Quick Add tile (3×2 grid, dropped the Snap span hack) + the `App.tsx` route. **Dashboard hero (Pro only):** an Expenses tile + a derived **Net = collected − expenses** tile below the stat tiles. Full EN+AR i18n.
- **Live gate:** apply `0020` (required for the table + the hero's `total_expenses`; the Net/Expenses tiles are guarded with `?? 0` so they show SAR 0 — not `NaN` — in the window before the migration lands) **and `0021`** (the `enforce_deal_owner` cross-tenant guard trigger on `expenses.deal_id`); then as a Pro user: add an expense (with and without a deal link) → it appears in the ledger and the hero Net/Expenses update; category + month filters narrow correctly; edit + delete persist; a **fresh free account** sees the `/expenses` page gated to the Upgrade modal and the dashboard unchanged (no Net/Expenses strip); 2nd-user RLS on `expenses`.

**Build 2 (DEFERRED — profitability reporting, planned):** `get_monthly_expenses` (+ per-category) RPC; extend `get_per_brand_report` with expense/net-margin (additive keys); `useExpensesForDeal` for deal/brand-detail cost-vs-revenue; Reports expense-vs-income overlay + category breakdown + per-brand margin. The `deal_id` link captured in Build 1 means Build 2 needs no backfill.

**Later:** recurring (auto-monthly) expenses; receipt-image attachments; optional `expense_added` activity-log kind.

**Decisions (locked 2026-06-20):** (1) Pro-only = **Snap AI extraction + Reports + web-push reminders**; (2) free cap = **5 in-flight deals**; (3) **grandfather** existing accounts to Pro (comp row); (4) **monthly-only, no trial** — one SAR 89/mo variant (annual/trial are additive later; the variant→plan map already supports N variants); (5) **display SAR 89** (charged ≈ USD 23.70), unless changed. **Remaining pre-build dev task (manual, in the LS dashboard):** create the Pro product + variant in the reused account (test mode), register the webhook endpoint + signing secret, mint an API key, then `supabase secrets set` the LS vars + `APP_URL`.

---

### Reminders — Quick Add (architected + **built** 2026-06-21)

A **free, standalone, user-authored quick reminder** — a typed note + a date/time that surfaces in the dashboard **Today** panel when due. The lightweight counterpart to a full Meeting: no attendees, no location, no brand/deal link — just "what" + "when". Planned via `/architect`; decisions locked with the developer through a discussion round.

**The load-bearing realization:** the `reminders` table (from `0008`) already shipped with everything this needs — `kind='custom'` in the CHECK set (no writer until now), **nullable `ref_id`/`ref_table`** (the dedup unique index is partial, `WHERE ref_id IS NOT NULL`, so a ref-less reminder is explicitly allowed), and **user insert/update/delete RLS**. The Today panel already renders `message_{locale}`, has the Done/dismiss action, and already had a `dashboard.today.type.custom` = "Reminder" label. So this is a **pure front-end feature** — no migration, no edge function, no backend change at all.

**Decisions (locked 2026-06-21):**

- **Reuse `reminders`, `kind='custom'`** — not a new table. A custom reminder IS just a reminder the user authored directly.
- **Zero-migration storage** — the typed text is **dual-written into both `message_en` and `message_ar`** (a user note isn't translatable, so whichever locale renders shows exactly what they typed). A dedicated `body` column is the clean upgrade later if ever wanted.
- **Free** — core productivity, zero marginal cost (unlike the Snap/Reports/Expenses Pro gates).
- **Standalone** — no deal/brand link in this build.
- **`/reminders` shows custom-only** — auto-generated reminders (meeting/shoot/post/snap) stay managed from their source entity; the page never edits/deletes a derived reminder (which its source would just re-arm).
- **Don't reuse `lib/createReminder`** — that helper upserts by `(kind, ref_id)` for *derived* reminders; a custom reminder has no ref, so the hook does plain insert/update/delete by `id` (the brands/expenses single-table CRUD pattern).
- **Edit re-opens a done reminder** (`is_done=false`) — the same re-arm-on-change stance as `createReminder`'s upsert move; a no-op for an already-open one. The Done section also has a **"Clear done"** bulk-delete, scoped to `kind='custom'` so it never removes an auto-reminder dismissed from the Today panel.

**Built (static-verified — typecheck + lint + production build clean):**

- **No schema change.** `ROUTES.REMINDERS` + the `App.tsx` route; `features/reminders/reminder.schema.ts` (zod: `text` + `remindAt` datetime-local).
- **Logic:** `hooks/useReminders.ts` extended — `useReminders()` (list `kind='custom'`, due_at asc) + `useCreateReminder`/`useUpdateReminder`/`useDeleteReminder`/`useSetReminderDone` (the Done/Undo toggle); all invalidate the `REMINDERS` prefix (covers both the new list and the Today query). The existing `useDismissReminder` (Today's one-way Done) is unchanged.
- **UI:** `routes/reminders.tsx` (the dedicated page — **Upcoming + Done** sections, add/edit/delete `BottomSheet`, a Done/Undo toggle, a "Clear done" bulk action, all states) with `components/reminders/{ReminderForm,ReminderListItem}.tsx`. Nav: a **7th free Quick Add tile** (`Bell`, `bg-brand-tint-blue`) + a ProfileMenuSheet link. `TodayPanel` now routes `kind='custom'` rows → `/reminders`. Default new-reminder time = tomorrow 09:00 local. Full EN+AR i18n (`reminders.*`, `quickAdd.reminder`).
- **Live gate:** add a reminder for later today/tomorrow → shows in the dashboard Today panel (from ~24h before `due_at`, persists until Done) and on `/reminders` Upcoming; edit text/time + delete persist; Done → leaves Today, moves to `/reminders` Done; Undo re-opens; tapping a custom Today row lands on `/reminders`; a far-future reminder is visible/editable on `/reminders` but not yet in Today; 2nd-user RLS on `reminders` for custom rows; 375px + RTL sweep of `/reminders` + the 7-tile Quick Add grid.

**Deferred (later):** an optional brand/deal link; recurring reminders; reminder **web-push** delivery (Pro — the `channel='whatsapp'`/`is_sent_at` columns already exist for additive v2 delivery).