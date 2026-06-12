import { DEAL_STATUS, type Deal } from "@shared/types/deal.types";

// Pure brand-detail rollup (React-free, Supabase-free per the features/
// boundary) over the brand's already-fetched deals — one query per detail
// page (useDealsForBrand), never a per-stat fetch. Cancelled deals are
// excluded from the money math (nothing was earned), but a cancelled deal
// still counts as engagement: the brand and the influencer did interact.

export type BrandRollup = {
  // Sum of agreed_amount_sar over non-cancelled deals; null when there are none.
  lifetimeTotalSar: number | null;
  // lifetimeTotalSar ÷ non-cancelled deal count; null when there are none.
  avgDealSizeSar: number | null;
  // created_at of the most recent deal (any status); null with no deals.
  lastEngagementAt: string | null;
};

export function getBrandRollup(deals: Deal[]): BrandRollup {
  const counted = deals.filter((deal) => deal.status !== DEAL_STATUS.CANCELLED);
  const lifetimeTotalSar = counted.length
    ? counted.reduce((sum, deal) => sum + deal.agreed_amount_sar, 0)
    : null;

  let lastEngagementAt: string | null = null;
  for (const deal of deals) {
    if (lastEngagementAt === null || deal.created_at > lastEngagementAt) {
      lastEngagementAt = deal.created_at;
    }
  }

  return {
    lifetimeTotalSar,
    avgDealSizeSar:
      lifetimeTotalSar === null ? null : lifetimeTotalSar / counted.length,
    lastEngagementAt,
  };
}
