import { z } from "zod";

import { DELIVERABLE_TYPE } from "@shared/types/deal.types";

// Deal create-form validation. Error messages are i18n catalog KEYS (resolved
// with t() at render), matching brand.schema.ts. Lives in features/ for now
// (where zod resolves); moves to backend/shared/schemas/ when an edge function
// first needs it (Feature 11 validates payment input, not deal input).
//
// Every text field is modelled as a string because react-hook-form hands inputs
// strings, never numbers — the count/amount strings are validated here and
// converted to real numbers at the write layer (useDeals.toDealColumns). The
// deliverables array is validated STRICTLY (closed type enum, bounded integer
// count, at least one line) so no arbitrary jsonb shapes ever reach the DB.

const COUNT_PATTERN = /^\d+$/;
const MAX_COUNT = 99;

// Positive SAR amount, up to 2 decimals (numeric column). Western digits — the
// numeric input renders them regardless of locale so math stays unambiguous.
const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;
const MAX_AMOUNT_SAR = 100_000_000;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const deliverableLineSchema = z.object({
  type: z.enum([
    DELIVERABLE_TYPE.STORY,
    DELIVERABLE_TYPE.POST,
    DELIVERABLE_TYPE.REEL,
  ]),
  count: z
    .string()
    .trim()
    .regex(COUNT_PATTERN, "deals.errors.countInvalid")
    .refine((value) => {
      const count = Number(value);
      return count >= 1 && count <= MAX_COUNT;
    }, "deals.errors.countRange"),
});

export const dealSchema = z.object({
  brandId: z.string().min(1, "deals.errors.brandRequired"),
  title: z
    .string()
    .trim()
    .min(1, "deals.errors.titleRequired")
    .max(120, "deals.errors.titleMax"),
  deliverables: z
    .array(deliverableLineSchema)
    .min(1, "deals.errors.deliverablesRequired"),
  agreedAmount: z
    .string()
    .trim()
    .min(1, "deals.errors.amountRequired")
    .refine((value) => {
      if (!AMOUNT_PATTERN.test(value)) return false;
      const amount = Number(value);
      return amount > 0 && amount <= MAX_AMOUNT_SAR;
    }, "deals.errors.amountInvalid"),
  // Optional — empty string means "no deadline". A native date input yields
  // YYYY-MM-DD; the format check guards manual/unsupported-browser entry.
  deadline: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || DATE_PATTERN.test(value),
      "deals.errors.deadlineInvalid",
    ),
  notes: z.string().trim().max(1000, "deals.errors.notesMax"),
});

export type DealFormInput = z.infer<typeof dealSchema>;
export type DeliverableLineInput = z.infer<typeof deliverableLineSchema>;
