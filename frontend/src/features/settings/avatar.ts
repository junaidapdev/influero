import {
  AVATAR_MIME_EXT,
  AVATAR_UPLOAD,
  type AvatarMime,
} from "@/constants/storage";

// Pure avatar logic — no React, no Supabase. Reused by the dropzone (validation)
// and the update hook (path building) so the rules live in exactly one place.

function isAvatarMime(mime: string): mime is AvatarMime {
  return mime in AVATAR_MIME_EXT;
}

// Returns an i18n error KEY when the file is unacceptable, or null when it's fine.
export function validateAvatarFile(file: File): string | null {
  if (!isAvatarMime(file.type)) return "settings.profile.avatarTypeError";
  if (file.size > AVATAR_UPLOAD.MAX_BYTES) return "settings.profile.avatarSizeError";
  return null;
}

// Object name within the avatars bucket. The first path segment is the user id —
// the storage RLS policy gates writes on it.
export function avatarObjectPath(userId: string, mime: AvatarMime): string {
  return `${userId}/avatar.${AVATAR_MIME_EXT[mime]}`;
}

export { isAvatarMime };
