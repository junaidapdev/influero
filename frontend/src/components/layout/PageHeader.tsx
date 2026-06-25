import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft } from "lucide-react";

import { HeaderIconButton } from "@/components/layout/HeaderIconButton";
import { ProfileButton } from "@/components/layout/ProfileButton";

type Props = {
  title: string;
  // The small muted line above the title (count, month, greeting). Omitted
  // pages (Insights, Settings) render the title alone.
  eyebrow?: ReactNode;
  // Renders a leading back chevron when set — pushed pages (Settings, brand
  // detail) opt in.
  onBack?: () => void;
  // The page's contextual action, sitting just before the avatar — usually a
  // HeaderIconButton (add, filter). Omitted on pages with no header action.
  action?: ReactNode;
};

// Every in-app page's top bar (ui-rules: "every page has a sticky title row with
// a muted line above it"). One row: an optional back chevron + the eyebrow/title
// block on the leading edge, then the contextual action and the profile avatar
// on the trailing edge. STICKY to the viewport top: `-mx-4` makes the blurred
// background full-bleed (cancelling the page's px-4) while the inner padding
// keeps content on the 640px column, and `pt-[safe-area]` owns the notch (so
// AppLayout no longer adds a top inset). z-30 sits under the bottom tab bar (z-40).
export function PageHeader({ title, eyebrow, onBack, action }: Props) {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-30 -mx-4 flex items-center gap-3 bg-background/90 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+8px)] backdrop-blur-sm">
      {onBack ? (
        <HeaderIconButton
          icon={ChevronLeft}
          label={t("nav.back")}
          onClick={onBack}
          mirror
        />
      ) : null}

      <div className="min-w-0 flex-1 leading-tight">
        {eyebrow ? (
          <p className="truncate text-body text-text-secondary">{eyebrow}</p>
        ) : null}
        <h1 className="truncate text-2xl font-bold text-text-primary">{title}</h1>
      </div>

      {action}
      <ProfileButton />
    </header>
  );
}
