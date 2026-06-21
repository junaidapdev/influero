-- expenses: the money-OUT side of the ledger — the costs an influencer incurs
-- running their brand-deal business (production, travel, equipment, operational,
-- software, marketing, other). The counterpart to `payments` (money IN). One row
-- per cost. RLS ships in the SAME migration as the table; every policy gates on
-- `user_id = auth.uid()` (the payments slice, 0006).
--
-- PRO GATE — UI ONLY, BY DECISION. Unlike the deal limit (a server-side BEFORE
-- INSERT trigger in 0018) and the Snap paid API (gated inside extract-snap-report),
-- expenses have NO server gate: they cost no money to store and enforce no count
-- limit, so the gate lives in the UI (the Reports stance — see 0018's header).
-- RLS stays plain user-owned, so a Pro→Free downgrade keeps every expense row;
-- the /expenses page just gates to the Upgrade prompt until they re-subscribe.
--
-- `deal_id` is NULLABLE and `on delete set null`: an expense MAY be attributed to
-- a deal (→ that deal's/brand's cost, for the Build-2 margin reports) or stand as
-- general overhead. It is not tied to deal money-history the way a payment is
-- (payments.deal_id is RESTRICT), so a future deleted deal leaves the expense
-- intact as overhead rather than blocking the delete.
--
-- Keep the category set in sync with EXPENSE_CATEGORY in
-- backend/shared/types/expense.types.ts and the zod enum in
-- frontend/src/features/expenses/expense.schema.ts.

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  deal_id uuid references public.ad_deals (id) on delete set null,
  amount_sar numeric not null check (amount_sar >= 0),
  category text not null check (
    category in (
      'production', 'travel', 'equipment', 'operational', 'software', 'marketing', 'other'
    )
  ),
  title text not null,
  expense_date date not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.expenses enable row level security;

create policy "expenses select own"
  on public.expenses for select
  using (user_id = auth.uid());

create policy "expenses insert own"
  on public.expenses for insert
  with check (user_id = auth.uid());

create policy "expenses update own"
  on public.expenses for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "expenses delete own"
  on public.expenses for delete
  using (user_id = auth.uid());

-- Serves the /expenses ledger (newest first) scoped to the caller's rows. The
-- month filter narrows on expense_date, so this index covers it too.
create index if not exists expenses_user_date_idx
  on public.expenses (user_id, expense_date desc);

-- Serves the per-deal cost lookup (Build 2 — deal/brand margin). Partial: only
-- linked expenses are ever queried by deal, so overhead rows stay out of it.
create index if not exists expenses_user_deal_idx
  on public.expenses (user_id, deal_id)
  where deal_id is not null;

-- Base table privileges. RLS decides WHICH rows; these decide whether the role
-- may touch the table at all. anon (unauthenticated) gets nothing.
grant select, insert, update, delete on public.expenses to authenticated;
revoke all on public.expenses from anon;

-- ---------------------------------------------------------------------------
-- get_dashboard_stats(month_start, month_end) — v2: + total_expenses
-- ---------------------------------------------------------------------------
-- Recreated from the CURRENT live definition (0017, NOT 0013 — 0017 made
-- post_date a timestamptz and recreated this fn) with ONE additive key:
-- total_expenses (sum of the month's expenses bucketed by expense_date).
-- Additive jsonb key, so every existing consumer is unaffected; the dashboard
-- derives net = collected − expenses on the client and gates the display to Pro
-- (a free user has no expense rows, so total_expenses is simply 0).
--
-- The three ad_deals predicates MUST bucket post_date by the RIYADH-LOCAL day
-- — `(post_date at time zone 'Asia/Riyadh')::date` — exactly as 0017 does and as
-- get_monthly_totals still does (this migration does NOT touch that fn). post_date
-- is timestamptz; comparing it raw to a date param coerces at the session tz
-- (UTC on Supabase), misbucketing month-edge deals and silently diverging
-- Dashboard from Reports. expense_date is a plain date, so total_expenses needs
-- no cast. total_collected / outstanding read received_date (still date) — left
-- verbatim. Keeping all this aligned is what keeps Dashboard + Reports in
-- agreement.
create or replace function public.get_dashboard_stats(
  month_start date,
  month_end date
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'total_invoiced', coalesce((
      select sum(agreed_amount_sar)
      from ad_deals
      where user_id = auth.uid()
        and status <> 'cancelled'
        and (post_date at time zone 'Asia/Riyadh')::date >= month_start
        and (post_date at time zone 'Asia/Riyadh')::date < month_end
    ), 0),
    'total_collected', coalesce((
      select sum(amount_sar)
      from payments
      where user_id = auth.uid()
        and status = 'received'
        and received_date >= month_start
        and received_date < month_end
    ), 0),
    'outstanding', coalesce((
      select sum(amount_sar)
      from payments
      where user_id = auth.uid()
        and status <> 'received'
    ), 0),
    'total_expenses', coalesce((
      select sum(amount_sar)
      from expenses
      where user_id = auth.uid()
        and expense_date >= month_start
        and expense_date < month_end
    ), 0),
    'deals_posted', (
      select count(*)
      from ad_deals
      where user_id = auth.uid()
        and status in ('posted', 'paid')
        and (post_date at time zone 'Asia/Riyadh')::date >= month_start
        and (post_date at time zone 'Asia/Riyadh')::date < month_end
    ),
    'deals_pending', (
      select count(*)
      from ad_deals
      where user_id = auth.uid()
        and status in ('pending', 'shot')
        and (post_date at time zone 'Asia/Riyadh')::date >= month_start
        and (post_date at time zone 'Asia/Riyadh')::date < month_end
    )
  );
$$;

revoke all on function public.get_dashboard_stats(date, date) from public;
revoke all on function public.get_dashboard_stats(date, date) from anon;
grant execute on function public.get_dashboard_stats(date, date) to authenticated;
