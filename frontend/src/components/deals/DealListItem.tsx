import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";

import { DealStatusPill } from "@/components/deals/DealStatusPill";
import { DealExpandedPanel } from "@/components/deals/DealExpandedPanel";
import { useLocale } from "@/hooks/useLocale";
import { formatDualDate } from "@/lib/date";
import { formatSar } from "@/lib/currency";
import type { Brand } from "@shared/types/brand.types";
import type { Deal } from "@shared/types/deal.types";

type Props = {
  deal: Deal;
  // Resolved by the parent from the cached brands list — undefined while the
  // brands query is in flight or if the brand row is somehow gone.
  brand: Brand | undefined;
};

// The deal row card. The whole header is the tap target — it expands the row
// inline (accordion; there is no /deals/:id route) to the deliverables
// descriptor, the two lifecycle checkmarks, and the payment/snap sections. No
// leading stripe: the status pill carries the row's state (a stripe would
// duplicate it, and deal rows aren't in the stripe table). At most one pill per
// row (ui-rules). The post_date (publish date) is the date shown on the card.
export function DealListItem({ deal, brand }: Props) {
  const { t } = useTranslation();
  const { locale, isArabic } = useLocale();
  const panelId = useId();
  const [expanded, setExpanded] = useState(false);

  const postDate = deal.post_date ? formatDualDate(deal.post_date, locale) : null;
  const brandName = brand ? (isArabic ? brand.name_ar : brand.name_en) : null;

  return (
    <div className="rounded-lg border border-border bg-surface shadow-card">
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="flex w-full flex-col gap-3 rounded-lg px-4 py-3.5 text-start transition-colors hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <div className="flex w-full items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-row font-semibold text-text-primary">
              {deal.title}
            </p>
            {brandName ? (
              <p className="truncate text-body text-text-secondary">{brandName}</p>
            ) : null}
          </div>
          <DealStatusPill status={deal.status} />
        </div>

        <div className="flex w-full items-end justify-between gap-3">
          <p className="money text-body font-semibold text-text-primary">
            {formatSar(deal.agreed_amount_sar, locale)}
          </p>
          <div className="flex items-end gap-3">
            {postDate ? (
              <div className="text-end">
                <p className="text-body text-text-secondary">{postDate.primary}</p>
                <p className="text-xs text-text-muted">{postDate.secondary}</p>
              </div>
            ) : (
              <p className="text-xs text-text-muted">{t("deals.noPostDate")}</p>
            )}
            <ChevronDown
              className={`size-4 shrink-0 text-text-muted transition-transform motion-reduce:transition-none ${
                expanded ? "rotate-180" : ""
              }`}
              aria-hidden="true"
            />
          </div>
        </div>
      </button>

      {expanded ? (
        <div id={panelId} className="px-4 pb-4">
          <DealExpandedPanel deal={deal} />
        </div>
      ) : null}
    </div>
  );
}
