import {
  PDF_MIME,
  SNAP_MIME_EXT,
  SNAP_UPLOAD,
  type SnapMime,
} from "@/constants/snap";
import type { SnapSurface } from "@shared/analytics/snapMetricDictionary";

// Pure snap-upload logic — no React, no Supabase, no DOM. The route reads the
// file's leading bytes and hands them here; validation and path-building live
// in exactly one place (the features/settings/avatar.ts pattern, hardened).
//
// MAGIC BYTES: unlike avatars, snap uploads are validated by content, not just
// the browser-reported MIME — a renamed file whose bytes don't match its
// declared type is rejected (code-standards "File upload hardening", the
// hardening deferred from Feature 06 to this pipeline).

const MAGIC_BYTES_NEEDED = 12;

function bytesStartWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((byte, i) => bytes[offset + i] === byte);
}

function isPngBytes(bytes: Uint8Array): boolean {
  return bytesStartWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
}

function isJpegBytes(bytes: Uint8Array): boolean {
  return bytesStartWith(bytes, [0xff, 0xd8, 0xff]);
}

function isWebpBytes(bytes: Uint8Array): boolean {
  // "RIFF" …4-byte size… "WEBP"
  return (
    bytesStartWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytesStartWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  );
}

function isPdfBytes(bytes: Uint8Array): boolean {
  // "%PDF"
  return bytesStartWith(bytes, [0x25, 0x50, 0x44, 0x46]);
}

const IMAGE_MAGIC_CHECK: Record<SnapMime, (bytes: Uint8Array) => boolean> = {
  "image/png": isPngBytes,
  "image/jpeg": isJpegBytes,
  "image/webp": isWebpBytes,
};

export function isSnapImageMime(mime: string): mime is SnapMime {
  return mime in SNAP_MIME_EXT;
}

export function isPdfMime(mime: string): boolean {
  return mime === PDF_MIME;
}

type FileFacts = { type: string; size: number };

// Returns an i18n error KEY when the image is unacceptable, or null when fine.
// `bytes` is the file's first chunk (≥ MAGIC_BYTES_NEEDED bytes).
export function validateSnapImage(file: FileFacts, bytes: Uint8Array): string | null {
  if (!isSnapImageMime(file.type)) return "snap.errors.fileType";
  if (file.size > SNAP_UPLOAD.IMAGE_MAX_BYTES) return "snap.errors.imageSize";
  if (!IMAGE_MAGIC_CHECK[file.type](bytes)) return "snap.errors.fileContent";
  return null;
}

// Same contract for a PDF picked for client-side conversion.
export function validateSnapPdf(file: FileFacts, bytes: Uint8Array): string | null {
  if (!isPdfMime(file.type)) return "snap.errors.fileType";
  if (file.size > SNAP_UPLOAD.PDF_MAX_BYTES) return "snap.errors.pdfSize";
  if (!isPdfBytes(bytes)) return "snap.errors.fileContent";
  return null;
}

// A multi-image report's files (monthly surfaces OR campaign frames) live under
// one per-report folder, named by surface + index so the manifest path is
// self-describing and uniquely keyed. `groupId` is caller-generated
// (crypto.randomUUID) so this stays pure; the first path segment is still the
// user id, which the snap-uploads RLS gates on.
export function snapSurfaceObjectPath(
  userId: string,
  groupId: string,
  surface: SnapSurface,
  index: number,
  mime: SnapMime,
): string {
  return `${userId}/${groupId}/${surface}-${index}.${SNAP_MIME_EXT[mime]}`;
}

export { MAGIC_BYTES_NEEDED };
