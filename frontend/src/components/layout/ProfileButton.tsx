import { useState } from "react";
import { useTranslation } from "react-i18next";

import { ProfileAvatar } from "@/components/layout/ProfileAvatar";
import { ProfileMenuSheet } from "@/components/layout/ProfileMenuSheet";
import { useAppUser } from "@/hooks/useAppUser";

// The user's avatar pinned to the trailing edge of every PageHeader — the single
// entry to the profile menu (Brands · Meetings · Expenses · Reminders · Settings
// · Sign out). Self-contained: reads the cached app user and owns the menu's open
// state, so a page only renders <PageHeader> and gets profile access for free.
export function ProfileButton() {
  const { t } = useTranslation();
  const appUserQuery = useAppUser();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("nav.openMenu")}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="shrink-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <ProfileAvatar appUser={appUserQuery.data} size="lg" shape="square" solid />
      </button>
      <ProfileMenuSheet
        open={open}
        onClose={() => setOpen(false)}
        appUser={appUserQuery.data}
      />
    </>
  );
}
