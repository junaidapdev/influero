# Memory — Deal Lifecycle Redesign + dashboard Payments entry (built, reviewed, LIVE-confirmed)

Last updated: 2026-06-13

## What was built / done this session
- **Deal lifecycle redesign — BUILT + reviewed + developer-confirmed working live.** The post-v1 feature the prior session had only *planned* is now implemented end to end. Deal is a legible pipeline **To-do → Shot → Posted → Paid (+ Cancelled)**, driven by two checkmarks instead of per-deliverable "posted" checkboxes.
- **`/architect` was run first** (4 decisions taken — see below), developer approved the plan, then implementation.
- **Migration `backend/supabase/migrations/0013_deal_lifecycle.sql`:** rename `ad_deals.deadline` → `post_date`; add `shoot_date date`, `shot_at timestamptz`, `posted_at timestamptz`; status set `in_progress` → `shot` (status now DERIVED from the two stamps: posted_at→posted, else shot_at→shot, else pending; paid/cancelled terminal); backfill stamps from old per-line deliverable `posted_at`; **CHECK swap ordered DROP → CONVERT(in_progress→shot) → ADD** (critical — see Problems solved); `reminders.kind` += `shoot`,`post`; `activity_log.kind` += `deal_shot` (`deliverable_posted` retired, kept in CHECK for history); index renamed to `..._post_date_idx`; **recreated `get_dashboard_stats` + `get_monthly_totals`** with `post_date`/`shot` (definitions otherwise verbatim — Dashboard/Reports numbers unchanged). `get_per_brand_report` untouched.
- **Shared types:** `deal.types.ts` (`DEAL_STATUS.SHOT` replaces `IN_PROGRESS`; `Deal` gains `shoot_date`/`post_date`/`shot_at`/`posted_at`; `Deliverable` drops `posted_at`), `reminder.types.ts` (+`SHOOT`/`POST`), `activity.types.ts` (+`DEAL_SHOT`).
- **Logic:** rewrote `features/deals/status.ts` (derive-from-stamps; `toggleShot`/`togglePosted`/`canToggleShot`/`becameShot`/`becamePosted`/`compareByPostDate`; Posted⇒Shot back-stamps). `hooks/useDeals.ts`: `useCreateDeal` + **new `useUpdateDeal`** (the F10-deferred edit flow; both call `syncDealDateReminders`, return `{deal, reminderFailed}` → soft toast), `useMarkShot`/`useMarkPosted` (replace `useToggleDeliverable`), `useCancelDeal` (deletes reminders first; **re-arms them if the status UPDATE fails** — deals-only). `features/reminders/dueAt.ts` (`dealDateReminderDueAt`) + `messages.ts` (shoot/post builders).
- **UI:** `DealForm` (shoot+post date inputs; create+edit), `DealExpandedPanel` rebuilt (read-only deliverables descriptor + ☐ Shot/☐ Posted + Edit sheet), `DealListItem`/`DealStatusPill`/`DealsFilters` (shot + post_date), ACTIVE-deal sets in deals/meetings/payments routes. Dashboard: `TodayPanel` (shoot/post → /deals, info stripe, type badges), `useNeedsAttention` → `useBehindScheduleDeals` (PostgREST `.or()` of past-post-unposted OR past-shoot-unshot), `NeedsAttentionPanel` (overdue-half label, post wins).
- **i18n** EN+AR fully updated; **all 7 context docs** updated. **`backend/supabase/tests/seed_demo_data.sql`** (untracked) updated to the new schema + shoot/post demo reminders + a shoot-overdue deal.
- **Reviewed twice:** a 5-dimension adversarial workflow (7 findings, all verified) + a `/review` pass. All addressed (see Problems solved). typecheck + lint + production build all clean (main ~763 kB).
- **THEN: dashboard Payments entry (developer follow-up — "add Payments as text", option 1+3).** Payments had been hidden behind the header notification bell. Fixed: `components/dashboard/MonthTotalsBar.tsx` — the three stat tiles are now whole-card `<Link>`s (**Collected + Outstanding → /payments, Posted → /deals**, each with an aria-label) + a right-aligned **"View payments →"** link (`dashboard.viewPayments`, ChevronRight, rtl-mirrored) above the tile grid. `components/layout/AppLayout.tsx` — the **notification bell was REMOVED** (it only linked to /payments and the alert dot implied a notifications feature that doesn't exist); header keeps the presentational search button + avatar. New i18n `dashboard.viewPayments`/`dashboard.viewDeals` (en+ar); orphaned `nav.notifications` removed. ui-registry (MonthTotalsBar + AppLayout) + progress-tracker polish note updated. typecheck + lint + build clean.

## Decisions made (the `/architect` forks, all developer-approved)
1. Status: rename `in_progress`→`shot`; keep `pending` (UI label "To-do").
2. Both dates optional; ticking **Posted auto-marks Shot** (can't post unshot content).
3. Ticking a checkmark **DELETES** that date's reminder; untick/edit **re-arms** (createReminder upsert).
4. Needs-attention = past-shoot-unshot **OR** past-post-unposted (one row, post label wins).
- Folded-in: reminder kinds shoot/post (forced by the (user_id,kind,ref_id) uniqueness); activity `deal_shot`; deliverables read-only descriptor; the +24h snap-analytics reminder now arms on the **Posted** tick (was per-deliverable).
- Deal **edit flow** built now (was F10-deferred) since dates must be editable after creation.
- **Today panel scope: KEEP rolling next-24h** (developer chose this when asked — not calendar-day). Window: meetings `[now, now+24h)` upcoming; reminders `due_at < now+24h`, no lower bound (overdue stay). Past-today meetings surface via their Overdue reminder; early-tomorrow items show with a "Tomorrow" tag.
- **Payments placement: dashboard money tiles + "View payments" link** (developer chose option 1+3 — NOT a tab bar slot, NOT a standalone card). ui-rules already intended Payments as a Home-card destination.

## Problems solved (don't re-solve)
- **CRITICAL migration bug (caught by review, fixed):** the `update status='shot'` ran BEFORE the old CHECK was dropped → would abort on any `in_progress` row. Correct order is **DROP old CHECK → UPDATE in_progress→shot → ADD new CHECK** (adding the new CHECK while in_progress rows still exist would ALSO fail validation — so it must be drop, convert, then add).
- Un-ticking Posted now clears the stale "Capture Snap analytics" reminder (was left armed).
- `shot_at`/`posted_at` render with `formatDualTimestampDate` (local tz), not the UTC-pinned `formatDualDate` (wrong-day-near-midnight bug). Planned dates (shoot_date/post_date, true `date` cols) keep `formatDualDate`.
- `useCancelDeal` re-arms the deal's reminders if the status UPDATE fails after the deletes commit (deals-only; meeting/payment cancel keep the plain delete-before-write pattern — deliberate asymmetry).
- Edit sheet shows a loading state while `useBrands` resolves (was an empty brand dropdown).

## Current state
- **Both pieces code-complete, static-verified, and LIVE-CONFIRMED by the developer.** `0013` applied; the worklist (shoot/post/snap reminders), the two checkmarks, edit, cancel, and Needs-attention all working. The dashboard Payments entry is built (static-verified; not yet separately eyeballed live but it's a small UI link change).
- Working tree is **uncommitted** (all changes local). Seed `seed_demo_data.sql` still intentionally untracked.
- Reminder worklist messages (what shows in Today), per deal toward Paid: **Shoot — {title}** (on shoot_date) → **Post — {title}** (on post_date) → **Capture Snap analytics — {title}** (+24h after Posted) → **Payment due — {title} · SAR {amount}** (on expected date, only if "Send reminder" tapped); plus **Meeting — {title}** for linked meetings. Each row: time pill / "Tomorrow, {time}" / "Overdue", message, type badge, Done button.

## Next session starts with
- **No required work — both the deal-lifecycle feature and the dashboard Payments entry are done.** Optional, only if asked: relocate `toDealFormInput` for symmetry (left in `DealExpandedPanel.tsx`); auto-create a payment's reminder on payment creation so "Payment due" appears without the manual "Send reminder" tap (currently manual by design); a quick live eyeball of the dashboard Payments link/tiles at 375px + RTL.

## Open questions
- **Git author identity** (carried from v1): commits are attributed to the hostname email, not the GitHub account. Still pending the developer's call — relevant whenever this session's uncommitted changes get committed (`git config user.name/email` + optional `--amend --reset-author`).
- Whether to ever commit `seed_demo_data.sql` (still intentionally local-only).
