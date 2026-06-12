import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { useSession } from "@/hooks/useSession";
import { ROUTES } from "@/constants/routes";
import { FullPageLoader } from "@/components/feedback/FullPageLoader";

type Props = {
  children: ReactNode;
};

// Client-side route guard. RLS is the real security boundary; this just sends a
// signed-out user to /login instead of rendering an empty, data-less page.
export function ProtectedRoute({ children }: Props) {
  const { session, isLoading } = useSession();

  if (isLoading) return <FullPageLoader />;
  if (!session) return <Navigate to={ROUTES.LOGIN} replace />;

  return <>{children}</>;
}
