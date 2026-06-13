# Code Standards

Implementation rules and conventions for the entire project. The AI agent must follow these in every session without exception. These rules prevent pattern drift across sessions.

---

## Engineering Mindset

The AI agent on this project operates as a senior engineer. This means:

- **Think before implementing** — understand what is being built and why before writing a single line
- **Read context files first** — never assume, always verify against `01-project-overview.md`, `02-architecture.md`, and the active `/specs` file
- **Verify Supabase APIs against docs when uncertain** — for anything beyond the well-trodden patterns (RLS with `auth.uid()`, JS client, edge functions on Deno, realtime channels, storage policies), confirm against `https://supabase.com/docs` before guessing
- **Scope is sacred** — only build what the current feature requires. Never go beyond scope even if it seems helpful
- **Every feature must be testable** — if it cannot be verified immediately after implementation, it is incomplete
- **Clean over clever** — simple readable code that a junior developer can understand is always preferred over clever abstractions
- **One thing at a time** — complete one feature fully before touching the next
- **Failures are expected** — wrap edge function operations in try/catch, log failures, never let one failure crash everything
- **RLS is the security** — every user-owned table ships with `user_id = auth.uid()` policies in the **same migration**. Client-side filtering is convenience, never the only check

---

## TypeScript

- Strict mode enabled in `tsconfig.json` — no exceptions
- Never use `any` — use `unknown` and narrow the type
- Never use type assertions (`as SomeType`) unless absolutely necessary and commented why
- All function parameters and return types must be explicitly typed
- Use `type` for object shapes and unions — use `interface` only for extendable component props
- All async functions must have proper error handling — never let promises float unhandled
- Use `const` by default — only use `let` when reassignment is necessary
- Shared types (deal, payment, brand, API envelope, etc.) live in **one** place (`backend/shared/types/`) and are imported by both frontend and edge functions

---

## Vite + React 18 Conventions

- Vite with React 18 + TypeScript — no SSR, no Next.js
- All components are function components — no class components
- React Router v6 for routing
- TanStack Query for all server state — no inline `fetch` in components, no `useEffect` for data
- Data fetching happens in **hooks** (`hooks/useDeals.ts`, etc.) — never in views
- Forms always use `react-hook-form` + the zod resolver — never hand-rolled `useState` for form state

---

## File and Folder Naming

- Folders: kebab-case — `deals`, `snap-analytics`, `meetings-reminders`
- Component files: PascalCase — `DealsList.tsx`, `TodayPanel.tsx`
- Utility files: camelCase — `date.ts`, `currency.ts`, `supabase.ts`
- Hook files: camelCase, `use` prefix — `useDeals.ts`, `usePayments.ts`
- Type files: camelCase with `.types.ts` suffix — `deal.types.ts`
- Schema files: camelCase with `.schema.ts` suffix — `deal.schema.ts`
- Edge function folders: kebab-case — `extract-snap-report/`, `mark-payment-received/`
- One component per file — never export multiple components from one file
- Index files only in `components/ui/` — never barrel export from other folders

---

## Component Structure

Every component follows this exact order:

```typescript
// 1. External imports
import { useState } from "react";
import { Button } from "@/components/ui/button";

// 2. Internal imports
import { useDeals } from "@/hooks/useDeals";

// 3. Type definitions
type Props = {
  dealId: string;
  status: DealStatus;
};

// 4. Component
export function DealRow({ dealId, status }: Props) {
  // state
  // derived values
  // handlers
  // return JSX
}
```

- Never use default exports for components — always named exports
- Props type defined directly above the component — not in a separate types file unless shared
- No inline styles — all styling via Tailwind classes
- No hard-coded English (or Arabic) strings — every user-facing string comes from the i18n catalog

---

## Edge Functions (the only "API we own")

```typescript
// backend/supabase/functions/mark-payment-received/index.ts

import { ok, fail } from "../_shared/api.ts";
import { HTTP, ERROR_CODE } from "../_shared/constants.ts";
import { markPaymentReceivedSchema } from "../_shared/schemas.ts";
import { createSupabaseAsUser } from "../_shared/supabase-server.ts";

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return fail(ERROR_CODE.UNAUTHENTICATED, "Missing auth", HTTP.UNAUTHORIZED);
    }

    const body = await req.json();
    const parsed = markPaymentReceivedSchema.safeParse(body);
    if (!parsed.success) {
      return fail(ERROR_CODE.VALIDATION, parsed.error.message, HTTP.BAD_REQUEST);
    }

    const supabase = createSupabaseAsUser(authHeader);
    const { data, error } = await supabase.rpc("mark_payment_received", {
      payment_id: parsed.data.paymentId,
    });

    if (error) {
      return fail(ERROR_CODE.INTERNAL, error.message, HTTP.INTERNAL_SERVER_ERROR);
    }
    return ok(data, HTTP.OK);
  } catch (err) {
    // logger.error wraps console.error in non-production; never use console.* directly
    return fail(ERROR_CODE.INTERNAL, "Unexpected error", HTTP.INTERNAL_SERVER_ERROR);
  }
});
```

- Every edge function has a try/catch
- Every edge function validates the request body with zod before any work
- Errors are logged with the function name as prefix: `[mark-payment-received]`
- Every edge function returns the **common response envelope**: `{ ok: true, data }` on success, `{ ok: false, error: { code, message } }` on failure
- Never return raw data without the envelope
- HTTP codes are imported from `constants/http.ts`, never literal numbers

---

## Supabase's Auto-REST Is Not Ours to Reshape

Supabase auto-generates REST endpoints over your tables via PostgREST. **That is Supabase's contract, not ours.** We consume it via `@supabase/supabase-js` + TanStack Query. We do **not** redefine its envelope or its status codes. The "common envelope" rule above applies to **edge functions we write**, never to PostgREST's generated responses.

---

## Database Transactions (Postgres Functions / RPC)

Any multi-row write that must be all-or-nothing runs inside a **single Postgres function** called from an edge function, so it commits or rolls back atomically.

```sql
-- backend/supabase/migrations/00XX_mark_payment_received.sql
create or replace function mark_payment_received(payment_id uuid)
returns void
language plpgsql
security invoker  -- runs as the calling user — RLS still applies
as $$
declare v_deal_id uuid;
begin
  update payments
    set status = 'received', received_date = now()
    where id = payment_id and user_id = auth.uid()
    returning deal_id into v_deal_id;

  if v_deal_id is null then
    raise exception 'payment not found';
  end if;

  if not exists (
    select 1 from payments
    where deal_id = v_deal_id and status <> 'received'
  ) then
    update ad_deals set status = 'paid', updated_at = now()
      where id = v_deal_id and user_id = auth.uid();
  end if;
end;
$$;
```

- The function enforces ownership (`user_id = auth.uid()`) — never trust ids from the client
- Multiple SDK calls from the edge function or the client to "do it in two steps" is the bug this pattern exists to prevent
- `security invoker` is mandatory unless there is a documented reason to bypass RLS. A `security definer` function is a security boundary in itself; do not write one without explicit ownership checks in code

---

## Frontend Mutation Hooks

```typescript
// hooks/usePayments.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { QUERY_KEYS } from "@/constants/queryKeys";

export function useMarkPaymentReceived() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (paymentId: string) => {
      const { data, error } = await supabase.functions.invoke(
        "mark-payment-received",
        { body: { paymentId } },
      );
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error?.message ?? "Request failed");
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PAYMENTS });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.DEALS });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
    },
  });
}
```

- Every mutation hook returns `useMutation(...)` — never call `fetch` directly in a component
- Query keys live in `constants/queryKeys.ts` — never hard-coded in hooks or components
- On success, invalidate **every** cache key that the mutation affects (deals + payments + dashboard for a payment)

---

## Supabase Client Usage

```typescript
// Browser context — frontend
import { supabase } from "@/lib/supabase";

// Edge function context — choose one ownership model:
import { createSupabaseAsUser } from "../_shared/supabase-server.ts"; // default — acts as the caller, RLS applies
import { createSupabaseAdmin }  from "../_shared/supabase-server.ts"; // service_role — bypasses RLS, restricted use only
```

- Never use the browser client inside an edge function, and never use a service-role client in the browser
- **Default to `createSupabaseAsUser`** in edge functions — it forwards the caller's JWT so RLS still enforces ownership. This is what `mark-payment-received` uses
- Use `createSupabaseAdmin` (the `service_role` key) **only** for system-level work that genuinely needs cross-user access, and only after explicit ownership checks in code. Calling it without thinking is the easiest way to silently bypass RLS
- Always scope every query to the current `user_id` — RLS enforces it, the filter is convenience
- Pin the `@supabase/supabase-js` version in `package.json` — passive minor-version drift on a client this central is not worth the risk

---

## Error Handling

- Never use empty catch blocks — always log or handle
- Console errors always include context prefix: `[component/function name]`
- User-facing errors must be human-readable and localized — pulled from the error-messages constants, never raw error strings
- Edge function errors return the envelope `{ ok: false, error: { code, message } }` with the right HTTP status — never expose internals
- `logActivity` failures must be **swallowed** — logging must never break the user's action

---

## Activity Events

All `activity_log` writes use these exact event kinds. Never invent new kinds without adding them here first.

| Event                | When                                        | Key Properties                    |
| -------------------- | ------------------------------------------- | --------------------------------- |
| `deal_created`       | Deal saved for the first time               | userId, dealId, brandId           |
| `deliverable_posted` | RETIRED (deal-lifecycle redesign) — historical rows only, no longer written | userId, dealId, deliverableType   |
| `deal_shot`          | A deal is marked Shot (☐ Shot ticked, or back-stamped when Posted is ticked) | userId, dealId          |
| `deal_posted`        | A deal is marked Posted (☐ Posted ticked)   | userId, dealId                    |
| `payment_received`   | A payment is marked received                | userId, paymentId, dealId, amount |
| `deal_paid`          | All payments for a deal are received        | userId, dealId                    |
| `meeting_scheduled`  | A meeting is created                        | userId, meetingId, scheduledAt    |
| `snap_extracted`     | Snap report extraction completes            | userId, snapReportId, dealId?     |

These are the only event kinds. `deliverable_posted` stays in the DB CHECK so historical rows remain valid but is no longer written. `logActivity` writes are non-blocking — wrap in try/catch and swallow errors. The dashboard's recent-activity feed reads from this table directly.

---

## Environment Variables

All environment variables defined in `.env.local` for frontend development and in the Supabase edge-function project env (set via `supabase secrets set`) for backend. **Never hardcode any key, URL, or secret anywhere in the codebase.**

All `import.meta.env.X` (frontend) and `Deno.env.get('X')` (backend) calls go through **one** typed config module that validates presence at startup. Direct env reads scattered through the code fail review.

| Variable                          | Used In                       | Scope               |
| --------------------------------- | ----------------------------- | ------------------- |
| `VITE_SUPABASE_URL`               | `lib/supabase.ts`             | frontend (public)   |
| `VITE_SUPABASE_ANON_KEY`          | `lib/supabase.ts`             | frontend (public)   |
| `SUPABASE_URL`                    | edge functions                | backend             |
| `SUPABASE_ANON_KEY`               | edge functions (as-user mode) | backend             |
| `SUPABASE_SERVICE_ROLE_KEY`       | edge functions (admin mode)   | backend (secret)    |
| `OPENAI_API_KEY`                  | `extract-snap-report`         | backend (secret)    |
| `SNAP_RATE_LIMIT_PER_HOUR`        | `extract-snap-report`         | backend             |

`VITE_` prefix means the variable is exposed to the browser. **Never add `VITE_` to secret keys** — the OpenAI key and the service-role key live only in edge function env. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-injected into Supabase edge functions by the platform; declare them in the typed config module so the rest of the code reads them consistently.

---

## Constants

All constants live in dedicated modules. Inline magic values fail review.

```typescript
// constants/http.ts
export const HTTP = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// constants/errors.ts
export const ERROR_CODE = {
  VALIDATION: "VALIDATION",
  UNAUTHENTICATED: "UNAUTHENTICATED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL: "INTERNAL",
} as const;

// @shared/types/deal.types.ts
export const DEAL_STATUS = {
  PENDING: "pending", // UI label "To-do"
  SHOT: "shot",
  POSTED: "posted",
  PAID: "paid",
  CANCELLED: "cancelled",
} as const;

// constants/queryKeys.ts
export const QUERY_KEYS = {
  BRANDS: ["brands"] as const,
  DEALS: ["deals"] as const,
  PAYMENTS: ["payments"] as const,
  MEETINGS: ["meetings"] as const,
  REMINDERS: ["reminders"] as const,
  SNAP_REPORTS: ["snap-reports"] as const,
  DASHBOARD: ["dashboard"] as const,
};
```

Status strings in particular — `'pending'`, `'paid'`, `'shot'` — never appear as literals in components or hooks. They come from the constants module.

---

## Validation — One Library, Everywhere

zod, for everything. Every form, every edge function input, every external payload.

```typescript
// shared/schemas/payment.schema.ts
import { z } from "zod";

export const paymentSchema = z.object({
  dealId: z.string().uuid(),
  amount: z.number().positive(),
  expectedDate: z.string().datetime().optional(),
  method: z.enum(["bank", "cash", "other"]).optional(),
  notes: z.string().max(1000).optional(),
});

export type PaymentInput = z.infer<typeof paymentSchema>;
```

- Frontend forms use the zod resolver with `react-hook-form`
- Edge functions parse input with the **same** schemas (shared via `backend/shared/schemas/`)
- Never mix ad-hoc validation with a second library — fails review

---

## Import Aliases

Always use `@/` for frontend, `@shared/` for cross-folder shared code. Never relative imports that go up more than one level.

```typescript
// Correct
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { DEAL_STATUS } from "@/constants/deals";
import { paymentSchema } from "@shared/schemas/payment.schema";

// Never
import { Button } from "../../../components/ui/button";
```

---

## Logging

- **No `console.log` in committed code** — the lint config flags this as an error
- Use a tiny logger wrapper (`lib/logger.ts`) that is a no-op in production builds
- Debug logging removed before commit; commenting it out doesn't count

---

## Security Boundaries (non-negotiable)

- **RLS is the tenancy backbone** — every app table ships with `user_id = auth.uid()` policies in the same migration. Client-only gating is never the sole check
- **Secrets** (OpenAI key, `SUPABASE_SERVICE_ROLE_KEY`) live **only** in Supabase edge function env (set via `supabase secrets set`), surfaced through the typed config module. They never reach the browser bundle
- **Service-role caution** — using `createSupabaseAdmin` bypasses RLS. Default to `createSupabaseAsUser` so RLS keeps enforcing ownership. Admin mode requires explicit ownership checks in code and a comment explaining why
- **OpenAI cost / DoS protection** — per-user rate limit on `extract-snap-report` (count this user's `snap_reports` in the last hour; reject with HTTP 429 over the limit)
- **Prompt injection** — text inside an uploaded screenshot is untrusted **data**, never instructions. The vision call uses a fixed structured-output JSON schema; the model's job is to fill fields, not follow text found in the image
- **File upload hardening** — validate by MIME **and** magic bytes; cap size; image types only. PDFs are converted to PNG client-side (pdf.js) before upload — the bucket only ever stores images
- **Storage bucket RLS** — `snap-uploads` and `avatars` buckets restrict select/insert/delete to objects whose path begins with the caller's `auth.uid()`. Bucket policies ship in the same migration as the bucket
- **XSS** — user-entered text rendered as text, never as HTML. No `dangerouslySetInnerHTML` anywhere
- **No IDOR** — never trust an id from the client to imply ownership; RLS plus a `user_id = auth.uid()` filter gates every read/write
- **OAuth redirect URIs** — set to the production domain in production (the classic "works locally, breaks in prod" bug)
- **Verification gate** for every data-bearing feature — sign in as a second user and confirm they cannot read the first user's rows

---

## Comments

- No comments explaining **what** the code does — the code must be self-explanatory
- Comments only for **why** — explaining a non-obvious decision
- Postgres functions and edge functions may carry a brief comment explaining the transaction or rate-limit strategy
- Never leave TODO comments in committed code

---

## Git Hygiene

- `.gitignore` excludes: `node_modules`, build output, `.env*`, `.cursor/`, `.DS_Store`, scratch `*Fix.md` / scratch notes
- **Do not** blanket-ignore `*.md` — `/context`, `/specs`, `/docs`, and `README` are tracked on purpose
- Project docs go in those folders; never leave scratch `.md` files in the repo root
- `.cursor/` is ignored because per-developer credentials and MCP configs may live there and must not be committed

---

## Dependencies

Never install a new package without a clear reason. Before installing anything check:

1. Does shadcn/ui already have this component?
2. Is there a simpler native solution (Intl, fetch, the platform)?

Approved dependencies for this project:

- `@supabase/supabase-js` — Supabase client (pinned version)
- `openai` — GPT-4o vision API (edge function only)
- `pdfjs-dist` — client-side PDF → PNG conversion
- `@tanstack/react-query` — server state
- `react-router-dom` — routing
- `react-hook-form` + `@hookform/resolvers` — forms
- `zod` — validation
- `react-i18next` + `i18next` — i18n
- `recharts` — reports charts
- `date-fns` — date utilities where Intl is awkward
- `lucide-react` — icons
- `tailwindcss` — styling
- `shadcn/ui` components — UI primitives

Do not install any other packages without updating this list first.