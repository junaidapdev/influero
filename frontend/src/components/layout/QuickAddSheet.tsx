import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Building2,
  CalendarPlus,
  Image,
  Megaphone,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { ROUTES } from "@/constants/routes";

type Props = {
  open: boolean;
  onClose: () => void;
};

type Tile = {
  key: string;
  label: string;
  icon: LucideIcon;
  // Existing brand-tint background + a deeper-tone foreground (no new tokens).
  circle: string;
  to: string;
  // Whether to signal the destination to auto-open its Add sheet. Snap has no
  // Add sheet — the upload card IS the add surface — so it just navigates.
  quickAdd: boolean;
  // Full-width tile so the five-tile grid stays balanced (the odd one out
  // spans both columns on its own row rather than sitting alone half-width).
  span?: boolean;
};

// The FAB's Quick Add sheet (ui-rules / ui-tokens): a 2-col grid of Brand · Deal
// · Meeting · Payment · Snap report (Snap spans the last row). Each tile
// navigates to the destination and (except Snap) signals it via
// location.state.quickAdd to pop its existing Add sheet — reusing every route's
// create flow rather than duplicating forms here. Brand leads because a deal
// requires a brand, so the prerequisite sits one tap from the thing needing it.
export function QuickAddSheet({ open, onClose }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const tiles: Tile[] = [
    {
      key: "brand",
      label: t("quickAdd.brand"),
      icon: Building2,
      circle: "bg-brand-tint-neutral text-text-secondary",
      to: ROUTES.BRANDS,
      quickAdd: true,
    },
    {
      key: "deal",
      label: t("quickAdd.deal"),
      icon: Megaphone,
      circle: "bg-brand-tint-violet text-accent",
      to: ROUTES.DEALS,
      quickAdd: true,
    },
    {
      key: "meeting",
      label: t("quickAdd.meeting"),
      icon: CalendarPlus,
      circle: "bg-brand-tint-blue text-info-foreground",
      to: ROUTES.MEETINGS,
      quickAdd: true,
    },
    {
      key: "payment",
      label: t("quickAdd.payment"),
      icon: Wallet,
      circle: "bg-brand-tint-amber text-warning-foreground",
      to: ROUTES.PAYMENTS,
      quickAdd: true,
    },
    {
      key: "snap",
      label: t("quickAdd.snap"),
      icon: Image,
      circle: "bg-brand-tint-green text-success-foreground",
      to: ROUTES.ANALYTICS_SNAP,
      quickAdd: false,
      span: true,
    },
  ];

  function handleTile(tile: Tile): void {
    onClose();
    navigate(tile.to, tile.quickAdd ? { state: { quickAdd: true } } : undefined);
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={t("nav.quickAdd")}>
      <div className="grid grid-cols-2 gap-3">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <button
              key={tile.key}
              type="button"
              onClick={() => handleTile(tile)}
              className={`flex flex-col items-center gap-2 rounded-lg bg-surface-secondary p-4 transition-colors hover:bg-surface-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                tile.span ? "col-span-2" : ""
              }`}
            >
              <span className={`grid size-12 place-items-center rounded-full ${tile.circle}`}>
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="text-sm font-semibold text-text-primary">
                {tile.label}
              </span>
            </button>
          );
        })}
      </div>
    </BottomSheet>
  );
}
