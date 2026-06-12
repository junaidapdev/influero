// Pure stat derivations for the dashboard hero card (React-free,
// Supabase-free per the features/ boundary).

// Collection rate as a 0–1 fraction (collected ÷ invoiced), or null when
// nothing was invoiced — the caller renders an em dash, never NaN/Infinity
// (the same zero-invoiced guard the Reports collection-rate bar mandates).
// Clamped to 1: collected can legitimately exceed the month's invoiced total
// (outstanding installments from earlier months arriving now), and a >100%
// ring would read as a bug.
export function collectionRate(
  collected: number,
  invoiced: number,
): number | null {
  if (invoiced <= 0) return null;
  return Math.min(1, collected / invoiced);
}
