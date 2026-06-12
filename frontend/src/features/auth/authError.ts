import { AUTH_ERROR_MESSAGE_KEY } from "@/constants/auth";

// Pure mapping from a thrown auth error to an i18n catalog KEY. Reads the
// stable Supabase AuthError `code` rather than matching message text, which can
// be reworded or localized. Falls back to a generic key for unknown errors.
function extractCode(error: unknown): string | null {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = error.code;
    return typeof code === "string" ? code : null;
  }
  return null;
}

export function authErrorMessageKey(error: unknown): string {
  const code = extractCode(error);
  if (code !== null && code in AUTH_ERROR_MESSAGE_KEY) {
    return AUTH_ERROR_MESSAGE_KEY[code];
  }
  return "auth.errors.generic";
}
