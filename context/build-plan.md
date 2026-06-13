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

Build the entry behavior. No marketing site in v1 — Influency is an authed app for one specific user type.

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

Internal event tracking that powers the dashboard's recent-activity feed and the audit trail. Influency does not ship a third-party analytics SDK in v1 — this is an in-DB log.

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