import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowRight, X } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { CompletionRing } from "@/components/dashboard/CompletionRing";
import { useAppUser } from "@/hooks/useAppUser";
import { useLocale } from "@/hooks/useLocale";
import { getProfileCompletion } from "@/features/profile/completion";
import { formatPercent } from "@/lib/numbers";
import { ROUTES } from "@/constants/routes";

// Nudge shown above the dashboard top-line numbers until the user's profile has
// a display name and an avatar. Self-contained: reuses the cached useAppUser
// query and derives completeness via the pure features/profile helper. Renders
// nothing while the profile loads/errors (a nudge, not essential content), once
// the profile is complete, or after the user dismisses it for this visit.
export function IncompleteProfileBanner() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { data: appUser } = useAppUser();
  const [dismissed, setDismissed] = useState(false);

  if (!appUser || dismissed) return null;

  const completion = getProfileCompletion(appUser);
  if (completion.isComplete) return null;

  const percentLabel = formatPercent(completion.completionPct / 100, locale);

  return (
    <Card>
      <div className="flex items-start gap-4">
        <CompletionRing percent={completion.completionPct} label={percentLabel} />

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h2 className="text-row font-semibold leading-snug text-text-primary">
            {t("dashboard.profileBanner.title")}
          </h2>
          <p className="text-body text-text-secondary">
            {t("dashboard.profileBanner.description")}
          </p>

          <div className="flex flex-wrap gap-2">
            {completion.missingFields.map((field) => (
              <span
                key={field}
                className="inline-flex items-center rounded-full border border-border-light bg-surface-secondary px-2.5 py-1 text-micro font-medium text-text-secondary ltr:uppercase ltr:tracking-wide"
              >
                {t(`dashboard.profileBanner.missing.${field}`)}
              </span>
            ))}
          </div>

          <Link
            to={ROUTES.SETTINGS}
            className="inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-semibold text-accent transition-colors hover:text-accent-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {t("dashboard.profileBanner.cta")}
            <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label={t("common.dismiss")}
          className="-me-2 -mt-2 grid size-11 shrink-0 place-items-center rounded-md text-text-muted transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </Card>
  );
}
