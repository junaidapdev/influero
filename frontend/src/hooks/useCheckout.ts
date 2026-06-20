import { useMutation } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { BILLING_EDGE_FUNCTION } from "@/constants/billing";

// The edge function's common envelope (success carries the hosted checkout URL).
type CheckoutEnvelope =
  | { ok: true; data: { url: string } }
  | { ok: false; error: { code: string; message: string } };

// Starts the LemonSqueezy hosted checkout: create-checkout mints it (embedding
// the user_id as custom data so the webhook can map the subscription back) and we
// redirect the browser to it. Same-tab redirect — a window.open after the await
// would be popup-blocked.
export function useCheckout() {
  return useMutation({
    mutationFn: async (): Promise<void> => {
      const { data, error } = await supabase.functions.invoke(
        BILLING_EDGE_FUNCTION.CREATE_CHECKOUT,
        { body: {} },
      );
      if (error) throw error;

      const envelope = data as CheckoutEnvelope;
      if (!envelope.ok) throw new Error(envelope.error.message);

      window.location.href = envelope.data.url;
    },
  });
}
