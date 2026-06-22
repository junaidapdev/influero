import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Camera } from "lucide-react";

import { SnapDropzone } from "@/components/snap/SnapDropzone";
import { MonthlyUploadSlots } from "@/components/snap/MonthlyUploadSlots";
import { SnapReportListItem } from "@/components/snap/SnapReportListItem";
import { SnapReportSheet } from "@/components/snap/SnapReportSheet";
import { MonthlySnapReportSheet } from "@/components/snap/MonthlySnapReportSheet";
import { InsightsTabs } from "@/components/insights/InsightsTabs";
import { UpgradePrompt } from "@/components/billing/UpgradePrompt";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Card } from "@/components/ui/Card";
import { FilterChips } from "@/components/ui/FilterChips";
import { EmptyState } from "@/components/feedback/EmptyState";
import {
  useCreateSnapReport,
  useSnapReports,
  useSnapReportsRealtime,
} from "@/hooks/useSnapReports";
import { useDeals } from "@/hooks/useDeals";
import { useEntitlement } from "@/hooks/useEntitlement";
import { useUpgradeModal } from "@/hooks/useUpgradeModal";
import { useToast } from "@/hooks/useToast";
import { useLocale } from "@/hooks/useLocale";
import { formatNumber } from "@/lib/numbers";
import { logger } from "@/lib/logger";
import { prepareSnapFile } from "@/features/snap/prepareUpload";
import { isPro } from "@/features/billing/entitlement";
import { SNAP_SCOPE } from "@shared/analytics/snapMetricDictionary";
import { DEAL_STATUS, type Deal } from "@shared/types/deal.types";
import {
  SNAP_EXTRACTION_STATUS,
  SNAP_REPORT_TYPE,
  type SnapReport,
  type SnapReportType,
} from "@shared/types/snapReport.types";

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
  const { locale } = useLocale();
  const showToast = useToast();

  const [openReportId, setOpenReportId] = useState<string | null>(null);
  const [uploadErrorKey, setUploadErrorKey] = useState<string | undefined>();
  // Covers the read-bytes + PDF-conversion stretch BEFORE the mutation starts.
  const [isPreparing, setIsPreparing] = useState(false);
  // What the next upload IS (16B): one piece of content's 24h Insights, or the
  // account's monthly Insights page. The row carries it; the edge function
  // picks the extraction contract from the row, never from the client call.
  const [uploadType, setUploadType] = useState<SnapReportType>(
    SNAP_REPORT_TYPE.POST,
  );

  const reportsQuery = useSnapReports();
  const dealsQuery = useDeals({});
  const createReport = useCreateSnapReport();
  const entitlement = useEntitlement();
  const openUpgrade = useUpgradeModal();

  const reports = reportsQuery.data ?? [];
  const ready = !reportsQuery.isLoading && !reportsQuery.isError;

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

  async function handleSelect(file: File): Promise<void> {
    setUploadErrorKey(undefined);
    setIsPreparing(true);
    try {
      const prepared = await prepareSnapFile(file);
      if (!prepared.ok) {
        setUploadErrorKey(prepared.errorKey);
        return;
      }

      createReport.mutate(
        { blob: prepared.file.blob, mime: prepared.file.mime, reportType: uploadType },
        {
          onSuccess: () => {
            // The pending row is now in the list; extraction runs in the
            // background and the row's status pill flips when it settles.
            showToast("snap.toast.uploaded", "success");
          },
          onError: (error) => {
            logger.error("SnapAnalyticsRoute.upload", error);
            showToast("snap.toast.uploadError", "error");
          },
        },
      );
    } finally {
      setIsPreparing(false);
    }
  }

  // Snap AI extraction is Pro-only — free users get the upgrade gate instead of
  // the upload/list UI (the extract-snap-report edge function enforces it too).
  // The modal pops the moment a free user lands here; the card behind re-opens it.
  const gated = !entitlement.isLoading && !isPro(entitlement.data);
  useEffect(() => {
    if (gated) openUpgrade("billing.upgradePrompt.snap");
  }, [gated, openUpgrade]);

  if (gated) {
    return (
      <main className="min-h-dvh bg-background px-4 py-8">
        <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6">
          <InsightsTabs />
          <h1 className="text-2xl font-bold text-text-primary">{t("snap.title")}</h1>
          <UpgradePrompt messageKey="billing.upgradePrompt.snap" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-background px-4 py-8">
      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6">
        <InsightsTabs />

        <div>
          {ready ? (
            <p className="text-body text-text-secondary">
              {t("snap.count", {
                count: reports.length,
                total: formatNumber(reports.length, locale),
              })}
            </p>
          ) : null}
          <h1 className="text-2xl font-bold text-text-primary">{t("snap.title")}</h1>
        </div>

        <Card>
          <h2 className="mb-3 text-base font-semibold text-text-primary">
            {t("snap.upload.heading")}
          </h2>
          <div className="mb-3">
            <FilterChips
              items={[
                { value: SNAP_REPORT_TYPE.POST, label: t("snap.type.post") },
                { value: SNAP_REPORT_TYPE.MONTHLY, label: t("snap.type.monthly") },
              ]}
              value={uploadType}
              onChange={setUploadType}
              label={t("snap.upload.typeLabel")}
            />
          </div>
          {uploadType === SNAP_REPORT_TYPE.MONTHLY ? (
            <MonthlyUploadSlots />
          ) : (
            <>
              <p className="mb-3 text-xs text-text-muted">{t("snap.upload.postHint")}</p>
              <SnapDropzone
                onSelect={(file) => {
                  void handleSelect(file);
                }}
                errorKey={uploadErrorKey}
                isBusy={isPreparing || createReport.isPending}
              />
            </>
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
          openReport.scope === SNAP_SCOPE.MONTHLY ? (
            <MonthlySnapReportSheet report={openReport} />
          ) : (
            <SnapReportSheet report={openReport} deals={linkableDeals} />
          )
        ) : null}
      </BottomSheet>
    </main>
  );
}
