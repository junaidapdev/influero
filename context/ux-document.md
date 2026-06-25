# Inflero UX Map

Created: 2026-06-25  
Purpose: give a senior UX designer or AI design agent a complete working map of the current Inflero app: pages, navigation, click targets, resulting surfaces, visible content, gates, and major states.

## Product Summary

Inflero is a mobile-first web app for Saudi influencers managing brand deals. The app is bilingual Arabic/English, supports RTL/LTR direction, uses SAR currency formatting, and combines deal tracking, brand records, payment collection, meetings, reminders, Snap report extraction, reports, expenses, and subscription billing.

The current product has two modes:

- Public signed-out website at `/` with marketing content and CTAs into auth.
- Authenticated app shell with bottom navigation, Quick Add, profile menu, and protected operational pages.

Important implementation note: older overview docs say signed-out users redirect from `/` to `/login`; the current app instead shows a public landing page at `/`.

## Navigation Model

### Authenticated Shell

Every protected page sits inside the same app shell:

- Sticky top header.
- Avatar button at the leading side opens the profile menu.
- Dashboard only: greeting text appears beside the avatar.
- Search icon button appears at the trailing side, but it is presentational only; clicking it does not open search.
- Bottom tab bar is fixed at the bottom.
- Center floating `+` button opens Quick Add.
- Content has bottom padding so the tab bar and FAB do not cover page content.

### Bottom Tabs

Tabs:

- Home → `/dashboard`
- Deals → `/deals`
- Center `+` → opens Quick Add sheet, not a route
- Calendar → `/meetings`
- Insights → `/reports`; also active when on `/analytics/snap`

Off-tab destinations are reached from the profile menu, Quick Add, dashboard cards, or contextual links:

- Brands
- Payments
- Expenses
- Reminders
- Settings

### Quick Add Sheet

Opened by tapping the center `+` FAB. It appears as a bottom sheet with a two-column tile grid.

Tiles:

- Brand → navigates to `/brands` and opens Add Brand sheet.
- Deal → navigates to `/deals` and opens Add Deal sheet.
- Meeting → navigates to `/meetings` and opens Add Meeting sheet.
- Payment → navigates to `/payments` and opens Add Payment sheet.
- Expense → navigates to `/expenses` and opens Add Expense sheet if Pro; free users see Pro gate. Tile shows a Pro badge for free users.
- Snap report → navigates to `/analytics/snap`; upload card is the add surface. Tile shows a Pro badge for free users.
- Reminder → navigates to `/reminders` and opens Add Reminder sheet.

This is a canonical create-flow pattern: the sheet does not duplicate forms; it routes to the page that owns the form.

### Profile Menu Sheet

Opened by tapping the avatar in the header. It appears as a bottom sheet with the user avatar/name and rows:

- Brands → `/brands`
- Payments → `/payments`
- Expenses → `/expenses`
- Reminders → `/reminders`
- Settings → `/settings`
- Sign out → signs out and navigates to `/login`

## Route Map

Public routes:

- `/` Landing page
- `/login` Sign in / sign up
- `/auth-callback` Supabase callback
- `/privacy` Legal page
- `/terms` Legal page
- `/refund` Legal page

Protected routes:

- `/dashboard`
- `/deals`
- `/brands`
- `/brands/:id`
- `/payments`
- `/expenses`
- `/meetings`
- `/reminders`
- `/analytics/snap`
- `/reports`
- `/settings`

Unknown routes redirect to `/`.

## Public Landing Page `/`

Signed-in users are redirected to `/dashboard`. Signed-out users see a marketing landing page.

Visible content:

- Top nav with brand name, Features, How it works, Pricing, Live demo, language toggle, Sign in, Get started.
- Mobile drawer with the same core nav and CTA.
- Hero: "Run your influence like a business" with supporting copy about deals, payments, and Snapchat reports.
- Hero phone mock showing dashboard metrics, deal cards, payment received card, AI extracted views card.
- Feature sections for deals, payments, Snap analytics, and related product value.
- Pricing content is included in the landing markup.

Clicks:

- Get started / Start free → `/login?mode=signup`
- Sign in / Live demo → `/login`
- Feature/Pricing nav links → in-page anchors
- Language pill toggles landing-page language between English and Arabic independent of the app auth form locale toggle.

## Login `/login`

If already signed in, redirects to `/dashboard`.

Visible content:

- Inflero wordmark.
- Arabic/English locale segmented control.
- Auth card.
- Sign-in mode by default, sign-up mode when URL has `?mode=signup`.

Sign-in / sign-up form:

- Google OAuth button.
- Divider.
- Email input.
- Password input with show/hide icon.
- Submit button.
- Terms and Privacy links.
- Toggle link between sign in and sign up.

Clicks and outcomes:

- Google button → starts Supabase Google OAuth.
- Submit in sign-in mode → signs in, ensures app user row, navigates to dashboard.
- Submit in sign-up mode → signs up. If email confirmation is required, replaces form with Verify Notice telling user to check email.
- Verify Notice back button → returns to sign-in form.
- Show/hide password icon → toggles password visibility.
- Locale toggle → immediately flips language and page direction.

Error states:

- Auth errors render inline inside the form alert.
- Field validation errors show below each input.

## Dashboard `/dashboard`

This is the operational home screen.

Visible content:

- Optional incomplete profile banner.
- Month totals hero.
- Stat tiles.
- Today panel.
- Needs attention panel.

Header greeting:

- The app shell header says "Hi" plus display name on this page only.
- If display name is missing, fallback greeting text is shown.

Incomplete Profile Banner:

- Appears when profile is missing display name or avatar.
- Shows profile completion ring and missing-field tags.
- CTA navigates to Settings.
- Can be dismissed.

Month Totals:

- Violet gradient card for current month.
- Headline metric: invoiced amount.
- Collection-rate ring: collected divided by invoiced.
- Posted/pending line.
- Optional sparkline of invoiced trend.
- Three stat tiles: Collected, Outstanding, Posted.
- For Pro users only: extra strip with Expenses and Net.

Clicks:

- Collected tile → `/payments`
- Outstanding tile → `/payments`
- Posted tile → `/deals`
- "View payments" link → `/payments`
- Expenses tile, when visible → `/expenses`

Today Panel:

- Merges meetings in next 24 hours with due reminders.
- Deduplicates meeting reminders when the meeting itself is already shown.
- Shows overdue reminder rows with an overdue treatment.
- Rows with actionable references navigate to the relevant page.
- Done button marks reminder as done without navigating.

Needs Attention:

- Shows overdue payments.
- Shows deals past planned date that are not done.
- Rows navigate to Payments or Deals.
- Empty state says everything is clear.

Loading and errors:

- Month totals show hero/stat skeletons.
- Today and Needs Attention can show partial content plus error cards if one of their data sources fails.

## Deals `/deals`

Purpose: manage ad deals and lifecycle from planned to shot, posted, paid, or cancelled.

Visible content:

- Count line.
- Page title.
- Add Deal button when ready and when list exists or filters are active.
- Filters when list exists or filters are active.
- Rollup line: posted count and pending SAR amount for current filter result.
- Free users on unfiltered view see in-flight deal usage, e.g. count out of free cap.
- Deal row cards.

Filters:

- Status chips: see all, to-do, shot, posted, paid.
- Brand select.
- Month select based on existing deal post dates.

Empty states:

- No deals → empty state with Add first deal CTA.
- Filters produce no results → no matches empty state.
- If no brands exist and user opens Add Deal, sheet tells user to add a brand first and links to Brands.

Add Deal Sheet:

Fields:

- Brand select.
- Title.
- Deliverables builder: each line has type select and count input. Types: story, post, reel.
- Add deliverable button.
- Agreed amount.
- Shoot date/time.
- Post date/time.
- Notes.
- Submit.

Behavior:

- Creating a deal may also create reminders; if reminder creation fails, deal still exists and a warning toast appears.
- Free-tier deal limit is enforced server-side. If exceeded, the sheet closes and the global upgrade modal opens.

Deal Row:

- Whole row header is tappable.
- Shows title, brand name, status pill, amount, post date/time, chevron.
- Clicking expands/collapses inline; there is no deal detail route.

Expanded Deal Panel:

- Deliverables summary list.
- Progress section with two checkboxes:
  - Shot
  - Posted
- Planned shoot/post date shown if not completed; actual shot/posted timestamp shown after completion.
- Notes, if present.
- Payment summary:
  - Loading skeleton
  - Error message
  - No payments
  - All received
  - Or count received and outstanding SAR
- Snap report summary:
  - Loading skeleton
  - Error message
  - No report
  - Or linked report summary; link goes to `/analytics/snap`
- Edit button opens Edit Deal sheet.
- Cancel Deal button opens inline confirmation. Confirm cancels; Keep Deal backs out.

Lifecycle behavior:

- Shot checkbox marks a deal as shot.
- Posted checkbox marks a deal as posted and may arm a Snap analytics reminder.
- Checkboxes are disabled once lifecycle is locked by paid or cancelled state.
- Shot cannot be toggled after posted.

## Brands `/brands`

Purpose: manage brand directory and contact details.

Visible content:

- Count line.
- Page title.
- Add Brand button when brands exist.
- Brand list row cards.

Brand Row:

- Shows brand avatar/tint, localized primary brand name, secondary name, category/contact summary, and deal count.
- Clicking a row navigates to `/brands/:id`.

Empty states:

- No brands → empty state with Add your first brand CTA.
- If deal-count query fails, the list still renders and shows a small note that counts are unavailable.

Add Brand Sheet:

Fields:

- English name.
- Arabic name.
- Category select.
- Contact name.
- Contact email.
- Contact phone.
- Notes.
- Submit.

## Brand Detail `/brands/:id`

Purpose: inspect one brand, edit metadata, see rollups and associated deals.

Visible content:

- Back link to Brands.
- Brand card with avatar, localized name, secondary name, optional category chip, Edit button.
- Contact details if present.
- Notes if present.
- Rollup stats:
  - Lifetime total
  - Average deal size
  - Last engagement
- Deals section with deal count and deal rows.
- Delete brand section.

Clicks:

- Back → `/brands`
- Edit → opens Edit Brand sheet with same fields as Add Brand.
- Deal row → expands same as Deals page.
- Delete brand → if no deals, starts confirm state; Confirm Delete deletes and navigates back to `/brands`; Keep Brand cancels confirmation.

Delete behavior:

- Delete is disabled unless the deals query has resolved and there are zero deals.
- If brand has deals, explanatory blocked text appears.

States:

- Loading skeleton.
- Error card.
- Not found card with link back to brand list.
- No deals card in deal section.

## Payments `/payments`

Purpose: manage money in, installments, received status, and WhatsApp payment nudges.

Visible content:

- Count line.
- Page title.
- Add Payment button.
- Pending / Received segmented tabs.
- Pending tab can show Total Pending strip.
- Payment row cards.

Tabs:

- Pending: sorted by expected date.
- Received: sorted by received date.

Add Payment Sheet:

Fields:

- Deal select. Only active deals can receive new payments: pending, shot, posted.
- Amount.
- Method select: bank, cash, other, or not set.
- "Already received?" checkbox.
- Expected date, hidden when "Already received?" is checked.
- Notes.
- Submit.

Behavior:

- If "Already received?" is checked, create flow inserts payment and routes it through the mark-received RPC so status and deal paid-state update consistently.
- If there are no active deals, sheet tells user to create a deal first and links to Deals.

Payment Row:

- Shows deal title, payment status pill, amount, expected/received date.
- Pending rows show actions:
  - Mark received
  - Send reminder
  - Edit, if supporting deal data is loaded
- Received rows do not show pending actions.

Mark Received:

- Calls atomic backend operation.
- Updates payment to received.
- If all deal payments are received, deal becomes paid.
- Shows success toast; error toast on failure.

Send Reminder:

- Opens WhatsApp deep link in a new tab/window with prewritten localized reminder message.
- Requires brand contact phone via payment → deal → brand.
- If no valid phone, the button is disabled and row can show a no-phone hint.

Edit Payment Sheet:

- Same fields as Add Payment except "Already received?" is hidden.
- Editing does not change status.
- Includes Delete button.
- Delete opens a confirmation bottom sheet.

## Meetings `/meetings`

Purpose: schedule meetings and auto-create meeting reminders.

Visible content:

- Count line.
- Page title.
- Add Meeting button.
- Month navigation row: previous, current month label, next.
- List / Calendar segmented control.

List View:

- Meeting row cards.
- Each row shows time pill, title, optional brand/location/link subtitle, and dual date.
- Whole row opens Edit Meeting sheet.

Calendar View:

- Month grid card.
- Meeting dots on days with meetings.
- Selected day detail section below calendar.
- Empty day text when selected day has no meetings.
- Tapping a date selects that day.

Add/Edit Meeting Sheet:

Fields:

- Title.
- Scheduled at date/time.
- Location or link.
- Attendees builder with name/contact rows.
- Optional brand select.
- Optional deal select; only active deals listed.
- Notes.
- Submit.

Edit behavior:

- Row tap opens sheet prefilled.
- Delete Meeting button appears in edit mode.
- Delete requires inline confirmation: Confirm Delete / Keep Meeting.
- Create/edit attempts to maintain associated reminder. If reminder update fails, meeting still saves and a warning toast appears.

Month navigation:

- Previous/next buttons change month.
- Selected day becomes today when viewing current month, otherwise first day of selected month.

## Reminders `/reminders`

Purpose: manage user-created standalone reminders, separate from system-generated payment/meeting/deal reminders.

Visible content:

- Count line.
- Page title.
- Add Reminder button when reminders exist.
- Upcoming section.
- Done section.

Empty state:

- No reminders → empty state with Add reminder CTA.

Add/Edit Reminder Sheet:

Fields:

- Reminder text.
- Remind at date/time.
- Submit.
- Delete button in edit mode.

Default create behavior:

- New reminder defaults to tomorrow at 09:00 local time.

Reminder Row:

- Shows text and due date/time.
- Overdue reminders receive overdue treatment.
- Edit opens sheet.
- Done/Undo toggles `is_done`.

Done section:

- Shows completed reminders newest-first.
- Clear Done button deletes/clears completed reminders and shows toast.

Dashboard relationship:

- Custom reminders due within the next 24 hours appear in Today panel.

## Insights: Reports `/reports`

Purpose: Pro-only reporting on invoiced/collected history and per-brand collection rate.

Access:

- Bottom tab Insights opens `/reports`.
- Reports/Snap segmented control appears at the top.
- Free users see global upgrade modal on landing and a locked UpgradePrompt card behind it.

Visible content for Pro users:

- Insights tabs.
- Page title.
- Monthly section.
- Per-brand section.

Monthly Section:

- Title and period label.
- Card containing:
  - Chart skeleton while loading.
  - Error text on failure.
  - Empty state if all 12 months are zero.
  - Lazy-loaded bar chart once data exists.
- Chart compares invoiced vs collected for last 12 months.

Per-Brand Section:

- Loading skeleton.
- Error card.
- Empty card with CTA to Deals if no report data.
- Row cards showing brand, deal count, invoiced SAR, and collection-rate progress bar.

Clicks:

- Insights tab switch to Snap Analytics.
- Empty per-brand CTA → `/deals`

## Insights: Snap Analytics `/analytics/snap`

Purpose: Pro-only Snap report generation and history.

Access:

- Quick Add → Snap report.
- Insights tabs from Reports.
- Deal expanded panel linked report line.
- Free users see global upgrade modal on landing and a locked UpgradePrompt card behind it.

Visible content for Pro users:

- Insights tabs.
- Count line.
- Page title.
- Upload card.
- Report history list.

Upload Card:

- Heading.
- Campaign / Monthly segmented control.

Campaign Upload:

- Required deal picker.
- Multi-image upload area for 1-3 campaign frames.
- Thumbnail previews with remove buttons.
- Generate campaign report button.
- Disabled until a deal and at least one frame are chosen.

Monthly Upload:

- Step guide.
- Three upload slots:
  - Profile
  - Public Stories
  - Spotlight
- Each slot supports image thumbnails, remove buttons, and an add tile.
- Period input, defaulting to current month-year.
- Generate monthly report button.
- Disabled until at least one image is chosen.

Report History Row:

- Whole row opens detail sheet.
- Shows report type chip, status pill, title based on report type/period/date, and metric summary.
- Pending rows pulse with reading/extraction message.
- Failed rows encourage manual entry.

Report Detail Sheet:

- Opens as bottom sheet.
- Chooses sheet by report scope:
  - Campaign 24h → CampaignSnapReportSheet.
  - Monthly → MonthlySnapReportSheet.
  - Legacy post/monthly rows → original SnapReportSheet.

Common detail behavior:

- Source image previews where relevant.
- Pending reports disable edits until extraction settles.
- Failed reports open editable fields as recovery path.
- Each metric row can be edited with pencil.
- Save changes stamps report as manual.
- Discard exits edit state.
- Extracted/manual reports show a report-preview card.
- Download button exports the report preview as PNG.

Deal linking:

- Campaign reports are tied to a deal.
- Monthly account reports do not link to a deal.

Realtime behavior:

- While any report is pending, the page subscribes to report updates and refreshes history/detail when extraction finishes.

## Expenses `/expenses`

Purpose: Pro-only business-expense ledger, money out.

Access:

- Profile menu.
- Quick Add → Expense.
- Dashboard Pro expenses tile.
- Free users see global upgrade modal on landing and a locked UpgradePrompt card behind it.

Visible content for Pro users:

- Count line.
- Page title.
- Add Expense button when rows exist or filters are active.
- Category chips.
- Month select when months exist.
- Expense row cards.

Filters:

- Category chips: all plus fixed expense categories.
- Month select from months that have expense rows.

Empty states:

- No expenses → empty state with Add expense CTA.
- Filter result empty → no matches empty state.

Add/Edit Expense Sheet:

Fields:

- Title.
- Category chips.
- Amount.
- Expense date, default today for create.
- Optional linked deal select; any deal can be selected, including paid/cancelled.
- Notes.
- Save.
- Delete button in edit mode.

Expense Row:

- Shows category badge, title, amount, date, optional linked deal title.
- Clicking row opens edit sheet.

Dashboard relationship:

- Pro dashboard uses expenses to show Expenses and Net tiles.

## Settings `/settings`

Purpose: user settings, billing, notifications, profile, support, account deletion.

Visible content:

- Page title.
- Language section.
- Notifications section.
- Billing section.
- Reminder settings.
- Profile settings.
- Save button.
- Sign out button.
- Support section.
- Delete account section.

Language:

- Arabic/English segmented control.
- Switches UI language and direction immediately.
- Persists to user profile; error toast if persistence fails.

Notifications:

- Per-device web push controls.
- Shows state-specific messaging:
  - Unsupported browser.
  - Unavailable when VAPID/config is absent.
  - Blocked permission.
  - iOS install required.
  - Enabled with Turn off button.
  - Default unsubscribed with enable button.
- May show Add to Home Screen / install guidance.

Billing:

- Shows plan/entitlement information.
- Free users can upgrade through LemonSqueezy checkout.
- Pro users can open customer portal.
- Free users can redeem promo code.
- Returning from checkout with success param shows toast, refreshes entitlement, then removes URL param.

Reminder settings:

- Default reminder lead time in minutes.
- Affects future reminders.

Profile:

- Display name input.
- Avatar dropzone supporting click/drag upload and preview.
- Save button persists profile and avatar.

Sign out:

- Destructive button; signs out and navigates to `/login`.

Support:

- Support section appears below sign-out. It is a settings surface for help/contact information.

Delete Account:

- Account deletion section appears last and handles destructive account removal flow.

## Legal Pages

Routes:

- `/privacy`
- `/terms`
- `/refund`

Purpose:

- Public legal pages needed for Google OAuth and LemonSqueezy merchant settings.
- They render through a shared LegalPageLayout using static legal content.

## Global Overlays And Feedback

### Bottom Sheet

Used for nearly all create/edit flows and menus. Behavior:

- Slides up from bottom.
- Scrim backdrop.
- Close via scrim, close button, Escape, or focus flow.
- Locks body scroll.
- Traps focus.
- Returns focus to trigger on close.

Main sheet uses:

- Quick Add.
- Profile menu.
- Add/Edit Brand.
- Add/Edit Deal.
- Add/Edit Payment.
- Delete Payment confirmation.
- Add/Edit Meeting.
- Add/Edit Reminder.
- Add/Edit Expense.
- Snap report detail.

### Toasts

Used for mutation feedback:

- Success: created/saved/received/deleted/cleared/checkout success.
- Error: failed save/load/delete/receive/reminder.
- Info in a few neutral cases.

Toast appears fixed near the bottom and auto-dismisses.

### Upgrade Modal / Upgrade Prompt

There is one global upgrade modal provider. Pro gates call this modal with context-specific copy.

Gated surfaces:

- Reports.
- Snap AI extraction.
- Expenses.
- Free-tier deal limit.
- Web push reminders are also part of Pro plan per docs, but Settings notification UI handles availability/state.

Locked routes also render an UpgradePrompt card behind the modal so users have an in-page way to reopen the upgrade prompt.

## Data And State Patterns A UX Designer Should Know

### Loading

- First auth check shows full-page skeleton.
- Lists use skeleton cards shaped like final rows.
- Charts use chart-shaped skeletons.
- Route sections often handle partial failure rather than blanking the whole page.

### Empty States

Every primary empty list has an empty state. Common pattern:

- Small icon.
- One-line message.
- One CTA when there is an obvious next action.

### Error States

- Route load errors render cards or inline error text.
- Mutation errors show toasts.
- Row-scoped failures render inline inside the row or sheet.
- Raw backend errors are not shown to the user.

### RTL / Locale

- Arabic is the default locale.
- Root `lang` and `dir` change with locale.
- Layout uses logical leading/trailing spacing and mirrored arrows.
- Date presentation commonly shows both Gregorian and Hijri; order depends on locale.
- Money uses SAR and locale-aware formatting.
- Numeric form inputs stay LTR/Western digits for reliable input.

## Current UX Friction And Open Questions

These are not code defects by themselves; they are useful design prompts.

- Search button is visible globally but non-functional. Decide whether to remove, disable with explanation, or implement scoped/global search.
- `/` behavior changed from app-entry redirect to public landing page. Decide whether the product wants marketing-first or auth-first entry.
- Quick Add has seven tiles, while original UI rules described six tiles. The current layout is functional but may feel uneven in a two-column grid.
- Pro gates appear automatically on route landing. Evaluate whether automatic modal is too interruptive versus an inline locked card first.
- Off-tab destinations depend on avatar/profile menu discoverability. Payments has dashboard tile links, but Brands/Reminders/Settings may still be less obvious to new users.
- Reports and Snap share the Insights tab but Expenses is separate in profile menu. Decide whether money-out belongs closer to Payments or Dashboard.
- Deal detail is an accordion, not a dedicated detail page. This is efficient for scanning but may limit deep linking and complex editing.
- Payment reminders open WhatsApp externally. Confirm whether this expectation is clear before the click, especially when disabled due to missing phone.
- Free deal-cap feedback appears on the Deals page and at create failure. Consider whether users need earlier education during onboarding.
- The product has many bottom sheets. Ensure nested sheet/confirmation flows feel predictable on small screens.

## Suggested Prompt For A UX Improvement AI

Use this document as the source of truth for the current app. Act as a senior mobile-first SaaS UX designer. Review the full Inflero experience for a Saudi Arabic-first influencer managing brand deals. Focus on navigation clarity, information hierarchy, empty states, Pro upgrade moments, Quick Add ergonomics, form complexity, and the relationship between deals, payments, meetings, reminders, Snap reports, and dashboard attention states. Propose improvements that preserve the existing product model, bilingual RTL/LTR support, bottom-tab navigation, and mobile-first 640px content constraint. Do not invent unrelated features; improve the current flows.
