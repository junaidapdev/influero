import { ENV } from "@/config/env";

// The only sanctioned place `console` is used — everywhere else the lint rule
// `no-console` forbids it. Every log carries a `[context]` prefix so failures
// are traceable.
//
// errors ALWAYS emit, including in production, so a beta-launch failure is at
// least visible in the browser console / hosting logs (there is no remote error
// sink yet — wiring Sentry is the proper follow-up). warnings stay dev-only to
// keep the prod console focused on actual failures.

type LogArgs = readonly unknown[];

export const logger = {
  error(context: string, ...args: LogArgs): void {
    // eslint-disable-next-line no-console
    console.error(`[${context}]`, ...args);
  },
  warn(context: string, ...args: LogArgs): void {
    if (ENV.IS_PROD) return;
    // eslint-disable-next-line no-console
    console.warn(`[${context}]`, ...args);
  },
};
