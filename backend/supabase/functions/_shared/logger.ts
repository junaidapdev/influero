// The one sanctioned console chokepoint for edge functions — the Deno
// counterpart of frontend/src/lib/logger.ts. Function bodies never call
// console.* directly (code-standards); they call logger.error with the
// function name as the prefix, e.g. logger.error("[mark-payment-received]", err).

export const logger = {
  error(prefix: string, ...args: unknown[]): void {
    // deno-lint-ignore no-console
    console.error(prefix, ...args);
  },
} as const;
