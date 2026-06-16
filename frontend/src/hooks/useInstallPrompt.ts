import { useCallback, useEffect, useState } from "react";

// The non-standard install event Chrome/Edge/Android fire before showing their
// own install affordance. Capturing it lets us trigger install from our own
// button. Typed locally — it is not in lib.dom.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type InstallPrompt = {
  // Android/desktop captured a deferred prompt → a one-tap install is possible.
  canInstall: boolean;
  // Already running as an installed PWA → nothing to offer.
  isInstalled: boolean;
  // iOS Safari has no install API → the UI shows manual instructions instead.
  isIos: boolean;
  // Triggers the native install dialog (no-op unless canInstall is true).
  promptInstall: () => void;
};

function detectIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function detectInstalled(): boolean {
  if (typeof window === "undefined") return false;
  const standaloneDisplay = window.matchMedia(
    "(display-mode: standalone)",
  ).matches;
  // iOS marks an installed PWA via the non-standard navigator.standalone.
  const iosStandalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return standaloneDisplay || iosStandalone;
}

export function useInstallPrompt(): InstallPrompt {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [isInstalled, setIsInstalled] = useState(detectInstalled);

  useEffect(() => {
    function onBeforeInstall(event: Event): void {
      // Stop the browser's own mini-infobar; we drive install from our button.
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    }
    function onInstalled(): void {
      setIsInstalled(true);
      setDeferred(null);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(() => {
    if (!deferred) return;
    void deferred.prompt().then(() => deferred.userChoice);
    // A deferred prompt can be used once; drop it so the button hides after use.
    setDeferred(null);
  }, [deferred]);

  return {
    canInstall: deferred !== null,
    isInstalled,
    isIos: detectIos(),
    promptInstall,
  };
}
