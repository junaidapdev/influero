import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

import { useSession } from "@/hooks/useSession";
import { useEnsureAppUser } from "@/hooks/useEnsureAppUser";
import { ROUTES } from "@/constants/routes";
import { logger } from "@/lib/logger";

// Backstop for the rare case where a `code` is present but the exchange never
// completes (e.g. a cross-device PKCE link with no local code verifier).
const CALLBACK_TIMEOUT_MS = 10_000;

// Lands here after Google OAuth or the email-confirmation link. The Supabase
// client (detectSessionInUrl + PKCE) exchanges the code into a session on load;
// SessionProvider reports it. We then bootstrap the profile row and continue.
export function AuthCallbackRoute() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { session, isLoading } = useSession();
  const ensureAppUser = useEnsureAppUser();
  const handledRef = useRef(false);

  // Parsed once — window.location is stable for this page load.
  const [authParams] = useState(() => new URLSearchParams(window.location.search));
  const errorParam = authParams.get("error");
  const hasCode = authParams.has("code");

  useEffect(() => {
    if (errorParam) {
      logger.warn(
        "AuthCallbackRoute",
        authParams.get("error_description") ?? errorParam,
      );
    }
  }, [authParams, errorParam]);

  // Only meaningful while we're genuinely waiting on a code exchange.
  useEffect(() => {
    if (!hasCode) return;
    const timer = window.setTimeout(() => {
      if (!handledRef.current) {
        logger.warn("AuthCallbackRoute", "timed out waiting for session");
        navigate(ROUTES.LOGIN, { replace: true });
      }
    }, CALLBACK_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [hasCode, navigate]);

  useEffect(() => {
    if (handledRef.current) return;

    if (errorParam) {
      handledRef.current = true;
      navigate(ROUTES.LOGIN, { replace: true });
      return;
    }

    if (isLoading) return;

    if (session) {
      handledRef.current = true;
      const { user } = session;
      // Bootstrap the profile row, retrying once on a transient failure before
      // navigating. useAppUser also self-heals a missing row on read, so this is
      // belt-and-suspenders — but retrying here avoids the first Settings visit
      // having to do the repair.
      void ensureAppUser
        .mutateAsync(user)
        .catch(async (error: unknown) => {
          logger.warn("AuthCallbackRoute", "bootstrap retry after failure");
          await ensureAppUser
            .mutateAsync(user)
            .catch((retryError: unknown) =>
              logger.error("AuthCallbackRoute", retryError ?? error),
            );
        })
        .finally(() => navigate(ROUTES.DASHBOARD, { replace: true }));
      return;
    }

    // Resolved with no session and no code to exchange → this isn't a real
    // callback (e.g. a direct visit). Don't spin; send them to login now.
    if (!hasCode) {
      handledRef.current = true;
      navigate(ROUTES.LOGIN, { replace: true });
    }
  }, [errorParam, hasCode, isLoading, session, ensureAppUser, navigate]);

  return (
    <main
      className="grid min-h-dvh place-items-center bg-background p-4"
      role="status"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-3 text-text-secondary">
        <Loader2 className="size-6 animate-spin text-accent" aria-hidden />
        <p className="text-sm">{t("auth.callback.loading")}</p>
      </div>
    </main>
  );
}
