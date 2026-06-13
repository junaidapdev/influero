# UI Rules

Concise rules for building Influency UI. Design assets are available — use them as the source of truth for visual decisions. These rules cover the most important patterns and constraints to keep the UI consistent without over-specifying every detail. For tokens (every hex, every size), see `ui-tokens.md`.

---

## Font

Inter for Latin, Tajawal for Arabic. Both load via one Google Fonts `@import` in `src/index.css` (declared in `ui-tokens.md`). The active family follows `<html lang>`:

```css
:root            { font-family: var(--font-sans); }
:root[lang="ar"] { font-family: var(--font-arabic); }
```

Never use system fonts as the primary font. Never substitute a different sans for either family.

> **Adaptation from the JobPilot reference:** the reference uses Next.js's `next/font/google`. Influency is Vite + React, so the font loads via a Google Fonts `@import` in the global stylesheet. Same outcome, different mechanism.

---

## Layout

Mobile-first. The mocks are iPhone-sized (≤ 414px). Every page must be fully usable at **375px width** — this is the dry-run for the future React Native port, and it's the acceptance gate for every UI chunk.

- **Mobile (default):** single column, full-width content, side padding 16px.
- **Tablet (≥ 768px):** same single column, side padding 24px, max content width 640px centered. No multi-column layouts in v1.
- **Desktop:** content stays centered at ≤ 640px. This is a phone-shaped app first; widening the layout is an explicit v2 decision.
- Gap between page sections: 20–24px.
- Top safe area: respect `env(safe-area-inset-top)` so the iPhone notch doesn't crash into the page title.
- Bottom safe area: respect `env(safe-area-inset-bottom)` on the bottom tab bar.
- Every page has a sticky page title row at the top (e.g. "Meetings", "All Deals") with the date or count in muted text immediately above it (e.g. "June 2026", "8 deals").

> **Adaptation:** JobPilot's `max-width: 1440px` desktop rule doesn't apply — Influency has no desktop layout in v1.

---

## Navigation

**Bottom tab bar** with five slots: Home · Deals · [+ FAB] · Calendar · Insights. **No top navbar, no sidebar.**

- The center `+` is a Floating Action Button — **not a tab**. It opens the Quick Add sheet (Brand · Deal · Meeting · Payment · Snap report). It floats 8px above the bar baseline and uses `shadow-fab`.
- Active tab: `text-accent`, icon filled, label weight 600, 12px.
- Inactive tab: `text-text-secondary`, icon outline, label weight 500, 12px.
- The tab bar is `bg-surface` with a 1px top border, height 64px + bottom safe area.
- **Brands**, **Payments**, and **Settings** are not in the tab bar. They're reached from cards on Home, from a deal row, from the profile menu (top-trailing-edge avatar), or via Quick Add. This is intentional — five slots is the ceiling.

> **Adaptation:** JobPilot has a desktop top-navbar with three items. Influency has none of that — bottom tabs only.

---

## Direction (RTL / LTR)

Influency is Arabic-first. **Every layout decision is direction-aware from day one.**

- The root sets `<html lang="ar" dir="rtl">` when locale is Arabic and `lang="en" dir="ltr"` for English.
- Use **logical Tailwind utilities only** for spacing and borders: `ps-*` / `pe-*` / `ms-*` / `me-*` / `border-s-*` / `border-e-*`. Never `pl-*` / `pr-*` / `border-l-*` / `border-r-*`.
- The row-card leading-edge stripe uses `border-s-4` so it visually mirrors with the language. Same for chevrons, back arrows, and the brand avatar's position in a row card (leading edge in both languages, which means left in English and right in Arabic).
- Icons that imply direction (arrows, chevrons, "back") use the `rtl:` variant to flip; non-directional icons (calendar, bell, search, plus) stay put.
- The bottom-tab bar order does not flip — Home stays at the start (leading edge) in both directions, which means it visually moves position when direction changes. The FAB stays centered.

---

## Cards

Every content section lives in a card.

```
background: bg-surface
border: 1px solid var(--color-border)
border-radius: var(--radius-lg)   /* 16px */
padding: 16px
box-shadow: var(--shadow-card)
```

Never use colored card backgrounds — always white. Color goes **inside** cards via status pills, the row-card leading stripe, progress bars, and text, never on the card surface itself.

**Two exceptions, both single-purpose:**

1. The **hero "This Month" card** on Home uses the violet gradient defined in `ui-tokens.md`. It is the only gradient surface in the app.
2. The **"Total pending" strip** on Payments (a thin amber-tinted bar above the list) is the only colored-surface card; it is a callout, not a content card. Background `bg-warning-light`, text `text-warning-foreground`.

---

## Row Cards

A row card is a card-shaped list item used across Home Today, All Deals, Meetings list, calendar day detail, and Payments. Same component everywhere, configured per context.

- 1px border, `var(--radius-lg)`, padding 14px 16px.
- A **4px leading-edge stripe** that encodes the row's category — pull the color from the "Row-Card Left Stripe" table in `ui-tokens.md`. Always `border-s-4` so it mirrors with direction. Never use `border-l-4`.
- Inside layout: leading-edge content (brand avatar or time pill) → title + subtitle → trailing-edge content (status pill or money).
- Tap target: the whole card. Minimum height 64px.
- One status pill at most per row. If a row has both a status and money, the status pill goes on the trailing edge and the money sits below the title.

---

## Status Pills

Pull every pill (deal status, payment status) from the tables in `ui-tokens.md`. **Never invent ad-hoc pill colors** — if a status doesn't exist in the table, add it to the tokens first.

- `border-radius: var(--radius-full)` (pill shape).
- Inline-flex with a colored dot + label, gap 1.5.
- Padding `px-2.5 py-1`, 12px / weight 500.
- Pills are non-interactive by default. If a pill needs to act as a filter, it becomes a **tab** instead (see Segmented Control).

---

## Segmented Control (tabs)

Used for Pending/Received, List/Month, Reports/Snap Analytics, and the filter chips at the top of All Deals (See all · In progress · Pending · Posted · Paid). One control, everywhere.

```
container: bg-surface-muted, p-1, rounded var(--radius-md)
each tab:  px-4 py-2, rounded var(--radius-md), 14px, weight 600
active:    bg-surface, text-accent, shadow-card
inactive:  text-text-secondary
```

When the control has more tabs than fit on a 375px screen (e.g. the deal filter chips), it scrolls horizontally — no wrap, no truncation of the active tab.

---

## Typography Hierarchy

Three levels, used consistently. Exact sizes and weights are in `ui-tokens.md`.

- **Page title** (e.g. "Meetings", "All Deals") — large bold, with a small muted line above it (e.g. "June 2026", "8 deals").
- **Section heading** (e.g. "Today", "Needs attention", "Per brand") — 16px, weight 600.
- **Row title** (deal/meeting name) — 15px, weight 600. Subtitle 13px, regular, muted.
- **Money** always uses the `.money` class (tabular figures). Currency before the amount: `SAR 19,000`.
- **Hijri + Gregorian dates** always render together — Hijri leads in Arabic, Gregorian leads in English, the other appears below in 12px muted. Never format dates ad-hoc.

---

## Buttons

**Primary:**

```
background: bg-accent
text: text-accent-foreground
border-radius: var(--radius-md)
padding: 12px 16px
font-weight: 600
min-height: 44px
```

**Secondary:**

```
background: bg-surface
border: 1px solid var(--color-border)
text: text-text-primary
border-radius: var(--radius-md)
padding: 12px 16px
min-height: 44px
```

**Ghost (link-like):**

```
background: transparent
text: text-accent  (for actions)  OR  text-text-secondary  (for nav like "Calendar →")
hover: bg-surface-secondary
```

Buttons in a row (e.g. "Mark received" + "Send reminder" on a Payments row) sit side-by-side, equal width. Primary action goes on the leading edge.

---

## Form Inputs

```
background: bg-surface
border: 1px solid var(--color-border)
border-radius: var(--radius-md)
padding: 12px 14px
font-size: 14px
text: text-text-primary
placeholder: text-text-muted
focus: ring-2 ring-accent
min-height: 44px
```

- Labels above the input (not floating), 13px, weight 500, muted.
- Inline field errors below the input, 12px, `text-error-foreground`.
- Localized error messages from the i18n catalog — never raw zod messages, never English strings hardcoded.
- Numeric inputs (money, count) render Western digits regardless of locale (so math works), but display formatting follows the locale.

---

## Lists & Empty States

Influency has no `<table>`. Every "list" in the app is a vertical stack of row cards (see Row Cards). Separation is by gap, not by row borders.

**Every list that can be empty must have an empty state.** Keep it minimal:

- A small icon above (optional, muted).
- One line of copy in `text-text-secondary`.
- One CTA button that performs the obvious next action (e.g. "Add your first brand").
- Never show a blank panel.

> **Adaptation:** JobPilot's "Table (Jobs List)" rules don't apply — no tables in Influency.

---

## Progress Indicators

Two distinct kinds; do not confuse them visually.

**Deliverable progress** (on a deal row card) — how far along the deliverables are.

```
track: bg-border-light, height: 6px, rounded-full
fill:  bg-accent
label: "2/4" in 12px text-text-secondary
```

**Collection rate** (on the Per-brand report) — collected ÷ invoiced.

```
track: bg-border-light, height: 6px, rounded-full
fill:  bg-success
label: "32%" in 13px text-text-primary
zero-invoiced: render an em dash (—), never NaN/Infinity/0% as an error
```

The same physical bar component renders both, but the fill color tells the user which one they're looking at — accent = activity progress, green = money realized.

---

## Loading States

Every list and section that can be loading must show a state, not a spinner alone.

- **Skeletons** for list and dashboard loads — rectangles the same shape as the eventual content, with a faint shimmer.
- **Inline pending** for mutation buttons — disabled state + small spinner inside the button.
- **No full-page spinners** except during the very first auth check before the route is even decided.

---

## Error States

- Inline at the row level when the failure is row-scoped (e.g. Snap extraction failed for this report — show the "Couldn't read this — enter numbers manually" path).
- A non-blocking toast for global failures (mutation errors, network issues), from the i18n catalog. Auto-dismiss after a few seconds.
- Never show a raw error message or `[object Object]`. Always a human, localized string.

---

## Bottom Sheet (Quick Add)

The FAB opens a sheet, not a modal page.

- Slides up from the bottom edge, full width, rounded top corners (`var(--radius-2xl)`).
- 36×4px handle bar at the top, centered.
- Two-column grid of tiles: Brand · Deal · Meeting · Payment · Snap report (five tiles; Snap spans the full width of the last row so the grid stays balanced). Brand leads — a deal requires a brand, so the prerequisite sits one tap from the thing that needs it. Each tile = colored circle icon + label.
- Dismiss by tapping the scrim, dragging down, or tapping outside.
- Backdrop is `rgba(0,0,0,0.45)`.

---

## Touch & Accessibility

- **Touch targets** are at least 44×44px everywhere — buttons, pills if tappable, tab targets, FAB, icon buttons in the header.
- **Focus rings:** `ring-2 ring-accent` on `:focus-visible`. Never remove focus indication, even on mobile — keyboard users + screen readers depend on it.
- **Contrast:** all text-on-surface combinations meet WCAG AA. The hero card's white-on-violet meets AA at the metric size.
- **Reduced motion:** respect `prefers-reduced-motion` — disable the Snap-extraction reveal animation and the bottom-sheet slide-in.
- **`lang` attribute:** the root sets `lang="ar"` or `lang="en"` correctly. Screen readers depend on this to switch voices.

---

## Tailwind v4 Note

This project uses Tailwind v4 with the Vite plugin. Tokens are defined with `@theme` in `src/index.css` — no `tailwind.config.ts` needed for colors. Never define colors in a config file. Always use `@theme` for new tokens.

---

## Do Nots

- Never use Tailwind's built-in color classes (`bg-purple-500`, `text-gray-600`) — project tokens only.
- Never define colors in `tailwind.config.ts` — use `@theme` in `src/index.css`.
- Never add gradients to card backgrounds. The hero "This Month" card is the **only** gradient in the app.
- Never use directional spacing utilities (`pl-*`, `pr-*`, `ml-*`, `mr-*`, `border-l-*`, `border-r-*`) — always logical (`ps-*`, `pe-*`, `ms-*`, `me-*`, `border-s-*`, `border-e-*`).
- Never hardcode `left:` / `right:` in inline styles — use `inset-inline-start` / `inset-inline-end` if you ever need positional CSS at all.
- Never put more than one status pill on a row.
- Never invent a new status pill color — extend the tokens first.
- Never format dates ad-hoc in components — use `lib/date.ts`. Never format money ad-hoc — use `lib/currency.ts`.
- Never show raw error messages to users — always human-readable, localized text.
- Never stack more than 2 levels of border radius inside each other.
- Never use `position: fixed` except for: the bottom tab bar, the FAB, and the bottom-sheet scrim — the three things that *must* anchor to the viewport on a phone. Everything else uses normal flow.
- Never put a marketing-style hero, multi-column dashboard, or table layout into this app — it is a phone-shaped operational tool.