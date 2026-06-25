import { useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { QuickAddSheet } from "@/components/layout/QuickAddSheet";
import { ProfileMenuSheet } from "@/components/layout/ProfileMenuSheet";
import { ProfileAvatar } from "@/components/layout/ProfileAvatar";
import { useAppUser } from "@/hooks/useAppUser";
import { useEntitlementRealtime } from "@/hooks/useEntitlement";
import { ROUTES } from "@/constants/routes";

type Props = {
  children: ReactNode;
};

// The in-app shell wrapping every protected page (App.tsx mounts it as the
// layout route's element around the page Outlet): a sticky greeting header with
// the "Hi, {name}" greeting at the LEADING edge (dashboard only — F17 design) and
// the profile-avatar button (→ profile menu) pushed to the TRAILING edge via
// `ms-auto` — the avatar reads right in LTR / mirrors left in RTL, an easier
// thumb target than the leading corner. Then the page content with bottom
// clearance for the fixed bar, the bottom tab bar, and the Quick Add + profile
// menu sheets it owns. Other pages keep their own title rows (avatar still
// trailing). (Payments now has its own tab bar slot.)
export function AppLayout({ children }: Props) {
  const { t } = useTranslation();
  const location = useLocation();
  const appUserQuery = useAppUser();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // The single entitlement realtime subscription for the whole authenticated app
  // (the shell is mounted once). Components read entitlement via useEntitlement
  // (query only) — never open their own channel, or they'd collide on the
  // per-user topic and crash the app.
  useEntitlementRealtime();

  const isDashboard = location.pathname === ROUTES.DASHBOARD;
  const greetingName =
    appUserQuery.data?.display_name?.trim() || t("dashboard.greetingFallback");

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 bg-background/90 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+8px)] backdrop-blur-sm">
        {/* Same centered column as every page's content (mx-auto max-w-[640px])
            so the header never detaches from the page on wide viewports. */}
        <div className="mx-auto flex w-full max-w-[640px] items-center gap-3">
          {isDashboard ? (
            <div className="min-w-0 leading-tight">
              <p className="text-body text-text-secondary">
                {t("dashboard.greeting")}
              </p>
              <p className="truncate text-row font-bold text-text-primary">
                {greetingName}
              </p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            aria-label={t("nav.openMenu")}
            className="ms-auto rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <ProfileAvatar
              appUser={appUserQuery.data}
              size="lg"
              shape="square"
              solid
            />
          </button>
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
