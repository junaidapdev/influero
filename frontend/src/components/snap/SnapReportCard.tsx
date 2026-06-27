import { useTranslation } from "react-i18next";
import {
  ArrowDownRight,
  ArrowUpRight,
  Camera,
  Clock,
  Eye,
  Heart,
  MessageCircle,
  Minus,
  MousePointerClick,
  Smartphone,
  Sparkle,
  Sparkles,
  UserPlus,
  Users,
  UsersRound,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { ProfileAvatar } from "@/components/layout/ProfileAvatar";
import { useLocale } from "@/hooks/useLocale";
import type { Locale } from "@/constants/locale";
import { formatDualDate, formatMonthYear } from "@/lib/date";
import { formatNumber } from "@/lib/numbers";
import {
  formatSnapChangeMagnitude,
  formatSnapMetricValue,
} from "@/features/analytics/snapMetricFormat";
import type { AppUser } from "@shared/types/appUser.types";
import {
  changePctKey,
  getMonthlyMetricDef,
  SNAP_CAMPAIGN_HEADLINES,
  SNAP_METRIC_UNIT,
  SNAP_MONTHLY_HEADLINES,
  SNAP_SCOPE,
  type SnapHeadline,
  type SnapMetricUnit,
} from "@shared/analytics/snapMetricDictionary";
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

// Each tile leads with a glyph in a soft-yellow circle. The icon belongs to the
// VIEW (no React in the framework-agnostic dictionary), keyed by the same stable
// identity the dictionary exposes. Sparkles is the safe fallback for any future
// metric that lands here before it gets its own glyph.
const MONTHLY_HEADLINE_ICONS: Record<string, LucideIcon> = {
  "profile.followers": Users,
  "profile.profile_views": Eye,
  "public_stories.snap_views": Smartphone,
  "public_stories.viewers": UsersRound,
  "spotlight.views": Sparkles,
  "spotlight.viewers": UsersRound,
  "spotlight.sum": Heart,
};

const CAMPAIGN_HEADLINE_ICONS: Record<string, LucideIcon> = {
  reach: Users,
  clicks: MousePointerClick,
  screenshots: Camera,
  views_peak: Eye,
  replies: MessageCircle,
};

const LEGACY_METRIC_ICONS: Record<MetricKey, LucideIcon> = {
  views: Eye,
  reach: Users,
  story_views: Smartphone,
  screenshot_count: Camera,
  swipe_ups: ArrowUpRight,
  profile_views: Eye,
  new_followers: UserPlus,
  watch_time_minutes: Clock,
};

// The stable per-headline icon key — matches MONTHLY_HEADLINE_ICONS above.
function headlineKey(headline: SnapHeadline): string {
  return headline.kind === "metric"
    ? `${headline.surface}.${headline.metricId}`
    : `${headline.surface}.sum`;
}

// Resolves one curated headline (Engagement is a sum of Spotlight favourites +
// shares; the rest a single metric) to its value, unit, and growth %.
function headlineCell(
  report: SnapReport,
  headline: SnapHeadline,
): { value: number | null; unit: SnapMetricUnit; changePct: number | null } {
  const surfaceValues = report.metrics?.[headline.surface] ?? {};
  if (headline.kind === "sum") {
    let sum = 0;
    let any = false;
    for (const metricId of headline.metricIds) {
      const part = surfaceValues[metricId];
      if (typeof part === "number") {
        sum += part;
        any = true;
      }
    }
    return { value: any ? sum : null, unit: SNAP_METRIC_UNIT.COUNT, changePct: null };
  }
  const value = surfaceValues[headline.metricId];
  const change = surfaceValues[changePctKey(headline.metricId)];
  return {
    value: typeof value === "number" ? value : null,
    unit: getMonthlyMetricDef(headline.surface, headline.metricId)?.unit ?? SNAP_METRIC_UNIT.COUNT,
    changePct: typeof change === "number" ? change : null,
  };
}

// The brand-facing report card (Feature 16B; monthly rebuilt 0023; Snapchat-
// branded redesign) — the polished artifact the influencer exports as a PNG and
// sends over WhatsApp. PRESENTATIONAL: the sheet resolves every input (report
// from the cached list, brand/deal context, the app user) and owns the export;
// this only renders. Renders in the ACTIVE locale — the export captures the DOM
// exactly as shown, which is how Arabic shaping / RTL / Hijri dates survive the
// PNG. Tokens only; the Snapchat yellow + the card's top→white gradient are the
// app's only yellow and only non-hero gradient, scoped to this one artifact.
export function SnapReportCard({ report, appUser, brandName, dealTitle }: Props) {
  const { t } = useTranslation();
  const { locale } = useLocale();

  // 24-hour campaign (0024) — a fused headline read from metrics.computed.
  const isCampaign = report.scope === SNAP_SCOPE.CAMPAIGN_24H;
  // The new metric-dictionary monthly model — a CURATED headline set read from
  // the metrics jsonb (the full set stays in `metrics`, off the card).
  const isNewMonthly = report.scope === SNAP_SCOPE.MONTHLY;
  // Legacy fixed-column monthly (pre-0023 rows) still render their old grid.
  const isLegacyMonthly =
    !isNewMonthly && !isCampaign && report.report_type === SNAP_REPORT_TYPE.MONTHLY;
  const legacyMetrics = isLegacyMonthly ? MONTHLY_METRICS : POST_METRICS;

  const computed = report.metrics?.computed;
  const frameCount = computed?.frame_count ?? 0;

  const monthLabel =
    isLegacyMonthly && report.report_date
      ? formatMonthYear(report.report_date.slice(0, 7), locale)
      : null;
  // Campaign + post both show the snap date as a dual Hijri/Gregorian line.
  const dualDate =
    !isNewMonthly && !isLegacyMonthly && report.report_date
      ? formatDualDate(report.report_date, locale)
      : null;

  const cardTitle = isCampaign
    ? t("snap.card.titleCampaign")
    : isNewMonthly || isLegacyMonthly
      ? t("snap.card.titleMonthly")
      : t("snap.card.titlePost");

  // The headline block under the identity row. Monthly leads with its reporting
  // period over the fixed "vs Previous 28 Days" caption; campaign/post lead with
  // the brand · deal context over the dual Hijri/Gregorian snap date.
  const brandDealLine = [brandName, dealTitle].filter(Boolean).join(" · ") || null;
  let primaryLine: string | null = null;
  let secondaryLine: string | null = null;
  if (isNewMonthly) {
    primaryLine = report.period_label?.trim() || null;
    secondaryLine = primaryLine ? t("snap.card.vsPrevious") : null;
  } else if (isLegacyMonthly) {
    primaryLine = monthLabel;
  } else if (brandDealLine) {
    primaryLine = brandDealLine;
    secondaryLine = dualDate ? `${dualDate.primary} · ${dualDate.secondary}` : null;
  } else if (dualDate) {
    primaryLine = dualDate.primary;
    secondaryLine = dualDate.secondary;
  }

  const tiles = isCampaign
    ? SNAP_CAMPAIGN_HEADLINES.map((headline, index) => {
        const value = computed?.[headline.computedKey];
        // views_peak is a single-frame MAX — flag it as the highest frame and
        // note the spread when more than one frame was caught.
        const showAcross = Boolean(headline.isPeak) && frameCount > 1;
        return (
          <MetricTile
            key={headline.computedKey}
            icon={CAMPAIGN_HEADLINE_ICONS[headline.computedKey] ?? Sparkles}
            value={typeof value === "number" ? formatNumber(value, locale) : "—"}
            label={`${headline.label[locale]}${showAcross ? ` · ${t("snap.campaign.highestFrame")}` : ""}`}
            note={
              showAcross
                ? t("snap.campaign.acrossFrames", {
                    count: frameCount,
                    n: formatNumber(frameCount, locale),
                  })
                : null
            }
            locale={locale}
            full={isLastOdd(index, SNAP_CAMPAIGN_HEADLINES.length)}
          />
        );
      })
    : isNewMonthly
      ? SNAP_MONTHLY_HEADLINES.map((headline) => {
          const cell = headlineCell(report, headline);
          const key = headlineKey(headline);
          return (
            <MetricTile
              key={key}
              icon={MONTHLY_HEADLINE_ICONS[key] ?? Sparkles}
              value={
                cell.value === null
                  ? "—"
                  : formatSnapMetricValue(cell.value, cell.unit, locale)
              }
              label={headline.label[locale]}
              changePct={cell.changePct}
              locale={locale}
              // Engagement (the sum headline) spans the full width as the closer.
              full={headline.kind === "sum"}
            />
          );
        })
      : legacyMetrics.map(({ key, labelKey }, index) => {
          const value = report[key];
          return (
            <MetricTile
              key={key}
              icon={LEGACY_METRIC_ICONS[key] ?? Sparkles}
              value={value === null ? "—" : formatNumber(value, locale)}
              label={t(labelKey)}
              locale={locale}
              full={isLastOdd(index, legacyMetrics.length)}
            />
          );
        });

  // Footer: "Generated with Inflero" with the brand name emphasized. Splitting
  // the translated string on the app name keeps the bold scoped to the brand in
  // both en ("…with **Inflero**") and ar ("…بواسطة **Inflero**").
  const appName = t("app.name");
  const footer = t("snap.card.footer", { app: appName });
  const appAt = footer.indexOf(appName);

  return (
    <div
      className="relative isolate overflow-hidden rounded-3xl"
      style={{
        background:
          "linear-gradient(180deg, var(--color-snap-frame-from) 0, var(--color-snap-frame-via) 96px, var(--color-surface) 210px)",
        boxShadow: "var(--shadow-snap)",
      }}
    >
      {/* Decorative Snapchat-yellow sparkles in the header zone. */}
      <Sparkle
        className="pointer-events-none absolute end-24 top-7 size-5 text-snap-yellow"
        aria-hidden
      />
      <Sparkle
        className="pointer-events-none absolute end-16 top-16 size-3 text-snap-yellow"
        aria-hidden
      />

      <div className="flex flex-col gap-5 p-5">
        {/* Identity row. noImage: the card is exported to a canvas (PNG) — a
            cross-origin avatar photo would 429 / taint the export. */}
        <div className="flex items-center gap-3">
          <ProfileAvatar appUser={appUser} noImage tone="snap" size="2xl" />
          <div className="min-w-0 flex-1">
            {appUser?.display_name ? (
              <p className="truncate text-base font-bold text-text-primary">
                {appUser.display_name}
              </p>
            ) : null}
            <p className="text-caption font-semibold uppercase tracking-widest text-text-secondary">
              {cardTitle}
            </p>
          </div>
          <SnapchatGhost className="size-9 shrink-0 text-snap-ink" />
        </div>

        {primaryLine ? (
          <div className="min-w-0">
            <p className="truncate text-2xl font-bold leading-tight text-text-primary">
              {primaryLine}
            </p>
            {secondaryLine ? (
              <p className="text-body text-text-secondary">{secondaryLine}</p>
            ) : null}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">{tiles}</div>

        <div className="flex items-center justify-center gap-1.5 border-t border-border-light pt-4">
          <Zap className="size-3.5 fill-snap-yellow text-snap-yellow" aria-hidden />
          <p className="text-caption text-text-secondary">
            {appAt >= 0 ? (
              <>
                {footer.slice(0, appAt)}
                <span className="font-bold text-text-primary">{appName}</span>
                {footer.slice(appAt + appName.length)}
              </>
            ) : (
              footer
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

// A metric tile: glyph in a soft-yellow circle, the value, its label, and an
// optional "vs Previous 28 Days" change pill (direction by arrow + color).
function MetricTile({
  icon: Icon,
  value,
  label,
  note,
  changePct,
  locale,
  full,
}: {
  icon: LucideIcon;
  value: string;
  label: string;
  note?: string | null;
  changePct?: number | null;
  locale: Locale;
  full?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-2.5 rounded-2xl border border-border-light bg-surface p-4 shadow-card ${
        full ? "col-span-2" : ""
      }`}
    >
      {/* Icon + (optional) change pill share the top row; the value below always
          gets the tile's full width, so big numbers never truncate. */}
      <div className="flex items-start justify-between gap-2">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-snap-yellow-soft text-snap-ink">
          <Icon className="size-5" aria-hidden />
        </span>
        {typeof changePct === "number" ? (
          <ChangePill value={changePct} locale={locale} />
        ) : null}
      </div>
      <div className="min-w-0">
        <p className="money truncate text-xl font-bold leading-tight text-text-primary">
          {value}
        </p>
        <p className="truncate text-body text-text-secondary">{label}</p>
        {note ? <p className="truncate text-micro text-text-muted">{note}</p> : null}
      </div>
    </div>
  );
}

// The "vs Previous 28 Days" pill — up (green) / down (red) / flat (muted),
// direction shown by the arrow + color. Magnitude is unsigned (no +/−), tabular
// figures; an aria-label announces the direction since the arrow is decorative
// and the magnitude alone ("6.7%") would read direction-less to a screen reader.
function ChangePill({ value, locale }: { value: number; locale: Locale }) {
  const { t } = useTranslation();
  const magnitude = formatSnapChangeMagnitude(value, locale);
  const direction = value > 0 ? "up" : value < 0 ? "down" : "flat";
  const Arrow =
    direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus;
  const toneClass =
    direction === "up"
      ? "bg-success-light text-success-foreground"
      : direction === "down"
        ? "bg-error-light text-error-foreground"
        : "bg-surface-secondary text-text-muted";
  const ariaLabel = t(
    direction === "up"
      ? "snap.card.changeUp"
      : direction === "down"
        ? "snap.card.changeDown"
        : "snap.card.changeFlat",
    { value: magnitude },
  );
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-caption font-semibold ${toneClass}`}
      aria-label={ariaLabel}
    >
      <Arrow className="size-3.5" aria-hidden />
      <span className="money" aria-hidden>
        {magnitude}
      </span>
    </span>
  );
}

// The Snapchat ghost mark (top-right of the card) — it's a Snapchat performance
// report, so the platform's own glyph reads correctly. Single-path silhouette.
function SnapchatGhost({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" role="img" aria-hidden>
      <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509 0 .075-.015.149-.045.225-.24.569-1.273.988-3.146 1.271-.059.091-.12.375-.165.57-.045.179-.09.36-.15.553-.073.299-.252.388-.404.388-.04 0-.075-.005-.106-.014-.359-.069-.764-.234-1.318-.234-.135 0-.27.014-.404.029-.659.105-1.273.554-1.918 1.034-.96.704-2.04 1.498-3.61 1.498-.062 0-.121-.002-.179-.007-.06.005-.121.007-.182.007-1.57 0-2.65-.794-3.61-1.498-.645-.48-1.259-.93-1.918-1.034-.135-.015-.27-.029-.404-.029-.554 0-.959.165-1.318.234-.031.009-.066.014-.106.014-.152 0-.331-.089-.404-.388-.06-.193-.105-.374-.15-.553-.045-.195-.106-.479-.165-.57-1.873-.283-2.906-.702-3.146-1.271-.03-.076-.045-.15-.045-.225-.015-.239.165-.465.42-.509 3.265-.539 4.731-3.878 4.791-4.014l.015-.015c.181-.344.21-.644.12-.868-.194-.45-.883-.675-1.333-.81-.135-.044-.255-.09-.344-.119-.823-.329-1.228-.719-1.213-1.168 0-.359.284-.689.734-.838.15-.061.327-.09.509-.09.12 0 .299.016.464.104.374.181.733.285 1.033.301.198 0 .326-.045.401-.09-.008-.165-.018-.33-.03-.51l-.003-.06c-.104-1.628-.23-3.654.299-4.847C7.859 1.069 11.216.793 12.206.793z" />
    </svg>
  );
}

// True for the last tile of an odd-length grid — it spans both columns so the
// row never leaves a lonely gap.
function isLastOdd(index: number, length: number): boolean {
  return index === length - 1 && length % 2 === 1;
}
