import { useContext } from "react";

import { UpgradeModalContext, type OpenUpgrade } from "@/lib/upgradeModalContext";

// Reads the app-wide upgrade-modal trigger from UpgradeModalProvider. Any Pro gate
// calls this to pop the single "Upgrade to Pro" modal: useUpgradeModal()(messageKey).
export function useUpgradeModal(): OpenUpgrade {
  const open = useContext(UpgradeModalContext);
  if (!open) {
    throw new Error("useUpgradeModal must be used within an UpgradeModalProvider");
  }
  return open;
}
