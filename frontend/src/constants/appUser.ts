// Defaults stamped onto a new app_users row at first-login bootstrap.
// Arabic-first, SAR, 60-minute reminder lead time.
export const APP_USER_DEFAULTS = {
  locale: "ar",
  defaultCurrency: "SAR",
  reminderLeadMinutes: 60,
} as const;
