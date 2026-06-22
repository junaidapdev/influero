-- Entitlement grants + promo codes: a generic "this user is Pro" engine that sits
-- ALONGSIDE the LemonSqueezy paid billing in 0018, never inside it. A grant is the
-- universal unit — today minted by redeeming a promo code, later by an admin comp,
-- a referral reward, or a partnership. The paid `subscriptions` table is left
-- completely untouched; entitlement becomes "valid paid subscription OR a live
-- grant". This is the MVP slice (Phase 1): the three tables, the additive is_pro /
-- get_my_entitlement rewrite, and the redeem_promo RPC. Admin UI + analytics are
-- later, additive slices — no schema change needed for them.
--
-- THREE load-bearing stances (mirroring 0018's discipline):
--   1. Grants are WRITTEN ONLY by SECURITY DEFINER functions (redeem_promo) or
--      service-role. Users may READ their own grants; they can never forge one.
--   2. promo_codes is NEVER readable by users at all — codes can't be enumerated.
--      Validation happens only inside redeem_promo (definer → bypasses RLS).
--   3. The expiry is LAZY: is_pro() date-checks each grant on every read, so a
--      grant lapses the instant its clock passes — no cron, no scheduled job.
--
-- The is_pro() change is purely ADDITIVE (an OR branch); the existing paid-billing
-- logic is byte-for-byte unchanged, so grandfathered comp users and real LS subs
-- keep working exactly as before.

-- ---------------------------------------------------------------------------
-- entitlement_grants: the universal "user gets Pro" record.
create table if not exists public.entitlement_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Why this grant exists. promo_code is the only writer today; the others are
  -- future sources that reuse this exact table with zero schema change.
  source text not null check (
    source in ('promo_code', 'admin', 'referral', 'partnership', 'manual')
  ),
  -- A free-text pointer back to the source (e.g. the redeemed code, or an admin note).
  source_ref text,
  starts_at timestamptz not null default now(),
  -- NULL = no expiry = Pro forever (lifetime comp).
  expires_at timestamptz,
  -- Manual claw-back: set this to end a grant early without deleting the audit row.
  revoked_at timestamptz,
  note text,
  created_at timestamptz not null default now()
);

-- The is_pro() lookup only ever cares about live grants; index exactly those.
create index if not exists entitlement_grants_live_idx
  on public.entitlement_grants (user_id)
  where revoked_at is null;

alter table public.entitlement_grants enable row level security;

-- SELECT-own ONLY. No insert/update/delete policies — writes are definer/service-role.
create policy "entitlement_grants select own"
  on public.entitlement_grants for select
  using (user_id = auth.uid());

grant select on public.entitlement_grants to authenticated;
revoke all on public.entitlement_grants from anon;

-- ---------------------------------------------------------------------------
-- promo_codes: the campaign definitions. NOT readable by users (no select policy).
create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  -- Stored uppercase; redeem_promo upper-cases + trims the submitted code to match.
  code text not null unique,
  -- Months of Pro granted on redemption. NULL = forever.
  grant_months integer check (grant_months is null or grant_months > 0),
  -- Global cap across all users. NULL = unlimited. redemption_count is the atomic
  -- counter the redeem path bumps (see redeem_promo).
  max_redemptions integer check (max_redemptions is null or max_redemptions > 0),
  redemption_count integer not null default 0,
  per_user_limit integer not null default 1,
  active boolean not null default true,
  valid_from timestamptz,
  valid_until timestamptz,
  note text,
  created_by uuid,
  created_at timestamptz not null default now()
);

alter table public.promo_codes enable row level security;
-- Deliberately NO policies → authenticated/anon can never read or write. Only the
-- table owner (SECURITY DEFINER functions) and service-role touch this table.
revoke all on public.promo_codes from anon, authenticated;

-- ---------------------------------------------------------------------------
-- promo_redemptions: append-only ledger. The UNIQUE (promo_code_id, user_id) is the
-- race-proof one-redemption-per-user guarantee (two simultaneous clicks can both
-- pass an in-code count check; they cannot both win this insert).
create table if not exists public.promo_redemptions (
  id uuid primary key default gen_random_uuid(),
  promo_code_id uuid not null references public.promo_codes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  grant_id uuid references public.entitlement_grants (id) on delete set null,
  redeemed_at timestamptz not null default now(),
  unique (promo_code_id, user_id)
);

alter table public.promo_redemptions enable row level security;

-- A user may see their own redemption history; writes are definer/service-role.
create policy "promo_redemptions select own"
  on public.promo_redemptions for select
  using (user_id = auth.uid());

grant select on public.promo_redemptions to authenticated;
revoke all on public.promo_redemptions from anon;

-- ---------------------------------------------------------------------------
-- is_pro: ADDITIVE rewrite. Paid-billing branch is identical to 0018; the new OR
-- branch makes a user Pro while they hold a live grant (not revoked, started,
-- not expired). Date-checked here on every call → lazy auto-expiry, no cron.
create or replace function public.is_pro(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1
      from public.subscriptions s
      where s.user_id = p_user_id
        and (
          s.status in ('active', 'on_trial')
          or (s.status in ('cancelled', 'past_due') and s.ends_at > now())
        )
    )
    or exists (
      select 1
      from public.entitlement_grants g
      where g.user_id = p_user_id
        and g.revoked_at is null
        and g.starts_at <= now()
        and (g.expires_at is null or g.expires_at > now())
    );
$$;

-- ---------------------------------------------------------------------------
-- get_my_entitlement: rewritten to (a) report the REAL is_pro in every branch
-- (the old free branch hardcoded false, which would have read grant-only Pro
-- users as free) and (b) add `via` = 'paid' | 'grant' | NULL so the UI can show
-- "Manage billing" only for real LS subscribers. Adding a return column changes
-- the function's row type, so we drop-then-create.
drop function if exists public.get_my_entitlement();
create or replace function public.get_my_entitlement()
returns table (
  plan text,
  status text,
  is_pro boolean,
  active_until timestamptz,
  via text
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_sub public.subscriptions%rowtype;
  v_has_sub boolean := false;
  v_sub_entitled boolean := false;
  v_grant_forever boolean;   -- NULL when the user has no live grant at all
  v_grant_until timestamptz; -- latest expiry among live grants
begin
  select * into v_sub from public.subscriptions s where s.user_id = v_uid;
  v_has_sub := found;
  if v_has_sub then
    v_sub_entitled :=
      v_sub.status in ('active', 'on_trial')
      or (v_sub.status in ('cancelled', 'past_due') and v_sub.ends_at > now());
  end if;

  select bool_or(g.expires_at is null), max(g.expires_at)
    into v_grant_forever, v_grant_until
  from public.entitlement_grants g
  where g.user_id = v_uid
    and g.revoked_at is null
    and g.starts_at <= now()
    and (g.expires_at is null or g.expires_at > now());

  if v_sub_entitled then
    -- Real paid subscription wins: keep the existing renews/ends display.
    plan := v_sub.plan;
    status := v_sub.status;
    is_pro := true;
    active_until := coalesce(v_sub.ends_at, v_sub.renews_at);
    via := 'paid';
  elsif v_grant_forever is not null then
    -- A live grant is the source of Pro (no entitling paid sub).
    plan := 'pro';
    status := null;
    is_pro := true;
    active_until := case when v_grant_forever then null else v_grant_until end;
    via := 'grant';
  else
    -- Free. Surface any (non-entitling) subscription row for context.
    plan := case when v_has_sub then v_sub.plan else null end;
    status := case when v_has_sub then v_sub.status else null end;
    is_pro := false;
    active_until := null;
    via := null;
  end if;

  return next;
end;
$$;

-- ---------------------------------------------------------------------------
-- redeem_promo: the client-callable redemption path. SECURITY DEFINER so it can
-- read promo_codes (which users can't) and write grants/redemptions. Raises bare
-- token messages (SQLSTATE P0001) the client maps to localized copy — the
-- DEAL_LIMIT convention from 0018.
create or replace function public.redeem_promo(p_code text)
returns table (
  plan text,
  status text,
  is_pro boolean,
  active_until timestamptz,
  via text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_norm text := upper(btrim(coalesce(p_code, '')));
  v_code public.promo_codes%rowtype;
  v_expires timestamptz;
  v_grant_id uuid;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  -- Already Pro (paid, grandfathered comp, or a live grant) → reject and consume
  -- NOTHING (no ledger row, no counter bump). Grants live in their own table, so a
  -- redemption can never corrupt or overwrite a real paid subscription.
  if public.is_pro(v_uid) then
    raise exception 'ALREADY_PRO';
  end if;

  if v_norm = '' then
    raise exception 'INVALID_CODE';
  end if;

  select * into v_code
  from public.promo_codes c
  where c.code = v_norm
    and c.active
    and (c.valid_from is null or c.valid_from <= now())
    and (c.valid_until is null or c.valid_until > now());
  if not found then
    raise exception 'INVALID_CODE';
  end if;

  -- Friendly per-user check (the unique constraint below is the race-proof backstop).
  if exists (
    select 1 from public.promo_redemptions r
    where r.promo_code_id = v_code.id and r.user_id = v_uid
  ) then
    raise exception 'ALREADY_REDEEMED';
  end if;

  -- Atomically claim one global slot. A NULL max_redemptions means unlimited.
  -- Doing it as a single conditional UPDATE avoids the read-then-write race that
  -- would let a viral code blow past its cap.
  update public.promo_codes c
  set redemption_count = c.redemption_count + 1
  where c.id = v_code.id
    and (c.max_redemptions is null or c.redemption_count < c.max_redemptions);
  if not found then
    raise exception 'CODE_EXHAUSTED';
  end if;

  v_expires := case
    when v_code.grant_months is null then null
    else now() + make_interval(months => v_code.grant_months)
  end;

  insert into public.entitlement_grants (user_id, source, source_ref, expires_at, note)
  values (v_uid, 'promo_code', v_code.code, v_expires, v_code.note)
  returning id into v_grant_id;

  -- The ledger insert is the hard guard: a double-click that slipped past the
  -- check above loses here on the unique violation. The handler is scoped to THIS
  -- insert (not the whole function) so only the promo_redemptions unique violation
  -- maps to ALREADY_REDEEMED — a future unique constraint elsewhere can't be
  -- silently mislabeled. Re-raising aborts the function, so the slot bump + grant
  -- (earlier statements in the same transaction) roll back too.
  begin
    insert into public.promo_redemptions (promo_code_id, user_id, grant_id)
    values (v_code.id, v_uid, v_grant_id);
  exception
    when unique_violation then
      raise exception 'ALREADY_REDEEMED';
  end;

  return query select * from public.get_my_entitlement();
end;
$$;

-- New functions are EXECUTE-able by PUBLIC by default. get_my_entitlement was
-- dropped (so it lost its grants); re-lock both to authenticated + service_role.
revoke execute on function public.get_my_entitlement() from public;
revoke execute on function public.redeem_promo(text) from public;
grant execute on function public.get_my_entitlement() to authenticated, service_role;
grant execute on function public.redeem_promo(text) to authenticated, service_role;
