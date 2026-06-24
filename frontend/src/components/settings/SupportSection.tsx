import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { SettingsSection } from "@/components/settings/SettingsSection";
import { ROUTES } from "@/constants/routes";
import { SUPPORT_EMAIL } from "@/constants/support";

const LINK_CLASS =
  "text-text-secondary underline hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm";

// Settings "Legal & support": the support email plus links to the three public
// policy pages. (Account deletion has its own danger-zone section below.)
export function SupportSection() {
  const { t } = useTranslation();

  return (
    <SettingsSection
      title={t("settings.support.title")}
      description={t("settings.support.help")}
    >
      <div className="flex flex-col gap-3 text-body">
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="font-semibold text-accent focus-visible:underline focus-visible:outline-none"
        >
          {t("settings.support.contact")}
        </a>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <Link to={ROUTES.PRIVACY} className={LINK_CLASS}>
            {t("legal.nav.privacy")}
          </Link>
          <Link to={ROUTES.TERMS} className={LINK_CLASS}>
            {t("legal.nav.terms")}
          </Link>
          <Link to={ROUTES.REFUND} className={LINK_CLASS}>
            {t("legal.nav.refund")}
          </Link>
        </div>
      </div>
    </SettingsSection>
  );
}
