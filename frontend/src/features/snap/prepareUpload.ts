import { pdfFirstPageToPng } from "@/lib/pdfToImage";
import { logger } from "@/lib/logger";
import { SNAP_UPLOAD, type SnapMime } from "@/constants/snap";
import {
  isPdfMime,
  isSnapImageMime,
  MAGIC_BYTES_NEEDED,
  validateSnapImage,
  validateSnapPdf,
} from "@/features/snap/upload";

// Turns a picked File into an upload-ready image blob, or an i18n error KEY.
// One place for the validate (MIME + magic bytes + size) → PDF-first-page→PNG
// pipeline, shared by the single-screenshot post flow and the three-slot
// monthly flow (lifted out of the route so neither duplicates it).

export type PreparedSnapFile = { blob: Blob; mime: SnapMime };

export type PrepareSnapResult =
  | { ok: true; file: PreparedSnapFile }
  | { ok: false; errorKey: string };

export async function prepareSnapFile(file: File): Promise<PrepareSnapResult> {
  const headBytes = new Uint8Array(
    await file.slice(0, MAGIC_BYTES_NEEDED).arrayBuffer(),
  );

  if (isPdfMime(file.type)) {
    const pdfError = validateSnapPdf(file, headBytes);
    if (pdfError) return { ok: false, errorKey: pdfError };
    try {
      const png = await pdfFirstPageToPng(file);
      // The rendered PNG bypasses the pre-conversion PDF cap, so re-check it
      // against the image cap before it can reach the bucket.
      if (png.size > SNAP_UPLOAD.IMAGE_MAX_BYTES) {
        return { ok: false, errorKey: "snap.errors.imageSize" };
      }
      return { ok: true, file: { blob: png, mime: "image/png" } };
    } catch (error) {
      logger.error("prepareSnapFile.pdfConvert", error);
      return { ok: false, errorKey: "snap.errors.pdfConvert" };
    }
  }

  const imageError = validateSnapImage(file, headBytes);
  if (imageError) return { ok: false, errorKey: imageError };
  if (!isSnapImageMime(file.type)) {
    return { ok: false, errorKey: "snap.errors.fileType" };
  }
  return { ok: true, file: { blob: file, mime: file.type } };
}
