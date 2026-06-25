# Inflero — Product Requirements Document (PRD)

**Status:** Live (v1 shipped 2026-06-13) + post-v1 features (Deal Lifecycle Redesign, Subscription Billing) complete.
**Last updated:** 2026-06-20
**Live URL:** https://inflero-beta.vercel.app/
**Repo:** github.com/junaidapdev/inflero (`main`)

> This PRD is a consolidated, point-in-time description of what Inflero **is and does today** — the actual built product, not the original plan. For build sequencing see `build-plan.md`; for the technical contract see `architecture.md`; for current build state see `progress-tracker.md`.

---

## 1. Executive Summary

Inflero is a full-stack, multi-tenant web app that runs the operational side of a Saudi influencer's brand-deal business in one place. An influencer signs up, picks a language (Arabic or English) and currency (SAR), and works out of five connected views: **ad deals, meetings & reminders, payment collection, Snapchat analytics, and reports** — all rolling up to a dashboard that shows money this month, what's due today, and what needs attention.

It is **Arabic-first and bilingual** from day one, with full RTL support and Hijri + Gregorian dates. It is **mobile-first** (usable at 375px) — deliberately built as the dry-run for a future React Native port on the same backend.

The app shipped fully free, then layered on a paid **Pro** tier via LemonSqueezy (Merchant of Record).

---

## 2. Problem Statement

Running brand deals is death by a thousand scattered places. Agreements live in WhatsApp threads, deliverables in the notes app, payment promises in screenshots, meeting times in someone's head, and performance numbers buried in Snap Insights. It is easy to forget a story you owe, lose track of who has actually paid, miss a meeting, or never get around to invoicing a brand.

Inflero consolidates all of it. Deals, deliverables, payments, meetings, reminders, and Snap performance live in one system that knows what is overdue, what is unpaid, and how each brand has performed — so the influencer spends time creating, not chasing.

---

## 3. Target User

A Saudi influencer who:

- Runs multiple paid brand deals at once and needs one place to track them.
- Works with brands repeatedly and wants to see how each one performs over time.
- Collects payments in installments (advance + balance is common in the KSA market) and loses track of who has paid.
- Needs to prove Snap campaign performance to brands quickly.
- Wants the app in Arabic, right-to-left, with Hijri dates and SAR — not a localized afterthought.

---

## 4. Goals & Success Criteria

- A new user can sign up, set their profile, and start tracking deals in minutes — seeing only their own data.
- The full deal lifecycle works: brand → deal → mark **Shot** → mark **Posted** (status advances) → payment marked received → deal becomes **Paid**, with dashboard totals updating correctly.
- Marking a payment received is **atomic** — the payment and the deal status never disagree, even on a mid-operation failure.
- Snap extraction returns accurate views / reach / story views for both Arabic and English Snap Insights screenshots, and manual overrides persist.
- A meeting created for the near future produces a reminder that appears in the dashboard "Today" panel.
- Reports match hand-calculated totals; collection rate is correct with no divide-by-zero.
- **Tenant isolation holds:** a second user can never see the first user's rows (RLS verified live).
- The Arabic toggle flips the layout to RTL, switches all strings, and renders numbers and dates in Arabic / Hijri format.
- Every page is fully usable at 375px width.
- A free user is blocked at the deal limit and on paid features; upgrading flips them to Pro within seconds; a user can never forge their own entitlement.

---

## 5. Scope

### In scope (built)

- Auth entry with redirect logic + Supabase auth (Google OAuth + email/password with verification).
- Multi-tenancy with row-level security on every user-owned table.
- Arabic + English with RTL toggle; Hijri + Gregorian dates; SAR currency.
- Brands directory with per-brand rollups.
- Ad deals with a Shot/Posted lifecycle and an automatic status machine.
- Payments with installments and atomic mark-received.
- Dashboard: month totals, a "Today" worklist, and a "Needs attention" panel.
- Meetings (calendar + list) with auto-created reminders.
- In-app reminders feeding the Today panel.
- Snapchat analytics: upload (screenshot or PDF), GPT-4o vision extraction, realtime result, manual override, link-to-deal, and a branded PNG report export (post + monthly report types).
- Reports: monthly invoiced-vs-collected chart + per-brand table with collection rate.
- Recent-activity feed / audit trail.
- Mobile-first responsive (375px) bottom-tab navigation shell.
- **Public bilingual landing page** at `/` (post-v1).
- **Subscription Billing — Pro plan** via LemonSqueezy (post-v1).
- WhatsApp payment-reminder messaging + Microsoft Clarity analytics (post-v1).

### Out of scope

- WhatsApp **automated** reminder delivery (the schema is ready; v2 is purely additive).
- React Native (iOS + Android) app sharing this backend (planned next).
- Contract / file attachments on deals.
- Agency / commission split.
- OCR for non-Snap platforms (TikTok, Instagram Insights).
- Email or push notifications beyond the planned reminder web-push.
- Team or multi-user-per-account features.
- Browser extension.

---

## 6. Plans & Monetization

v1 shipped fully free; a paid **Pro** tier is layered on via **LemonSqueezy** — the **Merchant of Record**, so it handles checkout, cards, Saudi VAT, and invoicing (no PCI/tax burden on us).

| Plan | Price | What's included |
| --- | --- | --- |
| **Free** (default, no subscription) | — | All brands, payments, meetings, manual data entry. Capped at **5 in-flight deals** (status `pending`/`shot`/`posted`; `paid`/`cancelled` don't count). No Snap AI extraction, no Reports, no reminder web-push. |
| **Pro** | **SAR 89/mo** (charged ≈ USD 23.70 at the 3.75 SAR↔USD peg; LS charges in USD, SAR is display) | Unlimited deals, **Snap AI extraction**, **Reports**, and reminder web-push. Monthly-only, no trial. |

**Locked principles:**

- The **LemonSqueezy webhook is the source of truth** for entitlement — the post-checkout browser redirect is only UX.
- **The gates that cost money or enforce limits are server-side:** a deal-limit `BEFORE INSERT` trigger, and a Pro check inside `extract-snap-report` (it guards the paid OpenAI call). **Reports are gated in the UI** on purpose — their aggregate RPC (`get_monthly_totals`) is shared with the *free* dashboard sparkline, and report data is the user's own zero-marginal-cost data, so a blanket RPC gate would wrongly break a free surface.
- The `subscriptions` table is **written only by the webhook** (service-role). Users can read their own entitlement, never forge it (RLS select-own only).
- Because the LemonSqueezy account is **reused** (formerly "Narrate AI"), every webhook is **filtered by our store id + Pro variant id + test mode** — legacy/foreign events are ignored.
- **Downgrade never deletes or hides data** — it only blocks *new* actions past the free limit.
- At cutover, all existing accounts (incl. the developer's) were **grandfathered to Pro** via a one-time comp `subscriptions` row, so gates only bite **new** signups.

---

## 7. Information Architecture

### Pages

```
/                  → Public bilingual landing page (logged-out marketing)
/dashboard         → Dashboard (month totals, Today worklist, Needs attention)
/login             → Auth (Google OAuth + email/password)
/auth-callback     → OAuth + email-verification callback
/deals             → Ad deals list + filters (rows expand inline)
/brands            → Brand directory
/brands/[id]       → Brand detail (deals, lifetime total, avg deal size, last engagement)
/payments          → Payments — Pending / Received tabs
/meetings          → Meetings — calendar + list
/analytics/snap    → Snapchat analytics — upload + AI extraction + report export
/reports           → Reports — monthly + per-brand
/settings          → Settings — language, reminder lead time, profile, billing
```

### Navigation

The app shell is a single protected layout route wrapping every in-app page:

- A slim sticky top header with a profile avatar (trailing edge) and a notification bell (→ `/payments`).
- A **bottom tab bar** with five slots: **Home · Deals · [+ FAB] · Calendar · Insights**. (Insights is active on `/reports` or `/analytics/snap`.)
- A **Quick Add FAB** opens a 2×2 sheet (Deal / Meeting / Payment / Snap) that navigates and auto-opens each route's existing Add sheet — even when already on that route.
- A **profile menu** sheet holds the off-tab destinations (Brands · Payments · Settings) + Sign out.
- An **Insights** segmented control switches between Reports ↔ Snap atop both routes.

Direction-aware: the entire shell mirrors when the locale is Arabic (RTL).

---

## 8. Functional Requirements

### 8.1 Entry & Auth

- `/` shows the public landing page to logged-out visitors; logged-in users entering the app land on `/dashboard`.
- Auth via Supabase: **Google OAuth (PKCE)** and **email/password with email verification**.
- On first successful login, an `app_users` row is created (idempotent client-side upsert) with defaults: locale `ar`, currency `SAR`, reminder lead time 60 min, seeding `display_name`/`avatar_url` from OAuth metadata when present.
- Protected routes are guarded client-side by a `ProtectedRoute` wrapper and **guaranteed server-side by RLS**. A user can navigate to a protected URL but cannot read/write any data without a valid session and matching `user_id`.

### 8.2 Settings & Profile

- **Language** — Arabic / English segmented control with live RTL preview; persists to `app_users.locale` and flips `<html dir lang>` immediately.
- **Reminders** — default reminder lead time (minutes); "affects future reminders only".
- **Profile** — display name + avatar (click/drag upload; MIME + ≤2 MB validation; stored at `avatars/{user_id}/`).
- **Billing** — current plan, status, renews/ends date, card last-4; "Upgrade to Pro" (free) or "Manage billing" (Pro). Handles `?checkout=success`.
- **Sign out.**
- An **Incomplete Profile Banner** on the dashboard surfaces missing required fields (`display_name`, `avatar_url`) with a completion ring and a "Go to settings" CTA; hidden once complete.

### 8.3 Brands

- Directory of every brand (bilingual `name_ar` / `name_en`, contact, deal-count badge); add / edit.
- Empty state: "Add your first brand".
- Brand detail: all deals for that brand, **lifetime total SAR**, **average deal size**, and **last engagement date** (rolled up client-side from the page's deals query).
- A brand is reused across many deals so totals roll up per brand.

### 8.4 Ad Deals (the operational heart)

- List with filters (brand, status, month) and a money rollup; "Add deal".
- **Add/Edit deal:** brand, title, deliverables descriptor (`{type: story|post|reel, count}`, zod-validated), agreed amount (SAR, **≥ 0**), shoot date, post date, notes.
- Each row expands inline to show: read-only deliverables, the two lifecycle checkmarks, payment status, linked Snap report (if any), and Edit.
- **Status machine** (post-v1 Deal Lifecycle Redesign) — lives in one module and is **derived from two timestamps**:
  - **To-do (`pending`)** → tick **☐ Shot** (sets `shot_at`) → **`shot`** → tick **☐ Posted** (sets `posted_at`; implies Shot) → **`posted`**.
  - **`paid`** is set by the atomic payment flow; **`cancelled`** is manual. Both are terminal.
  - Status is recomputed from the stamps, never written ad-hoc.
- Two date-driven reminders (`shoot` / `post`) feed the dashboard Today worklist; ticking a box clears that reminder, unticking/editing re-arms it. Marking **Posted** also arms a **+24h Snap-analytics reminder** ("capture your analytics").
- Activity logged: `deal_created`, `deal_shot`, `deal_posted`.

### 8.5 Payments

- Two tabs: **Pending** (sorted by expected date) and **Received** (sorted by received date).
- A deal may have multiple installments (advance + balance).
- **"Mark as received"** runs an **atomic transaction** (Postgres RPC via edge function): it sets the payment received **and**, if all the deal's payments are now received, sets the deal to `paid` — both happen or neither does.
- **"Send reminder"** drops an in-app reminder (`kind='payment'`); WhatsApp delivery messaging exists, automated delivery is future.
- The deal expanded row shows "X of Y payments received · SAR Z outstanding".
- Activity logged: `payment_received`, `deal_paid`.

### 8.6 Meetings & Reminders

- Month-grid calendar view + list view.
- Add a meeting (title, scheduled-at, location/link, attendees jsonb, optional brand/deal link, notes).
- Creating a meeting **auto-creates a reminder** at meeting-time minus the user's lead time. Editing the time moves the reminder; cancelling clears it (the meeting row stays `cancelled`).
- **Reminders are created in application/edge code, never via Postgres triggers** — the logic stays visible and testable.
- `createReminder` dedups by `(kind, ref)` so there is exactly one live reminder per target, re-armed as needed.
- Activity logged: `meeting_scheduled`.

### 8.7 Dashboard

- **Top-line numbers (current month):** Total Invoiced, Total Collected, Outstanding, Deals Posted, Deals Pending — computed in one RPC round trip (`get_dashboard_stats`), with the caller passing its viewer-local month range.
- **Today worklist** — meetings + reminders due in the next 24h, with type badges; each row navigates to its action page; Done/dismiss per row.
- **Needs attention** — overdue payments and deals past their shoot/post date still incomplete; preserves whichever half loaded on partial failure.
- **Hero sparkline** — invoiced trend from the shared monthly-totals series (hand-rolled SVG, not Recharts, to keep the chart chunk off the landing path).
- "All clear" empty states.

### 8.8 Snapchat Analytics

- User uploads a Snap Insights **screenshot or PDF**. A PDF is converted to a PNG **in the browser** (pdf.js) first — the backend only ever receives an image.
- Upload validated by MIME **and magic bytes** + size cap; stored at `snap-uploads/{user_id}/`.
- A server-side edge function (`extract-snap-report`) calls **GPT-4o vision** with a **fixed structured-output JSON schema** and a bilingual prompt that understands the Snap Insights UI (Arabic-Indic digits / abbreviations are normalized to plain integers).
- **Two report types:**
  - **Post (24-hour) report:** views, reach, story views, screenshot count, swipe-ups, snap date.
  - **Monthly account report:** views, reach, story views, profile views, new followers, watch-time minutes, month (normalized to first-of-month).
- The result streams back to the UI via **Supabase realtime** (no polling). Every field has an edit pencil — a manual override sets status `manual` and always wins over the model.
- If extraction fails, the user enters numbers manually. The edge function input takes **only `{ snapReportId }`** — the storage path is read from the row (SSRF/IDOR defense), and image text is treated as untrusted **data, never instructions** (prompt-injection defense).
- **Per-user hourly rate limit** (cost + DoS guard for the paid API).
- A report can be **linked to a deal** (post type only) so a brand sees the performance of *their* campaign.
- **Branded PNG export:** a `SnapReportCard` (avatar, display name, per-type title, brand/deal or month context, metric tile grid, "Generated with Inflero" footer) is captured via lazily-imported `html-to-image` → downloadable PNG (renders Arabic/RTL/Hijri exactly as shown). WhatsApp-native sharing.
- Activity logged: `snap_extracted`.

### 8.9 Reports (Pro)

- **Monthly total** — Recharts bar chart of invoiced vs collected, last 12 months (always 12 ordered rows, empty months as 0). RTL-tolerant axes in Arabic; Arabic-Indic digits on the axes.
- **Per brand** — all-time per-brand list: deal count, invoiced SAR, and a collection-rate bar (collected ÷ invoiced).
- **Collection-rate guard:** when invoiced is 0, show `—`, never NaN/Infinity.
- Recharts is lazy-loaded into its own chunk so the main bundle doesn't absorb it.

---

## 9. Key User Flows

### 9.1 Atomic Mark-Received (data-integrity flow)

```
User clicks "Mark as received" on a pending payment
  → mutation hook invokes edge function `mark-payment-received` { paymentId }
  → edge function zod-validates, calls RPC `mark_payment_received` (security invoker)
  → ONE transaction:
      1. payments.status='received', received_date=now()  (WHERE id=… AND user_id=auth.uid())
      2. IF all the deal's payments are received → ad_deals.status='paid'
     (both happen, or neither)
  → envelope { ok, data } returned
  → hook invalidates payments + deals + dashboard caches
```

### 9.2 Snap Extraction (AI + realtime flow)

```
Upload PNG/PDF → (PDF→PNG in browser via pdf.js) → validate MIME+magic+size
  → upload to snap-uploads/{user_id}/  → INSERT snap_reports (status='pending')
  → invoke `extract-snap-report` { snapReportId }
  → [Pro check] → 404/409/429 cost-ordered guards → download as user
  → GPT-4o vision (fixed json_schema, bilingual, injection-defended)
  → UPDATE snap_reports (fields + status='extracted' | 'failed')
  → frontend realtime subscription updates the UI (no reload)
  → user edits a field → status='manual' (persists, never reverts)
```

### 9.3 Checkout → Entitlement (billing flow)

```
Settings "Upgrade" → invoke `create-checkout` (embeds custom.user_id, sends test_mode)
  → LS hosted checkout → redirect to /settings?checkout=success (optimistic "processing…")
  → MEANWHILE LS fires subscription_created
  → `lemonsqueezy-webhook` verifies HMAC-SHA256 (constant-time), filters store+variant+test_mode
  → resolves user (custom_data.user_id, else LS customer id), upserts subscriptions (newest-LS-wins)
  → Postgres realtime UPDATE → useEntitlement flips to Pro within seconds
  → every gate (snap edge fn + deal trigger server-side; Reports in UI) now sees is_pro=true
```

---

## 10. Data Model

Every user-owned row carries `user_id` (the Supabase `auth.users.id`) and is gated by RLS so user A can never read user B's data. Dates are stored ISO/Gregorian (UTC) and displayed Hijri + Gregorian.

| Table | Purpose / key columns |
| --- | --- |
| `app_users` | Profile extension (PK = auth user id): `display_name`, `locale` (`ar`/`en`), `default_currency` (SAR), `avatar_url`, `reminder_lead_minutes` (default 60). Changed only by the user in Settings — never by automation. |
| `brands` | `name_en`, `name_ar` (both required), `contact_{name,email,phone}`, `notes`. |
| `ad_deals` | `brand_id`, `title`, `deliverables` jsonb (read-only `{type,count}` descriptor), `agreed_amount_sar` (≥0), `shoot_date`, `post_date`, `shot_at`, `posted_at`, `status` (`pending`/`shot`/`posted`/`paid`/`cancelled`, **derived from the two stamps**), `notes`. |
| `payments` | `deal_id`, `amount_sar`, `expected_date`, `received_date`, `status` (`pending`/`received`/`overdue`), `method` (`bank`/`cash`/`other`), `notes`. |
| `meetings` | `brand_id?`, `deal_id?`, `title`, `scheduled_at`, `location_or_link`, `attendees` jsonb, `status` (`upcoming`/`done`/`cancelled`). |
| `reminders` | `kind` (`meeting`/`payment`/`deliverable`/`custom`/`shoot`/`post`), `ref_id`, `ref_table`, `due_at`, `message_en`, `message_ar`, `channel` (`in_app`/`whatsapp`), `is_done`, `is_sent_at`. Created in code, deduped by `(kind, ref)`. |
| `snap_reports` | `deal_id?`, `report_type` (`post`/`monthly`), `report_date`, `source_file_url`, post metrics (`views`, `reach`, `story_views`, `screenshot_count`, `swipe_ups`) + monthly metrics (`profile_views`, `new_followers`, `watch_time_minutes`), `raw_ai_json`, `extraction_status` (`pending`/`extracted`/`failed`/`manual`). |
| `activity_log` | `kind` (`deal_created`, `deal_shot`, `deal_posted`, `payment_received`, `deal_paid`, `meeting_scheduled`, `snap_extracted`, `subscription_changed`; `deliverable_posted` retired/historical), `summary`, `ref_id?`, `ref_table?`. Powers the recent-activity feed/audit trail. Write failures are swallowed. |
| `subscriptions` | One row/user, **written only by the webhook (service-role); users have SELECT-own only**. `lemonsqueezy_subscription_id` (unique; comp sentinel `comp:<user_id>`), customer/order/variant ids, `status`, `renews_at`, `ends_at`, `trial_ends_at`, card brand/last4, `raw_event` jsonb, `updated_at` (holds the LS event's updated_at for newest-wins). |

**Functions / RPCs:** `mark_payment_received` (atomic), `get_dashboard_stats`, `get_monthly_totals`, `get_per_brand_report`, `is_pro` (SECURITY DEFINER entitlement predicate), `get_my_entitlement` (security invoker, frontend read), `enforce_deal_limit` (BEFORE-INSERT trigger on `ad_deals`).

**Storage buckets:** `avatars` (public-read, own-path write) and `snap-uploads` (private, own-path only). Images only; validated by MIME + magic bytes + size on the client.

**RLS:** every user-owned table ships `user_id = auth.uid()` policies (select/insert/update/delete) **in the same migration as the table**. `subscriptions` is the one documented deviation (select-own only; webhook writes via service-role).

---

## 11. System Architecture & Tech Stack

| Layer | Tool |
| --- | --- |
| Frontend | Vite + React 18 (SPA — no SSR), TypeScript strict |
| Backend | Supabase (Postgres + Auth + Storage + Realtime) |
| "API we own" | Supabase Edge Functions (Deno) |
| Server state | TanStack Query |
| Routing | React Router v6 |
| Forms + validation | react-hook-form + zod (one validation library everywhere) |
| i18n | react-i18next (`<html dir>` toggle) |
| Dates | `Intl.DateTimeFormat` (Umm al-Qura Hijri) + date-fns |
| Currency/numbers | `Intl.NumberFormat` (SAR, locale digits) |
| PDF → image | pdf.js (client-side) |
| AI | OpenAI GPT-4o vision (structured output) |
| Charts | Recharts (lazy-loaded) |
| Styling | Tailwind CSS v4 (`@theme` tokens in `index.css`; hand-rolled token-exact UI primitives) |
| Billing | LemonSqueezy (Merchant of Record) |
| Analytics | Microsoft Clarity |
| Deploy | Frontend → Vercel; Backend → Supabase (managed) |

**Architectural boundaries (enforced as invariants):**

- Components contain **no** Supabase calls — all server-state interaction lives in a hook.
- `features/*` is React-free and Supabase-free (pure types, zod schemas, status logic).
- Hooks are the only place that touches Supabase from the frontend.
- Every edge function: try/catch, zod-validated input, one response envelope (`{ ok, data | error: { code, message } }`), correct HTTP status, no `console.log`.
- Multi-row writes that must be atomic run as a Postgres RPC called from an edge function — never two SDK calls. The RPC enforces ownership (`user_id = auth.uid()`).
- No hard-coded magic values, no `any`, no inline env access (single validated `config/env.ts`).
- Secrets (OpenAI key, service-role key, LemonSqueezy keys) live only in edge-function env — never in the browser bundle.

---

## 12. Non-Functional Requirements

- **Internationalization / RTL:** Arabic-first, full EN⇄AR toggle. Logical Tailwind utilities (`ps-`/`pe-`, `ms-`/`me-`) — no `left-`/`right-` for spacing; direction driven by `<html dir>`. Hijri (Umm al-Qura) + Gregorian dual dates; Arabic-Indic digits; SAR placement correct in both locales. Verified across every page at RTL.
- **Security / tenancy:** RLS on every user-owned table is the actual security boundary; client route guards are convenience. Verified by the **second-user RLS test** on every data-bearing table and both storage buckets. User-entered text is rendered as text, never HTML.
- **Mobile:** every page fully usable at **375px** (verified) — the dry-run for a future React Native port on the same backend.
- **Performance:** rollups via aggregate RPCs (no N+1 client fetching); heavy deps (Recharts, pdf.js, html-to-image) lazy-loaded into their own chunks; Snap results delivered via realtime (no polling).
- **Reliability:** atomic payment writes; idempotent webhook upserts (newest-LS-wins, retry- and out-of-order-safe); best-effort logging/reminders that never break the user's primary action; nothing left stuck `pending` (client marks failed if the invoke dies).
- **Cost control:** per-user hourly rate limit on the paid Snap API; the Pro check guards the OpenAI call before it's made.

---

## 13. Integrations

- **Supabase** — auth, Postgres + RLS, storage, realtime, edge functions. Project ref `uvueoypezcjtyazzibbu`.
- **OpenAI GPT-4o (vision)** — Snap Insights extraction; key in edge env only.
- **LemonSqueezy** — Pro subscription billing (Merchant of Record; reused "Narrate AI" store, renamed `inflero.lemonsqueezy.com`). Webhook callback = the public Supabase function URL; security is the HMAC signature, not URL secrecy. Currently in **test mode**.
- **Microsoft Clarity** (`x94o1m160q`) — product analytics on the landing page.
- **WhatsApp** — payment-reminder message composition (manual share); automated delivery is future.

---

## 14. Release Status & Roadmap

**Shipped:**

- ✅ **v1 (2026-06-13)** — all 17 planned features across 5 phases; deployed to Vercel; prod Google OAuth + tenant isolation verified live.
- ✅ **Deal Lifecycle Redesign** — Shot/Posted pipeline replacing the old single-deadline + per-deliverable model.
- ✅ **Public bilingual landing page** at `/`.
- ✅ **WhatsApp payment reminders**, **Microsoft Clarity**, **deal agreed-amount ≥ 0**.
- ✅ **Subscription Billing — LemonSqueezy Pro** — built end-to-end and proven in LS test mode (test purchase → webhook → realtime → "Pro"; Upgrade modal firing on gated surfaces).

**Open / next:**

- **Billing go-live (later):** flip LS to live mode, mint a live API key, set `LEMONSQUEEZY_TEST_MODE=false`, confirm real tax/payout details, then the live webhook + checkout.
- **Reminder web-push cron:** schedule the twice-daily digest (10:00 & 18:00 Riyadh = 07:00/15:00 UTC) and rotate the throwaway `CRON_SECRET`.
- **React Native app** on the shared backend (the whole reason the web app was built mobile-first and the backend kept client-agnostic).

**Future / parked:**

- WhatsApp automated reminder delivery (schema ready, v2 additive).
- Annual / trial billing variants (the variant→plan map already supports N variants).
- Optional third-party product-analytics SDK (e.g. PostHog).
- Known parked bug: `get_users_with_outstanding` morning-meeting `>= now()` predicate drops same-morning meetings, and the morning cron fires an hour off — to confirm against `cron.job`.

---

## 15. Activity Events (audit trail)

```
deal_created          { userId, dealId, brandId }
deal_shot             { userId, dealId }          — first deliverable batch shot
deal_posted           { userId, dealId }          — all deliverables posted
payment_received      { userId, paymentId, dealId, amountSar }
deal_paid             { userId, dealId }          — all payments received
meeting_scheduled     { userId, meetingId, scheduledAt }
snap_extracted        { userId, snapReportId, dealId? }
subscription_changed  { userId, status }          — written by the webhook (optional)
```

---

*End of PRD.*
