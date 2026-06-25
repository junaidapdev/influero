import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  BarChart3,
  Home,
  Megaphone,
  Plus,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { ROUTES } from "@/constants/routes";

type Props = {
  // The FAB action lives in AppLayout (it opens the Quick Add sheet); the bar
  // just renders the button and calls back.
  onQuickAdd: () => void;
};

type Tab = {
  to: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
};

function TabButton({ tab }: { tab: Tab }) {
  const Icon = tab.icon;
  return (
    <Link
      to={tab.to}
      aria-current={tab.active ? "page" : undefined}
      className={`flex min-h-11 flex-col items-center justify-center gap-1 rounded-md py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        tab.active ? "text-accent" : "text-text-secondary"
      }`}
    >
      <Icon className="size-5" aria-hidden="true" />
      <span className={`text-xs ${tab.active ? "font-semibold" : "font-medium"}`}>
        {tab.label}
      </span>
    </Link>
  );
}

// The app's only navigation (ui-rules: bottom tab bar, no top navbar / sidebar).
// Five slots — Home · Deals · [+ FAB] · Payments · Insights — fixed to the
// viewport bottom with a safe-area inset. Payments earns a primary slot (the
// money mental model); Meetings moves to the profile menu. Insights is active on
// either /reports or /analytics/snap (the shared segmented control switches them).
// lucide is outline-only at this pin, so the active state reads via color +
// label weight rather than a filled-glyph swap (ui-tokens' "icon filled").
export function MobileTabBar({ onQuickAdd }: Props) {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  const home: Tab = {
    to: ROUTES.DASHBOARD,
    label: t("nav.home"),
    icon: Home,
    active: pathname === ROUTES.DASHBOARD,
  };
  const deals: Tab = {
    to: ROUTES.DEALS,
    label: t("nav.deals"),
    icon: Megaphone,
    active: pathname === ROUTES.DEALS,
  };
  const payments: Tab = {
    to: ROUTES.PAYMENTS,
    label: t("nav.payments"),
    icon: Wallet,
    active: pathname === ROUTES.PAYMENTS,
  };
  const insights: Tab = {
    to: ROUTES.REPORTS,
    label: t("nav.insights"),
    icon: BarChart3,
    active: pathname === ROUTES.REPORTS || pathname === ROUTES.ANALYTICS_SNAP,
  };

  return (
    <nav
      aria-label={t("nav.barLabel")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto grid h-16 max-w-[640px] grid-cols-5 items-center px-1">
        <TabButton tab={home} />
        <TabButton tab={deals} />
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={onQuickAdd}
            aria-label={t("nav.quickAdd")}
            className="-mt-7 grid size-14 place-items-center rounded-full bg-accent text-accent-foreground shadow-fab transition-colors hover:bg-accent-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            <Plus className="size-6" aria-hidden="true" />
          </button>
        </div>
        <TabButton tab={payments} />
        <TabButton tab={insights} />
      </div>
    </nav>
  );
}
