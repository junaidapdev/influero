import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ImagePlus, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Label } from "@/components/ui/Label";
import { FieldError } from "@/components/ui/FieldError";
import { useCreateCampaignSnapReport } from "@/hooks/useSnapReports";
import { useToast } from "@/hooks/useToast";
import { logger } from "@/lib/logger";
import { prepareSnapFile } from "@/features/snap/prepareUpload";
import {
  PDF_MIME,
  SNAP_CAMPAIGN_MAX_FRAMES,
  SNAP_MIME_EXT,
  type SnapMime,
} from "@/constants/snap";
import type { Deal } from "@shared/types/deal.types";

const ACCEPT = [...Object.keys(SNAP_MIME_EXT), PDF_MIME].join(",");

// The four onboarding steps, rendered as an ordered list.
const STEP_KEYS = [
  "snap.campaign.steps.one",
  "snap.campaign.steps.two",
  "snap.campaign.steps.three",
  "snap.campaign.steps.four",
];

type FrameImage = { id: string; blob: Blob; mime: SnapMime; previewUrl: string };

type Props = {
  // Non-cancelled deals — a campaign MUST link to one (the required picker).
  deals: Deal[];
};

// The 24-hour campaign upload surface: pick the brand DEAL first, then upload the
// 1–3 story FRAMES that featured that brand. Self-contained (the TodayPanel /
// MonthlyUploadSlots pattern): owns its frame state, the create mutation, and
// its toasts. On success it creates ONE pending campaign row + fires the
// per-frame extraction. The surface for every frame is story_frame (set by the
// hook) — there is no per-frame surface choice.
export function CampaignUploadSlots({ deals }: Props) {
  const { t } = useTranslation();
  const showToast = useToast();
  const createCampaign = useCreateCampaignSnapReport();

  const [dealId, setDealId] = useState("");
  const [frames, setFrames] = useState<FrameImage[]>([]);
  const [imageError, setImageError] = useState<string | undefined>();
  const [formErrorKey, setFormErrorKey] = useState<string | undefined>();
  const [isPreparing, setIsPreparing] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Revoke object URLs on unmount (frames may never reach the bucket if the user
  // navigates away). A ref keeps cleanup current without re-arming the effect.
  const framesRef = useRef(frames);
  framesRef.current = frames;
  useEffect(
    () => () => {
      for (const frame of framesRef.current) URL.revokeObjectURL(frame.previewUrl);
    },
    [],
  );

  const isBusy = isPreparing || createCampaign.isPending;
  const atCap = frames.length >= SNAP_CAMPAIGN_MAX_FRAMES;

  async function addFrames(fileList: FileList): Promise<void> {
    setFormErrorKey(undefined);
    setImageError(undefined);
    setIsPreparing(true);
    try {
      let accepted = frames.length;
      const added: FrameImage[] = [];
      for (const file of Array.from(fileList)) {
        if (accepted >= SNAP_CAMPAIGN_MAX_FRAMES) {
          setImageError("snap.campaign.maxReached");
          break;
        }
        const result = await prepareSnapFile(file);
        if (!result.ok) {
          setImageError(result.errorKey);
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
      if (added.length > 0) setFrames((prev) => [...prev, ...added]);
    } finally {
      setIsPreparing(false);
    }
  }

  function removeFrame(id: string): void {
    setFrames((prev) => {
      const frame = prev.find((item) => item.id === id);
      if (frame) URL.revokeObjectURL(frame.previewUrl);
      return prev.filter((item) => item.id !== id);
    });
  }

  function resetForm(): void {
    for (const frame of frames) URL.revokeObjectURL(frame.previewUrl);
    setFrames([]);
    setDealId("");
    setImageError(undefined);
  }

  function handleGenerate(): void {
    if (!dealId) {
      setFormErrorKey("snap.campaign.needDeal");
      return;
    }
    if (frames.length === 0) {
      setFormErrorKey("snap.campaign.needImages");
      return;
    }
    createCampaign.mutate(
      { dealId, images: frames.map((frame) => ({ blob: frame.blob, mime: frame.mime })) },
      {
        onSuccess: () => {
          showToast("snap.toast.uploaded", "success");
          resetForm();
        },
        onError: (error) => {
          logger.error("CampaignUploadSlots.generate", error);
          showToast("snap.toast.uploadError", "error");
        },
      },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-col gap-1.5 rounded-lg bg-surface-secondary p-4 text-sm text-text-secondary">
        <li className="font-medium text-text-primary">{t("snap.campaign.steps.intro")}</li>
        {STEP_KEYS.map((key, index) => (
          <li key={key} className="flex gap-2">
            <span className="text-text-muted">{index + 1}.</span>
            <span>{t(key)}</span>
          </li>
        ))}
        <li className="mt-1 text-xs text-text-muted">{t("snap.campaign.steps.note")}</li>
      </ol>

      <div>
        <Label htmlFor="campaign-deal">{t("snap.campaign.dealLabel")}</Label>
        <Select
          id="campaign-deal"
          value={dealId}
          disabled={isBusy || deals.length === 0}
          onChange={(event) => {
            setDealId(event.target.value);
            setFormErrorKey(undefined);
          }}
        >
          <option value="">{t("snap.campaign.dealPlaceholder")}</option>
          {deals.map((deal) => (
            <option key={deal.id} value={deal.id}>
              {deal.title}
            </option>
          ))}
        </Select>
        <p className="mt-1 text-xs text-text-muted">
          {deals.length === 0 ? t("snap.campaign.noDeals") : t("snap.campaign.dealHint")}
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-text-primary">
            {t("snap.campaign.framesLabel")}
          </span>
          <span className="money text-xs text-text-muted">
            {t("snap.campaign.frameCount", {
              n: frames.length,
              max: SNAP_CAMPAIGN_MAX_FRAMES,
            })}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {frames.map((frame) => (
            <div
              key={frame.id}
              className="relative size-16 overflow-hidden rounded-md border border-border-light"
            >
              <img
                src={frame.previewUrl}
                alt={t("snap.campaign.frameAlt")}
                className="size-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeFrame(frame.id)}
                aria-label={t("snap.campaign.removeFrame")}
                className="absolute end-0.5 top-0.5 grid size-5 place-items-center rounded-full bg-background/80 text-text-secondary transition-colors hover:text-error-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <X className="size-3" aria-hidden />
              </button>
            </div>
          ))}

          {atCap ? null : (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => inputRef.current?.click()}
              className="grid size-16 shrink-0 place-items-center rounded-md border border-dashed border-border-muted bg-surface-secondary text-text-muted transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
              aria-label={t("snap.campaign.addFrames")}
            >
              {isPreparing ? (
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
              void addFrames(event.target.files);
            }
            event.target.value = "";
          }}
        />

        <FieldError
          message={imageError ? t(imageError, { max: SNAP_CAMPAIGN_MAX_FRAMES }) : undefined}
        />
      </div>

      <FieldError message={formErrorKey ? t(formErrorKey) : undefined} />

      <Button
        type="button"
        className="w-full"
        onClick={handleGenerate}
        isLoading={createCampaign.isPending}
        disabled={isBusy || frames.length === 0 || !dealId}
      >
        {t("snap.campaign.generate")}
      </Button>
    </div>
  );
}
