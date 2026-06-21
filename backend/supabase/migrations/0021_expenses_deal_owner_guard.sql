-- Cross-tenant guard for expenses.deal_id (defense in depth on tenant isolation).
--
-- expenses.deal_id (0020) references ad_deals(id), but the FK only checks the
-- deal EXISTS — not that it belongs to the same user — and the RLS policies only
-- assert expenses.user_id = auth.uid(). So nothing at the DB level stops an
-- expense from linking to another user's deal.
--
-- In practice this is neither reachable nor exploitable through the app: the
-- expense form's deal picker only offers the caller's own deals, ad_deals is
-- RLS-protected so a foreign deal id can't be discovered (and the ids are random
-- UUIDs), and every read/aggregate is owner-scoped — a stray foreign id would
-- render nothing and never surface another tenant's data. But tenant isolation is
-- this project's core invariant, so we enforce it at the DB rather than rely on
-- that reasoning holding for every future query.
--
-- The function is GENERIC (it checks NEW.deal_id's owner == NEW.user_id), so the
-- same guard can later be attached to `payments` — which has the identical
-- deal_id FK + RLS-only-user_id shape — by adding one more trigger, no code change.
-- SECURITY DEFINER + fixed empty search_path, mirroring enforce_deal_limit (0018):
-- it only ever reads ad_deals to answer a boolean about the row being written, so
-- it leaks nothing. Fires only when deal_id is set/changed (`update of deal_id`),
-- so it never runs on unrelated updates (e.g. a status-only write).

create or replace function public.enforce_deal_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.deal_id is not null
     and not exists (
       select 1
       from public.ad_deals d
       where d.id = new.deal_id
         and d.user_id = new.user_id
     ) then
    raise exception 'deal_id % does not belong to the owning user', new.deal_id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_deal_owner_trigger on public.expenses;
create trigger enforce_deal_owner_trigger
  before insert or update of deal_id on public.expenses
  for each row execute function public.enforce_deal_owner();
