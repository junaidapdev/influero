import { useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";

import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { QuickAddSheet } from "@/components/layout/QuickAddSheet";
import { ProfileMenuSheet } from "@/components/layout/ProfileMenuSheet";
import { ProfileAvatar } from "@/components/layout/ProfileAvatar";
import { useAppUser } from "@/hooks/useAppUser";
import { ROUTES } from "@/constants/routes";

type Props = {
  children: ReactNode;
};

// The in-app shell wrapping every protected page (App.tsx mounts it as the
// layout route's element around the page Outlet): a sticky greeting header
// (avatar → profile menu, leading; a presentational search button, trailing;
// the "Hi, {name}" greeting only on the dashboard — F17 design), the page
// content with bottom clearance for the fixed bar, the bottom tab bar, and the
// Quick Add + profile menu sheets it owns. Other pages keep their own title
// rows. (Payments is reached from the dashboard money tiles, not the header.)
export function AppLayout({ children }: Props) {
  const { t } = useTranslation();
  const location = useLocation();
  const appUserQuery = useAppUser();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const isDashboard = location.pathname === ROUTES.DASHBOARD;
  const greetingName =
    appUserQuery.data?.display_name?.trim() || t("dashboard.greetingFallback");

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 bg-background/90 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+8px)] backdrop-blur-sm">
        {/* Same centered column as every page's content (mx-auto max-w-[640px])
            so the header never detaches from the page on wide viewports. */}
        <div className="mx-auto flex w-full max-w-[640px] items-center gap-3">
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            aria-label={t("nav.openMenu")}
            className="rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <ProfileAvatar
              appUser={appUserQuery.data}
              size={isDashboard ? "xl" : "lg"}
              shape="square"
              solid
            />
          </button>

          {isDashboard ? (
            <div className="min-w-0">
              <p className="text-body text-text-secondary">
                {t("dashboard.greeting")}
              </p>
              <p className="truncate text-row font-bold text-text-primary">
                {greetingName}
              </p>
            </div>
          ) : null}

          {/* Search stays presentational (no search feature in v1). Payments now
              has a labelled home on the dashboard (the money tiles + a "View
              payments" link), so the header no longer carries a payments entry. */}
          <div className="ms-auto flex items-center gap-2">
            <button
              type="button"
              aria-label={t("nav.search")}
              className="grid size-12 place-items-center rounded-2xl border border-border bg-surface text-text-secondary shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Search className="size-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {/* Bottom clearance so the fixed tab bar + floating FAB never cover content. */}
      <div className="pb-[calc(env(safe-area-inset-bottom)+88px)]">{children}</div>

      <MobileTabBar onQuickAdd={() => setQuickAddOpen(true)} />
      <QuickAddSheet open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
      <ProfileMenuSheet
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        appUser={appUserQuery.data}
      />
    </div>
  );
}
