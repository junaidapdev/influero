// Brand-avatar tint picker. ui-tokens defines six pastel `--color-brand-tint-*`
// backgrounds; each pairs with an existing deeper-tone foreground token for the
// glyph (no new tokens, no hex). The tint is chosen deterministically from the
// brand id so the same brand always renders the same color across the app.
//
// React-free and Supabase-free per the features/ boundary — pure logic only.
export const BRAND_TINTS = [
  { bg: "bg-brand-tint-violet", text: "text-accent" },
  { bg: "bg-brand-tint-amber", text: "text-warning-foreground" },
  { bg: "bg-brand-tint-green", text: "text-success-foreground" },
  { bg: "bg-brand-tint-blue", text: "text-info-foreground" },
  { bg: "bg-brand-tint-pink", text: "text-error-foreground" },
  { bg: "bg-brand-tint-neutral", text: "text-text-secondary" },
] as const;

export type BrandTint = (typeof BRAND_TINTS)[number];

export function brandTint(id: string): BrandTint {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }
  return BRAND_TINTS[hash % BRAND_TINTS.length];
}
