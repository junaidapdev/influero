# UI Tokens

Design tokens for Influency. All colors, typography, spacing, and component values extracted from the delivered mobile mocks. Use these exact values throughout the codebase — never hardcode colors or use raw Tailwind color classes in components.

---

## How to Use

This project uses **Tailwind CSS v4** with Vite. All design tokens are defined using the `@theme` directive in `src/index.css`. No `tailwind.config.ts` needed for colors or tokens — v4 reads them from CSS.

> **Adaptation from the JobPilot reference:** the reference puts tokens in `app/globals.css` and loads the font with `next/font/google`. Influency is Vite + React, so tokens live in `src/index.css` and the font is loaded via Google Fonts `@import`. The `@theme` mechanism is identical.

Tailwind v4 automatically generates utility classes from `@theme` variables:

- `--color-accent` → `bg-accent`, `text-accent`, `border-accent`
- `--color-surface` → `bg-surface`, `text-surface`, `border-surface`

```tsx
// Correct — uses generated utility classes
className="bg-surface text-text-primary border-border"

// Also correct — references CSS variable directly
style={{ color: 'var(--color-text-primary)' }}

// Never — hardcoded hex values
className="bg-[#F4F4F8] text-[#101828]"

// Never — raw Tailwind color classes
className="bg-purple-500 text-gray-600"
```

---

## src/index.css — Complete Token Definition

```css
@import "tailwindcss";

/* Inter for Latin; Tajawal for Arabic. Tajawal pairs cleanly with Inter at the same metrics. */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Tajawal:wght@400;500;700&display=swap');

@theme {
  /* Fonts */
  --font-sans: "Inter", "Tajawal", system-ui, sans-serif;
  --font-arabic: "Tajawal", "Inter", system-ui, sans-serif;

  /* Type scale — the §Typography sizes Tailwind's default scale
     (12/14/16/18/20…) doesn't cover, tokenized so components never inline
     `text-[NNpx]`. Font-size only (line-heights stay inherited) EXCEPT
     --text-hero, which carries its 34px leading. --text-micro (11px) sits
     below the 12px floor for the smallest chips/labels. 16/18/24px keep using
     Tailwind's text-base / text-lg / text-2xl. */
  --text-hero: 28px;            /* hero metric → text-hero (28/34) */
  --text-hero--line-height: 34px;
  --text-row: 15px;             /* row title → text-row */
  --text-body: 13px;            /* row subtitle, amount/time pill → text-body */
  --text-caption: 12px;         /* status pill, Hijri date, caption → text-caption */
  --text-micro: 11px;           /* smallest chips / ring percent → text-micro */

  /* Page and surface backgrounds */
  --color-background: #f4f4f8;        /* lavender-tinted page background from the mocks */
  --color-surface: #ffffff;
  --color-surface-secondary: #f9fafb;
  --color-surface-tertiary: #f2f5f7;
  --color-surface-muted: #f4f5fb;

  /* Borders */
  --color-border: #e7eaf3;
  --color-border-light: #eceef5;
  --color-border-muted: #dfe1e7;

  /* Text */
  --color-text-primary: #101828;
  --color-text-secondary: #6a7282;
  --color-text-muted: #99a1af;
  --color-text-dark: #364153;
  --color-text-darker: #36394a;
  --color-text-darkest: #111827;
  --color-text-on-accent: #ffffff;     /* text on top of the violet hero card */

  /* Primary accent — Influency violet (slightly cooler than JobPilot's purple) */
  --color-accent: #6e56f5;
  --color-accent-dark: #5340e6;
  --color-accent-darker: #3f2cc7;
  --color-accent-light: #ede9ff;       /* "In progress" pill bg, primary button hover surface */
  --color-accent-muted: #f6f3ff;       /* very faint violet wash */
  --color-accent-foreground: #ffffff;

  /* Hero gradient stops (used by the "This Month" card on Home) */
  --color-hero-from: #7a63ff;
  --color-hero-via:  #6e56f5;
  --color-hero-to:   #5340e6;

  /* Success — green (Paid, Posted, Collected, collection-rate bars) */
  --color-success: #10b981;
  --color-success-dark: #007a55;
  --color-success-light: #d0fae5;
  --color-success-lightest: #ecfdf5;
  --color-success-foreground: #007a55;

  /* Warning — amber/orange (Pending deals, Outstanding money, Total-pending strip) */
  --color-warning: #f59e0b;
  --color-warning-dark: #b45309;
  --color-warning-light: #fef3c7;
  --color-warning-lightest: #fffbeb;
  --color-warning-foreground: #b45309;

  /* Info — blue (Meeting time pills in violet/blue family, Snap Analytics tab) */
  --color-info: #3b82f6;
  --color-info-dark: #1d4ed8;
  --color-info-light: #dbeafe;
  --color-info-lightest: #eff6ff;
  --color-info-foreground: #1d4ed8;

  /* Error — red (Overdue, the "Needs attention" card stripe, the Unboxing-shoot pill) */
  --color-error: #ef4444;
  --color-error-dark: #b91c1c;
  --color-error-light: #fee2e2;
  --color-error-lightest: #fef2f2;
  --color-error-foreground: #b91c1c;

  /* Brand-avatar tints (used by BrandAvatar — soft pastel with deeper-tone glyph) */
  --color-brand-tint-violet: #ede9ff;
  --color-brand-tint-amber:  #fde9c8;
  --color-brand-tint-green:  #d8efe3;
  --color-brand-tint-blue:   #dce8f7;
  --color-brand-tint-pink:   #f7dde2;
  --color-brand-tint-neutral:#eceef5;

  /* Border radius — Influency leans larger than JobPilot */
  --radius-sm:  6px;
  --radius-md:  10px;
  --radius-lg:  16px;
  --radius-xl:  20px;
  --radius-2xl: 24px;
  --radius-full: 9999px;

  /* Elevation — flat by default, very subtle when needed */
  --shadow-card: 0 1px 2px rgba(16, 24, 40, 0.04);
  --shadow-hero: 0 8px 24px rgba(110, 86, 245, 0.25);
  --shadow-fab:  0 6px 16px rgba(110, 86, 245, 0.35);

  /* Overlay scrim behind the bottom sheet / dialog — generates `bg-scrim` */
  --color-scrim: rgba(0, 0, 0, 0.45);
}
```

> **Scrim (added in Feature 09):** the bottom-sheet backdrop value `rgba(0,0,0,0.45)` is mandated by `ui-rules.md`. It lives as the `--color-scrim` token so the overlay stays tokenized (`bg-scrim`) rather than a hardcoded color.

Tailwind v4 generates utility classes automatically from every `--color-*` token above:

- `bg-accent`, `text-accent`, `border-accent`
- `bg-surface`, `text-surface-secondary`
- `bg-success-light`, `text-text-muted`
- `bg-brand-tint-violet`
- etc.

---

## Color Usage Guide

### Page Layout

| Element                   | Token                  |
| ------------------------- | ---------------------- |
| Page background           | `bg-background`        |
| Card / surface            | `bg-surface`           |
| Secondary surface         | `bg-surface-secondary` |
| Default border (hairline) | `border-border`        |
| Light border              | `border-border-light`  |

### Typography Colors

| Element                | Token                           |
| ---------------------- | ------------------------------- |
| Headings, primary text | `text-text-primary` (#101828)   |
| Secondary text, labels | `text-text-secondary` (#6A7282) |
| Placeholder, muted     | `text-text-muted` (#99A1AF)     |
| Dark labels            | `text-text-dark` (#364153)      |
| Text on violet hero    | `text-text-on-accent` (#FFF)    |

### Accent (Primary Violet)

Used for: the FAB, primary buttons, active bottom-tab label + icon, hero "This Month" card, progress fills, "In progress" pill, segmented-control active tab, focus rings.

| Element                       | Token                    |
| ----------------------------- | ------------------------ |
| Button / FAB background       | `bg-accent`              |
| Button / FAB text             | `text-accent-foreground` |
| Light pill background         | `bg-accent-light`        |
| Subtle violet wash            | `bg-accent-muted`        |
| Hero card background          | (gradient — see below)   |

### Status Pills — Deals

The deal-status pill is the small dot + label at the top-right of every deal card. Same control reused across All Deals, Home Today, brand detail.

| Status         | Background          | Text                       | Dot                |
| -------------- | ------------------- | -------------------------- | ------------------ |
| In progress    | `bg-accent-light`   | `text-accent`              | `bg-accent`        |
| Pending        | `bg-warning-light`  | `text-warning-foreground`  | `bg-warning`       |
| Posted         | `bg-info-light`     | `text-info-foreground`    | `bg-info`          |
| Paid           | `bg-success-light`  | `text-success-foreground`  | `bg-success`       |
| Cancelled      | `bg-surface-tertiary` | `text-text-muted`       | `bg-text-muted`    |

### Status Pills — Payments

| Status      | Background           | Text                       |
| ----------- | -------------------- | -------------------------- |
| Pending     | `bg-warning-light`   | `text-warning-foreground`  |
| Received    | `bg-success-light`   | `text-success-foreground`  |
| Overdue     | `bg-error-light`     | `text-error-foreground`    |

### Status Pills — Snap reports (added in Feature 15)

Label-only like the payments pill (no dot). Existing color families — no new hex.

| Status      | Background           | Text                       |
| ----------- | -------------------- | -------------------------- |
| Pending     | `bg-warning-light`   | `text-warning-foreground`  |
| Extracted   | `bg-success-light`   | `text-success-foreground`  |
| Failed      | `bg-error-light`     | `text-error-foreground`    |
| Manual      | `bg-info-light`      | `text-info-foreground`     |

### Row-Card Left Stripe

Every row-card (Today items on Home, meetings list, calendar day detail) carries a 4px colored left stripe (visually the leading edge — see *Direction* below) that encodes the row's category at a glance.

| Row kind          | Stripe color  |
| ----------------- | ------------- |
| Meeting           | `bg-accent`   |
| Payment due       | `bg-warning`  |
| Overdue payment   | `bg-error`    |
| Deliverable due   | `bg-info`     |
| Brand-tagged item | follows the brand-avatar tint family |

### Stat Tiles (under the hero on Home)

Each tile has a 2px colored top stripe + a single bold number + a muted caption.

| Tile          | Stripe color  | Caption color           |
| ------------- | ------------- | ----------------------- |
| Collected     | `bg-success`  | `text-text-secondary`   |
| Outstanding   | `bg-warning`  | `text-text-secondary`   |
| Posted        | `bg-accent`   | `text-text-secondary`   |

### Brand Avatars

A circular avatar with a soft pastel tinted background and the brand's Arabic glyph (or an English initial fallback) in a deeper tone of the same color family. Always one of the `--color-brand-tint-*` tokens. Pick the tint deterministically from the brand id so the same brand always renders the same color.

### Tabs (segmented control)

Used for Pending/Received, List/Month, Reports/Snap Analytics. Same control everywhere.

| Tab state | Background          | Text                  |
| --------- | ------------------- | --------------------- |
| Container | `bg-surface-muted`  | —                     |
| Active    | `bg-surface`        | `text-accent`         |
| Inactive  | transparent         | `text-text-secondary` |

### Hero "This Month" Card (Home)

```
background: linear-gradient(135deg, var(--color-hero-from), var(--color-hero-via), var(--color-hero-to));
text: text-text-on-accent
inner ring (collection-rate): white stroke 2px on a translucent track
inner sparkline: white at 80% opacity
border-radius: var(--radius-2xl)
padding: 20px
box-shadow: var(--shadow-hero)
```

This is the **only** gradient surface in the app. Don't introduce gradients elsewhere.

### FAB (the center `+` in the bottom tab bar)

```
size: 56x56px
background: bg-accent
text: text-accent-foreground
border-radius: rounded-full
box-shadow: var(--shadow-fab)
```

Opens the **Quick Add** bottom sheet (Brand · Deal · Meeting · Payment · Snap report).

---

## Typography

Two families: **Inter** for Latin (English), **Tajawal** for Arabic. The active family follows `<html lang>`:

```css
:root         { font-family: var(--font-sans); }
:root[lang="ar"] { font-family: var(--font-arabic); }
```

Both are 16px/1.5 by default. Tabular figures for money:

```css
.money { font-variant-numeric: tabular-nums; }
```

| Element                       | Size | Weight | Line height | Color token              |
| ----------------------------- | ---- | ------ | ----------- | ------------------------ |
| Hero metric (SAR 220,500)     | 28px | 700    | 34px        | `text-text-on-accent`    |
| Page title (Meetings, Deals)  | 24px | 700    | 30px        | `text-text-primary`      |
| Stat number (Collected etc.)  | 18px | 700    | 24px        | `text-text-primary`      |
| Section heading (Today, etc.) | 16px | 600    | 24px        | `text-text-primary`      |
| Bottom-tab active label       | 12px | 600    | 16px        | `text-accent`            |
| Bottom-tab inactive label     | 12px | 500    | 16px        | `text-text-secondary`    |
| Row title (deal/meeting)      | 15px | 600    | 22px        | `text-text-primary`      |
| Row subtitle (brand · note)   | 13px | 400    | 18px        | `text-text-secondary`    |
| Row time / amount pill        | 13px | 600    | 18px        | varies by semantic       |
| Status pill text              | 12px | 500    | 16px        | varies by status         |
| Hijri secondary date          | 12px | 400    | 16px        | `text-text-muted`        |
| Muted caption / timestamp     | 12px | 400    | 16px        | `text-text-muted`        |

**Size utilities (tokenized in Feature 17 — never inline `text-[NNpx]`):**

| Size | Utility        | Role                                        |
| ---- | -------------- | ------------------------------------------- |
| 28px | `text-hero`    | hero metric (carries its 34px line-height)  |
| 24px | `text-2xl`     | page title (Tailwind default)               |
| 18px | `text-lg`      | stat number (Tailwind default)              |
| 16px | `text-base`    | section heading (Tailwind default)          |
| 15px | `text-row`     | row title                                   |
| 13px | `text-body`    | row subtitle, amount / time pill            |
| 12px | `text-caption` | status pill, Hijri date, muted caption      |
| 11px | `text-micro`   | smallest chips / completion-ring percent    |

All sizes except `text-hero` are font-size only — line-height stays inherited.

---

## Direction (RTL / LTR)

Influency is Arabic-first. **All layout uses logical Tailwind utilities** — never `left-*` / `right-*` for spacing or positioning. The `<html dir>` attribute switches at the root:

```html
<html lang="ar" dir="rtl">  <!-- Arabic -->
<html lang="en" dir="ltr">  <!-- English -->
```

| Direction concept              | Use                          | Never                |
| ------------------------------ | ---------------------------- | -------------------- |
| Leading edge padding           | `ps-*`                       | `pl-*`               |
| Trailing edge padding          | `pe-*`                       | `pr-*`               |
| Leading edge margin            | `ms-*`                       | `ml-*`               |
| Trailing edge margin           | `me-*`                       | `mr-*`               |
| Row-card stripe                | `border-s-4` (leading edge)  | `border-l-4`         |
| Chevron / back arrow direction | use `rtl:` variant to flip   | hardcode direction   |

The mocks are LTR; in Arabic everything mirrors — including the row-card stripe (it stays on the *leading* edge), the chevron arrows, and the brand avatar in row cards (which moves to the trailing edge).

---

## Numbers, Currency, Dates

| Format          | Locale: ar                                 | Locale: en                          |
| --------------- | ------------------------------------------ | ----------------------------------- |
| Number          | `Intl.NumberFormat('ar-SA')` (Arabic digits)| `Intl.NumberFormat('en-US')`        |
| Currency        | `…format(amount)` with `style:'currency', currency:'SAR'` | same           |
| Date — primary  | Hijri via `Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura')` | Gregorian      |
| Date — secondary| Gregorian under the Hijri (smaller, muted) | Hijri under the Gregorian (smaller, muted) |
| Money rendering | `.money` class for tabular figures         | `.money` class for tabular figures  |

The mocks show "SAR 19,000" with SAR before the number — keep that order in both locales (it's how the screens read), driven by the `Intl` currency formatter.

---

## Spacing

| Token        | Value      | Usage                            |
| ------------ | ---------- | -------------------------------- |
| `gap-1`      | 4px        | Tight inline (dot + label)       |
| `gap-2`      | 8px        | Badge and chip gaps              |
| `gap-3`      | 12px       | Form field gaps                  |
| `gap-4`      | 16px       | Card internal gaps               |
| `gap-5`      | 20px       | Between rows in a list           |
| `gap-6`      | 24px       | Between sections                 |
| `p-4`        | 16px       | Card padding                     |
| `p-5`        | 20px       | Hero card padding                |
| `px-4 py-2`  | 16px / 8px | Button padding                   |
| `px-3 py-1`  | 12px / 4px | Pill padding                     |

---

## Component Tokens

### Cards (default surface)

```
background: bg-surface
border: 1px solid var(--color-border)
border-radius: var(--radius-lg)        /* 16px */
padding: 16px (p-4)
box-shadow: var(--shadow-card)
```

### Row Cards (deal row, meeting row, payment row, Today item)

```
background: bg-surface
border: 1px solid var(--color-border)
border-radius: var(--radius-lg)
padding: 14px 16px
leading-edge stripe: 4px solid (color encodes row kind — see "Row-Card Left Stripe")
gap between elements: gap-3
```

### Hero "This Month" Card

```
background: linear-gradient(135deg, var(--color-hero-from), var(--color-hero-via), var(--color-hero-to))
text: text-text-on-accent
border-radius: var(--radius-2xl)       /* 24px */
padding: 20px (p-5)
box-shadow: var(--shadow-hero)
```

### Buttons

**Primary:**

```
background: bg-accent
text: text-accent-foreground
border-radius: var(--radius-md)
padding: px-4 py-2.5
font-weight: 600
height (touch): 44px minimum
```

**Secondary:**

```
background: bg-surface
border: 1px solid var(--color-border)
text: text-text-primary
border-radius: var(--radius-md)
padding: px-4 py-2.5
```

**Ghost:**

```
background: transparent
text: text-text-secondary
hover: hover:bg-surface-secondary
border-radius: var(--radius-md)
```

### Input Fields

```
background: bg-surface
border: 1px solid var(--color-border)
border-radius: var(--radius-md)
padding: 12px 14px
text: text-text-primary
placeholder: text-text-muted
focus: ring-2 ring-accent ring-offset-0
height (touch): 44px minimum
```

### Status Pills

```
border-radius: var(--radius-full)
padding: px-2.5 py-1
font-size: 12px
font-weight: 500
display: inline-flex with dot + label, gap-1.5
```

### Segmented Control (tabs)

```
container: bg-surface-muted, p-1, border-radius: var(--radius-md)
each tab: px-4 py-2, border-radius: var(--radius-md), font-size 14px, font-weight 600
active tab: bg-surface, text-accent, shadow-card
inactive tab: text-text-secondary
```

### Bottom Tab Bar

```
background: bg-surface
border-top: 1px solid var(--color-border)
height: 64px (+ safe-area-inset-bottom on iOS)
five slots: Home · Deals · [FAB] · Calendar · Insights
active: text-accent + icon filled
inactive: text-text-secondary + icon outline
FAB center slot: floats 8px above the bar baseline, shadow-fab
```

### Bottom Sheet (Quick Add)

```
background: bg-surface
border-radius: var(--radius-2xl) var(--radius-2xl) 0 0
padding: 20px
handle bar: 36x4px, bg-border-muted, centered at top, margin-bottom: 16px
grid: 2 columns, gap-3, five tiles (Brand · Deal · Meeting · Payment · Snap report — Snap col-span-2 on the last row)
tile: bg-surface-secondary, p-4, rounded-lg, icon in colored circle (uses brand-tint tokens)
```

### Progress Bar (deal deliverables)

```
track: bg-border-light, height: 6px, border-radius: full
fill: bg-accent
percent label (e.g. "2/4"): text-text-secondary, 12px, 500
```

### Collection Rate Bar (Reports — Per brand)

```
track: bg-border-light, height: 6px, border-radius: full
fill: bg-success
edge-case: when invoiced is 0, render an em dash (—), never NaN/Infinity
```

### Charts (Recharts)

| Element                | Value                                       |
| ---------------------- | ------------------------------------------- |
| Monthly invoiced (bar) | `var(--color-accent-light)` track + `var(--color-accent)` fill |
| Monthly collected (bar)| `var(--color-success)` fill                 |
| Grid lines             | 1px dashed `var(--color-border)`            |
| Axis labels            | `var(--color-text-muted)`, 12px             |
| RTL                    | mirror axis orientation when `lang="ar"`    |

---

## Touch & Accessibility

- **Touch targets:** every interactive element is at least 44×44px (iOS / WCAG baseline). Buttons, pills, tab targets, FAB.
- **Focus rings:** `ring-2 ring-accent` on focus-visible — never remove focus indication.
- **Contrast:** all text-on-surface combinations above pass WCAG AA. The hero card's white-on-violet meets AA at the metric size.
- **Reduced motion:** respect `prefers-reduced-motion` for the realtime Snap-extraction reveal animation and the bottom-sheet open transition.

---

## Invariants

- Never use hex values directly in components — always use CSS variables via Tailwind v4 generated utilities
- Latin font is Inter; Arabic font is Tajawal — load both via the Google Fonts `@import` in `src/index.css`. Never substitute a system font
- Never use raw Tailwind color classes like `bg-purple-500` or `text-gray-600` — use project tokens only
- `--color-accent` (#6E56F5) is the only violet — never use Tailwind's built-in purple scale, never introduce a second violet
- The hero gradient is the **only** gradient in the app — no other gradient surfaces
- Status pills always pull from the **Status Pills — Deals / Payments** tables — never invent ad-hoc pill colors
- Row-card stripes always pull from the **Row-Card Left Stripe** table
- Brand avatars always use one of `--color-brand-tint-*` — picked deterministically from brand id so the same brand renders the same color across the app
- Layout uses logical Tailwind utilities (`ps-*` / `pe-*` / `ms-*` / `me-*` / `border-s-*` / `border-e-*`) — never `left-*` / `right-*` for spacing. Direction is controlled by `<html dir>`
- Dates are formatted via the `lib/date.ts` helper — never format Hijri/Gregorian ad-hoc in components
- Money is formatted via the `lib/currency.ts` helper, rendered with the `.money` class for tabular figures
- Font sizes come from the type-scale utilities (`text-hero` / `text-row` / `text-body` / `text-caption` / `text-micro`) or Tailwind's matching `text-base` / `text-lg` / `text-2xl` — never inline `text-[NNpx]`
- All touch targets ≥ 44×44px. Never disable focus-visible rings