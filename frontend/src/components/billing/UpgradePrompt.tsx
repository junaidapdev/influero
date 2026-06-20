import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useCheckout } from "@/hooks/useCheckout";
import { useToast } from "@/hooks/useToast";
import { logger } from "@/lib/logger";

type UpgradePromptProps = {
  // i18n key for the feature-specific body copy (e.g. billing.upgradePrompt.snap).
  messageKey: string;
};

// The reusable Pro gate — shown where a free user hits a paid feature (the snap +
// reports pages). Its CTA starts the LemonSqueezy checkout directly (same path as
// the Settings Billing card), so upgrading is one tap from the gate.
export function UpgradePrompt({ messageKey }: UpgradePromptProps) {
  const { t } = useTranslation();
  const showToast = useToast();
  const checkout = useCheckout();

  function handleUpgrade(): void {
    checkout.mutate(undefined, {
      onError: (error) => {
        logger.error("UpgradePrompt.upgrade", error);
        showToast("billing.toast.checkoutError", "error");
      },
    });
  }

  return (
    <Card>
      <div className="flex flex-col items-center gap-4 px-2 py-6 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-accent-light text-accent">
          <Sparkles size={24} />
        </span>
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold text-text-primary">
            {t("billing.upgradePrompt.title")}
          </h2>
          <p className="text-body text-text-secondary">{t(messageKey)}</p>
        </div>
        <Button isLoading={checkout.isPending} onClick={handleUpgrade}>
          {t("billing.upgrade")}
        </Button>
      </div>
    </Card>
  );
}
