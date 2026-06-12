export const AUTH_MODE = {
  SIGN_IN: "sign_in",
  SIGN_UP: "sign_up",
} as const;

export type AuthMode = (typeof AUTH_MODE)[keyof typeof AUTH_MODE];

export const OAUTH_PROVIDER = {
  GOOGLE: "google",
} as const;

// Stable Supabase AuthError codes (error.code) — robust against message
// rewording/localization, unlike matching on error.message text.
export const AUTH_ERROR_CODE = {
  INVALID_CREDENTIALS: "invalid_credentials",
  EMAIL_NOT_CONFIRMED: "email_not_confirmed",
  USER_ALREADY_EXISTS: "user_already_exists",
} as const;

// Maps an auth error code to its i18n catalog key (resolved with t() at render).
export const AUTH_ERROR_MESSAGE_KEY: Record<string, string> = {
  [AUTH_ERROR_CODE.INVALID_CREDENTIALS]: "auth.errors.invalidCredentials",
  [AUTH_ERROR_CODE.EMAIL_NOT_CONFIRMED]: "auth.errors.emailNotConfirmed",
  [AUTH_ERROR_CODE.USER_ALREADY_EXISTS]: "auth.errors.emailTaken",
};
