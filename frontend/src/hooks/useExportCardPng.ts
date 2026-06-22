import { useCallback, useState } from "react";

import { useToast } from "@/hooks/useToast";
import { logger } from "@/lib/logger";

// Captures a report-card DOM node to a downloaded PNG via the lazily-imported
// html-to-image (its first + only consumer, so it stays out of the main bundle
// — the pdf.js / recharts precedent). Shared by the post and monthly snap
// sheets. Capturing the DOM as-rendered is how Arabic shaping / RTL / Hijri
// dates survive the export.

// 2× the on-screen pixels so the PNG stays crisp when WhatsApp re-compresses it.
const EXPORT_PIXEL_RATIO = 2;

// A 1×1 transparent PNG — a defensive backstop for any image html-to-image
// can't inline. The card embeds NO cross-origin image (the avatar uses the
// initial via ProfileAvatar's noImage), so the export has nothing external to
// fetch; this only guards future card content.
const TRANSPARENT_PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

export function useExportCardPng() {
  const showToast = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const exportPng = useCallback(
    async (node: HTMLElement | null, filename: string): Promise<void> => {
      if (!node) return;
      setIsExporting(true);
      try {
        const { toPng } = await import("html-to-image");
        const dataUrl = await toPng(node, {
          pixelRatio: EXPORT_PIXEL_RATIO,
          // No cacheBust — it forces a unique URL per call that an external
          // avatar CDN rate-limits (429), rejecting the export.
          imagePlaceholder: TRANSPARENT_PIXEL,
        });
        const link = document.createElement("a");
        link.download = filename;
        link.href = dataUrl;
        link.click();
        showToast("snap.toast.exported", "success");
      } catch (error) {
        logger.error("useExportCardPng", error);
        showToast("snap.toast.exportError", "error");
      } finally {
        setIsExporting(false);
      }
    },
    [showToast],
  );

  return { isExporting, exportPng };
}
