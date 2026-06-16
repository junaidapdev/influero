import { Share } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import type { InstallPrompt } from "@/hooks/useInstallPrompt";

type Props = {
  install: InstallPrompt;
};

// Platform-aware "Add to Home Screen". Android/desktop get a real one-tap
// install button (the captured beforeinstallprompt); iOS Safari has no install
// API, so it gets manual instructions; an already-installed app renders nothing.
export function InstallAppButton({ install }: Props) {
  const { t } = useTranslation();

  if (install.isInstalled) return null;

  if (install.isIos) {
    return (
      <div className="flex items-start gap-2 rounded-md bg-surface-secondary p-3">
        <Share className="mt-0.5 size-4 shrink-0 text-text-secondary" aria-hidden />
        <p className="text-body text-text-secondary">
          {t("settings.notifications.install.iosHint")}
        </p>
      </div>
    );
  }

  if (install.canInstall) {
    return (
      <Button variant="secondary" className="w-full" onClick={install.promptInstall}>
        {t("settings.notifications.install.button")}
      </Button>
    );
  }

  return null;
}
