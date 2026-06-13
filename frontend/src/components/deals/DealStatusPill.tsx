import { useTranslation } from "react-i18next";

import { DEAL_STATUS, type DealStatus } from "@shared/types/deal.types";

type Props = {
  status: DealStatus;
};

// Colors come from ui-tokens "Status Pills — Deals" — the closed table; never
// invent a pill color. Payments gets its own pill (own token table) in F11.
const PILL_CLASS: Record<DealStatus, { pill: string; dot: string }> = {
  [DEAL_STATUS.PENDING]: {
    pill: "bg-warning-light text-warning-foreground",
    dot: "bg-warning",
  },
  [DEAL_STATUS.SHOT]: {
    pill: "bg-accent-light text-accent",
    dot: "bg-accent",
  },
  [DEAL_STATUS.POSTED]: {
    pill: "bg-info-light text-info-foreground",
    dot: "bg-info",
  },
  [DEAL_STATUS.PAID]: {
    pill: "bg-success-light text-success-foreground",
    dot: "bg-success",
  },
  [DEAL_STATUS.CANCELLED]: {
    pill: "bg-surface-tertiary text-text-muted",
    dot: "bg-text-muted",
  },
};

// The deal-status pill (dot + localized label) reused across All Deals, the
// brand detail's deals section, and later Home Today. At most one per row.
export function DealStatusPill({ status }: Props) {
  const { t } = useTranslation();
  const classes = PILL_CLASS[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${classes.pill}`}
    >
      <span className={`size-1.5 rounded-full ${classes.dot}`} aria-hidden="true" />
      {t(`deals.status.${status}`)}
    </span>
  );
}
