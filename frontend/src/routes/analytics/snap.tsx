import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Camera } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { MonthlyUploadSlots } from "@/components/snap/MonthlyUploadSlots";
import { CampaignUploadSlots } from "@/components/snap/CampaignUploadSlots";
import { SnapReportListItem } from "@/components/snap/SnapReportListItem";
import { SnapReportSheet } from "@/components/snap/SnapReportSheet";
import { MonthlySnapReportSheet } from "@/components/snap/MonthlySnapReportSheet";
import { CampaignSnapReportSheet } from "@/components/snap/CampaignSnapReportSheet";
import { InsightsTabs } from "@/components/insights/InsightsTabs";
import { UpgradePrompt } from "@/components/billing/UpgradePrompt";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Card } from "@/components/ui/Card";
import { FilterChips } from "@/components/ui/FilterChips";
import { EmptyState } from "@/components/feedback/EmptyState";
import {
  useSnapReports,
  useSnapReportsRealtime,
} from "@/hooks/useSnapReports";
import { useDeals } from "@/hooks/useDeals";
import { useEntitlement } from "@/hooks/useEntitlement";
import { isPro } from "@/features/billing/entitlement";
import { SNAP_SCOPE } from "@shared/analytics/snapMetricDictionary";
import { DEAL_STATUS, type Deal } from "@shared/types/deal.types";
import {
  SNAP_EXTRACTION_STATUS,
  type SnapReport,
} from "@shared/types/snapReport.types";

// The upload picker's two kinds. 'campaign' maps to scope='campaign_24h' (the
// 1–3 brand frames of a deal's story); 'monthly' maps to scope='monthly' (the
// account's monthly Insights). The legacy 24h 'post' report was retired — it can
// no longer be created, but existing post rows still render read-only below.
type UploadKind = "campaign" | "monthly";

function SnapSkeleton() {
  return (
    <div className="flex flex-col gap-3" role="status" aria-busy="true">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="h-20 animate-pulse rounded-lg bg-border motion-reduce:animate-none"
        />
      ))}
    </div>
  );
}

export function SnapAnalyticsRoute() {
  const { t } = useTranslation();

  const [openReportId, setOpenReportId] = useState<string | null>(null);
  // Which upload surface is shown: the 24h-campaign frames or the 3-surface
  // monthly slots. Each is a self-contained component owning its own create flow.
  const [uploadKind, setUploadKind] = useState<UploadKind>("campaign");

  const reportsQuery = useSnapReports();
  const dealsQuery = useDeals({});
  const entitlement = useEntitlement();

  const reports = reportsQuery.data ?? [];

  // Live only while something is actually extracting — the subscription
  // delivers the settled row and the prefix invalidation refreshes the list.
  useSnapReportsRealtime(
    reports.some(
      (report) => report.extraction_status === SNAP_EXTRACTION_STATUS.PENDING,
    ),
  );

  // A report may link to any non-cancelled deal — paid deals are exactly the
  // campaigns whose performance a brand wants to see; only cancelled is dead.
  const linkableDeals = useMemo(
    () =>
      (dealsQuery.data ?? []).filter(
        (deal: Deal) => deal.status !== DEAL_STATUS.CANCELLED,
      ),
    [dealsQuery.data],
  );

  // The sheet re-derives its report from the cached list so a realtime settle
  // while it is open refreshes the fields live.
  const openReport = openReportId
    ? (reports.find((report) => report.id === openReportId) ?? null)
    : null;

  // Snap AI extraction is Pro-only — free users get the upgrade gate instead of
  // the upload/list UI (the extract-snap-report edge function enforces it too).
  // A free user lands on the in-page UpgradePrompt card; its button opens the
  // upgrade modal (card-first — no modal auto-pops on landing).
  const gated = !entitlement.isLoading && !isPro(entitlement.data);

  if (gated) {
    return (
      <main className="min-h-dvh bg-background px-4 pb-8">
        <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6">
          <PageHeader title={t("nav.insights")} />
          <InsightsTabs />
          <UpgradePrompt messageKey="billing.upgradePrompt.snap" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-background px-4 pb-8">
      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6">
        <PageHeader title={t("nav.insights")} />

        <InsightsTabs />

        <Card>
          <h2 className="mb-3 text-base font-semibold text-text-primary">
            {t("snap.upload.heading")}
          </h2>
          <div className="mb-3">
            <FilterChips
              items={[
                { value: "campaign", label: t("snap.type.campaign") },
                { value: "monthly", label: t("snap.type.monthly") },
              ]}
              value={uploadKind}
              onChange={setUploadKind}
              label={t("snap.upload.typeLabel")}
            />
          </div>
          {uploadKind === "monthly" ? (
            <MonthlyUploadSlots />
          ) : (
            <CampaignUploadSlots deals={linkableDeals} />
          )}
        </Card>

        {reportsQuery.isLoading ? (
          <SnapSkeleton />
        ) : reportsQuery.isError ? (
          <Card>
            <p className="text-sm text-error-foreground">{t("snap.loadError")}</p>
          </Card>
        ) : reports.length === 0 ? (
          <EmptyState icon={Camera} message={t("snap.empty")} />
        ) : (
          <div className="flex flex-col gap-3">
            {reports.map((report: SnapReport) => (
              <SnapReportListItem
                key={report.id}
                report={report}
                onOpen={(opened) => setOpenReportId(opened.id)}
              />
            ))}
          </div>
        )}
      </div>

      <BottomSheet
        open={openReport !== null}
        onClose={() => setOpenReportId(null)}
        title={t("snap.detail.title")}
      >
        {openReport ? (
          openReport.scope === SNAP_SCOPE.CAMPAIGN_24H ? (
            <CampaignSnapReportSheet report={openReport} deals={linkableDeals} />
          ) : openReport.scope === SNAP_SCOPE.MONTHLY ? (
            <MonthlySnapReportSheet report={openReport} />
          ) : (
            // Legacy 24h-post + pre-0023 monthly rows (scope=NULL) still render
            // and edit through the original fixed-field sheet.
            <SnapReportSheet report={openReport} deals={linkableDeals} />
          )
        ) : null}
      </BottomSheet>
    </main>
  );
}
