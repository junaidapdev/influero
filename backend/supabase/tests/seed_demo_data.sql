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
--   3. Re-running is safe: it deletes its own fixed-id rows first, then re-inserts
--      (so edits re-apply). It only ever touches these seed rows, never data you
--      create by hand in the app.
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
  v_email text := lower('junaidap.dev@gmail.com');
  v_user  uuid;

  -- Fixed ids so the script is re-runnable and FK references are stable.
  b_nike    uuid := 'b0000001-0000-4000-8000-000000000001';
  b_almarai uuid := 'b0000002-0000-4000-8000-000000000002';
  b_stc     uuid := 'b0000003-0000-4000-8000-000000000003';
  b_nodeals uuid := 'b0000004-0000-4000-8000-000000000004';

  d_summer  uuid := 'd0000001-0000-4000-8000-000000000001'; -- Nike, paid
  d_ramadan uuid := 'd0000002-0000-4000-8000-000000000002'; -- Nike, shot (not yet posted)
  d_review  uuid := 'd0000003-0000-4000-8000-000000000003'; -- Almarai, posted (overdue payment)
  d_event   uuid := 'd0000004-0000-4000-8000-000000000004'; -- Almarai, pending (post-overdue)
  d_aware   uuid := 'd0000005-0000-4000-8000-000000000005'; -- STC, cancelled
  d_unbox   uuid := 'd0000006-0000-4000-8000-000000000006'; -- STC, pending (shoot-overdue, 2 installments)

  p_adv  uuid := 'c0000001-0000-4000-8000-000000000001';
  p_bal  uuid := 'c0000002-0000-4000-8000-000000000002';
  p_ram  uuid := 'c0000003-0000-4000-8000-000000000003';
  p_rev  uuid := 'c0000004-0000-4000-8000-000000000004';
  p_unb1 uuid := 'c0000005-0000-4000-8000-000000000005';
  p_unb2 uuid := 'c0000006-0000-4000-8000-000000000006';

  m_nike    uuid := 'e0000001-0000-4000-8000-000000000001';
  m_almarai uuid := 'e0000002-0000-4000-8000-000000000002';
  m_stc     uuid := 'e0000003-0000-4000-8000-000000000003';
  m_cancel  uuid := 'e0000004-0000-4000-8000-000000000004';

  r_mnike   uuid := 'f0000001-0000-4000-8000-000000000001';
  r_malmarai uuid := 'f0000002-0000-4000-8000-000000000002';
  r_pay     uuid := 'f0000003-0000-4000-8000-000000000003';
  r_deliv   uuid := 'f0000004-0000-4000-8000-000000000004';
  r_shoot   uuid := 'f0000005-0000-4000-8000-000000000005';
  r_post    uuid := 'f0000006-0000-4000-8000-000000000006';

  s_post    uuid := 'a0000001-0000-4000-8000-000000000001';
  s_monthly uuid := 'a0000002-0000-4000-8000-000000000002';
  s_failed  uuid := 'a0000003-0000-4000-8000-000000000003';
begin
  select id into v_user from auth.users where lower(email) = v_email;
  if v_user is null then
    raise exception 'No auth user found for %. Sign in on the app once first, then set v_email to that address.', v_email;
  end if;

  -- Clean prior seed (FK-safe order) so re-runs refresh cleanly.
  delete from public.snap_reports where id in (s_post, s_monthly, s_failed);
  delete from public.reminders where id in (r_mnike, r_malmarai, r_pay, r_deliv, r_shoot, r_post);
  delete from public.payments where id in (p_adv, p_bal, p_ram, p_rev, p_unb1, p_unb2);
  delete from public.meetings where id in (m_nike, m_almarai, m_stc, m_cancel);
  delete from public.ad_deals where id in (d_summer, d_ramadan, d_review, d_event, d_aware, d_unbox);
  delete from public.brands where id in (b_nike, b_almarai, b_stc, b_nodeals);

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
-- begin
--   delete from public.snap_reports where id in
--     ('a0000001-0000-4000-8000-000000000001','a0000002-0000-4000-8000-000000000002','a0000003-0000-4000-8000-000000000003');
--   delete from public.reminders where id in
--     ('f0000001-0000-4000-8000-000000000001','f0000002-0000-4000-8000-000000000002','f0000003-0000-4000-8000-000000000003','f0000004-0000-4000-8000-000000000004','f0000005-0000-4000-8000-000000000005','f0000006-0000-4000-8000-000000000006');
--   delete from public.payments where id in
--     ('c0000001-0000-4000-8000-000000000001','c0000002-0000-4000-8000-000000000002','c0000003-0000-4000-8000-000000000003','c0000004-0000-4000-8000-000000000004','c0000005-0000-4000-8000-000000000005','c0000006-0000-4000-8000-000000000006');
--   delete from public.meetings where id in
--     ('e0000001-0000-4000-8000-000000000001','e0000002-0000-4000-8000-000000000002','e0000003-0000-4000-8000-000000000003','e0000004-0000-4000-8000-000000000004');
--   delete from public.ad_deals where id in
--     ('d0000001-0000-4000-8000-000000000001','d0000002-0000-4000-8000-000000000002','d0000003-0000-4000-8000-000000000003','d0000004-0000-4000-8000-000000000004','d0000005-0000-4000-8000-000000000005','d0000006-0000-4000-8000-000000000006');
--   delete from public.brands where id in
--     ('b0000001-0000-4000-8000-000000000001','b0000002-0000-4000-8000-000000000002','b0000003-0000-4000-8000-000000000003','b0000004-0000-4000-8000-000000000004');
-- end $$;
