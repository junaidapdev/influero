-- subscriptions: the entitlement source of truth for the post-v1 LemonSqueezy
-- (LS) Pro plan. This migration ships the billing *infrastructure* — the table,
-- the entitlement predicate, the free-tier deal limit, the grandfather backfill,
-- and realtime — but NOT the edge functions (lemonsqueezy-webhook /
-- create-checkout / customer-portal land in their own slices).
--
-- THREE load-bearing stances (see build-plan.md → Post-v1 → Subscription Billing):
--   1. The LS webhook is the source of truth. This table is WRITTEN ONLY by the
--      webhook (service-role, which bypasses RLS). Users may READ their own
--      entitlement; they can never write it.
--   2. Gates that cost money or enforce limits live server-side: the Snap paid
--      API is gated in the extract-snap-report edge function (later slice), and
--      the free deal limit is the BEFORE INSERT trigger below. (Reports are gated
--      in the UI on purpose — their aggregate RPC, get_monthly_totals, is shared
--      with the FREE dashboard sparkline, and report data is the user's own
--      zero-marginal-cost data. A blanket RPC gate would break the free hero.)
--   3. Existing accounts are grandfathered to Pro at cutover (the comp backfill at
--      the bottom) so flipping gates on never locks a current user out.
--
-- RLS DEVIATION (documented): unlike every other user-owned table, subscriptions
-- gets only a SELECT-own policy — NO insert/update/delete policies and NO write
-- grant to `authenticated`. The webhook owns all writes via service-role. This is
-- the whole point: entitlement must not be forgeable from the client.

create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- LS identifiers. lemonsqueezy_subscription_id is unique and is the webhook's
  -- natural key; for grandfathered comp rows it is the sentinel 'comp:<user_id>'.
  lemonsqueezy_subscription_id text not null unique,
  lemonsqueezy_customer_id text,
  lemonsqueezy_order_id text,
  variant_id text,
  -- The entitlement tier. Single value for now; extend the CHECK when more land.
  plan text not null default 'pro' check (plan in ('pro')),
  -- LS subscription status verbatim. is_pro() below decides which of these count
  -- as entitled (active/on_trial outright; cancelled/past_due only within grace).
  status text not null check (
    status in (
      'on_trial', 'active', 'paused', 'past_due', 'unpaid', 'cancelled', 'expired'
    )
  ),
  renews_at timestamptz,
  ends_at timestamptz,        -- when cancelled/past_due: access-until (grace) date
  trial_ends_at timestamptz,
  card_brand text,
  card_last_four text,
  raw_event jsonb,            -- last webhook payload, for debugging / re-parse
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Renewals carry no custom_data, so the webhook re-matches them to a user by LS
-- customer id; this index serves that lookup.
create index if not exists subscriptions_customer_idx
  on public.subscriptions (lemonsqueezy_customer_id);

alter table public.subscriptions enable row level security;

-- SELECT-own ONLY. No insert/update/delete policies — writes are service-role.
create policy "subscriptions select own"
  on public.subscriptions for select
  using (user_id = auth.uid());

-- A user may read their entitlement; they may not touch the table otherwise.
-- service_role (the webhook) bypasses RLS and has its privileges implicitly,
-- exactly as send-daily-reminders writes notification_sends.
grant select on public.subscriptions to authenticated;
revoke all on public.subscriptions from anon;

-- is_pro: the single entitlement predicate every gate calls. SECURITY DEFINER so
-- it can read the row regardless of the caller's RLS (e.g. inside the deal-limit
-- trigger) — it is always passed an explicit user id and only ever returns a
-- boolean, so it leaks nothing. Fixed empty search_path + fully-qualified names
-- per the SECURITY DEFINER hardening guidance.
--
-- Entitled = active or on_trial outright, OR cancelled/past_due still inside the
-- paid period (ends_at in the future) — a grace window so a failed renewal or an
-- end-of-period cancel doesn't yank access mid-cycle.
create or replace function public.is_pro(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.subscriptions s
    where s.user_id = p_user_id
      and (
        s.status in ('active', 'on_trial')
        or (s.status in ('cancelled', 'past_due') and s.ends_at > now())
      )
  );
$$;

-- get_my_entitlement: the frontend read (useEntitlement). SECURITY INVOKER — it
-- only ever reads the caller's own row, which the SELECT-own policy already
-- allows. Returns one row even when the user has no subscription (free).
create or replace function public.get_my_entitlement()
returns table (
  plan text,
  status text,
  is_pro boolean,
  active_until timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    s.plan,
    s.status,
    public.is_pro(auth.uid()) as is_pro,
    coalesce(s.ends_at, s.renews_at) as active_until
  from public.subscriptions s
  where s.user_id = auth.uid()
  union all
  -- No row → an explicit free entitlement so the client always gets one row.
  select null::text, null::text, false, null::timestamptz
  where not exists (
    select 1 from public.subscriptions s where s.user_id = auth.uid()
  );
$$;

-- New functions are EXECUTE-able by PUBLIC by default — that would let anon probe
-- is_pro(<any uuid>). Lock both callable functions to authenticated + service_role
-- (the 0009/0011 RPC convention). enforce_deal_limit is a trigger function, not
-- client-callable, so it keeps the default.
revoke execute on function public.is_pro(uuid) from public;
revoke execute on function public.get_my_entitlement() from public;
grant execute on function public.is_pro(uuid) to authenticated, service_role;
grant execute on function public.get_my_entitlement() to authenticated, service_role;

-- enforce_deal_limit: the server-side free-tier gate. Free accounts may hold at
-- most 5 IN-FLIGHT deals (pending/shot/posted — paid/cancelled don't count).
-- Pro (incl. grandfathered comp) is unlimited. Fires BEFORE INSERT so it keeps
-- the existing PostgREST insert path (useDeals) — no edge function needed.
-- SECURITY DEFINER so the count is reliable regardless of RLS; it is scoped to
-- NEW.user_id, so it only ever counts the inserting user's own rows.
--
-- On block it raises a bare 'DEAL_LIMIT' message (SQLSTATE P0001) — the client
-- matches that token and shows the UpgradePrompt; the human copy is i18n, not SQL.
create or replace function public.enforce_deal_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_in_flight integer;
begin
  if public.is_pro(new.user_id) then
    return new;
  end if;

  select count(*) into v_in_flight
  from public.ad_deals
  where user_id = new.user_id
    and status in ('pending', 'shot', 'posted');

  if v_in_flight >= 5 then
    raise exception 'DEAL_LIMIT';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_deal_limit_trigger on public.ad_deals;
create trigger enforce_deal_limit_trigger
  before insert on public.ad_deals
  for each row execute function public.enforce_deal_limit();

-- Realtime: useEntitlement subscribes to UPDATEs on the caller's own row so the
-- UI flips to Pro within seconds of the webhook write (postgres_changes respects
-- RLS → a user only ever receives events for their own row). Guarded so a
-- re-apply doesn't error on "already member of publication".
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'subscriptions'
  ) then
    alter publication supabase_realtime add table public.subscriptions;
  end if;
end $$;

-- GRANDFATHER BACKFILL (cutover): seed a complimentary Pro row for every EXISTING
-- account so turning gates on never locks a current user (or the dev) out. The
-- sentinel id 'comp:<user_id>' + null customer/order marks it as comp; status
-- 'active' makes is_pro() true with no end date. When such a user later actually
-- subscribes, the webhook's upsert-by-user_id overwrites this row with the real
-- LS subscription. New signups after this migration get NO row → free tier.
insert into public.subscriptions (user_id, lemonsqueezy_subscription_id, plan, status)
select id, 'comp:' || id::text, 'pro', 'active'
from auth.users
on conflict (user_id) do nothing;
