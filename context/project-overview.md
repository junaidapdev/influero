# Project Overview

## About the Project

Influero is a full-stack, multi-tenant web app that runs the operational side of a Saudi influencer's brand-deal business in one place. Each influencer signs up, sets their language (Arabic or English) and currency (SAR), and works out of five connected views: ad deals, meetings & reminders, payment collection, Snapchat analytics, and reports.

The influencer tracks every deal end to end — from agreeing deliverables with a brand, to marking each story/post as posted, to collecting payment in installments, to proving performance with Snap Insights numbers extracted automatically by GPT-4o vision. The whole picture rolls up onto a dashboard: money this month, what's due today, and what needs attention.

Arabic-first and bilingual from day one, with full RTL support and Hijri + Gregorian dates.

---

## The Problem It Solves

Running brand deals is death by a thousand scattered places. Agreements live in WhatsApp threads, deliverables in the notes app, payment promises in screenshots, meeting times in your head, and performance numbers buried in Snap Insights. It is easy to forget a story you owe, lose track of who has actually paid, miss a meeting, or never get around to invoicing a brand.

Influero consolidates all of it. Deals, deliverables, payments, meetings, reminders, and Snap performance live in one system that knows what is overdue, what is unpaid, and how each brand has performed — so the influencer spends time creating, not chasing.

---

## Pages

```
/                  → Dashboard (month totals, Today, Needs attention)
/login             → Auth (Google OAuth + email/password)
/deals             → Ad deals list + filters (rows expand inline)
/brands            → Brand directory
/brands/[id]       → Brand detail (deals, lifetime total, avg deal size, last engagement)
/payments          → Payments — Pending / Received tabs
/meetings          → Meetings — calendar + list
/analytics/snap    → Snapchat analytics — upload + AI extraction
/reports           → Reports — monthly + per-brand
/settings          → Settings — language, reminder lead time, profile
```

---

## Navigation

Top navbar. Full width on all pages. No sidebar. Direction-aware — the bar mirrors when the locale is Arabic (RTL).

```
Dashboard   Deals   Brands   Payments   Meetings   Analytics   Reports
```

Settings, profile, and sign-out live in a profile menu at the trailing edge of the navbar. On mobile, the navbar collapses to a bottom tab bar (Dashboard, Deals, Payments, Meetings) plus a "More" sheet for the rest.

---

## Core User Flow

### Entry

- Logged-in users → land on `/dashboard`.
- Logged-out users → redirected to `/login`.

### Onboarding

- User signs up via Supabase auth (Google OAuth or email/password with email verification).
- On first login, an `app_users` row is created with locale + currency defaults (Arabic, SAR) and a default reminder lead time.
- After login → redirect to the dashboard.

### Dashboard

- Top-line numbers for the current month: total invoiced, total collected, outstanding, deals posted, deals pending.
- "Today" panel — meetings and reminders due in the next 24 hours.
- "Needs attention" panel — overdue payments, and deals past their deadline still un-posted.

### Brands

- Directory of every brand the user has worked with (add / edit).
- Brand detail: all deals for that brand, lifetime total SAR, average deal size, and last engagement date.
- A brand is reused across many deals so totals roll up per brand.

### Ad Deals

- List with filters: brand, status, month. High-level money rollup ("how many done / how much pending").
- "Add Deal" modal: brand, title, deliverables, agreed amount (SAR), deadline, notes.
- Each row expands inline to show:
  - Deliverables checklist — mark each story / post / reel as posted.
  - Payment status for the deal.
  - Linked Snap report, if any.
- Status machine: marking deliverables posted advances the deal automatically — `pending → in_progress → posted`. `paid` is set when payments complete. `cancelled` is manual.

### Payments

- Two tabs: Pending (sorted by expected date) and Received (sorted by received date).
- A deal can have multiple installments (advance + balance) — common in the Saudi market.
- "Mark as received" updates the payment, the deal status, and the dashboard rollups together, atomically — never half-done.
- "Send reminder" drops an in-app reminder (WhatsApp delivery is a future addition).

### Meetings

- Month-grid calendar view + list view.
- Add a meeting, optionally linked to a brand or a deal.
- Creating a meeting automatically creates a reminder at the meeting time minus the user's reminder lead time. That reminder feeds the dashboard "Today" panel.

### Snapchat Analytics

- User uploads a Snap Insights screenshot or PDF.
- A PDF is converted to an image in the browser first (the backend only ever receives an image).
- A server-side edge function calls GPT-4o vision with a fixed structured-output schema and a prompt that understands the Snap Insights UI in both Arabic and English.
- Extracted fields: views, reach, story views, screenshot count, swipe-ups, snap date.
- The result streams back to the UI in realtime. Every field has an edit pencil — the user always has the final word, because Snap UI variants will sometimes confuse the model.
- If extraction fails, the user enters the numbers manually.
- A report can be linked to a deal so a brand sees the performance of *their* campaign.

### Reports

- Monthly total — bar chart of invoiced vs collected per month, last 12 months.
- Per brand — table of brand × month with deal count, total SAR, and collection rate.

### Settings

- Language toggle (Arabic / English + RTL/LTR switch).
- Default reminder lead time.
- Profile (display name, avatar).
- Sign-out.

---

## Data Architecture

### Profile & Settings Data

- Lives in the `app_users` table.
- Changes only when the user edits the Settings page.
- Holds locale, currency, reminder lead time, and profile fields.
- Never modified by any automated operation.

### Deal & Money Data

- `brands`, `ad_deals` (with a `deliverables` jsonb and a status machine), `payments` (installments), `meetings`, `reminders`.
- Reminders are created in application code (not database triggers), so the logic is visible and testable.
- The "mark payment received" operation runs as a single database transaction so the payment and the deal status can never disagree.

### Snap Research Data

- Stored in the `snap_reports` table, including the raw model output in a `raw_ai_json` column.
- Generated per upload when the user runs an extraction.
- Never affects profile, deal, or money data — the only connection is an optional link to a deal. A manual override by the user always wins over the model.

### Tenant isolation

- Every user-owned row carries `user_id` and is gated by Postgres row-level security (`user_id = auth.uid()`) on select / insert / update / delete. This is the single backbone that keeps one influencer's data invisible to another.

---

## Features In Scope

- Homepage / auth entry with redirect logic
- Top navbar — Dashboard, Deals, Brands, Payments, Meetings, Analytics, Reports
- Supabase authentication (Google OAuth + email/password with verification)
- Multi-tenancy with row-level security
- Arabic + English with RTL toggle from day one; Hijri + Gregorian dates; SAR currency
- Brands directory with per-brand rollups
- Ad deals with deliverables checklist and an automatic status machine
- Payments with installments and atomic mark-received
- Dashboard: month totals, Today panel, Needs attention panel
- Meetings (calendar + list) with auto-created reminders
- In-app reminders feeding the Today panel
- Snapchat analytics: upload (screenshot or PDF), GPT-4o vision extraction, realtime result, manual override, link-to-deal
- Reports: monthly invoiced-vs-collected chart + per-brand table with collection rate
- Recent activity feed and audit trail
- Mobile-first responsive (usable at 375px) — the dry-run for a future React Native port

---

## Features Out of Scope

- WhatsApp reminder delivery (the table is structured now so v2 is purely additive)
- React Native (iOS + Android) app sharing this backend
- Contract / file attachments on deals
- Agency / commission split
- OCR for non-Snap platforms (TikTok, Instagram Insights)
- Scheduled / automated agent runs — extractions are manually triggered only
- Email or push notifications
- Team or multi-user-per-account features
- Payment or subscription system
- Browser extension

---

## Activity & Events

Influero tracks key actions internally in an `activity_log` table that powers the dashboard's recent-activity feed and an audit trail. (Unlike the reference project, Influero does not ship a third-party product-analytics SDK in v1; adding one such as PostHog is an optional future choice.)

```typescript
deal_created;        // { userId, dealId, brandId }
deliverable_posted;  // { userId, dealId, deliverableType }
deal_posted;         // { userId, dealId }      — all deliverables done
payment_received;    // { userId, paymentId, dealId, amountSar }
deal_paid;           // { userId, dealId }       — all payments received
meeting_scheduled;   // { userId, meetingId, scheduledAt }
snap_extracted;      // { userId, snapReportId, dealId? }
```

---

## Target User

A Saudi influencer who:

- Runs multiple paid brand deals at once and needs one place to track them
- Works with brands repeatedly and wants to see how each one performs over time
- Collects payments in installments and loses track of who has paid
- Needs to prove Snap campaign performance to brands quickly
- Wants the app in Arabic, right-to-left, with Hijri dates and SAR — not a localized afterthought

---

## Success Criteria

- A new user can sign up, set their profile, and start tracking deals in minutes — seeing only their own data.
- The full deal lifecycle works: brand → deal → deliverables marked posted (status advances) → payment marked received → deal becomes paid, with dashboard totals updating correctly.
- Marking a payment received is atomic — the payment and the deal status never disagree, even on a mid-operation failure.
- Snap extraction returns accurate views / reach / story views for both Arabic and English Snap Insights screenshots, and manual overrides persist.
- A meeting created for the near future produces a reminder that appears in the dashboard "Today" panel.
- Reports match hand-calculated totals; collection rate is correct with no divide-by-zero.
- Tenant isolation holds: a second user can never see the first user's rows (RLS verified).
- Arabic toggle flips the layout to RTL, switches all strings, and renders numbers and dates in Arabic / Hijri format.
- Every page is fully usable at 375px width.