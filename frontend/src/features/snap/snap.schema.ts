import { z } from "zod";

// Manual-override form validation (the edit pencils + the failed→manual entry
// path share it). Error messages are i18n catalog KEYS resolved with t() at
// render, matching payment.schema.ts.
//
// Every field is a string because react-hook-form hands inputs strings; empty
// string means "not set" (the columns are nullable). Conversion to numbers /
// nulls happens at the write layer (useSnapReports.toSnapColumns). Counts are
// Western-digit non-negative integers per ui-rules' numeric-input convention.

const COUNT_PATTERN = /^\d+$/;
const MAX_COUNT = 1_000_000_000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const countField = z
  .string()
  .trim()
  .refine((value) => {
    if (value === "") return true;
    if (!COUNT_PATTERN.test(value)) return false;
    return Number(value) <= MAX_COUNT;
  }, "snap.errors.countInvalid");

export const snapReportSchema = z.object({
  views: countField,
  reach: countField,
  storyViews: countField,
  screenshotCount: countField,
  swipeUps: countField,
  // The monthly-only metrics (16B) — the sheet renders the field set matching
  // the row's report_type; the unrendered fields round-trip untouched.
  profileViews: countField,
  newFollowers: countField,
  watchTimeMinutes: countField,
  // Native date input yields YYYY-MM-DD; empty string means "no date".
  reportDate: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || DATE_PATTERN.test(value),
      "snap.errors.dateInvalid",
    ),
  // Empty string means "not linked to a deal" (column is nullable).
  dealId: z.string(),
});

export type SnapReportFormInput = z.infer<typeof snapReportSchema>;
