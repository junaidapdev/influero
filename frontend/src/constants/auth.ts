export const AUTH_MODE = {
  SIGN_IN: "sign_in",
  SIGN_UP: "sign_up",
} as const;

export type AuthMode = (typeof AUTH_MODE)[keyof typeof AUTH_MODE];

// Which identifier the login form is collecting. Email and phone both use a
// password; Google is a separate button, not an identifier.
export const IDENTIFIER = {
  EMAIL: "email",
  PHONE: "phone",
} as const;

export type Identifier = (typeof IDENTIFIER)[keyof typeof IDENTIFIER];

export const OAUTH_PROVIDER = {
  GOOGLE: "google",
} as const;

// Stable Supabase AuthError codes (error.code) — robust against message
// rewording/localization, unlike matching on error.message text.
export const AUTH_ERROR_CODE = {
  INVALID_CREDENTIALS: "invalid_credentials",
  EMAIL_NOT_CONFIRMED: "email_not_confirmed",
  USER_ALREADY_EXISTS: "user_already_exists",
  PHONE_EXISTS: "phone_exists",
  WEAK_PASSWORD: "weak_password",
  // The Phone provider isn't enabled (or signups are off) in the Supabase
  // dashboard — surfaced so a misconfig reads as a clear message, not "generic".
  PHONE_PROVIDER_DISABLED: "phone_provider_disabled",
  SIGNUP_DISABLED: "signup_disabled",
} as const;

// Maps an auth error code to its i18n catalog key (resolved with t() at render).
export const AUTH_ERROR_MESSAGE_KEY: Record<string, string> = {
  [AUTH_ERROR_CODE.INVALID_CREDENTIALS]: "auth.errors.invalidCredentials",
  [AUTH_ERROR_CODE.EMAIL_NOT_CONFIRMED]: "auth.errors.emailNotConfirmed",
  [AUTH_ERROR_CODE.USER_ALREADY_EXISTS]: "auth.errors.emailTaken",
  [AUTH_ERROR_CODE.PHONE_EXISTS]: "auth.errors.phoneTaken",
  [AUTH_ERROR_CODE.WEAK_PASSWORD]: "auth.errors.passwordMin",
  [AUTH_ERROR_CODE.PHONE_PROVIDER_DISABLED]: "auth.errors.phoneUnavailable",
  [AUTH_ERROR_CODE.SIGNUP_DISABLED]: "auth.errors.phoneUnavailable",
};
