# Architecture

## Stack

| Layer                            | Tool                                  | Purpose                                                  |
| -------------------------------- | ------------------------------------- | -------------------------------------------------------- |
| Framework                        | Vite + React 18                       | Frontend SPA (no SSR — authed dashboard, not a content site) |
| Auth + DB + Storage + Realtime   | Supabase                              | Entire backend                                            |
| Edge runtime                     | Supabase Edge Functions (Deno)        | The only "API we own"                                     |
| Server state                     | TanStack Query                        | Caching, retries, optimistic updates                      |
| Routing                          | React Router v6                       | SPA routing                                               |
| Forms + validation               | react-hook-form + zod                 | One validation library, everywhere                        |
| i18n                             | react-i18next                         | Arabic + English with `<html dir>` toggle                 |
| Dates                            | `Intl.DateTimeFormat` + date-fns      | Hijri (Umm al-Qura) + Gregorian display                   |
| Currency / numbers               | `Intl.NumberFormat`                   | SAR + locale-aware digits                                 |
| Client-side PDF → image          | pdf.js                                | Snap PDF uploads converted in the browser before upload   |
| AI model                         | OpenAI GPT-4o (vision)                | Snap Insights structured-output extraction                |
| Charts                           | Recharts                              | Reports + dashboard                                       |
| Styling                          | Tailwind CSS + shadcn/ui              | UI components and styling                                 |
| Deploy — frontend                | Vercel                                | Static SPA + CDN                                          |
| Deploy — backend                 | Supabase (managed)                    | Postgres, auth, storage, edge functions, realtime         |
| Language                         | TypeScript strict                     | Throughout                                                |

> **Adaptation from the JobPilot reference:** Influency is a Vite SPA, not Next.js. There is no App Router, no Server Actions, no `middleware.ts`, no `@supabase/ssr` cookie bridge. The reference's layered Next.js patterns map cleanly onto Vite + edge functions, and the mapping is documented in *Client Pattern* and *Data Flow* below.

---

## Folder Structure

Monorepo. Frontend and backend in separate top-level folders, sharing one repo (deliberate deviation from review point 5 — see `01-project-overview.md`).

```
/
├── AGENTS.md
├── CLAUDE.md
├── context/
│   ├── 00-chunk-map.md
│   ├── 01-project-overview.md
│   ├── 02-architecture.md
│   ├── 03-code-standards.md
│   ├── 04-ai-workflow-rules.md
│   ├── 05-ui-context.md
│   └── 06-progress-tracker.md
├── specs/                                  → Per-chunk implementation specs
├── frontend/
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── public/
│   └── src/
│       ├── main.tsx                        → React entry, providers (Query, Router, i18n)
│       ├── App.tsx                         → Route tree
│       ├── routes/
│       │   ├── index.tsx                   → Entry router (auth check → dashboard or login)
│       │   ├── login.tsx                   → Auth page
│       │   ├── auth-callback.tsx           → OAuth + email-verification callback
│       │   ├── dashboard.tsx               → Month totals, Today, Needs attention
│       │   ├── deals.tsx                   → Deals list + filters + expandable rows
│       │   ├── brands/
│       │   │   ├── index.tsx               → Brand directory
│       │   │   └── [id].tsx                → Brand detail
│       │   ├── payments.tsx                → Pending / Received tabs
│       │   ├── meetings.tsx                → Calendar + list
│       │   ├── analytics/
│       │   │   └── snap.tsx                → Upload + extracted result
│       │   ├── reports.tsx                 → Monthly + per-brand
│       │   └── settings.tsx                → Language, lead time, profile
│       ├── components/
│       │   ├── ui/                         → shadcn/ui primitives only
│       │   ├── layout/
│       │   │   ├── TopNav.tsx              → Direction-aware top navbar
│       │   │   ├── MobileTabBar.tsx        → 375px bottom tab bar
│       │   │   └── ProtectedRoute.tsx      → Redirects to /login if no session
│       │   ├── dashboard/
│       │   │   ├── MonthTotalsBar.tsx
│       │   │   ├── TodayPanel.tsx
│       │   │   ├── NeedsAttentionPanel.tsx
│       │   │   └── IncompleteProfileBanner.tsx
│       │   ├── brands/  deals/  payments/  meetings/  snap/  reports/  settings/
│       │   └── feedback/                   → Loading skeletons, empty states, error states
│       ├── features/                       → Per-domain types, schemas, status logic
│       │   ├── brands/   (brand.types.ts, brand.api.ts, brand.schema.ts)
│       │   ├── deals/    (deal.types.ts, deal.api.ts, deal.schema.ts, status.ts ← state machine)
│       │   ├── payments/ meetings/ reminders/ snap/ reports/
│       ├── hooks/                          → TanStack Query wrappers
│       │   ├── useAppUser.ts  useBrands.ts  useDeals.ts  usePayments.ts
│       │   ├── useMeetings.ts useReminders.ts useSnapReports.ts
│       │   ├── useDashboardStats.ts useTodayItems.ts useNeedsAttention.ts
│       │   └── useMonthlyTotals.ts usePerBrandReport.ts
│       ├── lib/
│       │   ├── supabase.ts                 → Browser Supabase client
│       │   ├── i18n.ts                     → react-i18next bootstrap
│       │   ├── date.ts                     → Hijri + Gregorian formatter
│       │   ├── currency.ts                 → SAR formatter
│       │   ├── numbers.ts                  → Locale-aware number formatter
│       │   ├── logger.ts                   → No-op in production
│       │   └── logActivity.ts              → Writes to activity_log (errors swallowed)
│       ├── config/
│       │   └── env.ts                      → Single validated env import surface
│       ├── constants/
│       │   ├── http.ts  errors.ts  routes.ts  queryKeys.ts
│       │   ├── deals.ts payments.ts meetings.ts reminders.ts snap.ts
│       └── locales/
│           ├── ar/common.json
│           └── en/common.json
└── backend/
    ├── supabase/
    │   ├── config.toml                     → Supabase CLI project config
    │   ├── migrations/                     → SQL — tables, RLS policies, indexes, RPC
    │   │   ├── 0001_app_users.sql
    │   │   ├── 0002_brands.sql
    │   │   ├── 0003_ad_deals.sql
    │   │   ├── 0004_payments.sql
    │   │   ├── 0005_mark_payment_received_rpc.sql
    │   │   ├── 0006_meetings_reminders.sql
    │   │   ├── 0007_snap_reports.sql
    │   │   ├── 0008_activity_log.sql
    │   │   ├── 0009_dashboard_views.sql
    │   │   └── 0010_storage_bucket_policies.sql
    │   └── functions/
    │       ├── mark-payment-received/index.ts
    │       └── extract-snap-report/index.ts
    ├── shared/
    │   ├── types/                          → Shared TS types (deal, payment, brand, envelope)
    │   ├── schemas/                        → Shared zod schemas
    │   └── api.ts                          → ok() / fail() envelope helpers
    └── config/
        └── env.ts                          → Edge-function env (validated once)
```

---

## System Boundaries

| Folder                       | Owns                                                                                                       |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `frontend/src/routes/`       | Pages only. Route-level data wiring via hooks. No business logic, no schema knowledge.                     |
| `frontend/src/components/`   | UI only. No data fetching, no direct Supabase calls. State and data come in via props or hooks.            |
| `frontend/src/features/`     | Per-domain types, zod schemas, and pure logic (e.g. the deal status machine). No React, no Supabase calls. |
| `frontend/src/hooks/`        | All server-state interaction (TanStack Query). The *only* place a component talks to Supabase.             |
| `frontend/src/lib/`          | Third-party client init + cross-cutting utilities (i18n, date, currency, logger).                          |
| `frontend/src/constants/`    | All magic values — HTTP codes, statuses, query keys, route paths, error codes.                             |
| `frontend/src/config/env.ts` | The *one* place env vars are read on the frontend.                                                         |
| `backend/supabase/migrations/` | Schema + RLS + indexes + RPC. RLS ships in the same migration as the table.                              |
| `backend/supabase/functions/`  | Edge functions — the only API we own. Validate input, call RPC, return the common envelope.              |
| `backend/shared/`            | Types + schemas + envelope helpers imported by both frontend and edge functions.                           |

---

## Data Flow

### UI Mutations (Mutation Hooks)

```
User interaction in component
        ↓
Mutation hook in frontend/src/hooks/  (useMutation)
        ↓
Supabase JS client (browser)  →  PostgREST  →  RLS enforces user_id = auth.uid()
        ↓
TanStack Query cache invalidated (deals, payments, dashboard as relevant)
```

> No "Server Action" tier exists in a Vite SPA — Supabase's PostgREST + RLS *is* the safe write path, because RLS enforces ownership server-side. We never bypass it with the service-role key from the browser.

### Atomic Multi-Row Writes (Edge Function → RPC)

```
User clicks "Mark as received" on a payment
        ↓
Mutation hook calls supabase.functions.invoke('mark-payment-received', { body: { paymentId } })
        ↓
Edge function validates input with zod
        ↓
Edge function calls supabase.rpc('mark_payment_received', { payment_id })
        ↓
Postgres function — ONE TRANSACTION:
  1. UPDATE payments SET status='received', received_date=now() WHERE id=… AND user_id=auth.uid()
  2. IF all payments for this deal are received → UPDATE ad_deals SET status='paid'
  (Either both happen, or neither does.)
        ↓
Edge function returns { ok: true, data } via common envelope
        ↓
Mutation hook invalidates payments + deals + dashboard caches
```

### Snap Extraction (Edge Function → OpenAI → Realtime)

```
User uploads a Snap PDF/PNG
        ↓
Browser: if PDF, pdf.js renders first page to PNG (Deno edge runtime cannot rasterize PDFs)
        ↓
Validate MIME + magic bytes + size cap (image types only)
        ↓
Upload to Supabase Storage bucket `snap-uploads/{user_id}/...`
        ↓
INSERT snap_reports row with extraction_status='pending'
        ↓
Edge function `extract-snap-report` invoked with { file_url, snap_report_id }
        ↓
Per-user rate limit: COUNT snap_reports created by this user in the last hour;
  reject with HTTP 429 over the limit (paid API → cost + DoS guard)
        ↓
OpenAI GPT-4o vision call with FIXED structured-output JSON schema +
  bilingual Snap-Insights-aware prompt
  (image text is data, never instructions — prompt-injection defense)
        ↓
Edge function UPDATEs snap_reports row with extracted fields + extraction_status='extracted'
        ↓
Frontend SUBSCRIBES via Supabase realtime channel → UI updates with no polling
        ↓
User edits any field → manual override sets extraction_status='manual' and persists
```

### Reminder Creation (Code, Not Triggers)

```
User creates a meeting
        ↓
useCreateMeeting mutation INSERTs into meetings
        ↓
Same mutation calls createReminder({
  kind: 'meeting', refId, refTable: 'meetings',
  dueAt: scheduledAt − app_users.reminder_lead_minutes,
  message_en, message_ar
})
        ↓
INSERT reminders row → feeds dashboard "Today" panel
```

> Reminders are deliberately created in *application code*, not Postgres triggers. The logic stays visible, testable, and debuggable.

---

## Supabase Database Schema

Every user-owned row carries `user_id` (the Supabase `auth.users.id`) and is gated by RLS so user A can never read user B's data.

### `app_users` (profile extension; keyed by auth user id)

| Column                | Type        | Notes                                                |
| --------------------- | ----------- | ---------------------------------------------------- |
| user_id               | uuid        | PK, FK to `auth.users.id`                            |
| display_name          | text        |                                                      |
| locale                | text        | check in ('ar', 'en') · default 'ar'                  |
| default_currency      | text        | default 'SAR'                                         |
| avatar_url            | text        | Supabase Storage URL                                  |
| reminder_lead_minutes | integer     | default 60                                            |
| created_at            | timestamptz | default now()                                         |

### `brands`

| Column         | Type        | Notes                  |
| -------------- | ----------- | ---------------------- |
| id             | uuid        | PK                     |
| user_id        | uuid        | FK to auth.users.id    |
| name_en        | text        | NOT NULL               |
| name_ar        | text        | NOT NULL               |
| contact_name   | text        |                        |
| contact_email  | text        |                        |
| contact_phone  | text        |                        |
| notes          | text        |                        |
| created_at     | timestamptz | default now()          |

### `ad_deals`

| Column            | Type        | Notes                                                                       |
| ----------------- | ----------- | --------------------------------------------------------------------------- |
| id                | uuid        | PK                                                                          |
| user_id           | uuid        | FK to auth.users.id                                                         |
| brand_id          | uuid        | FK to brands                                                                |
| title             | text        | NOT NULL                                                                    |
| deliverables      | jsonb       | `[{ type: 'story'|'post'|'reel', count: int, posted_at?: timestamptz }]` (zod-validated on write) |
| agreed_amount_sar | numeric     | NOT NULL                                                                    |
| deadline          | date        |                                                                             |
| status            | text        | check in ('pending','in_progress','posted','paid','cancelled') · default 'pending' |
| notes             | text        |                                                                             |
| created_at        | timestamptz | default now()                                                               |
| updated_at        | timestamptz | default now()                                                               |

### `payments`

| Column        | Type        | Notes                                                              |
| ------------- | ----------- | ------------------------------------------------------------------ |
| id            | uuid        | PK                                                                 |
| user_id       | uuid        | FK to auth.users.id                                                |
| deal_id       | uuid        | FK to ad_deals (a deal may have multiple installments)             |
| amount_sar    | numeric     | NOT NULL                                                           |
| expected_date | date        |                                                                    |
| received_date | date        |                                                                    |
| status        | text        | check in ('pending','received','overdue') · default 'pending'      |
| method        | text        | check in ('bank','cash','other')                                   |
| notes         | text        |                                                                    |
| created_at    | timestamptz | default now()                                                      |

### `meetings`

| Column           | Type        | Notes                                                              |
| ---------------- | ----------- | ------------------------------------------------------------------ |
| id               | uuid        | PK                                                                 |
| user_id          | uuid        | FK to auth.users.id                                                |
| brand_id         | uuid        | FK to brands · nullable                                            |
| deal_id          | uuid        | FK to ad_deals · nullable                                          |
| title            | text        | NOT NULL                                                           |
| scheduled_at     | timestamptz | NOT NULL                                                           |
| location_or_link | text        |                                                                    |
| attendees        | jsonb       | `[{ name, contact? }]` (zod-validated)                             |
| notes            | text        |                                                                    |
| status           | text        | check in ('upcoming','done','cancelled') · default 'upcoming'      |
| created_at       | timestamptz | default now()                                                      |

### `reminders`

| Column      | Type        | Notes                                                                                  |
| ----------- | ----------- | -------------------------------------------------------------------------------------- |
| id          | uuid        | PK                                                                                     |
| user_id     | uuid        | FK to auth.users.id                                                                    |
| kind        | text        | check in ('meeting','payment','deliverable','custom')                                  |
| ref_id      | text        | Id of the meeting/payment/deal this points to                                          |
| ref_table   | text        | 'meetings' | 'payments' | 'ad_deals'                                                  |
| due_at      | timestamptz | NOT NULL                                                                               |
| message_en  | text        | NOT NULL                                                                               |
| message_ar  | text        | NOT NULL                                                                               |
| channel     | text        | check in ('in_app','whatsapp') · default 'in_app' — column ships now so v2 is additive |
| is_done     | boolean     | default false                                                                          |
| is_sent_at  | timestamptz | nullable — future WhatsApp delivery uses this                                          |
| created_at  | timestamptz | default now()                                                                          |

### `snap_reports`

| Column            | Type        | Notes                                                              |
| ----------------- | ----------- | ------------------------------------------------------------------ |
| id                | uuid        | PK                                                                 |
| user_id           | uuid        | FK to auth.users.id                                                |
| deal_id           | uuid        | FK to ad_deals · nullable (optional link to a deal)                |
| report_date       | date        |                                                                    |
| source_file_url   | text        | Supabase Storage URL                                               |
| views             | integer     |                                                                    |
| reach             | integer     |                                                                    |
| story_views       | integer     |                                                                    |
| screenshot_count  | integer     |                                                                    |
| swipe_ups         | integer     |                                                                    |
| raw_ai_json       | jsonb       | Full model response (for debugging + future re-parsing)            |
| extraction_status | text        | check in ('pending','extracted','failed','manual') · default 'pending' |
| created_at        | timestamptz | default now()                                                      |

### `activity_log`

| Column     | Type        | Notes                                                                  |
| ---------- | ----------- | ---------------------------------------------------------------------- |
| id         | uuid        | PK                                                                     |
| user_id    | uuid        | FK to auth.users.id                                                    |
| kind       | text        | `deal_created`, `deliverable_posted`, `deal_posted`, `payment_received`, `deal_paid`, `meeting_scheduled`, `snap_extracted` |
| summary    | text        | Human-readable summary for the recent-activity feed                    |
| ref_id     | text        | Optional — id of the related row                                       |
| ref_table  | text        | Optional — name of the related table                                   |
| created_at | timestamptz | default now()                                                          |

### Indexes (covered earlier in `01-project-overview.md`; restated for completeness)

- `ad_deals (user_id, status, deadline)`
- `payments (user_id, status, expected_date)`
- `meetings (user_id, scheduled_at)`
- `reminders (user_id, due_at, is_done)`
- `snap_reports (user_id, created_at desc)` — supports the per-hour rate-limit count
- `activity_log (user_id, created_at desc)`

### RLS template (the same on every user-owned table)

```sql
alter table <table> enable row level security;

create policy "<table> select own"
  on <table> for select
  using (user_id = auth.uid());

create policy "<table> insert own"
  on <table> for insert
  with check (user_id = auth.uid());

create policy "<table> update own"
  on <table> for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "<table> delete own"
  on <table> for delete
  using (user_id = auth.uid());
```

Ships in the **same migration** as the `create table`. Never in a follow-up.

---

## Supabase Storage

| Bucket         | Path                            | Contents                                |
| -------------- | ------------------------------- | --------------------------------------- |
| `avatars`      | `avatars/{user_id}/avatar.{ext}` | Profile avatar (PNG/JPEG/WebP)          |
| `snap-uploads` | `snap-uploads/{user_id}/<file>` | Snap Insights screenshots (PNG only — PDFs are converted client-side) |

Access: authenticated users only, **own paths only**. Bucket policies restrict select/insert/delete to objects whose path begins with the caller's `auth.uid()`. Validate MIME + magic bytes + size cap on the client before upload; the bucket only ever stores images.

---

## Authentication

- Provider: Supabase Auth
- Methods: Google OAuth + email/password (with email verification)
- Protected routes: `/`, `/dashboard`, `/deals`, `/brands`, `/payments`, `/meetings`, `/analytics/snap`, `/reports`, `/settings`
- Public routes: `/login`, `/auth-callback`
- Protection is enforced client-side by a `ProtectedRoute` wrapper at the route tree, and *guaranteed* server-side by RLS. A user can technically navigate to a protected URL, but they cannot read or write any data without a valid session and matching `user_id`.
- On first successful login → create `app_users` row (locale `ar`, currency `SAR`, lead time 60) → redirect to `/dashboard`.

> **Adaptation note:** A Vite SPA has no `middleware.ts` to intercept server-rendered requests, because there is no server rendering. RLS is the actual security boundary; client-side route guards are convenience UX so users hit the login screen instead of an empty page.

---

## Supabase Client Pattern

Two contexts — never mix them:

```typescript
// frontend/src/lib/supabase.ts
// Browser-side — used by all hooks and components
import { createClient } from '@supabase/supabase-js';
import { ENV } from '@/config/env';

export const supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // for OAuth callback
  },
});
```

```typescript
// backend/supabase/functions/_shared/supabase-server.ts
// Edge-function-side — uses the service role key, lives only in Deno env
import { createClient } from 'jsr:@supabase/supabase-js@2';

export function createSupabaseAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );
}

// When the edge function needs to act AS the calling user (so RLS still applies),
// it creates a per-request client using the user's JWT instead:
export function createSupabaseAsUser(authHeader: string) {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } }
  );
}
```

**Two distinct ownership patterns inside an edge function:**

- **Acting as the user** (preferred default) — the function reads the caller's `Authorization` header and creates a client with that JWT, so all queries run under the user's identity and RLS still enforces ownership. This is what `mark-payment-received` uses, because the RPC checks `auth.uid()`.
- **Acting as admin** (`service_role`) — bypasses RLS. Used only when the function genuinely needs cross-user access (e.g. system-level work) and after explicit ownership checks in code. Influency v1 does not need this anywhere; the service-role key still ships in the function env in case it's needed.

> **Adaptation note:** The JobPilot reference uses `@supabase/ssr` with cookie bridging. A Vite SPA holds the session in memory + Supabase's own auth storage and sends the JWT as a header — no SSR cookies, no `next/headers`. The substance of "two clients, never mix" is identical; the mechanism is simpler.

---

## Edge Function Pattern

The single template every edge function follows:

```typescript
// backend/supabase/functions/mark-payment-received/index.ts
import { z } from 'https://deno.land/x/zod/mod.ts';
import { ok, fail } from '../_shared/api.ts';
import { HTTP, ERROR_CODE } from '../_shared/constants.ts';
import { createSupabaseAsUser } from '../_shared/supabase-server.ts';

const inputSchema = z.object({ paymentId: z.string().uuid() });

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return fail(ERROR_CODE.NOT_FOUND, 'Not found', HTTP.NOT_FOUND);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return fail(ERROR_CODE.UNAUTHENTICATED, 'Missing auth', HTTP.UNAUTHORIZED);
    }

    const body = await req.json();
    const parsed = inputSchema.safeParse(body);
    if (!parsed.success) {
      return fail(ERROR_CODE.VALIDATION, parsed.error.message, HTTP.BAD_REQUEST);
    }

    const supabase = createSupabaseAsUser(authHeader);
    const { data, error } = await supabase.rpc('mark_payment_received', {
      payment_id: parsed.data.paymentId,
    });

    if (error) {
      return fail(ERROR_CODE.INTERNAL, error.message, HTTP.INTERNAL_SERVER_ERROR);
    }

    return ok(data, HTTP.OK);
  } catch (err) {
    // logger is a no-op in production; never console.log
    return fail(ERROR_CODE.INTERNAL, 'Unexpected error', HTTP.INTERNAL_SERVER_ERROR);
  }
});
```

Every edge function: try/catch, zod-validated input, common envelope, correct HTTP status. No exceptions.

---

## Atomic Multi-Row Write Pattern (RPC)

```sql
-- backend/supabase/migrations/0005_mark_payment_received_rpc.sql
create or replace function mark_payment_received(payment_id uuid)
returns void
language plpgsql
security invoker  -- runs as the calling user → RLS still applies
as $$
declare v_deal_id uuid;
begin
  update payments
     set status = 'received', received_date = now()
   where id = payment_id and user_id = auth.uid()
   returning deal_id into v_deal_id;

  if v_deal_id is null then
    raise exception 'payment not found or not owned by caller';
  end if;

  if not exists (
    select 1 from payments
    where deal_id = v_deal_id and status <> 'received'
  ) then
    update ad_deals
       set status = 'paid', updated_at = now()
     where id = v_deal_id and user_id = auth.uid();
  end if;
end;
$$;
```

This is the **canonical atomic write**. Every later atomic operation copies this shape: an edge function that validates input and an RPC that does the multi-row work in one transaction under the user's identity.

---

## Snap Extraction Pattern

```typescript
// backend/supabase/functions/extract-snap-report/index.ts (sketch)
const RATE_LIMIT_PER_HOUR = Number(Deno.env.get('SNAP_RATE_LIMIT_PER_HOUR') ?? 20);
const inputSchema = z.object({
  file_url: z.string().url(),
  snap_report_id: z.string().uuid(),
});

const snapSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['views', 'reach', 'story_views', 'screenshot_count', 'swipe_ups', 'snap_date'],
  properties: {
    views: { type: 'integer' },
    reach: { type: 'integer' },
    story_views: { type: 'integer' },
    screenshot_count: { type: 'integer' },
    swipe_ups: { type: 'integer' },
    snap_date: { type: 'string' },
  },
};

// 1) Rate limit: count this user's snap_reports in the last hour; reject with 429 if over.
// 2) Call OpenAI vision with the FIXED snapSchema as response_format.
// 3) UPDATE snap_reports SET ...fields, extraction_status='extracted'.
// 4) Failure path: UPDATE snap_reports SET extraction_status='failed'; return envelope error.
//
// PROMPT INJECTION DEFENSE: the prompt instructs the model to extract values *as data*.
// Text inside the image is never treated as instructions. The structured-output schema
// is the only contract the model can satisfy.
```

---

## Realtime Pattern (Snap result delivery)

```typescript
// frontend/src/hooks/useSnapReport.ts (sketch)
const channel = supabase
  .channel(`snap_reports:${snapReportId}`)
  .on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'snap_reports', filter: `id=eq.${snapReportId}` },
    (payload) => {
      queryClient.setQueryData(['snap-reports', snapReportId], payload.new);
    }
  )
  .subscribe();
```

> No polling. The UI subscribes once and updates the cache as the edge function writes.

---

## Invariants

Rules the AI agent must never violate:

- Components contain no Supabase calls. All server-state interaction lives in a hook.
- Features code (`features/*`) is React-free and Supabase-free — pure types, schemas, and logic (e.g. the deal status machine).
- Hooks are the only place that touches Supabase from the frontend.
- Every edge function: try/catch, zod-validated input, common envelope (`{ ok, data | error: { code, message } }`), correct HTTP status code, no `console.log`.
- Every user-owned table ships with `user_id = auth.uid()` RLS policies (select/insert/update/delete) in the same migration as the table. **Never** in a follow-up migration.
- Multi-row writes that must be atomic run as a Postgres function (RPC) called from an edge function. Never two separate SDK calls.
- The Postgres RPC enforces ownership (`user_id = auth.uid()`) — never trust an id from the client to imply ownership.
- No hard-coded magic values in components or hooks — statuses, query keys, route paths, HTTP codes, error messages all live in `constants/`.
- No `any`. No inline `import.meta.env` / `Deno.env.get`. All env access goes through the single validated `config/env.ts` (frontend) or `backend/config/env.ts` (edge).
- No `console.log` in committed code. Use `lib/logger.ts` (no-op in production) or remove before commit.
- User-entered text is rendered as text, never HTML. No `dangerouslySetInnerHTML`.
- Snap uploads: validate by MIME **and** magic bytes; cap file size; image types only. PDFs are converted to PNG client-side (pdf.js) before upload.
- Snap extraction: image text is untrusted **data**, never instructions. Fixed structured-output schema is the only contract.
- Per-user rate limit on the Snap edge function. Paid API → cost + DoS guard.
- OpenAI key and `SUPABASE_SERVICE_ROLE_KEY` live only in edge function env (`supabase secrets set`). They never appear in the browser bundle.
- Reminders are created in application code, never via Postgres triggers.
- `logActivity` failures are caught and swallowed. Logging must never break the user's action.
- Dates stored as ISO/Gregorian (UTC); displayed via `lib/date.ts` as Hijri + Gregorian. Never format dates ad-hoc in components.
- Numbers and currency formatted via the lib helpers, never `String(value)` concatenation.
- Layout uses logical Tailwind utilities (`ps-`/`pe-`, `ms-`/`me-`) — no `left-`/`right-` for spacing. Direction is controlled by `<html dir>`.
- Every new data-bearing chunk is verified by the **second-user RLS test** — sign in as a second user, confirm zero cross-tenant data is visible.