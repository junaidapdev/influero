import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, Download, ImageOff, Pencil } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { FieldError } from "@/components/ui/FieldError";
import { SnapReportCard } from "@/components/snap/SnapReportCard";
import {
  useSnapSignedUrls,
  useUpdateMonthlySnap,
} from "@/hooks/useSnapReports";
import { useAppUser } from "@/hooks/useAppUser";
import { useToast } from "@/hooks/useToast";
import { useLocale } from "@/hooks/useLocale";
import { useExportCardPng } from "@/hooks/useExportCardPng";
import { logger } from "@/lib/logger";
import { normalizeDigits } from "@/lib/numbers";
import {
  formatSnapChangePct,
  formatSnapMetricValue,
} from "@/features/analytics/snapMetricFormat";
import {
  changePctKey,
  getSurfaceMetrics,
  SNAP_METRIC_UNIT,
  SNAP_PLATFORM,
  SNAP_SCOPE,
  SNAP_SURFACE_LABELS,
  SNAP_SURFACE_ORDER,
  type SnapMetricDef,
  type SnapMetricValues,
  type SnapMonthlyMetrics,
  type SnapSurface,
} from "@shared/analytics/snapMetricDictionary";
import {
  SNAP_EXTRACTION_STATUS,
  type SnapReport,
} from "@shared/types/snapReport.types";

type Props = { report: SnapReport };

const COUNT_PATTERN = /^\d+$/;
const DECIMAL_PATTERN = /^\d+(\.\d+)?$/;

// A field key in the editing/values maps: "<surface>.<metricId>" for a metric
// value, or the literal "period".
function metricKey(surface: SnapSurface, metricId: string): string {
  return `${surface}.${metricId}`;
}

function metricValueString(report: SnapReport, surface: SnapSurface, metricId: string): string {
  const value = report.metrics?.[surface]?.[metricId];
  return typeof value === "number" ? String(value) : "";
}

function allMetricKeys(): string[] {
  const keys: string[] = [];
  for (const surface of SNAP_SURFACE_ORDER) {
    for (const metric of getSurfaceMetrics(
      SNAP_PLATFORM.SNAPCHAT,
      SNAP_SCOPE.MONTHLY,
      surface,
    )) {
      keys.push(metricKey(surface, metric.id));
    }
  }
  return keys;
}

// Parses an input string to a stored value: empty → null, counts → integers,
// time/percent → decimals. Returns ok:false on a malformed entry.
function parseMetricInput(
  raw: string,
  unit: SnapMetricDef["unit"],
): { ok: true; value: number | null } | { ok: false } {
  // Normalize Arabic-Indic / Persian numerals so a value typed on an Arabic
  // keypad parses like Western input (matches snap.schema + the campaign sheet).
  const trimmed = normalizeDigits(raw.trim());
  if (trimmed === "") return { ok: true, value: null };
  const pattern = unit === SNAP_METRIC_UNIT.COUNT ? COUNT_PATTERN : DECIMAL_PATTERN;
  if (!pattern.test(trimmed)) return { ok: false };
  return { ok: true, value: Number(trimmed) };
}

// The monthly report detail (scope='monthly'): per-surface image previews +
// the surface's metrics, each value editable via the pencil pattern (change %
// is display-only), a free-text reporting period, and the curated report-card
// preview + PNG export. The human's edit always wins; saving stamps the row
// 'manual'. No "Linked deal" — a monthly report is account-level, not tied to
// one campaign. Self-contained: owns its mutation + toasts + export.
export function MonthlySnapReportSheet({ report }: Props) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const showToast = useToast();

  const isPending = report.extraction_status === SNAP_EXTRACTION_STATUS.PENDING;
  const isFailed = report.extraction_status === SNAP_EXTRACTION_STATUS.FAILED;
  const isExportable =
    report.extraction_status === SNAP_EXTRACTION_STATUS.EXTRACTED ||
    report.extraction_status === SNAP_EXTRACTION_STATUS.MANUAL;

  // Failed reports open with every field editable — that IS the recovery path.
  const [editing, setEditing] = useState<ReadonlySet<string>>(
    () => new Set(isFailed ? [...allMetricKeys(), "period"] : []),
  );
  const [values, setValues] = useState<Record<string, string>>(() => {
    if (!isFailed) return {};
    const seed: Record<string, string> = { period: report.period_label ?? "" };
    for (const surface of SNAP_SURFACE_ORDER) {
      for (const metric of getSurfaceMetrics(
        SNAP_PLATFORM.SNAPCHAT,
        SNAP_SCOPE.MONTHLY,
        surface,
      )) {
        seed[metricKey(surface, metric.id)] = metricValueString(report, surface, metric.id);
      }
    }
    return seed;
  });
  const [fieldErrors, setFieldErrors] = useState<ReadonlySet<string>>(new Set());

  const cardRef = useRef<HTMLDivElement | null>(null);
  const { isExporting, exportPng } = useExportCardPng();
  const updateMonthly = useUpdateMonthlySnap();
  const appUser = useAppUser();

  const imagePaths = (report.images ?? []).map((image) => image.path);
  const signedUrls = useSnapSignedUrls(imagePaths);

  function startEditing(key: string, seed: string): void {
    setValues((current) => (key in current ? current : { ...current, [key]: seed }));
    setEditing((current) => new Set(current).add(key));
  }

  function setValue(key: string, next: string): void {
    setValues((current) => ({ ...current, [key]: next }));
  }

  function cancelEditing(): void {
    setEditing(new Set());
    setValues({});
    setFieldErrors(new Set());
  }

  function handleSave(): void {
    const nextMetrics: SnapMonthlyMetrics = {};
    const errors = new Set<string>();

    for (const surface of SNAP_SURFACE_ORDER) {
      const base = report.metrics?.[surface];
      const bucket: SnapMetricValues = base ? { ...base } : {};
      for (const metric of getSurfaceMetrics(
        SNAP_PLATFORM.SNAPCHAT,
        SNAP_SCOPE.MONTHLY,
        surface,
      )) {
        const key = metricKey(surface, metric.id);
        if (!editing.has(key)) continue;
        const parsed = parseMetricInput(values[key] ?? "", metric.unit);
        if (!parsed.ok) {
          errors.add(key);
          continue;
        }
        if (parsed.value === null) {
          delete bucket[metric.id];
          delete bucket[changePctKey(metric.id)];
        } else {
          bucket[metric.id] = parsed.value;
        }
      }
      if (Object.keys(bucket).length > 0) nextMetrics[surface] = bucket;
    }

    if (errors.size > 0) {
      setFieldErrors(errors);
      return;
    }

    const periodLabel = editing.has("period")
      ? (values.period ?? "")
      : (report.period_label ?? "");

    updateMonthly.mutate(
      { reportId: report.id, metrics: nextMetrics, periodLabel },
      {
        onSuccess: () => {
          showToast("snap.toast.saved", "success");
          cancelEditing();
        },
        onError: (error) => {
          logger.error("MonthlySnapReportSheet.save", error);
          showToast("snap.toast.saveError", "error");
        },
      },
    );
  }

  function handleExport(): void {
    const filename = `snap-monthly-report-${report.period_label?.trim().replace(/\s+/g, "-") || report.id.slice(0, 8)}.png`;
    void exportPng(cardRef.current, filename);
  }

  const periodEditing = editing.has("period");

  return (
    <div className="flex flex-col gap-4">
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

      {/* Reporting period */}
      <div>
        {periodEditing ? (
          <>
            <Label htmlFor="snap-period-edit">{t("snap.monthly.periodLabel")}</Label>
            <Input
              id="snap-period-edit"
              value={values.period ?? ""}
              onChange={(event) => setValue("period", event.target.value)}
              placeholder={t("snap.monthly.periodPlaceholder")}
            />
          </>
        ) : (
          <div className="flex min-h-11 items-center justify-between gap-3">
            <span className="text-body font-medium text-text-secondary">
              {t("snap.monthly.periodLabel")}
            </span>
            <span className="flex items-center gap-1">
              <span className="text-sm font-semibold text-text-primary">
                {report.period_label?.trim() || "—"}
              </span>
              <button
                type="button"
                disabled={isPending}
                onClick={() => startEditing("period", report.period_label ?? "")}
                aria-label={t("snap.detail.editAria", { field: t("snap.monthly.periodLabel") })}
                className="grid size-11 place-items-center rounded-md text-text-muted transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-60"
              >
                <Pencil className="size-4" aria-hidden />
              </button>
            </span>
          </div>
        )}
      </div>

      {/* Per-surface previews + metrics */}
      {SNAP_SURFACE_ORDER.map((surface) => {
        const metrics = getSurfaceMetrics(
          SNAP_PLATFORM.SNAPCHAT,
          SNAP_SCOPE.MONTHLY,
          surface,
        );
        const surfaceImages = (report.images ?? []).filter(
          (image) => image.surface === surface,
        );
        return (
          <section key={surface} className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-text-primary">
              {SNAP_SURFACE_LABELS[surface][locale]}
            </h3>

            {surfaceImages.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {surfaceImages.map((image) => {
                  const url = signedUrls.data?.[image.path];
                  return url ? (
                    <img
                      key={image.path}
                      src={url}
                      alt={t("snap.monthly.previewAlt", {
                        surface: SNAP_SURFACE_LABELS[surface][locale],
                      })}
                      className="size-16 rounded-md border border-border-light object-cover"
                    />
                  ) : signedUrls.isError ? (
                    <div
                      key={image.path}
                      className="grid size-16 place-items-center rounded-md border border-border bg-surface-secondary text-text-muted"
                      role="img"
                      aria-label={t("snap.detail.previewError")}
                    >
                      <ImageOff className="size-5" aria-hidden />
                    </div>
                  ) : (
                    <div
                      key={image.path}
                      className="size-16 animate-pulse rounded-md bg-border motion-reduce:animate-none"
                      role="status"
                      aria-busy="true"
                    />
                  );
                })}
              </div>
            ) : null}

            <div className="flex flex-col">
              {metrics.map((metric) => {
                const key = metricKey(surface, metric.id);
                const rawValue = report.metrics?.[surface]?.[metric.id];
                const changeValue = metric.hasChangePct
                  ? report.metrics?.[surface]?.[changePctKey(metric.id)]
                  : undefined;
                return (
                  <div key={metric.id} className="border-b border-border-light last:border-b-0">
                    {editing.has(key) ? (
                      <div className="py-2">
                        <Label htmlFor={`snap-${key}`}>{metric.label[locale]}</Label>
                        <Input
                          id={`snap-${key}`}
                          inputMode="decimal"
                          dir="ltr"
                          hasError={fieldErrors.has(key)}
                          value={values[key] ?? ""}
                          onChange={(event) => setValue(key, event.target.value)}
                        />
                        <FieldError
                          message={
                            fieldErrors.has(key)
                              ? t(
                                  metric.unit === SNAP_METRIC_UNIT.COUNT
                                    ? "snap.errors.countInvalid"
                                    : "snap.errors.valueInvalid",
                                )
                              : undefined
                          }
                        />
                      </div>
                    ) : (
                      <div className="flex min-h-11 items-center justify-between gap-3">
                        <span className="text-body font-medium text-text-secondary">
                          {metric.label[locale]}
                        </span>
                        <span className="flex items-center gap-2">
                          {typeof changeValue === "number" ? (
                            <ChangeBadge value={changeValue} />
                          ) : null}
                          <span className="money text-sm font-semibold text-text-primary">
                            {typeof rawValue === "number"
                              ? formatSnapMetricValue(rawValue, metric.unit, locale)
                              : "—"}
                          </span>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() =>
                              startEditing(key, metricValueString(report, surface, metric.id))
                            }
                            aria-label={t("snap.detail.editAria", {
                              field: metric.label[locale],
                            })}
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
            </div>
          </section>
        );
      })}

      {editing.size > 0 ? (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            className="flex-1"
            onClick={handleSave}
            isLoading={updateMonthly.isPending}
          >
            {t("snap.actions.save")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="flex-1"
            onClick={cancelEditing}
            disabled={updateMonthly.isPending}
          >
            {t("snap.actions.cancel")}
          </Button>
        </div>
      ) : null}

      {isExportable ? (
        <div className="flex flex-col gap-3">
          <h3 className="text-body font-medium text-text-secondary">
            {t("snap.card.previewHeading")}
          </h3>
          <div ref={cardRef} className="bg-surface-secondary p-4">
            <SnapReportCard report={report} appUser={appUser.data} />
          </div>
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={handleExport}
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

// The "vs Previous 28 Days" pill — green up / red down, tabular figures.
function ChangeBadge({ value }: { value: number }) {
  const { locale } = useLocale();
  const tone =
    value > 0 ? "text-success" : value < 0 ? "text-error-foreground" : "text-text-muted";
  return (
    <span className={`money text-xs font-semibold ${tone}`}>
      {formatSnapChangePct(value, locale)}
    </span>
  );
}
