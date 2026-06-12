-- mark_payment_received: the canonical atomic multi-row write (Feature 11).
-- One transaction — the payment flips to received AND, when that was the last
-- unreceived installment, the deal flips to paid. Either both happen or
-- neither does; the payment and the deal can never disagree.
--
-- security invoker: runs as the calling user, so RLS still applies and
-- auth.uid() enforces ownership — an id from the client never implies
-- ownership. Called ONLY from the mark-payment-received edge function.
--
-- Returns jsonb with what the transaction learned (developer-approved
-- deviation from the architecture sketch's `returns void`): the edge function
-- logs payment_received always and deal_paid only when deal_paid is true, and
-- the UI gets the result back in the envelope — no extra round-trips.
--
-- Cancelled is terminal (developer-approved): money arriving on a cancelled
-- deal is still recorded on the payment, but the deal-update step is guarded
-- with `status <> 'cancelled'` so a cancelled deal never flips to paid —
-- mirroring the status machine's terminal pass-through in
-- features/deals/status.ts.

create or replace function public.mark_payment_received(payment_id uuid)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_payment_id uuid;
  v_deal_id uuid;
  v_amount_sar numeric;
  v_deal_title text;
  v_deal_paid boolean := false;
begin
  update public.payments p
     set status = 'received', received_date = now()
   where p.id = mark_payment_received.payment_id
     and p.user_id = auth.uid()
     and p.status <> 'received'
  returning p.id, p.deal_id, p.amount_sar
    into v_payment_id, v_deal_id, v_amount_sar;

  if v_payment_id is null then
    raise exception 'payment not found, not owned by caller, or already received';
  end if;

  -- Serialize per deal BEFORE the all-received check. Without this, two final
  -- installments marked concurrently could each see the other's uncommitted
  -- payment as still pending — both would skip the paid flip and the deal
  -- would sit fully received but never paid, with nothing left to re-trigger
  -- it. Lock order is payment row → deal row in every caller, so there is no
  -- deadlock cycle; the blocked transaction resumes after the winner commits
  -- and its exists check reads a fresh snapshot.
  perform 1 from public.ad_deals d
   where d.id = v_deal_id and d.user_id = auth.uid()
   for update;

  if not exists (
    select 1 from public.payments p
    where p.deal_id = v_deal_id and p.status <> 'received'
  ) then
    update public.ad_deals d
       set status = 'paid', updated_at = now()
     where d.id = v_deal_id
       and d.user_id = auth.uid()
       and d.status <> 'cancelled'
    returning true into v_deal_paid;

    v_deal_paid := coalesce(v_deal_paid, false);
  end if;

  select d.title into v_deal_title
    from public.ad_deals d
   where d.id = v_deal_id and d.user_id = auth.uid();

  return jsonb_build_object(
    'payment_id', v_payment_id,
    'deal_id', v_deal_id,
    'amount_sar', v_amount_sar,
    'deal_title', v_deal_title,
    'deal_paid', v_deal_paid
  );
end;
$$;

-- Callable by signed-in users only — anon gets nothing (mirrors table grants).
revoke all on function public.mark_payment_received(uuid) from public, anon;
grant execute on function public.mark_payment_received(uuid) to authenticated;
