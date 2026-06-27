-- Demo / test data for Inflero (Feature 17 manual testing).
--
-- WHY a script, not the app: it seeds a realistic spread across every table at
-- once (brands → deals → payments → meetings → reminders → snap reports) so the
-- whole app shows populated screens for the 375px/RTL walk-through and the live
-- mutation tests, without hand-creating dozens of rows. The Supabase SQL editor
-- runs as the table owner (RLS bypassed there), which is the only context that
-- can set user_id explicitly — so the rows land under YOUR auth user.
--
-- HOW TO RUN
--   1. Set v_email below to the account you sign in with on the deployed app
--      (your PRIMARY account — NOT the second account used for the RLS test).
--      Sign in once first so the auth.users row exists.
--   2. Paste the whole file into the Supabase SQL editor and Run.
--   3. Re-running is safe: it deletes its own per-user seed rows first, then
--      re-inserts (so edits re-apply). It only ever touches THIS account's seed
--      rows — never data you create by hand, and never another account's rows.
--
-- Money dates are fixed in 2026 so the dashboard hand-calc below holds when run
-- in June 2026. Meetings/reminders use now()-relative times so the "Today" panel
-- is correct whenever you run it.
--
-- Deal status is DERIVED from the two stamps (posted_at → posted, else shot_at →
-- shot, else pending; paid/cancelled terminal); the seed sets the stamps AND the
-- status so they agree, matching what the app writes. post_date is the publish
-- date (was deadline); shoot_date drives the shoot reminder.
--
-- HAND-CALC (what the dashboard should show for June 2026):
--   Invoiced this month   = 63,000  (Nike 25k + Nike 18k + Almarai 12k + Almarai 8k; post_dates in June, non-cancelled)
--   Collected this month  = 15,000  (Summer Collection balance, received 2026-06-05; the 10k advance was May)
--   Outstanding (all-time)= 45,000  (Ramadan 18k + Product Review 12k + Unboxing 7.5k + 7.5k)
--   Deals posted (June)   = 2       (Summer Collection = paid, Product Review = posted)
--   Deals pending (June)  = 2       (Ramadan = shot, Influencer Event = pending — both not yet posted, post_date in June)
--   Collection ring       ≈ 24%     (15,000 / 63,000)
--   Needs attention       = overdue payment (Almarai 12,000, expected 2026-05-30)
--                           + post-overdue deal (Influencer Event, post_date 2026-06-05, not posted)
--                           + shoot-overdue deal (New Phone Unboxing, shoot_date 2026-06-01, not shot)
--   Today                 = 2 meetings (in ~3h and ~tomorrow) + a snap-analytics reminder (~4h)
--                           + a shoot reminder (~1h) + a post reminder (~2h) + an overdue payment reminder

do $$
declare
  -- >>> CHANGE THIS to the email you log in with on the deployed app <<<
  -- Left as a placeholder on purpose — the script refuses to run until you set it.
  v_email text := lower('you@example.com');
  v_user  uuid;

  -- Per-user ids, assigned in the body once v_user is known (see below). Derived
  -- from the user id so they're stable across re-runs for one account, yet
  -- distinct per account — seeding a second user never collides with, or deletes,
  -- the first user's rows (safe on a shared database). FK references stay stable.
  b_nike uuid; b_almarai uuid; b_stc uuid; b_nodeals uuid;

  d_summer uuid;   -- Nike, paid
  d_ramadan uuid;  -- Nike, shot (not yet posted)
  d_review uuid;   -- Almarai, posted (overdue payment)
  d_event uuid;    -- Almarai, pending (post-overdue)
  d_aware uuid;    -- STC, cancelled
  d_unbox uuid;    -- STC, pending (shoot-overdue, 2 installments)

  p_adv uuid; p_bal uuid; p_ram uuid; p_rev uuid; p_unb1 uuid; p_unb2 uuid;
  m_nike uuid; m_almarai uuid; m_stc uuid; m_cancel uuid;
  r_mnike uuid; r_malmarai uuid; r_pay uuid; r_deliv uuid; r_shoot uuid; r_post uuid;
  s_post uuid; s_monthly uuid; s_failed uuid;
begin
  if v_email = 'you@example.com' then
    raise exception 'Set v_email (top of this script) to the address you sign in with first.';
  end if;

  select id into v_user from auth.users where lower(email) = v_email;
  if v_user is null then
    raise exception 'No auth user found for %. Sign in on the app once first, then set v_email to that address.', v_email;
  end if;

  -- Stable per-user ids: md5(user id + a key) cast to uuid → deterministic per
  -- (user, key). Same user re-running gets the same ids (so the deletes+inserts
  -- below refresh cleanly); a different user gets entirely different ids (so
  -- seeding a second account never touches the first account's rows).
  b_nike    := md5(v_user::text || ':b_nike')::uuid;
  b_almarai := md5(v_user::text || ':b_almarai')::uuid;
  b_stc     := md5(v_user::text || ':b_stc')::uuid;
  b_nodeals := md5(v_user::text || ':b_nodeals')::uuid;
  d_summer  := md5(v_user::text || ':d_summer')::uuid;
  d_ramadan := md5(v_user::text || ':d_ramadan')::uuid;
  d_review  := md5(v_user::text || ':d_review')::uuid;
  d_event   := md5(v_user::text || ':d_event')::uuid;
  d_aware   := md5(v_user::text || ':d_aware')::uuid;
  d_unbox   := md5(v_user::text || ':d_unbox')::uuid;
  p_adv     := md5(v_user::text || ':p_adv')::uuid;
  p_bal     := md5(v_user::text || ':p_bal')::uuid;
  p_ram     := md5(v_user::text || ':p_ram')::uuid;
  p_rev     := md5(v_user::text || ':p_rev')::uuid;
  p_unb1    := md5(v_user::text || ':p_unb1')::uuid;
  p_unb2    := md5(v_user::text || ':p_unb2')::uuid;
  m_nike    := md5(v_user::text || ':m_nike')::uuid;
  m_almarai := md5(v_user::text || ':m_almarai')::uuid;
  m_stc     := md5(v_user::text || ':m_stc')::uuid;
  m_cancel  := md5(v_user::text || ':m_cancel')::uuid;
  r_mnike   := md5(v_user::text || ':r_mnike')::uuid;
  r_malmarai := md5(v_user::text || ':r_malmarai')::uuid;
  r_pay     := md5(v_user::text || ':r_pay')::uuid;
  r_deliv   := md5(v_user::text || ':r_deliv')::uuid;
  r_shoot   := md5(v_user::text || ':r_shoot')::uuid;
  r_post    := md5(v_user::text || ':r_post')::uuid;
  s_post    := md5(v_user::text || ':s_post')::uuid;
  s_monthly := md5(v_user::text || ':s_monthly')::uuid;
  s_failed  := md5(v_user::text || ':s_failed')::uuid;

  -- Clean prior seed for THIS user (FK-safe order) so re-runs refresh cleanly.
  delete from public.snap_reports where user_id = v_user and id in (s_post, s_monthly, s_failed);
  delete from public.reminders where user_id = v_user and id in (r_mnike, r_malmarai, r_pay, r_deliv, r_shoot, r_post);
  delete from public.payments where user_id = v_user and id in (p_adv, p_bal, p_ram, p_rev, p_unb1, p_unb2);
  delete from public.meetings where user_id = v_user and id in (m_nike, m_almarai, m_stc, m_cancel);
  delete from public.ad_deals where user_id = v_user and id in (d_summer, d_ramadan, d_review, d_event, d_aware, d_unbox);
  delete from public.brands where user_id = v_user and id in (b_nike, b_almarai, b_stc, b_nodeals);

  -- ---- Brands -------------------------------------------------------------
  -- category: post-v1; b_nodeals left NULL on purpose (tests the no-chip path).
  insert into public.brands (id, user_id, name_en, name_ar, category, contact_name, contact_email, contact_phone, notes) values
    (b_nike,    v_user, 'Nike',       'نايكي',      'fashion', 'Sarah Ahmed',     'sarah@nike.com',     '+966500000001', 'Sportswear — recurring quarterly campaigns.'),
    (b_almarai, v_user, 'Almarai',    'المراعي',    'other',   'Khalid Al-Rashid','khalid@almarai.com', '+966500000002', 'Dairy & food. Prefers reels.'),
    (b_stc,     v_user, 'STC',        'إس تي سي',   'tech',    'Mona Saleh',      null,                 '+966500000003', null),
    (b_nodeals, v_user, 'NoDeals Co', 'بدون صفقات', null,      null,              null,                 null,            'Brand with no deals yet — tests the empty rollups.');

  -- ---- Deals (deliverables = read-only descriptor; status derived from the
  --      shot_at/posted_at stamps, set here to agree) -------------------------
  insert into public.ad_deals
    (id, user_id, brand_id, title, deliverables, agreed_amount_sar,
     shoot_date, post_date, shot_at, posted_at, status, notes) values
    (d_summer, v_user, b_nike, 'Summer Collection Launch',
       '[{"type":"story","count":3},{"type":"post","count":2},{"type":"reel","count":1}]'::jsonb,
       25000, date '2026-06-02', date '2026-06-20',
       timestamptz '2026-06-04T10:00:00Z', timestamptz '2026-06-06T15:00:00Z', 'paid',
       'Fully delivered and paid in two installments.'),
    (d_ramadan, v_user, b_nike, 'Ramadan Campaign',
       '[{"type":"story","count":4},{"type":"post","count":1}]'::jsonb,
       18000, date '2026-06-10', date '2026-06-25',
       timestamptz '2026-06-12T09:00:00Z', null, 'shot', 'Shot — final post still pending.'),
    (d_review, v_user, b_almarai, 'Product Review Reel',
       '[{"type":"reel","count":1}]'::jsonb,
       12000, date '2026-06-08', date '2026-06-10',
       timestamptz '2026-06-08T11:00:00Z', timestamptz '2026-06-09T11:00:00Z', 'posted',
       'Posted — invoice overdue.'),
    (d_event, v_user, b_almarai, 'Influencer Event Coverage',
       '[{"type":"story","count":2},{"type":"post","count":1}]'::jsonb,
       8000, null, date '2026-06-05', null, null, 'pending',
       'Post date passed, nothing posted — needs attention.'),
    (d_aware, v_user, b_stc, 'Brand Awareness Stories',
       '[{"type":"story","count":5}]'::jsonb,
       5000, null, date '2026-07-01', null, null, 'cancelled', 'Cancelled by brand.'),
    (d_unbox, v_user, b_stc, 'New Phone Unboxing',
       '[{"type":"reel","count":1},{"type":"post","count":1}]'::jsonb,
       15000, date '2026-06-01', date '2026-07-15', null, null, 'pending',
       'Shoot date passed, not yet shot — needs attention. Split into two installments.');

  -- ---- Payments -----------------------------------------------------------
  insert into public.payments (id, user_id, deal_id, amount_sar, expected_date, received_date, status, method, notes) values
    (p_adv,  v_user, d_summer, 10000, date '2026-05-10', date '2026-05-15', 'received', 'bank', 'Advance.'),
    (p_bal,  v_user, d_summer, 15000, date '2026-06-01', date '2026-06-05', 'received', 'bank', 'Balance.'),
    (p_ram,  v_user, d_ramadan, 18000, date '2026-06-28', null, 'pending', 'bank', 'Due after campaign.'),
    (p_rev,  v_user, d_review, 12000, date '2026-05-30', null, 'pending', 'bank', 'OVERDUE — expected date passed, still pending.'),
    (p_unb1, v_user, d_unbox, 7500, date '2026-07-10', null, 'pending', 'cash', 'Installment 1 of 2.'),
    (p_unb2, v_user, d_unbox, 7500, date '2026-08-10', null, 'pending', 'cash', 'Installment 2 of 2.');

  -- ---- Meetings (now()-relative so the Today panel is correct anytime) -----
  insert into public.meetings (id, user_id, brand_id, deal_id, title, scheduled_at, location_or_link, attendees, status) values
    (m_nike, v_user, b_nike, d_ramadan, 'Nike Q3 Planning Call',
       now() + interval '3 hours', 'Google Meet',
       '[{"name":"Sarah Ahmed","contact":"sarah@nike.com"},{"name":"Omar"}]'::jsonb, 'upcoming'),
    (m_almarai, v_user, b_almarai, null, 'Almarai Contract Review',
       now() + interval '20 hours', 'Almarai HQ, Riyadh',
       '[{"name":"Khalid Al-Rashid"}]'::jsonb, 'upcoming'),
    (m_stc, v_user, b_stc, d_unbox, 'STC Unboxing Strategy',
       now() + interval '7 days', 'Zoom',
       '[]'::jsonb, 'upcoming'),
    (m_cancel, v_user, b_nike, null, 'Cancelled Sync (should not appear)',
       now() + interval '2 days', null, '[]'::jsonb, 'cancelled');

  -- ---- Reminders (what the app would create; the Today panel dedupes a
  --      meeting-kind reminder against its meeting when both are in-window) ----
  insert into public.reminders (id, user_id, kind, ref_id, ref_table, due_at, message_en, message_ar, is_done) values
    (r_mnike, v_user, 'meeting', m_nike::text, 'meetings',
       now() + interval '2 hours', 'Meeting: Nike Q3 Planning Call', 'اجتماع: مكالمة تخطيط نايكي للربع الثالث', false),
    (r_malmarai, v_user, 'meeting', m_almarai::text, 'meetings',
       now() + interval '19 hours', 'Meeting: Almarai Contract Review', 'اجتماع: مراجعة عقد المراعي', false),
    (r_pay, v_user, 'payment', p_rev::text, 'payments',
       now() - interval '5 days', 'Payment due — Almarai (SAR 12,000)', 'دفعة مستحقة — المراعي (١٢٬٠٠٠ ريال)', false),
    (r_deliv, v_user, 'deliverable', d_summer::text, 'ad_deals',
       now() + interval '4 hours', 'Capture Snap analytics — Summer Collection Launch', 'التقط تحليلات سناب — Summer Collection Launch', false),
    (r_shoot, v_user, 'shoot', d_unbox::text, 'ad_deals',
       now() + interval '1 hour', 'Shoot — New Phone Unboxing', 'تصوير — New Phone Unboxing', false),
    (r_post, v_user, 'post', d_ramadan::text, 'ad_deals',
       now() + interval '2 hours', 'Post — Ramadan Campaign', 'نشر — Ramadan Campaign', false);

  -- ---- Snap reports (source_file_url is a placeholder path — the actual
  --      object isn't in the bucket, so the sheet's image preview shows its
  --      inline "couldn't load" fallback; every other field + the PNG export
  --      card render fully. Upload a real screenshot to test live extraction.) -
  insert into public.snap_reports
    (id, user_id, deal_id, report_type, report_date, source_file_url,
     views, reach, story_views, screenshot_count, swipe_ups,
     profile_views, new_followers, watch_time_minutes, extraction_status) values
    (s_post, v_user, d_summer, 'post', date '2026-06-06', v_user::text || '/seed-post.png',
       45200, 38100, 12400, 320, 890, null, null, null, 'extracted'),
    (s_monthly, v_user, null, 'monthly', date '2026-06-01', v_user::text || '/seed-monthly.png',
       210859, 180400, 95200, null, null, 15600, 562, 8400, 'extracted'),
    (s_failed, v_user, null, 'post', null, v_user::text || '/seed-failed.png',
       null, null, null, null, null, null, null, null, 'failed');

  raise notice 'Seed complete for % (user %).', v_email, v_user;
end $$;

-- ===========================================================================
-- TEARDOWN — run this block alone to remove all seed rows (FK-safe order).
-- ===========================================================================
-- do $$
-- declare
--   v_email text := lower('you@example.com');  -- the SAME address you seeded
--   v_user  uuid;
-- begin
--   select id into v_user from auth.users where lower(email) = v_email;
--   if v_user is null then raise exception 'No auth user for %', v_email; end if;
--   delete from public.snap_reports where user_id = v_user and id in (
--     md5(v_user::text||':s_post')::uuid, md5(v_user::text||':s_monthly')::uuid, md5(v_user::text||':s_failed')::uuid);
--   delete from public.reminders where user_id = v_user and id in (
--     md5(v_user::text||':r_mnike')::uuid, md5(v_user::text||':r_malmarai')::uuid, md5(v_user::text||':r_pay')::uuid,
--     md5(v_user::text||':r_deliv')::uuid, md5(v_user::text||':r_shoot')::uuid, md5(v_user::text||':r_post')::uuid);
--   delete from public.payments where user_id = v_user and id in (
--     md5(v_user::text||':p_adv')::uuid, md5(v_user::text||':p_bal')::uuid, md5(v_user::text||':p_ram')::uuid,
--     md5(v_user::text||':p_rev')::uuid, md5(v_user::text||':p_unb1')::uuid, md5(v_user::text||':p_unb2')::uuid);
--   delete from public.meetings where user_id = v_user and id in (
--     md5(v_user::text||':m_nike')::uuid, md5(v_user::text||':m_almarai')::uuid,
--     md5(v_user::text||':m_stc')::uuid, md5(v_user::text||':m_cancel')::uuid);
--   delete from public.ad_deals where user_id = v_user and id in (
--     md5(v_user::text||':d_summer')::uuid, md5(v_user::text||':d_ramadan')::uuid, md5(v_user::text||':d_review')::uuid,
--     md5(v_user::text||':d_event')::uuid, md5(v_user::text||':d_aware')::uuid, md5(v_user::text||':d_unbox')::uuid);
--   delete from public.brands where user_id = v_user and id in (
--     md5(v_user::text||':b_nike')::uuid, md5(v_user::text||':b_almarai')::uuid,
--     md5(v_user::text||':b_stc')::uuid, md5(v_user::text||':b_nodeals')::uuid);
-- end $$;
