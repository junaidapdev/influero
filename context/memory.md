# Memory — Header redesign (PR #20) + the standing rename/branch gotchas

Last updated: 2026-06-25

⚠️ **READ FIRST — git/branch state before any work:**
1. **`origin/main` = `fd6216e`** and **already contains the UX-polish commit `a5e3691`** (merged via PR #17),
   plus PR #18 (docs/tests) + PR #19 (blank-page fix). So branch new work off **`origin/main`** — it has the
   UX-polish nav restructure that the header work depends on, AND no uncommitted rename.
2. **Local branch `feat/ux-polish` (HEAD = `a5e3691`) is 6 commits BEHIND `origin/main`** and its working tree
   still carries the **uncommitted Influero→Inflero rename** (Codex's, separate concern) — logos, `index.html`,
   `manifest.webmanifest`, locale JSON *brand* strings (`app.name`, `billing.help`, `iosInstallRequired`,
   `deleteAccount.confirmBody`), landing, backend, `index.css`, legal copy, several `context/*.md`, untracked
   `frontend/public/inflero-logo.*`. **It ALSO now carries an uncommitted DUPLICATE of the header-redesign edits**
   (the same 21 files that are committed on PR #20). When committing the rename, do NOT re-commit the header edits
   — merge PR #20 first, then `git checkout origin/main -- <the 21 header files>` / rebase to drop the dupes.
3. No secrets in this file. Prod project ref `uvueoypezcjtyazzibbu`; `gh` + `supabase` CLIs available.

## What was built

- **PR #20 — Header redesign (`feat/page-headers`, OPEN, base `main`).** https://github.com/junaidapdev/influero/pull/20
  Fixes the developer's complaint that the in-app top bar was ugly/empty (a near-empty sticky strip with a lone
  trailing avatar, then each page repeating its own title row below). Collapsed the two bands into ONE per-page
  header; realigns with `ui-rules` ("every page has a title row with a muted line above it"). Built off `origin/main`
  in an isolated worktree so the uncommitted rename never contaminated the PR. **Verified clean:** PR diff = exactly
  21 files, `grep -i nflero` on the PR diff is EMPTY, locale diffs are ONLY the 3 new keys each; `tsc -b` + `eslint`
  + `vite build` all clean.
  - **3 new components** (`frontend/src/components/layout/`): `PageHeader.tsx` (eyebrow + title leading; contextual
    action + `ProfileButton` trailing; optional leading back chevron; **sticky** `top-0 z-30`, full-bleed blurred
    bg via `-mx-4 bg-background/90 backdrop-blur-sm`, owns the notch via `pt-[calc(env(safe-area-inset-top)+8px)]`),
    `HeaderIconButton.tsx` (square white 48px `rounded-2xl border bg-surface shadow-card` back/filter/add button;
    `active` → accent + `aria-pressed`; `mirror` → RTL chevron flip), `ProfileButton.tsx` (self-contained avatar →
    profile menu; reads `useAppUser`, owns the `ProfileMenuSheet`).
  - **`AppLayout.tsx`** stripped of its shell header + `ProfileMenuSheet` (moved into `ProfileButton`); now only
    provides the bottom inset + `MobileTabBar` + `QuickAddSheet` + the one `useEntitlementRealtime()`. Every in-app
    page's `<main>` dropped its TOP padding (`py-8` → `pb-8`) so the sticky header sits flush under the notch.
  - **Wired into all 11 pages:** Dashboard (`Hi,`+name), Deals (`{n} deals`+"All Deals"+filter funnel), Meetings
    (month+title+add), Settings (back+title), Insights = reports+snap (`Insights` title above `InsightsTabs`, old
    per-tab `Reports`/`Snap` h1 dropped), Payments/Brands/Expenses/Reminders (count+title+add), brand detail
    (back + brand name in header; card now leads with the OTHER-locale name so the name isn't duplicated).
  - **`DealsFilters.tsx`:** status chips now always visible (free-standing, no Card); brand/month selects render
    only when `advancedOpen` (toggled by the header filter funnel).
  - **`BottomSheet.tsx` now portals to `document.body`** (`createPortal`) — REQUIRED because the sticky header's
    `backdrop-blur` makes it the containing block for `position: fixed`, which had trapped the profile menu in a
    thin strip at the top with its `z-50` stuck under the `z-40` tab bar. The portal also hardens every other sheet.
  - **i18n:** new `nav.back` ("Back"/"رجوع") + `deals.filters.toggle` ("Filters"/"الفلاتر"); `deals.title`
    "Deals"→"All Deals" / "الصفقات"→"كل الصفقات" (en + ar Saudi).
  - `ui-registry.md` + `progress-tracker.md` updated.

## Decisions made

- **Profile avatar on EVERY page header** (developer choice over "Home only") — reachable from anywhere; sits at the
  far-trailing edge, contextual action to its left.
- **Headers are sticky** (developer asked) — pinned under the notch, content scrolls beneath; the bottom tab bar
  stays the persistent nav at `z-40`.
- **Brand detail shows the name in the header** (developer asked); the identity card drops the duplicate primary
  name and leads with the other-locale name instead (bilingual pairing, no dup).
- **A bottom sheet/overlay must portal to body** — the correct, durable fix (not removing the header blur).
- **Header PR built off `origin/main`, not `feat/ux-polish`** — `origin/main` already has the UX-polish deps and
  none of the uncommitted rename.

## Problems solved

- **Profile menu rendered broken (trapped strip at the top).** Root cause: the new sticky header uses
  `backdrop-blur` (a `backdrop-filter`), which becomes the containing block for `position: fixed` descendants, AND
  its `z-30` traps the sheet's `z-50` under the `z-40` tab bar. Since `ProfileButton` (inside the header) rendered
  the `ProfileMenuSheet`, the fixed sheet got confined to the thin header box. Fixed by portaling `BottomSheet`.
- **Isolating a clean header-only PR from the uncommitted rename + the mixed files.** Worktree off `origin/main`;
  copied the PURE files (all .tsx + ui-registry — verified their base is unchanged a5e3691→origin/main, so the copy
  reproduces the exact intended diff); RE-APPLIED the 3 locale keys + the progress-tracker note onto the clean
  `origin/main` versions (the working-tree locale/tracker files are mixed with the rename); verified `grep -i nflero`
  empty before committing.

## Current state

- **PR #20 OPEN** against `main`, build green, clean diff. Not yet merged. UI-only — no backend/migration/data change.
- The main working tree is back on `feat/ux-polish` (untouched) — still holds the uncommitted rename + the duplicate
  header edits. The temporary worktree was removed.

## Next session starts with

1. **375px + RTL visual eyeball of PR #20** (the standard UI gate): sticky blurred header pins under the notch;
   back-chevron pages mirror; the Deals funnel toggles the brand/month panel; avatar far-trailing on every page;
   Insights title above the segmented control; profile menu (and all sheets) open correctly as full bottom sheets.
2. **Merge PR #20.**
3. **Then untangle the working tree:** commit the Influero→Inflero rename as its OWN commit/PR WITHOUT
   re-committing the 21 header files (they'll be on main after #20) — `git checkout origin/main -- <header files>`
   or rebase to drop the dupes. Watch the locale JSONs + `progress-tracker.md` (mixed: rename + header keys).
4. `git pull` local `main` (behind `origin/main`).

## Open questions / standing backlog (carried)

- **Investigate `customer-portal` 404** on the authed call (likely benign — Settings billing on a no-subscription
  account); confirm it's not a broken portal link.
- **Payment edit/delete live-gate** (PR #15) — prod check.
- **At public launch:** flip LS Pro variant **$1.50 → $14**; refund+cancel the $14 test sub
  (`trynarrate@gmail.com`); delete stale TEST-mode `subscriptions` rows in prod.
- **Legal:** lawyer-review pages; confirm KSA governing law; add `/privacy` to Google OAuth consent screen +
  LemonSqueezy store settings; 375px + RTL eyeball.
- **Unconfirmed prod migration state:** `0021` (expenses deal-owner guard) + `0022` (promo) applied? — promo
  silently errors without `0022`. Possible stale non-Riyadh-tz `get_dashboard_stats` in prod.
- Audit follow-ups: **Sentry** error monitoring; **cookie/consent banner** for Clarity; confirm the LS webhook is
  live-mode + 200.
- **Promo-code grant-engine** (designed, not built — entitlement_grants table + additive `is_pro()`; next step
  `/architect`).
- **Rename hygiene (optional, external):** GitHub repo + git remote + Supabase project still named `influero`.
