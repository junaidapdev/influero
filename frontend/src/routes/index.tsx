import { Navigate } from "react-router-dom";

import { useSession } from "@/hooks/useSession";
import { ROUTES } from "@/constants/routes";
import { FullPageLoader } from "@/components/feedback/FullPageLoader";

// Thin entry router: while the auth check is in flight, show the pre-route
// skeleton; once resolved, redirect to the dashboard (signed in) or login
// (signed out). No content of its own.
export function EntryRoute() {
  const { session, isLoading } = useSession();

  if (isLoading) {
    return <FullPageLoader />;
  }

  return (
    <Navigate to={session ? ROUTES.DASHBOARD : ROUTES.LOGIN} replace />
  );
}
