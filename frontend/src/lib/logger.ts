import { ENV } from "@/config/env";

// A no-op logger in production. The only sanctioned place `console` is used —
// everywhere else in the codebase, the lint rule `no-console` forbids it.
// Every log carries a `[context]` prefix so failures are traceable.

type LogArgs = readonly unknown[];

export const logger = {
  error(context: string, ...args: LogArgs): void {
    if (ENV.IS_PROD) return;
    // eslint-disable-next-line no-console
    console.error(`[${context}]`, ...args);
  },
  warn(context: string, ...args: LogArgs): void {
    if (ENV.IS_PROD) return;
    // eslint-disable-next-line no-console
    console.warn(`[${context}]`, ...args);
  },
};
