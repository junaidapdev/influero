import { useContext } from "react";

import { SessionContext, type SessionState } from "@/lib/sessionContext";

// Reads the single app-wide session from SessionProvider. Throwing when the
// provider is missing turns a silent always-loading bug into a loud one.
export function useSession(): SessionState {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
