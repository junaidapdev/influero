import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { AlertCircle, Download, Pencil } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { FieldError } from "@/components/ui/FieldError";
import { SnapReportCard } from "@/components/snap/SnapReportCard";
import {
  useLinkSnapToDeal,
  useSnapSignedUrl,
  useUpdateSnapFields,
} from "@/hooks/useSnapReports";
import { useAppUser } from "@/hooks/useAppUser";
import { useBrands } from "@/hooks/useBrands";
import { useToast } from "@/hooks/useToast";
import { useLocale } from "@/hooks/useLocale";
import { useExportCardPng } from "@/hooks/useExportCardPng";
import { formatDualDate, formatMonthYear } from "@/lib/date";
import { formatNumber } from "@/lib/numbers";
import { logger } from "@/lib/logger";
import { localizedBrandName } from "@/features/brands/brandName";
import {
  snapReportSchema,
  type SnapReportFormInput,
} from "@/features/snap/snap.schema";
import type { Deal } from "@shared/types/deal.types";
import {
  SNAP_EXTRACTION_STATUS,
  SNAP_REPORT_TYPE,
  type SnapReport,
} from "@shared/types/snapReport.types";

type Props = {
  report: SnapReport;
  // Non-cancelled deals for the link select — the parent filters (a report may
  // legitimately link to a paid deal; only cancelled is dead).
  deals: Deal[];
};

type CountFieldName = Extract<
  keyof SnapReportFormInput,
  | "views"
  | "reach"
  | "storyViews"
  | "screenshotCount"
  | "swipeUps"
  | "profileViews"
  | "newFollowers"
  | "watchTimeMinutes"
>;

// The editable field set per report type (16B): a post report carries the
// original five, a monthly report the account six. The shared three render in
// both; the type-specific ones only where they mean something.
const POST_COUNT_FIELDS: { name: CountFieldName; labelKey: string }[] = [
  { name: "views", labelKey: "snap.fields.views" },
  { name: "reach", labelKey: "snap.fields.reach" },
  { name: "storyViews", labelKey: "snap.fields.storyViews" },
  { name: "screenshotCount", labelKey: "snap.fields.screenshotCount" },
  { name: "swipeUps", labelKey: "snap.fields.swipeUps" },
];

const MONTHLY_COUNT_FIELDS: { name: CountFieldName; labelKey: string }[] = [
  { name: "views", labelKey: "snap.fields.views" },
  { name: "reach", labelKey: "snap.fields.reach" },
  { name: "storyViews", labelKey: "snap.fields.storyViews" },
  { name: "profileViews", labelKey: "snap.fields.profileViews" },
  { name: "newFollowers", labelKey: "snap.fields.newFollowers" },
  { name: "watchTimeMinutes", labelKey: "snap.fields.watchTimeMinutes" },
];

type EditableField = CountFieldName | "reportDate";

function toFormValues(report: SnapReport): SnapReportFormInput {
  const toField = (value: number | null): string =>
    value === null ? "" : String(value);
  return {
    views: toField(report.views),
    reach: toField(report.reach),
    storyViews: toField(report.story_views),
    screenshotCount: toField(report.screenshot_count),
    swipeUps: toField(report.swipe_ups),
    profileViews: toField(report.profile_views),
    newFollowers: toField(report.new_followers),
    watchTimeMinutes: toField(report.watch_time_minutes),
    reportDate: report.report_date ?? "",
    dealId: report.deal_id ?? "",
  };
}

// The detail body hosted in the route's BottomSheet: source-image preview
// (signed URL — the bucket is private), the type's fields each with an edit
// pencil (the manual override; saving stamps the row 'manual'), the failed →
// enter-manually path (all fields start editable), the link-to-deal select
// (post reports only — monthly is account-level), and the brand-facing
// report-card preview + PNG export once numbers exist (16B). Self-contained
// (the TodayPanel pattern): owns its mutations + toasts. The parent re-derives
// `report` from the cached list, so a realtime settle while the sheet is open
// refreshes the values live.
export function SnapReportSheet({ report, deals }: Props) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const showToast = useToast();

  const isMonthly = report.report_type === SNAP_REPORT_TYPE.MONTHLY;
  const countFields = isMonthly ? MONTHLY_COUNT_FIELDS : POST_COUNT_FIELDS;

  const isPending = report.extraction_status === SNAP_EXTRACTION_STATUS.PENDING;
  const isFailed = report.extraction_status === SNAP_EXTRACTION_STATUS.FAILED;
  // The card is worth exporting once numbers exist — extracted or manual.
  const isExportable =
    report.extraction_status === SNAP_EXTRACTION_STATUS.EXTRACTED ||
    report.extraction_status === SNAP_EXTRACTION_STATUS.MANUAL;

  // Failed reports open straight into manual entry — that IS the recovery path.
  const [editing, setEditing] = useState<ReadonlySet<EditableField>>(
    () =>
      new Set<EditableField>(
        isFailed ? [...countFields.map((field) => field.name), "reportDate"] : [],
      ),
  );
  const cardRef = useRef<HTMLDivElement | null>(null);

  const { isExporting, exportPng } = useExportCardPng();
  const updateFields = useUpdateSnapFields();
  const linkToDeal = useLinkSnapToDeal();
  const signedUrl = useSnapSignedUrl(report.source_file_url);
  const appUser = useAppUser();
  const brands = useBrands();

  // The card's post-report context — resolved from the already-cached lists
  // (no new queries beyond the app-wide brands cache).
  const linkedDeal = report.deal_id
    ? (deals.find((deal) => deal.id === report.deal_id) ?? null)
    : null;
  const linkedBrand = linkedDeal
    ? ((brands.data ?? []).find((brand) => brand.id === linkedDeal.brand_id) ?? null)
    : null;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SnapReportFormInput>({
    resolver: zodResolver(snapReportSchema),
    values: toFormValues(report),
    resetOptions: { keepDirtyValues: true },
  });

  function startEditing(field: EditableField): void {
    setEditing((current) => new Set(current).add(field));
  }

  function stopEditingAll(): void {
    setEditing(new Set());
    reset(toFormValues(report));
  }

  function handleSave(data: SnapReportFormInput): void {
    updateFields.mutate(
      { reportId: report.id, input: data },
      {
        onSuccess: () => {
          showToast("snap.toast.saved", "success");
          setEditing(new Set());
        },
        onError: (error) => {
          logger.error("SnapReportSheet.save", error);
          showToast("snap.toast.saveError", "error");
        },
      },
    );
  }

  function handleLinkChange(dealId: string): void {
    linkToDeal.mutate(
      { reportId: report.id, dealId: dealId === "" ? null : dealId },
      {
        onSuccess: () => {
          showToast("snap.toast.linked", "success");
        },
        onError: (error) => {
          logger.error("SnapReportSheet.link", error);
          showToast("snap.toast.linkError", "error");
        },
      },
    );
  }

  // PNG export (16B) via the shared useExportCardPng (lazy html-to-image,
  // captures the card DOM as rendered so Arabic shaping / RTL / Hijri survive).
  function handleExport(): void {
    const filename = isMonthly
      ? `snap-monthly-report-${report.report_date?.slice(0, 7) ?? report.id.slice(0, 8)}.png`
      : `snap-report-${report.report_date ?? report.id.slice(0, 8)}.png`;
    void exportPng(cardRef.current, filename);
  }

  const monthLabel =
    isMonthly && report.report_date
      ? formatMonthYear(report.report_date.slice(0, 7), locale)
      : null;
  const dualDate =
    !isMonthly && report.report_date
      ? formatDualDate(report.report_date, locale)
      : null;
  const dateLabelKey = isMonthly ? "snap.fields.month" : "snap.fields.reportDate";

  const countValues: Record<CountFieldName, number | null> = {
    views: report.views,
    reach: report.reach,
    storyViews: report.story_views,
    screenshotCount: report.screenshot_count,
    swipeUps: report.swipe_ups,
    profileViews: report.profile_views,
    newFollowers: report.new_followers,
    watchTimeMinutes: report.watch_time_minutes,
  };

  return (
    <div className="flex flex-col gap-4">
      {signedUrl.data ? (
        <img
          src={signedUrl.data}
          alt={t("snap.detail.imageAlt")}
          className="max-h-64 w-full rounded-lg border border-border object-contain"
        />
      ) : signedUrl.isLoading ? (
        <div
          className="h-40 animate-pulse rounded-lg bg-border motion-reduce:animate-none"
          role="status"
          aria-busy="true"
        />
      ) : signedUrl.isError ? (
        <div className="flex h-40 items-center justify-center rounded-lg border border-border bg-surface-secondary p-3 text-center text-sm text-text-secondary">
          {t("snap.detail.previewError")}
        </div>
      ) : null}

      {isFailed ? (
        <div className="flex items-start gap-2 rounded-md bg-error-light p-3 text-sm text-error-foreground">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t("snap.detail.failedNotice")}
        </div>
      ) : null}

      {isPending ? (
        <p className="animate-pulse text-sm text-text-secondary motion-reduce:animate-none">
          {t("snap.detail.extracting")}
        </p>
      ) : null}

      <form
        onSubmit={handleSubmit(handleSave)}
        noValidate
        className="flex flex-col gap-3"
      >
        {countFields.map(({ name, labelKey }) => {
          const value = countValues[name];
          const fieldError = errors[name];

          return (
            <div key={name}>
              {editing.has(name) ? (
                <>
                  <Label htmlFor={`snap-${name}`}>{t(labelKey)}</Label>
                  <Input
                    id={`snap-${name}`}
                    inputMode="numeric"
                    dir="ltr"
                    hasError={Boolean(fieldError)}
                    {...register(name)}
                  />
                  <FieldError
                    message={fieldError?.message ? t(fieldError.message) : undefined}
                  />
                </>
              ) : (
                <div className="flex min-h-11 items-center justify-between gap-3">
                  <span className="text-body font-medium text-text-secondary">
                    {t(labelKey)}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="money text-sm font-semibold text-text-primary">
                      {value === null ? "—" : formatNumber(value, locale)}
                    </span>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => startEditing(name)}
                      aria-label={t("snap.detail.editAria", { field: t(labelKey) })}
                      className="grid size-11 place-items-center rounded-md text-text-muted transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-60"
                    >
                      <Pencil className="size-4" aria-hidden />
                    </button>
                  </span>
                </div>
              )}
            </div>
          );
        })}

        <div>
          {editing.has("reportDate") ? (
            <>
              <Label htmlFor="snap-reportDate">{t(dateLabelKey)}</Label>
              <Input
                id="snap-reportDate"
                type="date"
                dir="ltr"
                hasError={Boolean(errors.reportDate)}
                {...register("reportDate")}
              />
              <FieldError
                message={
                  errors.reportDate?.message ? t(errors.reportDate.message) : undefined
                }
              />
            </>
          ) : (
            <div className="flex min-h-11 items-center justify-between gap-3">
              <span className="text-body font-medium text-text-secondary">
                {t(dateLabelKey)}
              </span>
              <span className="flex items-center gap-1">
                <span className="text-end">
                  <span className="block text-sm font-semibold text-text-primary">
                    {monthLabel ?? (dualDate ? dualDate.primary : "—")}
                  </span>
                  {dualDate ? (
                    <span className="block text-xs text-text-muted">
                      {dualDate.secondary}
                    </span>
                  ) : null}
                </span>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => startEditing("reportDate")}
                  aria-label={t("snap.detail.editAria", {
                    field: t(dateLabelKey),
                  })}
                  className="grid size-11 place-items-center rounded-md text-text-muted transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-60"
                >
                  <Pencil className="size-4" aria-hidden />
                </button>
              </span>
            </div>
          )}
        </div>

        {editing.size > 0 ? (
          <div className="flex items-center gap-2">
            <Button
              type="submit"
              className="flex-1"
              isLoading={updateFields.isPending}
            >
              {t("snap.actions.save")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              onClick={stopEditingAll}
              disabled={updateFields.isPending}
            >
              {t("snap.actions.cancel")}
            </Button>
          </div>
        ) : null}
      </form>

      {isMonthly ? null : (
        <div>
          <Label htmlFor="snap-dealId">{t("snap.detail.linkToDeal")}</Label>
          <Select
            id="snap-dealId"
            value={report.deal_id ?? ""}
            disabled={linkToDeal.isPending}
            onChange={(event) => handleLinkChange(event.target.value)}
          >
            <option value="">{t("snap.detail.notLinked")}</option>
            {deals.map((deal) => (
              <option key={deal.id} value={deal.id}>
                {deal.title}
              </option>
            ))}
          </Select>
        </div>
      )}

      {isExportable ? (
        <div className="flex flex-col gap-3">
          <h3 className="text-body font-medium text-text-secondary">
            {t("snap.card.previewHeading")}
          </h3>
          {/* The capture node — the wrapper's background becomes the PNG's
              margin, so the exported card never has transparent corners. */}
          <div ref={cardRef} className="bg-surface-secondary p-4">
            <SnapReportCard
              report={report}
              appUser={appUser.data}
              brandName={
                linkedBrand ? localizedBrandName(linkedBrand, locale) : null
              }
              dealTitle={linkedDeal?.title ?? null}
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => {
              void handleExport();
            }}
            isLoading={isExporting}
          >
            <Download className="size-4" aria-hidden />
            {t("snap.actions.export")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
