-- One-time backfill — run ONCE in the Supabase SQL editor.
-- Deliberately NOT a numbered migration and kept OUT of supabase/migrations so
-- `supabase db push` never re-applies it.
--
-- Context: shoot/post reminders used to store a DAY-GRANULAR due_at (midnight of
-- the planned day, or the creation instant for a same-day task), which hid the
-- real time on the dashboard Today panel and made same-day tasks read "Overdue"
-- the moment they were created. The app now stores the EXACT planned time
-- (= the deal's shoot_date / post_date) as the reminder's due_at. NEW and edited
-- deals already get the correct value; this realigns the OPEN reminders on deals
-- that existed BEFORE the change so they show the right time immediately instead
-- of only after their deal is next touched.
--
-- Safe + idempotent: due_at is display-only, the `is distinct from` guard makes a
-- re-run a no-op, and it only touches open (is_done = false) shoot/post reminders
-- that still point at an existing deal with the date set. Note: reminders.ref_id
-- is text while ad_deals.id is uuid, hence the d.id::text cast.

update public.reminders r
   set due_at = d.shoot_date
  from public.ad_deals d
 where r.ref_id = d.id::text
   and r.kind = 'shoot'
   and r.is_done = false
   and d.shoot_date is not null
   and r.due_at is distinct from d.shoot_date;

update public.reminders r
   set due_at = d.post_date
  from public.ad_deals d
 where r.ref_id = d.id::text
   and r.kind = 'post'
   and r.is_done = false
   and d.post_date is not null
   and r.due_at is distinct from d.post_date;
