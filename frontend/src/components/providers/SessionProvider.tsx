import { useEffect, useState, type ReactNode } from "react";
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
      (_event, nextSession) => {
        setSession(nextSession);
        setIsLoading(false);
      },
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <SessionContext.Provider value={{ session, isLoading }}>
      {children}
    </SessionContext.Provider>
  );
}
