// Supabase Storage constants. Bucket names and upload limits live here so they
// never appear as magic strings/numbers in hooks or components.
export const STORAGE = {
  AVATARS_BUCKET: "avatars",
  SNAP_UPLOADS_BUCKET: "snap-uploads",
} as const;

export const AVATAR_UPLOAD = {
  MAX_BYTES: 2 * 1024 * 1024, // 2 MB
} as const;

// Allowed image types → the extension used in the object path. Validation and
// path-building both read from this one map so they can never drift apart.
export const AVATAR_MIME_EXT = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
} as const;

export type AvatarMime = keyof typeof AVATAR_MIME_EXT;
