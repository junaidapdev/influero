# Library Docs — how THIS project uses each library

Project-specific usage rules. Read before touching any library API. When a usage isn't covered here and you're unsure, fetch current docs (the libraries below move fast) before writing code — do not guess from memory.

Pinned/installed versions live in `frontend/package.json`. `@supabase/supabase-js` is pinned **exact** (2.108.1); the rest use carets.

---

## Supabase (`@supabase/supabase-js`)

**One browser client**, `frontend/src/lib/supabase.ts`, built from the typed `ENV`. Never construct another client in the frontend. Edge functions get their own server-side client (Feature 11+).

```ts
createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // auto-exchanges the OAuth / email code on the callback page
    flowType: "pkce",         // tokens never appear in the URL
  },
})
```

**Auth flows (Feature 02):**
- Email/password: `supabase.auth.signInWithPassword({ email, password })` and `supabase.auth.signUp({ email, password, options: { emailRedirectTo } })`.
- When email confirmation is required, `signUp` returns `data.session === null` (no session until the user clicks the link) → show the verify-email state.
- Google: `supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } })`.
- `redirectTo` / `emailRedirectTo` = `${window.location.origin}/auth-callback`.
- **Callback:** because `detectSessionInUrl` + `flowType: "pkce"` are set, the client exchanges the code into a session automatically on the callback page's load. The `/auth-callback` route just **waits for the session** (via `onAuthStateChange`) — do **not** also call `exchangeCodeForSession`, that would double-consume the code.
- **PKCE caveat:** the code verifier lives in the browser's storage, so an email-confirmation link must be opened **on the same device/browser** that started sign-up. (If cross-device confirmation becomes a requirement, switch email links to `verifyOtp` with a token hash.)
- Session: one subscription lives in `SessionProvider` (`getSession` + `onAuthStateChange`); `hooks/useSession.ts` reads it via context. It's an event subscription, deliberately not TanStack Query. Never open a second `onAuthStateChange` listener in a component/hook — read `useSession()` instead.
- **Error handling:** map auth failures via `AuthError.code` (e.g. `invalid_credentials`, `email_not_confirmed`, `user_already_exists`) — see `features/auth/authError.ts`. Never match on `error.message` text (it gets reworded/localized).

**Data access:**
- All reads/writes through **hooks only** (`frontend/src/hooks/*`). Components never call `supabase` directly.
- Always rely on RLS for tenancy; a `user_id = auth.uid()` filter is convenience, never the only check.
- Idempotent insert: `supabase.from("table").upsert(payload, { onConflict: "user_id", ignoreDuplicates: true })` — used by `useEnsureAppUser` for the profile bootstrap.
- The client is **untyped** (no generated `Database` types yet). Type payloads from `@shared/types/*` (e.g. `Pick<AppUser, ...>`) so writes stay checked.

**Migrations:** SQL in `backend/supabase/migrations/NNNN_*.sql`. RLS ships in the **same migration** as its table. Applied to the project by the developer (`supabase db push` or dashboard) — the agent writes SQL, never holds project credentials.

---

## i18n (`i18next` + `react-i18next`)

- Bootstrapped in `frontend/src/lib/i18n.ts` (imported for side effect in `main.tsx` before render). Single namespace `common`; catalogs in `src/locales/{ar,en}/common.json`.
- Default locale **`ar`** (Arabic-first); persisted in `localStorage` under `influency.locale`.
- The `languageChanged` listener sets `<html lang>` + `<html dir>` (drives font + RTL) and persists the choice. Never set those attributes ad-hoc elsewhere.
- Read/switch locale via `hooks/useLocale.ts`. Get strings via `useTranslation()`'s `t()`.
- **Every user-facing string comes from the catalog** — no hardcoded English/Arabic in components.
- **zod error messages are catalog keys** (e.g. `"auth.errors.emailInvalid"`), resolved with `t(message)` at render. Never show a raw zod message.
- Interpolation: `t("auth.verify.body", { email })` against `{{email}}` in the catalog.

---

## Forms (`react-hook-form` + `@hookform/resolvers` + `zod`)

- Every form: `useForm({ resolver: zodResolver(schema) })`. No hand-rolled `useState` form state.
- Schemas live in `features/<domain>/<domain>.schema.ts` (zod), and will be shared with edge functions via `backend/shared/schemas/` when those land.
- Inputs use `forwardRef` (`components/ui/Input.tsx`) so `{...register("field")}` attaches its ref.
- zod chain order = message priority (e.g. `.min(1, "...Required").email("...Invalid")` → required wins on empty).

---

## Server state (`@tanstack/react-query`)

- `QueryClient` provider in `main.tsx`. All mutations/queries live in `hooks/*` and return `useMutation`/`useQuery` — never `fetch`/`supabase` directly in a component.
- One hook per mutation (e.g. `useSignIn`, `useSignUp`, `useEnsureAppUser`).
- Query keys come from `constants/queryKeys.ts` (added when the first cached query lands). On a mutation, invalidate every key it affects.

---

## Styling (Tailwind v4 + `lucide-react`)

- Tailwind v4 via `@tailwindcss/vite`; tokens in `src/index.css` `@theme`. **No `tailwind.config.ts`.** All color/radius/shadow utilities (`bg-accent`, `rounded-2xl`, `shadow-card`, …) are generated from those tokens — never use raw Tailwind palette classes or hex.
- Logical utilities only for spacing/borders (`ps/pe`, `ms/me`, `border-s/e`, `start/end`) — never `left/right`. Direction follows `<html dir>`.
- `components/ui/*` are currently hand-rolled token-exact primitives (not shadcn/ui — see progress-tracker Feature 02). One component per file, named exports.
- Icons: `lucide-react` named imports (`Loader2`, `Eye`, `MailCheck`, …). Brand logos that lucide lacks (Google) are inline SVGs with their official brand colors — the only sanctioned hardcoded hex.

---

## Routing (`react-router-dom` v6)

- `BrowserRouter` in `main.tsx`; route tree in `App.tsx`. All paths from `constants/routes.ts` — never literal path strings.
- Protected elements wrap in `components/layout/ProtectedRoute.tsx`. Redirects use `<Navigate replace>`.
