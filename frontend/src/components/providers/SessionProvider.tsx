import { useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { SessionContext } from "@/lib/sessionContext";

type Props = {
  children: ReactNode;
};

// One subscription for the whole app. The auth session is an event stream
// (getSession + onAuthStateChange), not request/response data, so it lives in
// state here rather than TanStack Query. Every useSession() reads this context,
// so there's exactly one listener regardless of how many routes mount.
export function SessionProvider({ children }: Props) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    let active = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setSession(data.session);
        setIsLoading(false);
      })
      .catch((error: unknown) => {
        if (!active) return;
        logger.error("SessionProvider", error);
        setSession(null);
        setIsLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        // Drop ALL cached queries on sign-out so the next account on a shared
        // client can never read the previous user's data. Query keys aren't
        // partitioned by user id (RLS scopes every fetch server-side), so this
        // central clear — not per-hook user-scoped keys — is the systemic guard.
        // Scoped to SIGNED_OUT only: TOKEN_REFRESHED / USER_UPDATED keep the
        // same user, and an account switch always emits SIGNED_OUT before the
        // next SIGNED_IN, so the cache is empty by the time the new user loads.
        if (event === "SIGNED_OUT") {
          queryClient.clear();
        }
        setSession(nextSession);
        setIsLoading(false);
      },
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [queryClient]);

  return (
    <SessionContext.Provider value={{ session, isLoading }}>
      {children}
    </SessionContext.Provider>
  );
}
