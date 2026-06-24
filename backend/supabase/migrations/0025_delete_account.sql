-- delete_my_account: permanently erases the CALLING user's app data in ONE
-- transaction — the PDPL/GDPR "right to erasure" surface. Called by the
-- delete-account edge function (as the caller); that function then cancels any
-- LemonSqueezy subscription, removes the user's storage objects, and deletes the
-- auth.users row itself via the admin API. This function deliberately does NOT
-- touch auth.users or storage — only the public app rows.
--
-- SECURITY DEFINER (not invoker, unlike mark_payment_received): some user-owned
-- tables expose only SELECT-own RLS and have NO delete policy (subscriptions,
-- entitlement_grants, promo_redemptions are written by the webhook / definer
-- functions), so a security-invoker delete would be blocked on them. Running as
-- the owner clears every table. It is SAFE because it is PARAMETERLESS and scoped
-- to auth.uid() — it can only ever delete the caller's own rows, never another
-- user's. `set search_path = ''` + fully-qualified names mirror is_pro / redeem_promo.
--
-- ORDER MATTERS — two RESTRICT foreign keys exist:
--   ad_deals.brand_id -> brands       (0005, on delete restrict)
--   payments.deal_id  -> ad_deals     (0006, on delete restrict)
-- RESTRICT is non-deferrable, so the referencing child must be deleted before its
-- parent: payments -> ad_deals -> brands. (A naive `delete from auth.users` cascade
-- can fail for exactly this reason.) The remaining tables carry no RESTRICT among
-- themselves (deal_id links are on delete set null), so their order is free;
-- app_users is the profile row and goes last.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  -- RESTRICT chain first, deepest child outward.
  delete from public.payments where user_id = v_uid;
  delete from public.ad_deals where user_id = v_uid;
  delete from public.brands   where user_id = v_uid;

  -- Independent user-owned tables (no RESTRICT among them; deal_id links already
  -- nulled by the ad_deals delete above).
  delete from public.snap_reports        where user_id = v_uid;
  delete from public.expenses            where user_id = v_uid;
  delete from public.meetings            where user_id = v_uid;
  delete from public.reminders           where user_id = v_uid;
  delete from public.activity_log        where user_id = v_uid;
  delete from public.notification_sends  where user_id = v_uid;
  delete from public.push_subscriptions  where user_id = v_uid;
  delete from public.promo_redemptions   where user_id = v_uid;
  delete from public.entitlement_grants  where user_id = v_uid;
  delete from public.subscriptions       where user_id = v_uid;

  -- The profile row last.
  delete from public.app_users where user_id = v_uid;
end;
$$;

-- Callable by signed-in users only; the definer body re-scopes to auth.uid().
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
