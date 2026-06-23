// /analytics/snap constants. Upload limits and accepted types live here so
// they never appear as magic values in components, hooks, or features code.
// The bucket only ever stores images — a PDF is converted to PNG client-side
// (pdf.js, first page) BEFORE upload, so the PDF caps apply pre-conversion.

export const SNAP_EDGE_FUNCTION = "extract-snap-report";

// Accepted image types → the extension used in the object path. Validation and
// path-building both read from this one map so they can never drift apart
// (the AVATAR_MIME_EXT pattern).
export const SNAP_MIME_EXT = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
} as const;

export type SnapMime = keyof typeof SNAP_MIME_EXT;

export const PDF_MIME = "application/pdf";

export const SNAP_UPLOAD = {
  IMAGE_MAX_BYTES: 5 * 1024 * 1024, // 5 MB screenshot cap
  PDF_MAX_BYTES: 10 * 1024 * 1024, // 10 MB pre-conversion PDF cap
} as const;

// Rendered width of the PNG produced from a PDF's first page — high enough for
// GPT-4o to read the small Snap Insights labels, low enough to stay well under
// the image cap.
export const PDF_RENDER_WIDTH_PX = 1280;

// Per-surface image cap for a monthly report (3 slots → ≤ 9 vision calls per
// report). Bounds the OpenAI cost + the edge function's runtime per extraction.
export const SNAP_MONTHLY_MAX_IMAGES_PER_SLOT = 3;

// Frame cap for a 24-hour campaign report: a brand's story can run many frames
// across a day (commonly up to ~20). Each frame is one vision call, so this
// caps the OpenAI cost + the edge function's runtime per extraction.
export const SNAP_CAMPAIGN_MAX_FRAMES = 20;
