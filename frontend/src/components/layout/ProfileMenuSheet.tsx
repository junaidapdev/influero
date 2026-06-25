import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Bell,
  Building2,
  Calendar,
  ChevronRight,
  LogOut,
  Receipt,
  Settings,
  type LucideIcon,
} from "lucide-react";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { ProfileAvatar } from "@/components/layout/ProfileAvatar";
import { useSignOut } from "@/hooks/useAuth";
import { useSession } from "@/hooks/useSession";
import { useToast } from "@/hooks/useToast";
import { logger } from "@/lib/logger";
import { ROUTES } from "@/constants/routes";
import type { AppUser } from "@shared/types/appUser.types";

type Props = {
  open: boolean;
  onClose: () => void;
  appUser: AppUser | undefined;
};

type MenuLink = {
  key: string;
  label: string;
  icon: LucideIcon;
  to: string;
};

// The profile menu (the shell header's avatar opens it). Reuses the BottomSheet
// pattern. Holds the destinations kept OFF the tab bar
// (Brands · Meetings · Expenses · Reminders · Settings) plus Sign out — so
// everything the app can reach has a persistent home. (Payments moved to a tab
// bar slot; Meetings moved here in its place.)
export function ProfileMenuSheet({ open, onClose, appUser }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { session } = useSession();
  const showToast = useToast();
  const signOut = useSignOut();

  const links: MenuLink[] = [
    { key: "brands", label: t("brands.title"), icon: Building2, to: ROUTES.BRANDS },
    { key: "meetings", label: t("meetings.title"), icon: Calendar, to: ROUTES.MEETINGS },
    { key: "expenses", label: t("expenses.title"), icon: Receipt, to: ROUTES.EXPENSES },
    { key: "reminders", label: t("reminders.title"), icon: Bell, to: ROUTES.REMINDERS },
    { key: "settings", label: t("settings.title"), icon: Settings, to: ROUTES.SETTINGS },
  ];

  function go(to: string): void {
    onClose();
    navigate(to);
  }

  function handleSignOut(): void {
    signOut.mutate(undefined, {
      onSuccess: () => navigate(ROUTES.LOGIN, { replace: true }),
      onError: (error) => {
        logger.error("ProfileMenuSheet.signOut", error);
        showToast("settings.toast.error", "error");
      },
    });
  }

  const subtitle = appUser?.display_name?.trim() || session?.user.email || "";

  return (
    <BottomSheet open={open} onClose={onClose} title={t("nav.menuTitle")}>
      <div className="flex flex-col gap-1">
        <div className="mb-2 flex items-center gap-3">
          <ProfileAvatar appUser={appUser} size="lg" />
          {subtitle ? (
            <p className="min-w-0 flex-1 truncate text-base font-semibold text-text-primary">
              {subtitle}
            </p>
          ) : null}
        </div>

        {links.map((link) => {
          const Icon = link.icon;
          return (
            <button
              key={link.key}
              type="button"
              onClick={() => go(link.to)}
              className="flex min-h-12 w-full items-center gap-3 rounded-md px-2 py-3 text-start transition-colors hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Icon className="size-5 text-text-secondary" aria-hidden="true" />
              <span className="flex-1 text-sm font-medium text-text-primary">
                {link.label}
              </span>
              <ChevronRight
                className="size-4 text-text-muted rtl:-scale-x-100"
                aria-hidden="true"
              />
            </button>
          );
        })}

        <div className="my-1 h-px bg-border-light" />

        <button
          type="button"
          onClick={handleSignOut}
          disabled={signOut.isPending}
          className="flex min-h-12 w-full items-center gap-3 rounded-md px-2 py-3 text-start transition-colors hover:bg-error-lightest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
        >
          <LogOut
            className="size-5 text-error-foreground rtl:-scale-x-100"
            aria-hidden="true"
          />
          <span className="text-sm font-medium text-error-foreground">
            {t("settings.actions.signOut")}
          </span>
        </button>
      </div>
    </BottomSheet>
  );
}
