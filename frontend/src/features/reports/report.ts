import type { Brand } from "@shared/types/brand.types";

// Report shapes for the /reports page (React-free, Supabase-free per the
// features/ boundary). These are the contracts the UI renders against now (with
// mock data) and the aggregate hooks fill in next — useMonthlyTotals returns a
// MonthlyTotal[] (one row per month, last 12), usePerBrandReport a PerBrandRow[].
//
// The collection-rate guard (collected ÷ invoiced, null when nothing invoiced)
// is NOT re-implemented here: features/dashboard/stats.collectionRate already
// owns it — the per-brand bar and the hero ring share the one guard so a
// zero-invoiced brand renders an em dash, never NaN/Infinity.

export type MonthlyTotal = {
  // Local YYYY-MM bucket (e.g. "2026-06") — the month the deal was invoiced in.
  month: string;
  // Sum of agreed amounts for deals invoiced this month (non-cancelled).
  invoicedSar: number;
  // Sum of payments received this month.
  collectedSar: number;
};

export type PerBrandRow = {
  // The full brand row — the avatar tint + glyph derive from its id and names.
  brand: Brand;
  // Non-cancelled deals with this brand over the reporting window.
  dealCount: number;
  // Total invoiced (sum of agreed amounts) for this brand.
  invoicedSar: number;
  // Total collected (sum of received payments) for this brand.
  collectedSar: number;
};
