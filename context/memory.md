# Memory — Influency: Feature 11 live-closed + Feature 16B Snap Report Generation

Last updated: 2026-06-12

## What was built

This session = (1) cleared the Feature 11 live gate end-to-end, and (2) built **Feature 16B — Snap Report Generation** (new, developer-directed; architect-planned via two 4-question rounds, developer-approved; static-verified: typecheck + lint + production build + `deno check` on both edge functions all clean; partially live-verified).

**Feature 11 — Atomic Mark-Received — LIVE-CONFIRMED & FULLY CLOSED:**
- Developer applied migrations (through ≥`0012`), ran `tests/test_mark_payment_received.sql` → ALL 6 phases PASS; deployed `mark-payment-received`; in-app mark-received flipped the "ramadan" deal to **paid**; `payment_received` ×3 + `deal_paid` ×1 rows in `activity_log`; **2nd-user RLS on `payments` confirmed**.
- Added `backend/supabase/tests/test_mark_payment_received_visible.sql` — same proof but records each phase into a temp table and `SELECT`s a `phase | result` grid at the end (the Supabase web SQL editor does NOT render `RAISE NOTICE`, so the canonical test's PASS lines are invisible there).

**Feature 16B — Snap Report Generation** (two report products on the Feature 15 pipeline — NO Snapchat API ever; screenshots + GPT-4o only):
- **`backend/supabase/migrations/0012_snap_report_types.sql`** — `snap_reports.report_type text not null default 'post' check in ('post','monthly')` (default backfills existing rows) + three nullable monthly columns `profile_views`, `new_followers`, `watch_time_minutes`. `report_date` semantics PER TYPE: snap date for post, FIRST day of the covered month for monthly. No RLS/grant/index changes.
- **`backend/shared/types/snapReport.types.ts`** — `SNAP_REPORT_TYPE`, `report_type` + 3 monthly fields on `SnapReport`, new `MonthlySnapExtractionResult`.
- **`extract-snap-report/index.ts`** — switches prompt + strict json_schema on the **ROW's** `report_type` (never client input — the storage-path stance). `MONTHLY_JSON_SCHEMA`/`MONTHLY_SYSTEM_PROMPT` (bilingual glossary incl. profile views / new subscribers / watch-time-in-minutes; month → first-of-month) beside renamed POST pair; shared prompt rules extracted to one const; guards/rate-limit/zod unchanged; per-type activity summary.
- **24h auto-reminder:** `useToggleDeliverable` (`hooks/useDeals.ts`) arms the deal's `kind='deliverable'` reminder (its FIRST writer; kind already in 0008's CHECK) due now+24h, via new `buildSnapAnalyticsReminderMessages` (`features/reminders/messages.ts`) + `snapAnalyticsReminderDueAt` (`features/reminders/dueAt.ts`). createReminder upsert-by-(kind,ref) → ONE live reminder per deal, re-armed per posting. REMINDERS key invalidated.
- **UI:** `routes/analytics/snap.tsx` (report-type `FilterChips` picker + per-type hint; insert carries `report_type`); `SnapReportListItem.tsx` (neutral type chip; monthly rows titled via `formatMonthYear`); `SnapReportSheet.tsx` (per-type field set through the same pencil→manual flow; deal-link hidden on monthly; **Report preview + PNG Download** once extracted/manual); new **`SnapReportCard.tsx`** (branded card: avatar+name, per-type title, brand·deal/month context, 2-col metric grid, "Generated with Influency" footer, 4px accent top strip); new pure `features/brands/brandName.ts` (`localizedBrandName`); `ProfileAvatar.tsx` gained `noImage` prop. `snap.schema.ts` gained 3 monthly count fields. i18n `snap.type/card/*` + new field labels (en+ar). Installed `html-to-image` (lazy-loaded, own chunk).

## Decisions made
- **16B scope (round 1, approved):** monthly = its OWN screenshot of Snapchat's monthly Insights page (NOT an aggregation of post uploads); export = PNG of a branded card (WhatsApp-native, no public links / brand login); BUILD NOW before Feature 17; posting a deliverable auto-arms a 24h reminder.
- **16B implementation (round 2, approved):** monthly metrics = the account six (views/reach/story_views + profile_views/new_followers/watch_time_minutes); reminder = one per deal, re-armed (createReminder dedup); export = PNG via html-to-image; monthly lives on the SAME `/analytics/snap` behind a type picker (no separate page/route).
- **Agent calls (confident, in assumptions):** ONE edge function switching on the row's `report_type` (not two functions, not client input); ONE `snap_reports` table + `report_type` column (not separate tables); reminder write is **best-effort** (try/catch + logger — a reminder failure never fails the visible deliverable toggle, UNLIKE meetings where the reminder IS the contract); unmarking a deliverable LEAVES the reminder (dismissible); NO new activity kind (monthly logs `snap_extracted`).

## Problems solved (don't re-solve)
- **PNG export 429 / cross-origin avatar — THE gotcha:** a Google OAuth avatar (`lh3.googleusercontent.com`) breaks `html-to-image`. A 429 is an HTTP response (not a network error), so html-to-image's `fetch` RESOLVES, reads the 429 error-body as the image, sets `img.src` to garbage, the `<img>` fires `error`, and `toPng` REJECTS. `imagePlaceholder` does NOT help (it only catches a *thrown* fetch). `cacheBust` makes it worse (unique URL per call → Google rate-limits). **Fix: the report card embeds NO cross-origin image — `SnapReportCard` passes `noImage` to `ProfileAvatar` so it renders the initial/glyph.** Do NOT re-add the avatar photo to the card or re-enable `cacheBust`. Future enhancement: embed Supabase-`avatars`-bucket photos (same-origin, CORS-safe) instead of the initial.
- **Supabase SQL editor hides `RAISE NOTICE`** → the visible-output test variant (above). Also: a clean run there shows only the first `set_config` row + NO red error = all phases passed (failures `raise exception` → red error).

## Carried-forward invariants (still in force)
- Backend shared web + future RN; shared TYPES in `backend/shared/types/`; supabase-js pinned 2.108.1; untyped client (`data as X` sanctioned); edge default `createSupabaseAsUser`; numbers/dates/currency ONLY via lib helpers; new i18n COUNT strings get JSON-v4 plurals.
- `received` written ONLY by `mark_payment_received` RPC; overdue DERIVED never stored; cancelled terminal; reminders in app code not triggers (`createReminder` = the one writer, upsert-by-(kind,ref)); `logActivity` swallows errors. lucide pinned 1.17.0 (verify icon names exist before use). recharts + pdf.js stay their own lazy chunks; main bundle ~753 kB.
- Migrations applied by the DEVELOPER (agent holds NO credentials). UI primitives hand-rolled token-exact; tokens-only styling.

## Current state
- **Feature 11: fully closed (live-confirmed).**
- **Feature 16B: built + static-verified; live-verified through the PNG export.** Developer applied `0012`, redeployed `extract-snap-report`, `OPENAI_API_KEY` set. Confirmed live: monthly extraction returns sane account numbers (e.g. 210,859 views / 562 new followers); type picker; per-type detail fields; **PNG export works**.
- Both edge functions deployed; `activity_log` already shows deal/deliverable/deal_posted/payment/meeting/snap kinds → Features 10 & 13 effectively exercised live too.

## Next session starts with
- **Close the 16B live gate's LAST item — the 24h reminder:** mark a deliverable posted → confirm a `reminders` row `kind='deliverable'`, `ref_id`=deal id, `due_at` ≈ now+24h, `message_en`="Capture Snap analytics — {deal}" / `message_ar`="التقط تحليلات سناب — …"; mark a SECOND line on the same deal → the SAME row MOVES (one per deal), not a duplicate. (Won't show in Today until ~due — correct.) Then mark 16B gate green in the tracker.
- Then **Feature 17 — Polish + Deploy** (the final feature): 375px sweep, loading/empty/error sweep, RTL sweep, standards sweep (zero console.log/any/inline magic; one envelope + HTTP codes; one zod), final 2nd-user RLS spot-check, deploy frontend to Vercel (prod env + Google OAuth redirect URIs on prod domain + Supabase prod config/edge secrets), then progress-tracker → "v1 shipped".

## Open questions / outstanding gates (developer-gated; agent holds no credentials)
- **16B:** the 24h reminder eyeball (above) — only thing left.
- **Still-open live gates from the tracker** (some effectively exercised via `activity_log`, confirm honestly): 2nd-user RLS on `avatars` + `snap_reports` + `snap-uploads` bucket + `brands` + `ad_deals` + `meetings`/`reminders`; full 13 reminder-lifecycle walk; 14 dashboard hand-calc; 15 snap edge cases (AR screenshot digit convert, PDF→PNG, failed→manual, 429 rate limit); 16 reports hand-calc + RTL.
- **Visual passes pending (375px + RTL)** across 07/09/10/11/12/13/15/16 + nav + the new 16B surfaces (type picker, monthly detail, exported PNG's Arabic shaping); Arabic SAR placement.
