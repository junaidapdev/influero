import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { SettingsSection } from "@/components/settings/SettingsSection";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { useDeleteAccount } from "@/hooks/useDeleteAccount";
import { useToast } from "@/hooks/useToast";
import { ROUTES } from "@/constants/routes";
import { ACCOUNT_DELETE_ERROR } from "@/constants/account";
import { logger } from "@/lib/logger";

// Settings "Danger zone": permanent, irreversible account deletion (PDPL/GDPR
// erasure). A confirm dialog gates the action; on success the hook has already
// cleared the local session, so we land on the public landing page.
export function DeleteAccountSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const showToast = useToast();
  const deleteAccount = useDeleteAccount();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleConfirm(): void {
    deleteAccount.mutate(undefined, {
      onSuccess: () => {
        navigate(ROUTES.ROOT, { replace: true });
      },
      onError: (error) => {
        logger.error("DeleteAccountSection.delete", error);
        setConfirmOpen(false);
        const token = error instanceof Error ? error.message : "";
        showToast(
          token === ACCOUNT_DELETE_ERROR.SUBSCRIPTION_ACTIVE
            ? "account.delete.subscriptionActiveError"
            : "account.delete.error",
          "error",
        );
      },
    });
  }

  return (
    <SettingsSection
      title={t("account.delete.title")}
      description={t("account.delete.help")}
    >
      <Button
        variant="destructive"
        className="w-full"
        onClick={() => setConfirmOpen(true)}
      >
        {t("account.delete.action")}
      </Button>

      <BottomSheet
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t("account.delete.confirmTitle")}
      >
        <div className="flex flex-col gap-4">
          <p className="text-body text-text-secondary">
            {t("account.delete.confirmBody")}
          </p>
          <ul className="list-disc space-y-1 ps-5 text-body text-text-secondary">
            <li>{t("account.delete.item.data")}</li>
            <li>{t("account.delete.item.snap")}</li>
            <li>{t("account.delete.item.subscription")}</li>
            <li>{t("account.delete.item.login")}</li>
          </ul>
          <p className="text-body font-semibold text-error-foreground">
            {t("account.delete.permanent")}
          </p>
          <div className="flex flex-col gap-2">
            <Button
              variant="destructive"
              className="w-full"
              isLoading={deleteAccount.isPending}
              onClick={handleConfirm}
            >
              {t("account.delete.confirmAction")}
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              disabled={deleteAccount.isPending}
              onClick={() => setConfirmOpen(false)}
            >
              {t("common.cancel")}
            </Button>
          </div>
        </div>
      </BottomSheet>
    </SettingsSection>
  );
}
