import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Bell,
  Building2,
  CalendarPlus,
  Image,
  Megaphone,
  Receipt,
  Sparkles,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { useEntitlement } from "@/hooks/useEntitlement";
import { isPro } from "@/features/billing/entitlement";
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
  // Pro-gated destination (the route gates to the Upgrade modal for free users).
  // A small "Pro" badge renders on these tiles while the viewer is on the free
  // tier, so the gate is signalled before the tap (not a surprise dead-end).
  pro?: boolean;
};

// The FAB's Quick Add sheet (ui-rules / ui-tokens): a 2-col grid of Brand · Deal
// · Meeting · Payment · Expense · Snap report · Reminder. Each tile navigates to
// the destination and (except Snap) signals it via location.state.quickAdd to pop
// its existing Add sheet — reusing every route's create flow rather than
// duplicating forms here. Brand leads because a deal requires a brand, so the
// prerequisite sits one tap from the thing needing it; Expense sits next to
// Payment (money out beside money in). The two Pro destinations (Expense, Snap)
// carry a small "Pro" badge while the viewer is on the free tier, so the gate is
// signalled before the tap rather than landing them on the Upgrade modal as a
// surprise. Reminder is free (a core personal to-do, zero marginal cost).
export function QuickAddSheet({ open, onClose }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const entitlement = useEntitlement();
  // Only badge once entitlement has loaded, so a Pro user never sees a flash of
  // the badge before their plan resolves.
  const isFreeTier = !entitlement.isLoading && !isPro(entitlement.data);

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
      key: "expense",
      label: t("quickAdd.expense"),
      icon: Receipt,
      circle: "bg-brand-tint-pink text-text-secondary",
      to: ROUTES.EXPENSES,
      quickAdd: true,
      pro: true,
    },
    {
      key: "snap",
      label: t("quickAdd.snap"),
      icon: Image,
      circle: "bg-brand-tint-green text-success-foreground",
      to: ROUTES.ANALYTICS_SNAP,
      quickAdd: false,
      pro: true,
    },
    {
      key: "reminder",
      label: t("quickAdd.reminder"),
      icon: Bell,
      circle: "bg-brand-tint-blue text-info-foreground",
      to: ROUTES.REMINDERS,
      quickAdd: true,
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
              className="relative flex flex-col items-center gap-2 rounded-lg bg-surface-secondary p-4 transition-colors hover:bg-surface-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {tile.pro && isFreeTier ? (
                <span className="absolute end-2 top-2 inline-flex items-center gap-0.5 rounded-full bg-accent-light px-1.5 py-0.5 text-micro font-semibold text-accent">
                  <Sparkles className="size-3" aria-hidden="true" />
                  {t("billing.plan.pro")}
                </span>
              ) : null}
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
