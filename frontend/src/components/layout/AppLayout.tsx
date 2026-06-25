import { useState, type ReactNode } from "react";

import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { QuickAddSheet } from "@/components/layout/QuickAddSheet";
import { useEntitlementRealtime } from "@/hooks/useEntitlement";

type Props = {
  children: ReactNode;
};

// The in-app shell wrapping every protected page (App.tsx mounts it as the
// layout route's element around the page Outlet). No top chrome of its own —
// each page renders its own sticky PageHeader (title + eyebrow + action +
// profile avatar) which owns the top safe-area / notch itself. The shell just
// provides the bottom inset (fixed bar + FAB clearance), the bottom tab bar, and
// the Quick Add sheet the FAB opens.
export function AppLayout({ children }: Props) {
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  // The single entitlement realtime subscription for the whole authenticated app
  // (the shell is mounted once). Components read entitlement via useEntitlement
  // (query only) — never open their own channel, or they'd collide on the
  // per-user topic and crash the app.
  useEntitlementRealtime();

  return (
    <div className="min-h-dvh bg-background">
      {/* Page content: the sticky PageHeader owns the top notch; the wrapper just
          keeps the fixed tab bar + floating FAB from covering the bottom. */}
      <div className="pb-[calc(env(safe-area-inset-bottom)+88px)]">{children}</div>

      <MobileTabBar onQuickAdd={() => setQuickAddOpen(true)} />
      <QuickAddSheet open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
    </div>
  );
}
