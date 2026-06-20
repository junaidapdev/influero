import { lazy, Suspense } from "react";
import { Navigate } from "react-router-dom";

import { useSession } from "@/hooks/useSession";
import { ROUTES } from "@/constants/routes";
import { FullPageLoader } from "@/components/feedback/FullPageLoader";

// The landing page (its verbatim design markup + scoped CSS) is the only thing
// signed-out visitors at "/" need — signed-in users redirect away before it
// renders. Lazy-load it into its own chunk so it never weighs down the main app
// bundle, matching the codebase's recharts/pdf.js/html-to-image precedent.
const LandingPage = lazy(() =>
  import("@/routes/landing/LandingPage").then((m) => ({ default: m.LandingPage })),
);

// Entry router for "/": while the auth check is in flight, show the pre-route
// skeleton; once resolved, signed-in users go straight to the dashboard and
// everyone else gets the public marketing landing page (its CTAs deep-link to
// /login and /login?mode=signup).
export function EntryRoute() {
  const { session, isLoading } = useSession();

  if (isLoading) {
    return <FullPageLoader />;
  }

  if (session) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  return (
    <Suspense fallback={<FullPageLoader />}>
      <LandingPage />
    </Suspense>
  );
}
