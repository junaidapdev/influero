import { useCallback, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { useCheckout } from "@/hooks/useCheckout";
import { useToast } from "@/hooks/useToast";
import { logger } from "@/lib/logger";
import { UpgradeModalContext, type OpenUpgrade } from "@/lib/upgradeModalContext";

// The ONE upgrade surface. Every Pro gate (the 5-deal limit, the snap + reports
// pages, any future paid feature) calls useUpgradeModal()(messageKey) to pop this
// modal; its CTA starts the LemonSqueezy checkout. Mirrors ToastProvider — mounted
// once near the app root so any route can trigger it.
const DEFAULT_MESSAGE_KEY = "billing.upgradePrompt.generic";

export function UpgradeModalProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const showToast = useToast();
  const checkout = useCheckout();
  const [open, setOpen] = useState(false);
  const [messageKey, setMessageKey] = useState(DEFAULT_MESSAGE_KEY);

  const openUpgrade = useCallback<OpenUpgrade>((key) => {
    setMessageKey(key);
    setOpen(true);
  }, []);
  const close = useCallback(() => setOpen(false), []);

  function handleUpgrade(): void {
    checkout.mutate(undefined, {
      onError: (error) => {
        logger.error("UpgradeModal.upgrade", error);
        showToast("billing.toast.checkoutError", "error");
      },
    });
  }

  return (
    <UpgradeModalContext.Provider value={openUpgrade}>
      {children}
      <BottomSheet
        open={open}
        onClose={close}
        title={t("billing.upgradePrompt.title")}
      >
        <div className="flex flex-col items-center gap-4 px-2 pb-2 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-accent-light text-accent">
            <Sparkles size={24} aria-hidden="true" />
          </span>
          <p className="text-body text-text-secondary">{t(messageKey)}</p>
          <div className="flex w-full flex-col gap-2">
            <Button isLoading={checkout.isPending} onClick={handleUpgrade}>
              {t("billing.upgradeNow")}
            </Button>
            <Button variant="secondary" onClick={close}>
              {t("billing.maybeLater")}
            </Button>
          </div>
        </div>
      </BottomSheet>
    </UpgradeModalContext.Provider>
  );
}
