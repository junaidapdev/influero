import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, Download, ImageOff, Pencil } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { FieldError } from "@/components/ui/FieldError";
import { SnapReportCard } from "@/components/snap/SnapReportCard";
import {
  useLinkSnapToDeal,
  useSnapSignedUrls,
  useUpdateCampaignSnap,
} from "@/hooks/useSnapReports";
import { useAppUser } from "@/hooks/useAppUser";
import { useBrands } from "@/hooks/useBrands";
import { useToast } from "@/hooks/useToast";
import { useLocale } from "@/hooks/useLocale";
import { useExportCardPng } from "@/hooks/useExportCardPng";
import { formatDualDate } from "@/lib/date";
import { formatNumber } from "@/lib/numbers";
import { logger } from "@/lib/logger";
import { localizedBrandName } from "@/features/brands/brandName";
import {
  getSurfaceMetrics,
  SNAP_PLATFORM,
  SNAP_SCOPE,
  SNAP_SURFACE,
  type SnapFrameValues,
} from "@shared/analytics/snapMetricDictionary";
import type { Deal } from "@shared/types/deal.types";
import {
  SNAP_EXTRACTION_STATUS,
  type SnapReport,
} from "@shared/types/snapReport.types";

type Props = {
  report: SnapReport;
  // Non-cancelled deals — the required linked-deal select (a campaign is always
  // tied to one). The parent filters.
  deals: Deal[];
};

const COUNT_PATTERN = /^\d+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const FRAME_METRICS = getSurfaceMetrics(
  SNAP_PLATFORM.SNAPCHAT,
  SNAP_SCOPE.CAMPAIGN_24H,
  SNAP_SURFACE.STORY_FRAME,
);

// A field key in the editing/values maps: "<frameIndex>.<metricId>".
function frameKey(index: number, metricId: string): string {
  return `${index}.${metricId}`;
}

// Counts only on a frame — empty → null, digits → integer, else malformed.
function parseCount(raw: string): { ok: true; value: number | null } | { ok: false } {
  const trimmed = raw.trim();
  if (trimmed === "") return { ok: true, value: null };
  if (!COUNT_PATTERN.test(trimmed)) return { ok: false };
  return { ok: true, value: Number(trimmed) };
}

// The snap date — empty → null, YYYY-MM-DD → kept, else malformed.
function parseDateInput(raw: string): { ok: true; value: string | null } | { ok: false } {
  const trimmed = raw.trim();
  if (trimmed === "") return { ok: true, value: null };
  if (!DATE_PATTERN.test(trimmed)) return { ok: false };
  return { ok: true, value: trimmed };
}

// The campaign report detail (scope='campaign_24h'): the linked deal (required,
// editable), each captured FRAME's metrics editable via the pencil pattern (the
// headline recomputes on save), and the fused report-card preview + PNG export.
// The human's edit always wins; saving stamps the row 'manual'. Self-contained:
// owns its mutations + toasts + export.
export function CampaignSnapReportSheet({ report, deals }: Props) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const showToast = useToast();

  const isPending = report.extraction_status === SNAP_EXTRACTION_STATUS.PENDING;
  const isFailed = report.extraction_status === SNAP_EXTRACTION_STATUS.FAILED;
  const isExportable =
    report.extraction_status === SNAP_EXTRACTION_STATUS.EXTRACTED ||
    report.extraction_status === SNAP_EXTRACTION_STATUS.MANUAL;

  const storedFrames = report.metrics?.frames ?? [];
  const images = report.images ?? [];
  // The captured frame count — from the extracted frames, falling back to the
  // uploaded images (so a failed row still shows one editing group per frame).
  const frameCount = Math.max(storedFrames.length, images.length);

  function frameValueString(index: number, metricId: string): string {
    const value = storedFrames[index]?.[metricId];
    return typeof value === "number" ? String(value) : "";
  }

  function allFrameKeys(): string[] {
    const keys: string[] = [];
    for (let index = 0; index < frameCount; index += 1) {
      for (const metric of FRAME_METRICS) keys.push(frameKey(index, metric.id));
    }
    return keys;
  }

  // Failed reports open with every frame field + the date editable — that IS
  // the recovery path.
  const [editing, setEditing] = useState<ReadonlySet<string>>(
    () => new Set(isFailed ? [...allFrameKeys(), "reportDate"] : []),
  );
  const [values, setValues] = useState<Record<string, string>>(() => {
    if (!isFailed) return {};
    const seed: Record<string, string> = { reportDate: report.report_date ?? "" };
    for (let index = 0; index < frameCount; index += 1) {
      for (const metric of FRAME_METRICS) {
        seed[frameKey(index, metric.id)] = frameValueString(index, metric.id);
      }
    }
    return seed;
  });
  const [fieldErrors, setFieldErrors] = useState<ReadonlySet<string>>(new Set());

  const dualDate = report.report_date
    ? formatDualDate(report.report_date, locale)
    : null;

  const cardRef = useRef<HTMLDivElement | null>(null);
  const { isExporting, exportPng } = useExportCardPng();
  const updateCampaign = useUpdateCampaignSnap();
  const linkToDeal = useLinkSnapToDeal();
  const appUser = useAppUser();
  const brands = useBrands();

  const imagePaths = images.map((image) => image.path);
  const signedUrls = useSnapSignedUrls(imagePaths);

  // Card context — resolved from the cached lists (brand name localized).
  const linkedDeal = report.deal_id
    ? (deals.find((deal) => deal.id === report.deal_id) ?? null)
    : null;
  const linkedBrand = linkedDeal
    ? ((brands.data ?? []).find((brand) => brand.id === linkedDeal.brand_id) ?? null)
    : null;

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
    const frames: SnapFrameValues[] = [];
    const errors = new Set<string>();

    for (let index = 0; index < frameCount; index += 1) {
      const base = storedFrames[index] ?? {};
      const frame: SnapFrameValues = {};
      for (const metric of FRAME_METRICS) {
        const key = frameKey(index, metric.id);
        if (editing.has(key)) {
          const parsed = parseCount(values[key] ?? "");
          if (!parsed.ok) {
            errors.add(key);
            continue;
          }
          frame[metric.id] = parsed.value;
        } else {
          const existing = base[metric.id];
          frame[metric.id] = typeof existing === "number" ? existing : null;
        }
      }
      frames.push(frame);
    }

    let reportDate: string | null = report.report_date;
    if (editing.has("reportDate")) {
      const parsed = parseDateInput(values.reportDate ?? "");
      if (!parsed.ok) errors.add("reportDate");
      else reportDate = parsed.value;
    }

    if (errors.size > 0) {
      setFieldErrors(errors);
      return;
    }

    updateCampaign.mutate(
      { reportId: report.id, frames, reportDate },
      {
        onSuccess: () => {
          showToast("snap.toast.saved", "success");
          cancelEditing();
        },
        onError: (error) => {
          logger.error("CampaignSnapReportSheet.save", error);
          showToast("snap.toast.saveError", "error");
        },
      },
    );
  }

  function handleLinkChange(dealId: string): void {
    if (dealId === "") return;
    linkToDeal.mutate(
      { reportId: report.id, dealId },
      {
        onSuccess: () => showToast("snap.toast.linked", "success"),
        onError: (error) => {
          logger.error("CampaignSnapReportSheet.link", error);
          showToast("snap.toast.linkError", "error");
        },
      },
    );
  }

  function handleExport(): void {
    const filename = `snap-campaign-report-${report.report_date ?? report.id.slice(0, 8)}.png`;
    void exportPng(cardRef.current, filename);
  }

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

      {/* Linked deal — required, editable. */}
      <div>
        <Label htmlFor="campaign-deal-link">{t("snap.detail.linkToDeal")}</Label>
        <Select
          id="campaign-deal-link"
          value={report.deal_id ?? ""}
          disabled={linkToDeal.isPending}
          onChange={(event) => handleLinkChange(event.target.value)}
        >
          {report.deal_id ? null : (
            <option value="">{t("snap.campaign.dealPlaceholder")}</option>
          )}
          {deals.map((deal) => (
            <option key={deal.id} value={deal.id}>
              {deal.title}
            </option>
          ))}
        </Select>
      </div>

      {/* Snap date — the frame date the AI read, user-correctable. */}
      <div>
        {editing.has("reportDate") ? (
          <>
            <Label htmlFor="campaign-date">{t("snap.fields.reportDate")}</Label>
            <Input
              id="campaign-date"
              type="date"
              dir="ltr"
              hasError={fieldErrors.has("reportDate")}
              value={values.reportDate ?? ""}
              onChange={(event) => setValue("reportDate", event.target.value)}
            />
            <FieldError
              message={fieldErrors.has("reportDate") ? t("snap.errors.dateInvalid") : undefined}
            />
          </>
        ) : (
          <div className="flex min-h-11 items-center justify-between gap-3">
            <span className="text-body font-medium text-text-secondary">
              {t("snap.fields.reportDate")}
            </span>
            <span className="flex items-center gap-1">
              <span className="text-end">
                <span className="block text-sm font-semibold text-text-primary">
                  {dualDate ? dualDate.primary : "—"}
                </span>
                {dualDate ? (
                  <span className="block text-xs text-text-muted">{dualDate.secondary}</span>
                ) : null}
              </span>
              <button
                type="button"
                disabled={isPending}
                onClick={() => startEditing("reportDate", report.report_date ?? "")}
                aria-label={t("snap.detail.editAria", { field: t("snap.fields.reportDate") })}
                className="grid size-11 place-items-center rounded-md text-text-muted transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-60"
              >
                <Pencil className="size-4" aria-hidden />
              </button>
            </span>
          </div>
        )}
      </div>

      {/* Per-frame previews + metrics. */}
      {Array.from({ length: frameCount }, (_, index) => {
        const image = images[index];
        const url = image ? signedUrls.data?.[image.path] : undefined;
        return (
          <section key={image?.path ?? `frame-${index}`} className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-text-primary">
              {t("snap.campaign.frameHeading", { n: index + 1 })}
            </h3>

            {image ? (
              url ? (
                <img
                  src={url}
                  alt={t("snap.campaign.frameAlt")}
                  className="size-16 rounded-md border border-border-light object-cover"
                />
              ) : signedUrls.isError ? (
                <div
                  className="grid size-16 place-items-center rounded-md border border-border bg-surface-secondary text-text-muted"
                  role="img"
                  aria-label={t("snap.detail.previewError")}
                >
                  <ImageOff className="size-5" aria-hidden />
                </div>
              ) : (
                <div
                  className="size-16 animate-pulse rounded-md bg-border motion-reduce:animate-none"
                  role="status"
                  aria-busy="true"
                />
              )
            ) : null}

            <div className="flex flex-col">
              {FRAME_METRICS.map((metric) => {
                const key = frameKey(index, metric.id);
                const rawValue = storedFrames[index]?.[metric.id];
                return (
                  <div key={metric.id} className="border-b border-border-light last:border-b-0">
                    {editing.has(key) ? (
                      <div className="py-2">
                        <Label htmlFor={`snap-${key}`}>{metric.label[locale]}</Label>
                        <Input
                          id={`snap-${key}`}
                          inputMode="numeric"
                          dir="ltr"
                          hasError={fieldErrors.has(key)}
                          value={values[key] ?? ""}
                          onChange={(event) => setValue(key, event.target.value)}
                        />
                        <FieldError
                          message={
                            fieldErrors.has(key) ? t("snap.errors.countInvalid") : undefined
                          }
                        />
                      </div>
                    ) : (
                      <div className="flex min-h-11 items-center justify-between gap-3">
                        <span className="text-body font-medium text-text-secondary">
                          {metric.label[locale]}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="money text-sm font-semibold text-text-primary">
                            {typeof rawValue === "number"
                              ? formatNumber(rawValue, locale)
                              : "—"}
                          </span>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() =>
                              startEditing(key, frameValueString(index, metric.id))
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
            isLoading={updateCampaign.isPending}
          >
            {t("snap.actions.save")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="flex-1"
            onClick={cancelEditing}
            disabled={updateCampaign.isPending}
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
          <div ref={cardRef} className="bg-background p-3">
            <SnapReportCard
              report={report}
              appUser={appUser.data}
              brandName={linkedBrand ? localizedBrandName(linkedBrand, locale) : null}
              dealTitle={linkedDeal?.title ?? null}
            />
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
