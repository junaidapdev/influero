import { useTranslation } from "react-i18next";

import { SettingsSection } from "@/components/settings/SettingsSection";
import { InstallAppButton } from "@/components/settings/InstallAppButton";
import { Button } from "@/components/ui/Button";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { useToast } from "@/hooks/useToast";
import { PUSH_PERMISSION_DENIED } from "@/lib/pushClient";

// The Settings "Notifications" group: a per-device enable/disable toggle for the
// twice-daily web-push reminder, plus the platform-aware install affordance.
// Reads device capability + subscription state from usePushNotifications; the
// copy explains every dead-end (unsupported / blocked / iOS-needs-install) so
// the toggle is never a silent no-op.
export function NotificationsSection() {
  const { t } = useTranslation();
  const showToast = useToast();
  const push = usePushNotifications();
  const install = useInstallPrompt();

  function handleEnable(): void {
    push.enable.mutate(undefined, {
      onSuccess: () =>
        showToast("settings.notifications.toast.enabled", "success"),
      onError: (error) => {
        // A declined prompt flips the UI to the blocked state — no error toast.
        if (error instanceof Error && error.message === PUSH_PERMISSION_DENIED) {
          return;
        }
        showToast("settings.notifications.enableError", "error");
      },
    });
  }

  function handleDisable(): void {
    push.disable.mutate(undefined, {
      onSuccess: () =>
        showToast("settings.notifications.toast.disabled", "info"),
      onError: () => showToast("settings.notifications.disableError", "error"),
    });
  }

  function renderToggle() {
    if (!push.isSupported) {
      const key =
        install.isIos && !install.isInstalled
          ? "settings.notifications.iosInstallRequired"
          : "settings.notifications.unsupported";
      return <p className="text-body text-text-secondary">{t(key)}</p>;
    }

    if (!push.isConfigured) {
      return (
        <p className="text-body text-text-secondary">
          {t("settings.notifications.unavailable")}
        </p>
      );
    }

    if (push.isSubscribed) {
      return (
        <div className="flex items-center justify-between gap-3">
          <p className="text-body text-text-secondary">
            {t("settings.notifications.enabled")}
          </p>
          <Button
            variant="secondary"
            isLoading={push.disable.isPending}
            onClick={handleDisable}
          >
            {t("settings.notifications.disable")}
          </Button>
        </div>
      );
    }

    if (push.permission === "denied") {
      return (
        <p className="text-body text-text-secondary">
          {t("settings.notifications.blocked")}
        </p>
      );
    }

    return (
      <Button
        className="w-full"
        isLoading={push.enable.isPending}
        onClick={handleEnable}
      >
        {t("settings.notifications.enable")}
      </Button>
    );
  }

  return (
    <SettingsSection
      title={t("settings.notifications.title")}
      description={t("settings.notifications.help")}
    >
      <div className="flex flex-col gap-3">
        {renderToggle()}
        <InstallAppButton install={install} />
      </div>
    </SettingsSection>
  );
}
