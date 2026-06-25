import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useUpgradeModal } from "@/hooks/useUpgradeModal";

type UpgradePromptProps = {
  // i18n key for the feature-specific body copy (e.g. billing.upgradePrompt.snap).
  messageKey: string;
};

// The in-page locked state for an entirely-Pro page (snap, reports, expenses).
// It's the FIRST thing a free user sees on landing (card-first — the upgrade
// modal no longer auto-pops); its button opens that single modal, which owns the
// actual checkout CTA.
export function UpgradePrompt({ messageKey }: UpgradePromptProps) {
  const { t } = useTranslation();
  const openUpgrade = useUpgradeModal();

  return (
    <Card>
      <div className="flex flex-col items-center gap-4 px-2 py-6 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-accent-light text-accent">
          <Sparkles size={24} aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold text-text-primary">
            {t("billing.upgradePrompt.title")}
          </h2>
          <p className="text-body text-text-secondary">{t(messageKey)}</p>
        </div>
        <Button onClick={() => openUpgrade(messageKey)}>
          {t("billing.upgrade")}
        </Button>
      </div>
    </Card>
  );
}
