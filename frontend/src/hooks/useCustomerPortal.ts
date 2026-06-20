import { useMutation } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { BILLING_EDGE_FUNCTION } from "@/constants/billing";

// The edge function's common envelope (success carries the LS portal URL).
type PortalEnvelope =
  | { ok: true; data: { url: string } }
  | { ok: false; error: { code: string; message: string } };

// Opens the LemonSqueezy hosted customer portal (cancel / update card / invoices):
// customer-portal fetches a FRESH signed portal URL for the caller's subscription
// and we redirect to it (same-tab — avoids the post-await popup blocker). 404s for
// free / comp users (handled by the caller's onError toast).
export function useCustomerPortal() {
  return useMutation({
    mutationFn: async (): Promise<void> => {
      const { data, error } = await supabase.functions.invoke(
        BILLING_EDGE_FUNCTION.CUSTOMER_PORTAL,
        { body: {} },
      );
      if (error) throw error;

      const envelope = data as PortalEnvelope;
      if (!envelope.ok) throw new Error(envelope.error.message);

      window.location.href = envelope.data.url;
    },
  });
}
