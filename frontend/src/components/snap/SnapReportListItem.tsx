import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";

import { SnapStatusPill } from "@/components/snap/SnapStatusPill";
import { useLocale } from "@/hooks/useLocale";
import { formatDualDate, formatMonthYear } from "@/lib/date";
import { formatNumber } from "@/lib/numbers";
import {
  SNAP_EXTRACTION_STATUS,
  SNAP_REPORT_TYPE,
  type SnapReport,
} from "@shared/types/snapReport.types";

type Props = {
  report: SnapReport;
  onOpen: (report: SnapReport) => void;
};

// The snap report row card; the WHOLE card is a <button> that opens the detail
// sheet (the MeetingListItem pattern). No leading stripe — snap rows aren't in
// ui-tokens' stripe table; the status pill carries state (the deal-row
// precedent). Title follows the report type (16B): a monthly row titles with
// its month (Gregorian month-year — month buckets are Gregorian, the deals
// month-filter rationale), a post row with the dual snap date; either falls
// back to a generic label. A neutral type chip (the TodayPanel type-badge
// pattern — never a status pill) names the kind; the sub-line shows the two
// headline numbers once extracted.
export function SnapReportListItem({ report, onOpen }: Props) {
  const { t } = useTranslation();
  const { locale } = useLocale();

  const isMonthly = report.report_type === SNAP_REPORT_TYPE.MONTHLY;

  const monthTitle =
    isMonthly && report.report_date
      ? formatMonthYear(report.report_date.slice(0, 7), locale)
      : null;
  const dualDate =
    !isMonthly && report.report_date
      ? formatDualDate(report.report_date, locale)
      : null;

  const isPending = report.extraction_status === SNAP_EXTRACTION_STATUS.PENDING;
  const hasNumbers = report.views !== null || report.reach !== null;

  const subline = isPending
    ? t("snap.list.extracting")
    : hasNumbers
      ? t("snap.list.metrics", {
          views: report.views === null ? "—" : formatNumber(report.views, locale),
          reach: report.reach === null ? "—" : formatNumber(report.reach, locale),
        })
      : t("snap.list.noNumbers");

  return (
    <button
      type="button"
      onClick={() => onOpen(report)}
      aria-label={t("snap.list.openAria")}
      className="flex min-h-16 w-full items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3.5 text-start shadow-card transition-colors hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <div className="min-w-0 flex-1">
        {monthTitle ? (
          <p className="truncate text-row font-semibold text-text-primary">
            {monthTitle}
          </p>
        ) : dualDate ? (
          <>
            <p className="truncate text-row font-semibold text-text-primary">
              {dualDate.primary}
            </p>
            <p className="truncate text-xs text-text-muted">{dualDate.secondary}</p>
          </>
        ) : (
          <p className="truncate text-row font-semibold text-text-primary">
            {isMonthly ? t("snap.list.untitledMonthly") : t("snap.list.untitled")}
          </p>
        )}
        <p
          className={`truncate text-body text-text-secondary ${isPending ? "animate-pulse motion-reduce:animate-none" : ""}`}
        >
          {subline}
        </p>
      </div>
      <span className="inline-flex shrink-0 items-center rounded-full border border-border-light bg-surface-secondary px-2.5 py-1 text-micro font-medium text-text-secondary">
        {isMonthly ? t("snap.type.monthly") : t("snap.type.post")}
      </span>
      <SnapStatusPill status={report.extraction_status} />
      <ChevronRight
        className="size-5 shrink-0 text-text-muted rtl:-scale-x-100"
        aria-hidden
      />
    </button>
  );
}
