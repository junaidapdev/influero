import { useTranslation } from "react-i18next";

import { ProfileAvatar } from "@/components/layout/ProfileAvatar";
import { useLocale } from "@/hooks/useLocale";
import { formatDualDate, formatMonthYear } from "@/lib/date";
import { formatNumber } from "@/lib/numbers";
import type { AppUser } from "@shared/types/appUser.types";
import {
  SNAP_REPORT_TYPE,
  type SnapReport,
} from "@shared/types/snapReport.types";

type Props = {
  report: SnapReport;
  // The signed-in influencer — the card's "prepared by" identity.
  appUser: AppUser | undefined;
  // Post-report context, resolved by the caller from the cached lists
  // (brand name already localized). Both absent on monthly reports.
  brandName?: string | null;
  dealTitle?: string | null;
};

type MetricKey = keyof Pick<
  SnapReport,
  | "views"
  | "reach"
  | "story_views"
  | "screenshot_count"
  | "swipe_ups"
  | "profile_views"
  | "new_followers"
  | "watch_time_minutes"
>;

// The metric tiles per report type — same six/five the detail sheet edits.
const POST_METRICS: { key: MetricKey; labelKey: string }[] = [
  { key: "views", labelKey: "snap.fields.views" },
  { key: "reach", labelKey: "snap.fields.reach" },
  { key: "story_views", labelKey: "snap.fields.storyViews" },
  { key: "screenshot_count", labelKey: "snap.fields.screenshotCount" },
  { key: "swipe_ups", labelKey: "snap.fields.swipeUps" },
];

const MONTHLY_METRICS: { key: MetricKey; labelKey: string }[] = [
  { key: "views", labelKey: "snap.fields.views" },
  { key: "reach", labelKey: "snap.fields.reach" },
  { key: "story_views", labelKey: "snap.fields.storyViews" },
  { key: "profile_views", labelKey: "snap.fields.profileViews" },
  { key: "new_followers", labelKey: "snap.fields.newFollowers" },
  { key: "watch_time_minutes", labelKey: "snap.fields.watchTimeMinutes" },
];

// The brand-facing report card (Feature 16B) — the polished artifact the
// influencer exports as a PNG and sends over WhatsApp. PRESENTATIONAL: the
// sheet resolves every input (report from the cached list, brand/deal context,
// the app user) and owns the export; this only renders. Renders in the ACTIVE
// locale — the export captures the DOM exactly as shown, which is how Arabic
// shaping / RTL / Hijri dates survive the PNG. Tokens only; the one decorative
// flourish is the accent top bar (a 4px `bg-accent` strip — not a status
// color, the card's brand line).
export function SnapReportCard({ report, appUser, brandName, dealTitle }: Props) {
  const { t } = useTranslation();
  const { locale } = useLocale();

  const isMonthly = report.report_type === SNAP_REPORT_TYPE.MONTHLY;
  const metrics = isMonthly ? MONTHLY_METRICS : POST_METRICS;

  const monthLabel =
    isMonthly && report.report_date
      ? formatMonthYear(report.report_date.slice(0, 7), locale)
      : null;
  const dualDate =
    !isMonthly && report.report_date
      ? formatDualDate(report.report_date, locale)
      : null;

  const contextLine = isMonthly
    ? monthLabel
    : [brandName, dealTitle].filter(Boolean).join(" · ") || null;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
      <div className="h-1 bg-accent" aria-hidden />
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-3">
          {/* noImage: the card is exported to a canvas (PNG) — a cross-origin
              avatar photo would 429 / taint the export. The initial is safe. */}
          <ProfileAvatar appUser={appUser} noImage />
          <div className="min-w-0">
            {appUser?.display_name ? (
              <p className="truncate text-sm font-semibold text-text-primary">
                {appUser.display_name}
              </p>
            ) : null}
            <p className="text-xs text-text-secondary">
              {isMonthly ? t("snap.card.titleMonthly") : t("snap.card.titlePost")}
            </p>
          </div>
        </div>

        {contextLine ? (
          <div>
            <p className="truncate text-lg font-bold text-text-primary">
              {contextLine}
            </p>
            {dualDate ? (
              <p className="text-body text-text-secondary">
                {dualDate.primary}
                <span className="text-text-muted"> · {dualDate.secondary}</span>
              </p>
            ) : null}
          </div>
        ) : dualDate ? (
          <div>
            <p className="text-lg font-bold text-text-primary">{dualDate.primary}</p>
            <p className="text-body text-text-secondary">{dualDate.secondary}</p>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          {metrics.map(({ key, labelKey }) => {
            const value = report[key];
            return (
              <div
                key={key}
                className="rounded-lg border border-border-light bg-surface-secondary p-3"
              >
                <p className="money text-lg font-bold text-text-primary">
                  {value === null ? "—" : formatNumber(value, locale)}
                </p>
                <p className="text-xs text-text-secondary">{t(labelKey)}</p>
              </div>
            );
          })}
        </div>

        <p className="border-t border-border-light pt-3 text-center text-micro text-text-muted">
          {t("snap.card.footer", { app: t("app.name") })}
        </p>
      </div>
    </div>
  );
}
