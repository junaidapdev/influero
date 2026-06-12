import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";

import { useSession } from "@/hooks/useSession";
import { ROUTES } from "@/constants/routes";
import { LoginForm } from "@/components/auth/LoginForm";
import { LocaleToggle } from "@/components/ui/LocaleToggle";
import { FullPageLoader } from "@/components/feedback/FullPageLoader";

export function LoginRoute() {
  const { t } = useTranslation();
  const { session, isLoading } = useSession();

  if (isLoading) return <FullPageLoader />;
  if (session) return <Navigate to={ROUTES.DASHBOARD} replace />;

  return (
    <main className="flex min-h-dvh flex-col bg-background px-4 py-8">
      <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center gap-6">
        <div className="flex items-center justify-between">
          <span className="text-xl font-bold text-accent">{t("app.name")}</span>
          <LocaleToggle />
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
