import { createContext } from "react";
import type { Session } from "@supabase/supabase-js";

export type SessionState = {
  session: Session | null;
  isLoading: boolean;
};

// Holds the app's single source of auth-session truth. Provided by
// SessionProvider, read via the useSession hook. `undefined` means "no provider
// above me" — useSession throws on that, which is a wiring bug, not a state.
export const SessionContext = createContext<SessionState | undefined>(undefined);
