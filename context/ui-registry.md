# UI Registry

Living document. Updated after every component is built. Read this before building any new component — match existing patterns exactly before inventing new ones.

---

## How to Use

Before building any component:

1. Check if a similar component already exists here
2. If yes — match its exact classes
3. If no — build it following ui-rules.md and ui-tokens.md, then add it here

After building any component — update this file with the component name, file path, and exact classes used.

> **Type scale (Feature 17):** font sizes use the tokenized utilities — `text-hero` (28/34), `text-row` (15), `text-body` (13), `text-caption` (12), `text-micro` (11), plus Tailwind's `text-base`/`text-lg`/`text-2xl` (16/18/24). **Never inline `text-[NNpx]`.** The class strings below already reflect this.

---

## Components

### FullPageLoader

- **File:** `frontend/src/components/feedback/FullPageLoader.tsx`
- **Purpose:** Pre-route skeleton shown during the very first auth check, before the entry router decides where to send the user. Shaped like the app shell (title row → hero → 3 stat tiles → row cards) so there's no flash of unauthenticated content and no layout jump on redirect. The one place a full-page loading state is allowed (ui-rules: "No full-page spinners except during the very first auth check").
- **Container:** `min-h-dvh bg-background px-4 py-6` with inner `mx-auto w-full max-w-[640px] space-y-5`. `role="status"` + `aria-busy="true"`.
- **Skeleton blocks:** `animate-pulse … bg-border motion-reduce:animate-none` — title `h-3 w-24 rounded-full` + `h-6 w-40 rounded-md`; hero `h-40 rounded-2xl`; stat tiles `grid grid-cols-3 gap-3` of `h-24 rounded-lg`; rows `space-y-3` of `h-16 rounded-lg`.
- **Tokens used:** `bg-background`, `bg-border`, radii `rounded-full / -md / -lg / -2xl`. No hardcoded colors. Respects `prefers-reduced-motion` via `motion-reduce:animate-none`.

> **Note:** the `components/ui/*` primitives below are hand-rolled token-exact stand-ins, **not** shadcn/ui (avoids `shadcn init` clobbering the `@theme` tokens in `index.css`). Formalizing shadcn later is a clean swap — see progress-tracker Feature 02 notes.

### Button

- **File:** `frontend/src/components/ui/Button.tsx`
- **Props:** `variant` (`primary` | `secondary` | `ghost`, default `primary`), `isLoading`, plus native button attrs. **Defaults `type="button"`** (submit buttons pass `type="submit"`). Not full-width by default — pass `className="w-full"`.
- **Base:** `inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-60`
- **Variants:** primary `bg-accent text-accent-foreground hover:bg-accent-dark` · secondary `bg-surface border border-border text-text-primary hover:bg-surface-secondary` · ghost `bg-transparent text-accent hover:bg-surface-secondary` · destructive `bg-surface border border-error-light text-error-foreground hover:bg-error-lightest`
- **Loading:** renders `<Loader2 className="size-4 animate-spin">` before children; auto-disabled. `min-h-11` = 44px touch target.

### Card

- **File:** `frontend/src/components/ui/Card.tsx` — the default content surface. `rounded-lg border border-border bg-surface p-4 shadow-card`. Accepts `className` + native div attrs. Color goes inside (pills/stripes/text), never on the surface.

### SettingsSection

- **File:** `frontend/src/components/settings/SettingsSection.tsx` — titled group inside a `Card`: heading `text-base font-semibold text-text-primary`, optional description `text-body text-text-secondary`, then children. The standard "labelled settings block" wrapper.

### AvatarDropzone

- **File:** `frontend/src/components/settings/AvatarDropzone.tsx` — avatar picker (Feature 06). The whole dashed box is a `<button>` that opens a hidden `<input type="file">`; also accepts drag-and-drop. Dashed box `rounded-lg border border-dashed bg-surface-secondary p-4` (border `border-border-muted`, → `border-accent bg-accent-muted` while dragging); `size-14 rounded-full bg-accent-light overflow-hidden` avatar circle showing the **preview/current image** (`<img object-cover>`), else the name initial, else an `ImagePlus` icon. Renders an inline `FieldError` below. **Controlled:** parent supplies `currentUrl` / `previewUrl` / `onSelect` / `errorKey` / `disabled` — validation, object-URL lifecycle, and upload all live in the parent + `useUpdateAppUser` (component stays presentational). `accept` derived from `AVATAR_MIME_EXT`.

### Toast

- **File:** `frontend/src/components/ui/Toast.tsx` (presentational) + `components/providers/ToastProvider.tsx` + context `lib/toastContext.ts` + hook `hooks/useToast.ts` (Feature 06). The app's one non-blocking feedback toast. `ToastProvider` wraps `<App>` in `main.tsx` and holds a single slot (latest wins, 3s auto-dismiss). `useToast()(messageKey, variant?)` shows it; `messageKey` is an **i18n key** resolved with `t()`, `variant` is `success | error | info` (`info` added in Feature 12 — neutral notices like the gated Send-reminder's "coming soon"; on a touch app an info toast is the sanctioned stand-in for a hover tooltip).
- **Container:** `fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+16px)]`, `role="status"` + `aria-live="polite"`, `pointer-events-none` (inner card re-enables). **Inner:** `inline-flex max-w-[400px] items-center gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-sm font-medium text-text-primary shadow-card`. Icon `CheckCircle2`/`AlertCircle`/`Info` tinted `text-success-foreground`/`text-error-foreground`/`text-info-foreground`; trailing `X` dismiss button (`size-6`, `aria-label` from `common.dismiss`).
- **Deviation note:** `position: fixed` — ui-rules' fixed-element allowlist (tab bar / FAB / sheet scrim) predates this toast; an overlay toast inherently needs fixed positioning, and ui-rules itself mandates a toast for global failures. Documented exception.

### Input

- **File:** `frontend/src/components/ui/Input.tsx` — `forwardRef` (for react-hook-form `register`). Prop `hasError` swaps `border-border` → `border-error`.
- **Classes:** `min-h-11 w-full rounded-md border bg-surface px-3.5 py-3 text-sm text-text-primary placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`

### Textarea

- **File:** `frontend/src/components/ui/Textarea.tsx` (Feature 09) — multi-line counterpart to `Input`. `forwardRef` (for `register`), prop `hasError` swaps `border-border` → `border-error`. Same border/focus tokens as `Input` with a taller minimum.
- **Classes:** `min-h-[88px] w-full rounded-md border bg-surface px-3.5 py-3 text-sm text-text-primary placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`

### BottomSheet

- **File:** `frontend/src/components/ui/BottomSheet.tsx` (Feature 09) — the app's reusable overlay-form container (the "Add X" / Edit pattern; the FAB's future Quick Add sheet reuses it). Props `open` / `onClose` / `title` / `children`. Slides up from the bottom over a scrim; dismisses via scrim click, **Escape**, or a trailing close `X` (`aria-label` from `common.close`). While open it **locks body scroll**, **traps Tab focus**, moves focus to the first field, and **returns focus to the trigger on close** (captured before focus moves in). `role="dialog"` + `aria-modal` + `aria-labelledby` (a `useId` title). `onClose` is held in a ref so a parent re-render (mutation `isPending`) doesn't re-run the open effect and steal focus.
- **Container:** `fixed inset-0 z-50 flex items-end justify-center`; scrim `absolute inset-0 bg-scrim`. **Panel:** `relative w-full max-w-[640px] rounded-t-2xl bg-surface p-5 pb-[calc(env(safe-area-inset-bottom)+20px)] shadow-card transition-transform duration-300 motion-reduce:transition-none` toggling `translate-y-0` / `translate-y-full` (slide-in on the next frame). **Handle:** `mx-auto mb-4 h-1 w-9 rounded-full bg-border-muted`. **Title:** `text-base font-semibold text-text-primary`. Body `max-h-[70vh] overflow-y-auto`.
- **Deviation note:** `position: fixed` — covered by ui-rules' fixed-element allowlist (the bottom-sheet scrim). The new `--color-scrim` token (`bg-scrim`, `rgba(0,0,0,0.45)` from ui-rules) keeps the backdrop tokenized.

### EmptyState

- **File:** `frontend/src/components/feedback/EmptyState.tsx` (Feature 09) — reusable empty state per ui-rules (small muted icon, one line of copy, one CTA). Props: optional `icon` (a `LucideIcon`), `message` (string), optional `action` (the CTA node). **Classes:** `flex flex-col items-center gap-4 py-12 text-center`; icon `size-8 text-text-muted`; copy `text-sm text-text-secondary`. Every list that can be empty renders this instead of a blank panel.

### Label

- **File:** `frontend/src/components/ui/Label.tsx` — `mb-1.5 block text-body font-medium text-text-secondary`. Label sits above the input.

### FieldError

- **File:** `frontend/src/components/ui/FieldError.tsx` — `mt-1.5 text-xs text-error-foreground`; renders nothing when `message` is empty. Message is an i18n key resolved with `t()` by the caller.

### LocaleToggle (segmented control)

- **File:** `frontend/src/components/ui/LocaleToggle.tsx` — the project's canonical segmented-control pattern (reuse for Pending/Received, List/Month, etc.).
- **Container:** `inline-flex rounded-md bg-surface-muted p-1`, `role="group"`. **Each tab:** `min-h-11 rounded-md px-4 py-2 text-sm font-semibold` — active `bg-surface text-accent shadow-card`, inactive `text-text-secondary`. `aria-pressed` set.
- **Props (Feature 06):** optional `onLocaleChange?(next)` fires *after* the live i18n switch so a caller can persist the choice (Settings writes it to `app_users.locale`). Login uses the toggle with no handler — switch-only. Backward-compatible.

### GoogleIcon

- **File:** `frontend/src/components/auth/GoogleIcon.tsx` — official Google "G" SVG. **Brand hex is intentional** (a third-party logo can't be tokenized); the "no hardcoded hex" rule doesn't apply to brand marks. Default `size-5`.

### VerifyNotice

- **File:** `frontend/src/components/auth/VerifyNotice.tsx` — post-signup "check your email" state. Icon badge `size-12 rounded-full bg-accent-light` + `MailCheck size-6 text-accent`; title `text-lg font-semibold`; body `text-sm text-text-secondary` (interpolates `{{email}}`); ghost Button "Back to sign in".

### LoginForm

- **File:** `frontend/src/components/auth/LoginForm.tsx` — sign-in/sign-up toggle in one form (react-hook-form + zod resolver swapped by mode). Google button → divider (`h-px flex-1 bg-border` + `text-xs text-text-muted`) → error alert (`bg-error-light text-error-foreground` + `AlertCircle`) → email/password fields (inputs forced `dir="ltr"`) → password show/hide toggle on the trailing edge (`end-0 w-11`, `pe-11` on the input) → submit → mode-toggle link. All copy via i18n. Direction-aware via logical utilities.

### ProtectedRoute

- **File:** `frontend/src/components/layout/ProtectedRoute.tsx` — wraps protected route elements. `FullPageLoader` while the session resolves, `<Navigate to=/login replace>` if signed out, else renders children. RLS is the real boundary; this is UX only.

### SessionProvider (not visual)

- **File:** `frontend/src/components/providers/SessionProvider.tsx` + context in `lib/sessionContext.ts`. Holds the app's single `getSession` + `onAuthStateChange` subscription and provides `{ session, isLoading }`. Wrapped around `<App>` in `main.tsx`. All `useSession()` reads flow through it — no per-component listeners.

### CompletionRing

- **File:** `frontend/src/components/dashboard/CompletionRing.tsx` (Feature 07; `tone` added in Feature 14) — small circular progress ring. **Presentational:** caller passes `percent` (0–100, drives the arc) + a pre-formatted localized `label` (e.g. `50%` / `٥٠٪`); optional `size` (default 52) / `strokeWidth` (default 5) / `tone` (`default` | `onAccent`). Two SVG circles — `default`: track `stroke-border-light`, progress `stroke-accent`, text `fill-text-primary`; `onAccent` (the violet hero card's collection-rate ring, per ui-tokens "white stroke on a translucent track"): track `stroke-text-on-accent` at `strokeOpacity 0.3`, progress + text `stroke/fill-text-on-accent`. Progress uses `strokeLinecap="round"`, `strokeDasharray=circumference`, `strokeDashoffset` from percent, `rotate(-90 …)` so it fills clockwise from 12 o'clock; text `text-micro font-semibold`. Arc animates via `transition-[stroke-dashoffset] duration-500 motion-reduce:transition-none`. `aria-hidden` — decorative (the surrounding text carries the meaning). Stroke/fill use the generated `stroke-*` / `fill-*` token utilities — no hex.

### MonthTotalsBar

- **File:** `frontend/src/components/dashboard/MonthTotalsBar.tsx` (Feature 14) — the five top-line month numbers. **Self-contained** (the IncompleteProfileBanner pattern): fetches via `useDashboardStats(month)` (the `get_dashboard_stats` RPC — one round trip) and owns its skeleton (hero-shaped `h-40 rounded-2xl` + 3 `h-20` tiles, `animate-pulse bg-border motion-reduce:animate-none`) and error Card. Prop: `month` (local YYYY-MM, owned by the route so the title row agrees). **Hero "This Month" card** — THE one gradient surface: `rounded-2xl p-5 text-text-on-accent shadow-hero` with inline `linear-gradient(135deg, var(--color-hero-from), var(--color-hero-via), var(--color-hero-to))` (stops are tokens; a gradient can't be a generated utility). Inside: invoiced caption `text-body font-medium opacity-80` → metric `money text-hero font-bold` → trailing `CompletionRing tone="onAccent"` (collection rate = collected ÷ invoiced via `features/dashboard/stats.collectionRate`; **em-dash label when invoiced is 0, never NaN**) → posted/pending line `text-body opacity-80`. **Stat tiles** (`grid grid-cols-3 gap-3`, per ui-tokens "Stat Tiles"): each tile is now a whole-card **`<Link>`** (`block overflow-hidden rounded-lg border border-border bg-surface shadow-card hover:bg-surface-secondary` + focus ring) to the page where that number is managed — **Collected + Outstanding → `/payments`, Posted → `/deals`** (each with an `aria-label` = caption · destination); a 2px top stripe `h-0.5` (Collected `bg-success` / Outstanding `bg-warning` / Posted `bg-accent`) → `p-3` body: value `money text-lg font-bold` + caption `text-xs text-text-secondary`. Above the grid, a right-aligned (`self-end`) **"View payments →" link** (`dashboard.viewPayments`, `text-accent` + `ChevronRight rtl:-scale-x-100`) → `/payments` gives the explicit labelled entry (Payments has no tab — it's a Home-card destination per ui-rules; this replaced the header bell). Money via `formatSar`, counts via `formatNumber`. **F16:** the hero now also calls `useMonthlyTotals()` (shared `/reports` cache) and, below the posted/pending line, renders a `Sparkline` of the invoiced series (`mt-3`) — independent of the stats query, so it simply stays absent until it resolves (no skeleton, never blocks the hero) and hides entirely until at least one month has been invoiced.

### Sparkline

- **File:** `frontend/src/components/dashboard/Sparkline.tsx` (Feature 16) — a tiny hand-rolled SVG trend line for the dashboard hero. **Deliberately NOT Recharts** (the `CompletionRing` hand-rolled-SVG precedent): pulling the lazy `MonthlyTotalsChart` chunk (~358 kB) onto the landing page for a 12-point line would defeat the reason it's lazy-loaded. **Presentational:** props `values: number[]` (oldest-first series), `label` (accessible description — `role="img"` + `aria-label`, since it adds trend the hero number alone doesn't carry), `reversed?` (mirror for RTL so the timeline flows right-to-left / latest month at the trailing edge in Arabic). Single `polyline`, `stroke="currentColor"` (inherits the hero's `text-text-on-accent`) at `strokeOpacity={0.85}`, `vectorEffect="non-scaling-stroke"`; flat mid-line when every value is equal. Renders nothing for fewer than 2 points.
- **Classes / SVG:** `viewBox="0 0 100 32"`, `preserveAspectRatio="none"`, `className="h-9 w-full text-text-on-accent"`. No tokens-as-hex (stroke is a token via `currentColor`); static (no animation, so no reduced-motion concern).

### TodayPanel

- **File:** `frontend/src/components/dashboard/TodayPanel.tsx` (Feature 14; review fixes after F14) — the dashboard Today section; the FIRST READER of `reminders`. **Self-contained:** `useTodayMeetings()` + `useTodayReminders()` (two real TanStack queries keyed to their domain prefixes) + `mergeTodayItems(...)` in the panel (meetings in the 24h window + open reminders due by its end, merged/deduped/sorted by `features/dashboard/todayItems`) + `useDismissReminder` + toasts; owns skeleton rows, partial-load error Cards, and the "All clear" `EmptyState` (icon `CheckCircle2`) in a Card. **Meeting rows** = whole-card `<Link to=/meetings>` with `border-s-4 border-s-accent` stripe, leading **time pill** (`bg-info-light text-info-foreground rounded-md px-2 py-1 text-body font-semibold`; plain time for same-day items, `dashboard.today.tomorrowTime` for next-day items), truncated title, neutral **type badge**, trailing `ChevronRight rtl:-scale-x-100`. **Reminder rows** = route-aware cards when the reminder has an actionable target (payment/ref_table payments → `/payments`, deal reminders deliverable·shoot·post/ad_deals → `/deals`, meeting/meetings → `/meetings`; custom without a ref stays static), stripe per the token table via kind (payment=warning / overdue payment=error / deal reminders deliverable·shoot·post=info / else accent), bilingual message picked by locale (`message_ar`/`message_en`), type badge, and a trailing **Done icon-button** (`Check`, `size-11` target, `hover:text-success-foreground`, aria-label `dashboard.today.doneAria`) → `is_done=true`. The card click/key path navigates; the Done button stops propagation so it only dismisses. Dismiss pending state is a local per-row `Set<string>`, so concurrent taps do not hand off the spinner/disabled state. **Overdue reminders** swap the time pill for `bg-error-light text-error-foreground` "Overdue" (a stale clock time would mislead); the panel owns a tiny clock state that ticks at the next due minute/due timestamp so overdue labels can update without incidental rerenders. Type badge = neutral chip (`rounded-full border border-border-light bg-surface-secondary px-2.5 py-1 text-micro font-medium text-text-secondary`) — the stripe carries the color semantics; never a status pill.

### NeedsAttentionPanel

- **File:** `frontend/src/components/dashboard/NeedsAttentionPanel.tsx` (Feature 14; deal-lifecycle redesign) — overdue payments + deals behind schedule. **Self-contained:** `useOverduePayments` + `useBehindScheduleDeals` (both DB-filtered, indexed; the behind-schedule query is a PostgREST `.or()` of past-post-unposted OR past-shoot-unshot) + the shared cached `useDeals({})` for payment-row deal titles (the /payments pattern — no join, no N+1); owns skeleton, all-failed error Card, partial-failure error Cards, and the "All clear" `EmptyState`. Rows are whole-card `<Link>`s to the page where the fix happens (`/payments` / `/deals`): shared row classes `flex min-h-16 items-center gap-3 rounded-lg border border-border border-s-4 bg-surface px-4 py-3.5 shadow-card hover:bg-surface-secondary` + stripe — overdue payment `border-s-error`, behind-schedule deal `border-s-info` (deal-reminder family). Content: title `text-row font-semibold truncate` + sub-line `text-body text-text-secondary` (`.money` amount · dual-date primary for payments; the overdue date — post_date if past-and-unposted, else shoot_date — for deals) → trailing tag `text-caption font-medium` (`dashboard.attention.postOverdue` / `shootOverdue`, post takes precedence) in `text-error-foreground` / `text-info-foreground` → `ChevronRight rtl:-scale-x-100`. If only one query fails, the loaded half still renders with a localized section-specific error Card for the failed half.

### BrandAvatar

- **File:** `frontend/src/components/brands/BrandAvatar.tsx` (Feature 09) — circular brand avatar. **Presentational:** takes `brand` + optional `size` (`md` default = `size-11 text-base`, `lg` = `size-14 text-xl`). Background tint + glyph color picked **deterministically from the brand id** via `features/brands/brandTint.ts` (six `--color-brand-tint-*` backgrounds, each paired with an existing deeper-tone foreground token — no new tokens, no hex). Shows the **active-locale** name's first glyph (uppercased), `?` fallback. `aria-hidden` (the name is shown as text alongside). Classes: `inline-flex shrink-0 items-center justify-center rounded-full font-semibold {size} {tint.bg} {tint.text}`.

### BrandListItem

- **File:** `frontend/src/components/brands/BrandListItem.tsx` (Feature 09) — directory row card; the **whole card is a `<Link>`** to the brand detail (`brandPath(id)`). Row-card shape: `flex min-h-16 items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3.5 shadow-card transition-colors hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`. Leading `BrandAvatar` → name block (active-locale name `truncate text-row font-semibold text-text-primary`, other-locale name beneath `truncate text-body text-text-secondary`, and `contact_name` when present on a `truncate text-caption text-text-muted` third line) → the **deal count** (`shrink-0 text-body font-medium text-text-muted`, "{n} deals" via `brands.dealCount` + `formatNumber`; an em-dash while the deals index is in flight — prop `dealCount: number | undefined`, grouped client-side by the parent from `useDealsIndex`, filled in Feature 10) → `ChevronRight size-5 text-text-muted rtl:-scale-x-100`. No colored leading stripe (a brand row isn't a status-coded category).

### BrandForm

- **File:** `frontend/src/components/brands/BrandForm.tsx` (Feature 09) — create/edit form shared by the directory's Add sheet and the detail page's Edit sheet. react-hook-form + `zodResolver(brandSchema)`; props `defaultValues` / `onSubmit` / `isSubmitting` / `submitLabel`. Mounts fresh each time its `BottomSheet` opens, so `defaultValues` seed it (empty for create, the brand's values for edit). Fields: `nameEn` (`dir="ltr"`), `nameAr` (`dir="rtl"`), `contactName`, `contactEmail`/`contactPhone` (`dir="ltr"`, `type=email`/`tel`), `notes` (`Textarea`). Each is `Label` → `Input`/`Textarea` (`hasError`) → `FieldError` (message is an i18n key resolved with `t()`). Submit `Button type="submit" className="w-full"` with `isLoading={isSubmitting}`. `flex flex-col gap-4`, `noValidate`.

### Select

- **File:** `frontend/src/components/ui/Select.tsx` (Feature 10) — styled NATIVE `<select>`, the dropdown counterpart to `Input`. `forwardRef` (for `register`), prop `hasError` swaps `border-border` → `border-error`. Native on purpose (RTL-correct, mobile OS picker); `appearance-none` hides the platform arrow and a `ChevronDown` sits on the logical end (`end-3.5`) so it mirrors with direction.
- **Classes:** wrapper `relative`; select `min-h-11 w-full appearance-none rounded-md border bg-surface px-3.5 py-3 pe-10 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`; chevron `pointer-events-none absolute end-3.5 top-1/2 size-4 -translate-y-1/2 text-text-muted`.

### ProgressBar

- **File:** `frontend/src/components/ui/ProgressBar.tsx` (Feature 10) — the shared 6px progress track (ui-rules "Progress Indicators"). Props: `percent` (0–100, clamped), `fill` = `accent` (activity progress — no live consumer since the deal-lifecycle redesign retired the deal-row progress bar; retained for future use) | `success` (money realized — collection rate, F16). `aria-hidden` — the adjacent text label ("32%") carries the meaning.
- **Classes:** track `h-1.5 w-full rounded-full bg-border-light`; fill `h-full rounded-full bg-accent|bg-success transition-[width] duration-300 motion-reduce:transition-none` with inline `width: {percent}%`.

### FilterChips

- **File:** `frontend/src/components/ui/FilterChips.tsx` (Feature 10) — the segmented control as a horizontally scrollable filter row (the All Deals status chips). Generic over string values; props `items` / `value` / `onChange` / `label` (group `aria-label`). Same container/active/inactive classes as `LocaleToggle` (the canonical segmented pattern); scrolls instead of wrapping when chips outgrow 375px. `role="group"`, `aria-pressed` per chip.
- **Classes:** container `flex overflow-x-auto rounded-md bg-surface-muted p-1`; chip `min-h-11 shrink-0 whitespace-nowrap rounded-md px-4 py-2 text-sm font-semibold` — active `bg-surface text-accent shadow-card`, inactive `text-text-secondary`.

### DealStatusPill

- **File:** `frontend/src/components/deals/DealStatusPill.tsx` (Feature 10) — the deal-status pill (dot + localized label), reused across All Deals, the brand detail's deals section, and later Home Today. Colors map 1:1 from ui-tokens "Status Pills — Deals" (To-do/pending=warning, shot=accent, posted=info, paid=success, cancelled=surface-tertiary/text-muted) — never invent a pill color; payments gets its own pill (own token table) in F11. At most one pill per row.
- **Classes:** `inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium {pill}` + dot `size-1.5 rounded-full {dot}`.

### DealForm

- **File:** `frontend/src/components/deals/DealForm.tsx` (Feature 10; create+edit since the deal-lifecycle redesign) — the deal form, hosted in `BottomSheet`, reused for BOTH create (route) and edit (DealExpandedPanel) — the F09 brand pattern. react-hook-form + `zodResolver(dealSchema)`; props `brands` / `defaultValues` / `onSubmit` / `isSubmitting` / `submitLabel`. Brand `Select`, title `Input`, **deliverables builder** = RHF `useFieldArray` rows of [type `Select` | count `Input` (w-24, `dir=ltr`, `inputMode=numeric`) | remove icon-button `size-11`, disabled at one line] + ghost "Add deliverable" button, amount `Input` (`inputMode=decimal`, `dir=ltr`), **shoot date + post date** `Input type=date` side-by-side in a `grid grid-cols-2 gap-3` (both optional), notes `Textarea`. Numeric inputs render Western digits (ui-rules). Errors are i18n keys via `FieldError`.

### DealListItem

- **File:** `frontend/src/components/deals/DealListItem.tsx` (Feature 10) — the deal row card; the whole header is a `<button>` that expands the row INLINE (accordion — no `/deals/:id` route) with `aria-expanded`/`aria-controls` (`useId`). No leading stripe (the status pill carries state; deal rows aren't in the stripe table). Header: title + brand subtitle (subtitle omitted when `brand` prop is `undefined`, e.g. on the brand's own detail page) / trailing `DealStatusPill` → amount (`.money text-body font-semibold`) / trailing dual-date **post_date** (primary + 13px secondary, Hijri-Gregorian via `lib/date.ts`; `deals.noPostDate` when unset) + rotating `ChevronDown`. No progress bar — the status pill + the expanded-row checkmarks carry stage.
- **Classes:** card `rounded-lg border border-border bg-surface shadow-card`; header `flex w-full flex-col gap-3 rounded-lg px-4 py-3.5 text-start transition-colors hover:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-accent`.

### DealExpandedPanel

- **File:** `frontend/src/components/deals/DealExpandedPanel.tsx` (Feature 10; payments F12; rebuilt in the deal-lifecycle redesign) — the inside of an expanded deal row: the **read-only deliverables descriptor** (a `<ul>` of "{n} × {Type}" lines — "what's owed", no checkboxes), the **two lifecycle checkmarks** under a "Progress" heading (☐ Shot / ☐ Posted as `<label flex min-h-11 items-center gap-3>` + native checkbox `size-5 accent-accent`; checked → `text-text-muted line-through`; trailing muted text = the completion date once done (`shot_at`/`posted_at`), else `deals.expanded.planned` with the planned `shoot_date`/`post_date`). **Shot** disabled when posted (posting implies shot — `canToggleShot`) or locked; **Posted** disabled when locked; ticking calls `useMarkShot`/`useMarkPosted`. Then deal notes (when present), the **payment status section** (F12 — unchanged: heading + loading skeleton / error / empty / **fully paid** `text-success-foreground` "All payments received" / partial `money` "X of Y payments received · SAR Z outstanding" plural-aware), the **linked Snap report line** (F15 — read-only `<Link>` to `/analytics/snap`), and the **action row**: a secondary **Edit** button (`Pencil`) opening an edit `BottomSheet` (reuses `DealForm` via `toDealFormInput`; `useBrands` + `useUpdateDeal`; reminderFailed → soft toast) + the **Cancel** two-step inline confirm (destructive "Cancel deal" → [destructive "Yes, cancel it" | ghost "Keep deal"], hidden when paid/cancelled). **Self-contained:** `useBrands` + `usePaymentsForDeal` (fires on expand only — `data` is `{ payments, summary }` via a stable `select`) + `useSnapReportsForDeal` + `useMarkShot`/`useMarkPosted`/`useUpdateDeal`/`useCancelDeal` + toasts. The checkmarks are read-only (disabled) when status is paid/cancelled.

### DealsFilters

- **File:** `frontend/src/components/deals/DealsFilters.tsx` (Feature 10) — the search-controls card on /deals: `FilterChips` for status (See all · To-do · Shot · Posted · Paid — no Cancelled chip; cancelled surfaces under "See all") above a `grid grid-cols-2 gap-3` of brand + month `Select`s (labels via `Label`). Month options are YYYY-MM values from the deals index (bucketed by `post_date`), labelled Gregorian-only via `formatMonthYear` (Hijri months don't align with Gregorian buckets). Filter state lives in the parent and feeds the DB query.

### PaymentStatusPill

- **File:** `frontend/src/components/payments/PaymentStatusPill.tsx` (Feature 11) — the payment-status pill. Colors map 1:1 from ui-tokens "Status Pills — Payments" (pending=warning, received=success, overdue=error) — never invent a pill color. Unlike the deals pill the payments token table defines **no dot color**, so this pill is label-only. The caller passes the DISPLAY status: overdue is derived (`features/payments/overdue.ts`), never stored, in v1. At most one pill per row.
- **Classes:** `inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium {pill}`.

### PaymentListItem

- **File:** `frontend/src/components/payments/PaymentListItem.tsx` (Feature 11; actions row updated in Features 12 + 13) — the payment row card; NOT expandable (the row is the content). Payment rows ARE in ui-tokens' "Row-Card Left Stripe" table, so pending rows carry `border-s-4 border-s-warning`, derived-overdue rows `border-s-4 border-s-error`, received rows no stripe (settled history; the pill carries state). Layout: deal title (resolved by the parent from the cached deals list; em-dash while in flight) + trailing `PaymentStatusPill` → amount (`.money text-body font-semibold`) + trailing dual date (expected_date on pending rows, received_date on received rows, via `lib/date.ts`) → on pending rows only, the ui-rules action pair in a `flex items-center gap-2` row, both `flex-1` (side-by-side, equal width, primary action on the leading edge): secondary "Mark received" `Button` (`isLoading` per-row) + ghost "Send reminder" `Button` (LIVE since Feature 13 — `onSendReminder(payment)` + per-row `isSendingReminder` drive the real `useSendPaymentReminder` mutation; the F12 "coming soon" tooltip/title is gone; each button disables while the other is in flight).
- **Classes:** card `flex min-h-16 flex-col gap-3 rounded-lg border border-border bg-surface px-4 py-3.5 shadow-card {stripe}`.

### PaymentForm

- **File:** `frontend/src/components/payments/PaymentForm.tsx` (Feature 11) — the Add-payment form, hosted in `BottomSheet`. react-hook-form + `zodResolver(paymentSchema)`; props `deals` (ACTIVE deals only — parent filters out cancelled/paid) / `defaultValues` / `onSubmit` / `isSubmitting` / `submitLabel`. Fields: deal `Select`, amount `Input` (`inputMode=decimal`, `dir=ltr`), expected date `Input type=date`, method `Select` (optional: not-set/bank/cash/other), notes `Textarea`. Each is `Label` → control (`hasError`) → `FieldError` (i18n keys via `t()`). Submit `Button type="submit" className="w-full"` with `isLoading`. `flex flex-col gap-4`, `noValidate`.

### MeetingListItem

- **File:** `frontend/src/components/meetings/MeetingListItem.tsx` (Feature 13) — the meeting row card; the WHOLE card is a `<button>` that opens the edit sheet (`aria-label` via `meetings.actions.editAria`). Meetings ARE in ui-tokens' "Row-Card Left Stripe" table (meeting = accent): `border-s-4 border-s-accent` on every row. No status pill — cancelled meetings are excluded from the month query and 'done' has no writer. Layout: leading **time pill** (`shrink-0 rounded-md bg-info-light px-2 py-1 text-body font-semibold text-info-foreground`, time via `lib/date.ts formatTime`) → title (`truncate text-row font-semibold text-text-primary`) + subtitle (brand name · location/link joined, `truncate text-body text-text-secondary`) → trailing dual date (`formatDualTimestampDate` — the LOCAL-timezone dual formatter; 13px secondary over 12px muted), hidden via `showDate={false}` under the calendar's selected-day heading.
- **Classes:** `flex min-h-16 w-full items-center gap-3 rounded-lg border border-border border-s-4 border-s-accent bg-surface px-4 py-3.5 text-start shadow-card transition-colors hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`.

### MeetingForm

- **File:** `frontend/src/components/meetings/MeetingForm.tsx` (Feature 13) — the Add/Edit-meeting form, hosted in `BottomSheet`, react-hook-form + `zodResolver(meetingSchema)`; props `brands` / `deals` (ACTIVE deals only — parent filters) / `defaultValues` / `onSubmit` / `isSubmitting` / `submitLabel`. Mounts fresh each sheet open so `defaultValues` seed it (empty for create, the meeting's values for edit — the F09 pattern). Fields: title `Input`, scheduled-at `Input type="datetime-local" dir="ltr"`, location/link `Input`, **attendees builder** = RHF `useFieldArray` rows of [name `Input` | contact `Input` | remove icon-button `size-11`] removable to ZERO (attendees optional) + ghost "Add attendee", brand `Select` (empty option = not linked), deal `Select` (empty option = not linked), notes `Textarea`. Errors are i18n keys via `FieldError`. Submit `Button type="submit" className="w-full"` with `isLoading`. `flex flex-col gap-4`, `noValidate`.

### MeetingCalendar

- **File:** `frontend/src/components/meetings/MeetingCalendar.tsx` (Feature 13) — the Gregorian month grid (hosted in a `Card`; Hijri stays on individual dates — grid buckets are Gregorian, same rationale as the deals month filter). Pure grid math from `features/meetings/calendar.ts` (`monthGridDays`, week starts SUNDAY — the Saudi week); weekday header via `lib/date.ts weekdayLabels`. Day cells are `<button>`s `min-h-11` (44px touch target), day numbers locale digits via `formatNumber`; a `size-1 rounded-full` accent dot marks days with meetings. States: selected `bg-accent text-accent-foreground font-semibold` (dot flips `bg-accent-foreground`), today-unselected `bg-accent-light text-accent font-semibold`, in-month `text-text-primary hover:bg-surface-secondary`, pad cells of other months `text-text-muted opacity-40` + disabled (month nav is how you leave the month). **`role="group"` + `aria-label` + per-cell `aria-pressed`** — deliberately NOT `role="grid"` (an ARIA grid demands row/gridcell structure + arrow-key nav; half-faking it reads as broken to screen readers — `/review` fix). Under `<html dir="rtl">` the 7-column grid flows right-to-left automatically — correct for Arabic calendars.
- **Classes:** grid `grid grid-cols-7 gap-1`; header cell `py-1 text-center text-xs font-medium text-text-muted`; day cell `flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none` + state tone.

### SnapStatusPill

- **File:** `frontend/src/components/snap/SnapStatusPill.tsx` (Feature 15) — the snap extraction-status pill. Colors map 1:1 from ui-tokens "Status Pills — Snap reports" (pending=warning, extracted=success, failed=error, manual=info) — never invent a pill color. Label-only like the payments pill (the snap table defines no dot). At most one pill per row.
- **Classes:** `inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium {pill}`.

### SnapDropzone

- **File:** `frontend/src/components/snap/SnapDropzone.tsx` (Feature 15) — the snap upload picker (click or drag-and-drop; accepts PNG/JPEG/WebP/PDF). **Presentational** (the AvatarDropzone pattern): validation (MIME + magic bytes + size via `features/snap/upload.ts`), the pdf.js PDF→PNG conversion, and the upload all live in the parent/hooks — this only emits the chosen `File`. Props `onSelect` / `errorKey` (i18n key → `FieldError` below) / `isBusy` (spinner icon + busy label, disabled).
- **Classes:** button `flex w-full flex-col items-center gap-3 rounded-lg border border-dashed bg-surface-secondary px-4 py-8 text-center …` (`border-accent bg-accent-muted` while dragging, else `border-border-muted`); icon circle `grid size-12 place-items-center rounded-full bg-accent-light text-accent` with `UploadCloud` / spinning `Loader2`.

### SnapReportListItem

- **File:** `frontend/src/components/snap/SnapReportListItem.tsx` (Feature 15; type chip + monthly title in 16B) — the snap report row card; the WHOLE card is a `<button>` that opens the detail sheet (the MeetingListItem pattern). No leading stripe — snap rows aren't in the stripe table; the `SnapStatusPill` carries state (deal-row precedent). Title follows `report_type` (16B): monthly rows title with `formatMonthYear` (Gregorian month-year — the deals month-filter rationale), post rows with the dual snap date (`formatDualDate`); either falls back to a generic per-type label. A **neutral type chip** (the TodayPanel type-badge classes — `rounded-full border border-border-light bg-surface-secondary px-2.5 py-1 text-micro font-medium text-text-secondary`, never a status pill) names the kind (`snap.type.post` / `snap.type.monthly`) before the status pill. Sub-line = `Views X · Reach Y` once extracted (em dashes for nulls), a pulsing "Reading the numbers…" while pending, or the enter-manually nudge. Trailing chip + pill + `ChevronRight rtl:-scale-x-100`.
- **Classes:** `flex min-h-16 w-full items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3.5 text-start shadow-card transition-colors hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`.

### SnapReportSheet

- **File:** `frontend/src/components/snap/SnapReportSheet.tsx` (Feature 15; per-type fields + export in 16B) — the detail body hosted in the route's `BottomSheet`. **Self-contained** (the TodayPanel pattern): owns `useUpdateSnapFields` / `useLinkSnapToDeal` / `useSnapSignedUrl` (+ the cached `useAppUser` / `useBrands` for the card context) + toasts. Top-down: source-image preview via signed URL (`max-h-64 w-full rounded-lg border border-border object-contain`, skeleton while signing); failed-state alert (`flex items-start gap-2 rounded-md bg-error-light p-3 text-sm text-error-foreground` — the LoginForm alert pattern, NOT a colored card); the **type's field set** (16B: post = the original five; monthly = views/reach/storyViews + profileViews/newFollowers/watchTimeMinutes) each as a label/value row (`flex min-h-11 items-center justify-between`, value `money text-sm font-semibold`, em dash for null) with a trailing **edit pencil** icon-button (`grid size-11 place-items-center`, `Pencil size-4`, aria-label `snap.detail.editAria`) that swaps the row to a registered `Input` (RHF + `zodResolver(snapReportSchema)`, `values` + `keepDirtyValues` so a realtime settle refreshes non-dirty fields); the date row is labelled per type (`snap.fields.reportDate` / `snap.fields.month`, monthly displayed via `formatMonthYear`); **failed reports open with ALL of the type's fields editable** (manual entry IS the recovery path); Save/Discard pair (`flex-1` each) appears only while editing — saving stamps `extraction_status='manual'`; the link-to-deal `Select` saves on change and never touches status — **hidden on monthly reports** (account-level, no deal). Pencils disabled while the row is still `pending`. **Export (16B):** once `extracted`/`manual`, a "Report preview" section renders `SnapReportCard` inside a `bg-background p-3` capture wrapper (the wrapper becomes the PNG's margin — no transparent corners) + a secondary `Download` button → lazy `import("html-to-image")` (`toPng`, `pixelRatio 2`, own ~14 kB chunk — its only consumer) → anchor-download `snap[-monthly]-report-<date>.png` + success/error toasts.

### SnapReportCard

- **File:** `frontend/src/components/snap/SnapReportCard.tsx` (Feature 16B) — the brand-facing report card the influencer exports as a PNG and sends over WhatsApp. **Presentational:** props `report` / `appUser` (the "prepared by" identity) / `brandName` / `dealTitle` (post-report context, resolved by the sheet; both absent on monthly). Renders in the ACTIVE locale — the export captures the DOM as shown, which is how Arabic shaping / RTL / Hijri dates survive the PNG. Structure: `overflow-hidden rounded-2xl border border-border bg-surface shadow-card` with a **4px `bg-accent` top strip** (the card's brand line, not a status color) → `p-5` column: header row (`ProfileAvatar noImage` — initial/glyph only so the PNG export never hits a cross-origin avatar — + `display_name` `text-sm font-semibold` + per-type caption `text-xs text-text-secondary` from `snap.card.titlePost|titleMonthly`) → context block (post: `brandName · dealTitle` `text-lg font-bold` + dual date line; monthly: `formatMonthYear` month) → **metric grid** `grid grid-cols-2 gap-3` of tiles `rounded-lg border border-border-light bg-surface-secondary p-3` (value `money text-lg font-bold`, em dash for null, label `text-xs text-text-secondary`; per-type field set) → footer `border-t border-border-light pt-3 text-center text-micro text-text-muted` (`snap.card.footer`, "Generated with Influero"). Numbers via `formatNumber`, dates via `lib/date.ts` — tokens only.

- **File:** `frontend/src/components/payments/TotalPendingStrip.tsx` (Feature 11) — ui-rules' ONE sanctioned colored-surface card: the thin amber callout above the Payments pending list ("Total pending" + amount). Caller passes the amount pre-formatted via `formatSar`. Never reuse this pattern for content cards — every other card stays white.
- **Classes:** `flex items-center justify-between gap-3 rounded-lg bg-warning-light px-4 py-3`; label `text-sm font-semibold text-warning-foreground`; amount adds `.money`.

### IncompleteProfileBanner

- **File:** `frontend/src/components/dashboard/IncompleteProfileBanner.tsx` (Feature 07) — dashboard nudge to finish the profile. **Self-contained:** reuses the cached `useAppUser` query and derives completeness via the pure `features/profile/completion.ts` (`getProfileCompletion`); local `useState` dismiss. Renders **nothing** while the profile loads/errors, once complete, or after dismiss. Wrapped in a `Card`; top row `flex items-start gap-4`: leading `CompletionRing` → middle column (`h2` title `text-row font-semibold`, description `text-body text-text-secondary`, missing-field tags, a `Link`-as-CTA to `/settings`) → trailing dismiss `X` button (`-me-2 -mt-2 grid size-11 place-items-center`, `aria-label` from `common.dismiss`). **Missing-field tags:** `inline-flex rounded-full border border-border-light bg-surface-secondary px-2.5 py-1 text-micro font-medium text-text-secondary ltr:uppercase ltr:tracking-wide` — neutral (not a status pill, so no token-table pill color); `ltr:`-gated `uppercase`/`tracking-wide` so Arabic keeps natural case + cursive joining. **CTA:** `Link` styled `inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-semibold text-accent hover:text-accent-dark` + `ArrowRight` with `rtl:-scale-x-100`. Percent label via `lib/numbers.ts` `formatPercent(pct/100, locale)`.

### MonthlyTotalsChart

- **File:** `frontend/src/components/reports/MonthlyTotalsChart.tsx` (Feature 16) — the Reports monthly invoiced-vs-collected bar chart (Recharts, the lib's first + only consumer). **Presentational:** takes `data: MonthlyTotal[]` (last 12 months, oldest first); the route owns the data. **Lazy-loaded by the route** (`React.lazy` + `Suspense`) so Recharts lands in its OWN chunk (~358 kB / 108 kB gzip) instead of the main bundle — the pdf.js precedent; `/reports` is a leaf page. Custom textual **legend** above the chart (two `bg-accent` / `bg-success` `size-2.5 rounded-sm` swatches + `text-xs text-text-secondary` labels) for token + i18n control. Chart in a `h-60 w-full` box → `ResponsiveContainer width="100%" height="100%"`. `BarChart` with grouped `Bar`s: invoiced `fill="var(--color-accent)"`, collected `fill="var(--color-success)"`, both `radius={[4,4,0,0]}`. `CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false}`; axes `tick={{fontSize:12, fill:"var(--color-text-muted)"}}`, `tickLine={false}`. **Chart colors are CSS-var token strings** (`var(--color-*)`) — Recharts paints SVG attributes from real color values, so Tailwind utilities don't apply; this is the sanctioned token form (ui-tokens "Charts (Recharts)"). **RTL-tolerant** (ui-tokens): `XAxis reversed={isArabic}` + `YAxis orientation={isArabic ? "right" : "left"}` so the chart reads right-to-left in Arabic. Y-axis ticks via `formatCompactNumber` (locale digits, "20K"/"٢٠ ألف"); X-axis labels via `formatMonthShort` (Gregorian short month); `Tooltip` value via `formatSar`. Recharts v3 `accessibilityLayer` is on by default (keyboard-navigable); the legend + tooltip carry meaning. **First component under `components/reports/`.**

### PerBrandReportItem

- **File:** `frontend/src/components/reports/PerBrandReportItem.tsx` (Feature 16) — one brand's row in the per-brand report. A **static row card** (NOT a `<Link>` — there's no per-brand-report detail route), shaped like `BrandListItem` with **no leading stripe** (brand rows aren't status-coded). **Presentational:** takes `row: PerBrandRow`. Leading `BrandAvatar` → name block (active-locale name `truncate text-row font-semibold` + `.money truncate text-body text-text-secondary` summary "{n} deals · SAR X invoiced" via `formatNumber`/`formatSar`) → trailing **collection-rate label** (`shrink-0 text-body font-semibold text-text-primary`, `aria-label` = `reports.perBrand.rateAria`) → below, a `ProgressBar fill="success"` (money realized). Collection rate via the SHARED `features/dashboard/stats.collectionRate` guard (one zero-invoiced guard, not two) → **em dash when invoiced is 0, never NaN** (bar sits at 0%, label "—"); clamped to 100%.
- **Classes:** card `flex flex-col gap-3 rounded-lg border border-border bg-surface px-4 py-3.5 shadow-card`.

### AppLayout (the shell)

- **File:** `frontend/src/components/layout/AppLayout.tsx` (Nav slice; greeting header in F17; bell removed when Payments moved to the dashboard) — wraps every protected page (App.tsx mounts it as the layout route's element around the page `Outlet`, inside `ProtectedRoute`). Renders, top to bottom: a **sticky greeting header** (`sticky top-0 z-30 bg-background/90 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+8px)] backdrop-blur-sm`, inner `mx-auto flex w-full max-w-[640px] items-center gap-3` so it tracks the page column) holding the profile-avatar button at the LEADING edge (`ProfileAvatar shape="square" solid`, `size="xl"` on the dashboard / `lg` elsewhere → opens the profile menu), a "Hi, {name}" greeting block on the dashboard only (`dashboard.greeting` caption `text-body text-text-secondary` + `display_name` `truncate text-row font-bold`; pages keep their own title rows), and a trailing `ms-auto flex items-center gap-2` holding a single presentational **search button** (`size-12 rounded-2xl border border-border bg-surface text-text-secondary shadow-card`, `Search` icon, no search feature in v1). **The notification bell was removed** — it had only ever linked to /payments, which now has a proper labelled home on the dashboard money tiles (see MonthTotalsBar), so a bell-with-alert-dot implying notifications was misleading. The page content sits in a wrapper with bottom clearance `pb-[calc(env(safe-area-inset-bottom)+88px)]` so the fixed bar + floating FAB never cover content; then the `MobileTabBar`; and the `QuickAddSheet` + `ProfileMenuSheet` whose open state it owns. Reads `useAppUser` for the avatar + greeting. Outer `min-h-dvh bg-background`.

### MobileTabBar

- **File:** `frontend/src/components/layout/MobileTabBar.tsx` (Nav slice) — the app's ONLY navigation (ui-rules: bottom tab bar, no top navbar / sidebar). Fixed bottom bar, five slots **Home · Deals · [+ FAB] · Calendar · Insights**; `onQuickAdd` prop fires the FAB (the sheet lives in AppLayout). Active state from `useLocation().pathname` — Insights is active on `/reports` OR `/analytics/snap`. Tabs are `<Link>`s with `aria-current`; active = `text-accent` + label `font-semibold`, inactive = `text-text-secondary` + `font-medium` (lucide is outline-only at the `1.17.0` pin, so active reads via color + weight, not a filled-glyph swap). Icons: Home `Home`, Deals `Megaphone`, Calendar `Calendar`, Insights `BarChart3`, FAB `Plus`.
- **Classes:** nav `fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]`; inner `mx-auto grid h-16 max-w-[640px] grid-cols-5 items-center px-1` (centered to the app's 640px column); each tab `flex min-h-11 flex-col items-center justify-center gap-1 rounded-md py-1` + icon `size-5` + label `text-xs`. **FAB** (center slot, ui-tokens): `-mt-7 grid size-14 place-items-center rounded-full bg-accent text-accent-foreground shadow-fab` (floats above the bar baseline via the negative top margin).

### ProfileAvatar

- **File:** `frontend/src/components/layout/ProfileAvatar.tsx` (Nav slice; `noImage` in 16B) — the signed-in user's avatar (the shell header trigger + the profile menu header). **Presentational** (the BrandAvatar shape): the uploaded `avatar_url` image when set (`<img object-cover>`), else the `display_name` initial (uppercased), else a neutral `User` glyph. Accent tint (a person, not a brand → no per-id tinting). Props `appUser: AppUser | undefined`, `size` (`sm` = `size-9 text-sm` default, `lg` = `size-12 text-lg`), **`noImage?: boolean`** (suppresses the network `<img>` → initial/glyph only; the `SnapReportCard` passes it because the card is serialized to a canvas for PNG export and a cross-origin avatar — e.g. a Google OAuth photo on lh3 — 429-rate-limits / taints the canvas and rejects the export). `aria-hidden` (the trigger button / menu carry the label). Classes: `inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-light font-semibold text-accent {size}`.

### QuickAddSheet

- **File:** `frontend/src/components/layout/QuickAddSheet.tsx` (Nav slice; Brand tile added F17) — the FAB's Quick Add sheet (ui-rules / ui-tokens "Bottom Sheet (Quick Add)"), hosted in `BottomSheet` (title `nav.quickAdd`). A `grid grid-cols-2 gap-3` of five tiles — **Brand · Deal · Meeting · Payment · Snap report** — where the Snap tile carries `col-span-2` (driven by a `span?: boolean` on the tile type) so the odd fifth tile spans the last row instead of sitting alone half-width. Brand leads because a deal requires a brand (the prerequisite sits one tap from the thing needing it). Each tile = `flex flex-col items-center gap-2 rounded-lg bg-surface-secondary p-4` with an icon in a colored circle (`grid size-12 place-items-center rounded-full {circle}`) + label `text-sm font-semibold`. Circles use existing brand-tint backgrounds + deeper-tone foregrounds (no new tokens): Brand `bg-brand-tint-neutral text-text-secondary` (`Building2` — matches the profile menu's Brands icon; neutral grey avoids the false "danger" read of the only other free tint, pink/error), Deal `bg-brand-tint-violet text-accent` (`Megaphone`), Meeting `bg-brand-tint-blue text-info-foreground` (`CalendarPlus`), Payment `bg-brand-tint-amber text-warning-foreground` (`Wallet`), Snap `bg-brand-tint-green text-success-foreground` (`Image`). A tile closes the sheet then `navigate`s to the destination — Brand/Deal/Meeting/Payment pass `state: { quickAdd: true }` (the destination route's `useQuickAddOpen` pops its existing Add sheet — `BrandsRoute` now wires this hook too); Snap just navigates (its upload card IS the add surface).

### ProfileMenuSheet

- **File:** `frontend/src/components/layout/ProfileMenuSheet.tsx` (Nav slice) — the profile menu (the shell header avatar opens it), hosted in `BottomSheet` (title `nav.menuTitle`). Header row = `ProfileAvatar size="lg"` + the `display_name` (or the session email fallback). Then a list of the three OFF-tab destinations (ui-rules: Brands · Payments · Settings — icons `Building2`/`Wallet`/`Settings`) as row buttons (`flex min-h-12 w-full items-center gap-3 rounded-md px-2 py-3 text-start hover:bg-surface-secondary`, trailing `ChevronRight rtl:-scale-x-100`), a `h-px bg-border-light` divider, then **Sign out** (`LogOut`, `text-error-foreground`, `hover:bg-error-lightest`) → `useSignOut` → `/login`. Each link closes the sheet then navigates.

### InsightsTabs

- **File:** `frontend/src/components/insights/InsightsTabs.tsx` (Nav slice) — the "Insights" segmented control shared by `/reports` and `/analytics/snap` (ui-rules: "Reports / Snap Analytics"), rendered at the TOP of both pages. **Reuses `FilterChips`** (the canonical segmented control) but each segment NAVIGATES between the two routes instead of toggling local state: `value` follows `useLocation().pathname` (snap → `ANALYTICS_SNAP`, else `REPORTS`); `onChange` navigates when the target differs. Labels reuse `reports.title` / `snap.title`. First component under `components/insights/`.
