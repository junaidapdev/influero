import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ImagePlus, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { FieldError } from "@/components/ui/FieldError";
import { useCreateMonthlySnapReport } from "@/hooks/useSnapReports";
import { useToast } from "@/hooks/useToast";
import { useLocale } from "@/hooks/useLocale";
import { formatMonthYear, todayIsoLocal } from "@/lib/date";
import { logger } from "@/lib/logger";
import { prepareSnapFile } from "@/features/snap/prepareUpload";
import {
  PDF_MIME,
  SNAP_MIME_EXT,
  SNAP_MONTHLY_MAX_IMAGES_PER_SLOT,
  type SnapMime,
} from "@/constants/snap";
import {
  SNAP_SURFACE_LABELS,
  SNAP_SURFACE_ORDER,
  type SnapMonthlySurface,
} from "@shared/analytics/snapMetricDictionary";

const ACCEPT = [...Object.keys(SNAP_MIME_EXT), PDF_MIME].join(",");

type SlotImage = { id: string; blob: Blob; mime: SnapMime; previewUrl: string };
type SlotState = Record<SnapMonthlySurface, SlotImage[]>;

const EMPTY_SLOTS: SlotState = {
  profile: [],
  public_stories: [],
  spotlight: [],
};

// The three step instructions map 1:1 to the surfaces, in capture order.
const STEP_KEYS: Record<SnapMonthlySurface, string> = {
  profile: "snap.monthly.steps.profile",
  public_stories: "snap.monthly.steps.publicStories",
  spotlight: "snap.monthly.steps.spotlight",
};

function defaultPeriodLabel(locale: Parameters<typeof formatMonthYear>[1]): string {
  return formatMonthYear(todayIsoLocal().slice(0, 7), locale);
}

// The monthly upload surface: three LABELED slots (Profile / Public Stories /
// Spotlight) — each image is tagged with its surface because the user dropped
// it in that slot (no guessing). Self-contained (the TodayPanel pattern): owns
// its slot state, the create mutation, and its toasts. On success it creates ONE
// pending monthly row + fires the per-surface extraction.
export function MonthlyUploadSlots() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const showToast = useToast();
  const createMonthly = useCreateMonthlySnapReport();

  const [slots, setSlots] = useState<SlotState>(EMPTY_SLOTS);
  const [slotError, setSlotError] = useState<Partial<Record<SnapMonthlySurface, string>>>({});
  const [formErrorKey, setFormErrorKey] = useState<string | undefined>();
  const [periodLabel, setPeriodLabel] = useState(() => defaultPeriodLabel(locale));
  const [preparingSurface, setPreparingSurface] = useState<SnapMonthlySurface | null>(null);

  // Revoke every object URL on unmount (slots can hold blobs that never reach
  // the bucket if the user navigates away). A ref keeps the cleanup current
  // without re-arming the effect on each add/remove.
  const slotsRef = useRef(slots);
  slotsRef.current = slots;
  useEffect(
    () => () => {
      for (const surface of SNAP_SURFACE_ORDER) {
        for (const image of slotsRef.current[surface]) {
          URL.revokeObjectURL(image.previewUrl);
        }
      }
    },
    [],
  );

  const totalImages = SNAP_SURFACE_ORDER.reduce(
    (sum, surface) => sum + slots[surface].length,
    0,
  );
  const isBusy = preparingSurface !== null || createMonthly.isPending;

  async function addToSlot(surface: SnapMonthlySurface, fileList: FileList): Promise<void> {
    setFormErrorKey(undefined);
    setSlotError((prev) => ({ ...prev, [surface]: undefined }));
    setPreparingSurface(surface);
    try {
      let accepted = slots[surface].length;
      const added: SlotImage[] = [];
      for (const file of Array.from(fileList)) {
        if (accepted >= SNAP_MONTHLY_MAX_IMAGES_PER_SLOT) {
          setSlotError((prev) => ({ ...prev, [surface]: "snap.monthly.maxReached" }));
          break;
        }
        const result = await prepareSnapFile(file);
        if (!result.ok) {
          setSlotError((prev) => ({ ...prev, [surface]: result.errorKey }));
          continue;
        }
        added.push({
          id: crypto.randomUUID(),
          blob: result.file.blob,
          mime: result.file.mime,
          previewUrl: URL.createObjectURL(result.file.blob),
        });
        accepted += 1;
      }
      if (added.length > 0) {
        setSlots((prev) => ({ ...prev, [surface]: [...prev[surface], ...added] }));
      }
    } finally {
      setPreparingSurface(null);
    }
  }

  function removeImage(surface: SnapMonthlySurface, id: string): void {
    setSlots((prev) => {
      const image = prev[surface].find((item) => item.id === id);
      if (image) URL.revokeObjectURL(image.previewUrl);
      return { ...prev, [surface]: prev[surface].filter((item) => item.id !== id) };
    });
  }

  function resetSlots(): void {
    for (const surface of SNAP_SURFACE_ORDER) {
      for (const image of slots[surface]) URL.revokeObjectURL(image.previewUrl);
    }
    setSlots(EMPTY_SLOTS);
    setSlotError({});
    setPeriodLabel(defaultPeriodLabel(locale));
  }

  function handleGenerate(): void {
    const images = SNAP_SURFACE_ORDER.flatMap((surface) =>
      slots[surface].map((image) => ({
        surface,
        blob: image.blob,
        mime: image.mime,
      })),
    );
    if (images.length === 0) {
      setFormErrorKey("snap.monthly.needImages");
      return;
    }
    const trimmed = periodLabel.trim();
    createMonthly.mutate(
      { images, periodLabel: trimmed === "" ? defaultPeriodLabel(locale) : trimmed },
      {
        onSuccess: () => {
          showToast("snap.toast.uploaded", "success");
          resetSlots();
        },
        onError: (error) => {
          logger.error("MonthlyUploadSlots.generate", error);
          showToast("snap.toast.uploadError", "error");
        },
      },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-col gap-1.5 rounded-lg bg-surface-secondary p-4 text-sm text-text-secondary">
        <li className="font-medium text-text-primary">{t("snap.monthly.steps.intro")}</li>
        {SNAP_SURFACE_ORDER.map((surface, index) => (
          <li key={surface} className="flex gap-2">
            <span className="text-text-muted">{index + 1}.</span>
            <span>{t(STEP_KEYS[surface])}</span>
          </li>
        ))}
        <li className="mt-1 text-xs text-text-muted">{t("snap.monthly.steps.note")}</li>
      </ol>

      <div className="flex flex-col gap-3">
        {SNAP_SURFACE_ORDER.map((surface) => (
          <SurfaceSlot
            key={surface}
            label={SNAP_SURFACE_LABELS[surface][locale]}
            images={slots[surface]}
            errorKey={slotError[surface]}
            isBusy={preparingSurface === surface}
            disabled={isBusy && preparingSurface !== surface}
            onAdd={(files) => {
              void addToSlot(surface, files);
            }}
            onRemove={(id) => removeImage(surface, id)}
          />
        ))}
      </div>

      <div>
        <Label htmlFor="snap-period">{t("snap.monthly.periodLabel")}</Label>
        <Input
          id="snap-period"
          value={periodLabel}
          onChange={(event) => setPeriodLabel(event.target.value)}
          placeholder={t("snap.monthly.periodPlaceholder")}
        />
        <p className="mt-1 text-xs text-text-muted">{t("snap.monthly.periodHint")}</p>
      </div>

      <FieldError message={formErrorKey ? t(formErrorKey) : undefined} />

      <Button
        type="button"
        className="w-full"
        onClick={handleGenerate}
        isLoading={createMonthly.isPending}
        disabled={isBusy || totalImages === 0}
      >
        {t("snap.monthly.generate")}
      </Button>
    </div>
  );
}

type SurfaceSlotProps = {
  label: string;
  images: SlotImage[];
  errorKey?: string;
  isBusy: boolean;
  disabled: boolean;
  onAdd: (files: FileList) => void;
  onRemove: (id: string) => void;
};

function SurfaceSlot({
  label,
  images,
  errorKey,
  isBusy,
  disabled,
  onAdd,
  onRemove,
}: SurfaceSlotProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const atCap = images.length >= SNAP_MONTHLY_MAX_IMAGES_PER_SLOT;

  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-text-primary">{label}</span>
        <span className="money text-xs text-text-muted">
          {t("snap.monthly.imageCount", {
            n: images.length,
            max: SNAP_MONTHLY_MAX_IMAGES_PER_SLOT,
          })}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {images.map((image) => (
          <div
            key={image.id}
            className="relative size-16 overflow-hidden rounded-md border border-border-light"
          >
            <img
              src={image.previewUrl}
              alt={t("snap.monthly.previewAlt", { surface: label })}
              className="size-full object-cover"
            />
            <button
              type="button"
              onClick={() => onRemove(image.id)}
              aria-label={t("snap.monthly.removeImage")}
              className="absolute end-0.5 top-0.5 grid size-5 place-items-center rounded-full bg-background/80 text-text-secondary transition-colors hover:text-error-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <X className="size-3" aria-hidden />
            </button>
          </div>
        ))}

        {atCap ? null : (
          <button
            type="button"
            disabled={disabled || isBusy}
            onClick={() => inputRef.current?.click()}
            className="grid size-16 shrink-0 place-items-center rounded-md border border-dashed border-border-muted bg-surface-secondary text-text-muted transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
            aria-label={t("snap.monthly.addImages")}
          >
            {isBusy ? (
              <Loader2 className="size-5 animate-spin" aria-hidden />
            ) : (
              <ImagePlus className="size-5" aria-hidden />
            )}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(event) => {
          if (event.target.files && event.target.files.length > 0) {
            onAdd(event.target.files);
          }
          event.target.value = "";
        }}
      />

      <FieldError message={errorKey ? t(errorKey) : undefined} />
    </div>
  );
}
