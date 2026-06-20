import { createContext } from "react";

// messageKey is an i18n catalog key for the feature-specific gate copy shown in
// the modal body (e.g. billing.upgradePrompt.snap), resolved with t() inside it.
export type OpenUpgrade = (messageKey: string) => void;

// `undefined` means "no UpgradeModalProvider above me" — useUpgradeModal throws on
// that (a wiring bug), mirroring ToastContext.
export const UpgradeModalContext = createContext<OpenUpgrade | undefined>(
  undefined,
);
