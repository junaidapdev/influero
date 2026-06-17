// Shared brand type — the canonical shape of a brands row. Kept
// framework-agnostic (no React, Vite, or Deno imports) so the web app, the
// edge functions, and the future React Native app all reuse it untouched.

// The curated brand-category set (post-v1). Array order IS the display order in
// the picker. Stored as a stable key on brands.category; the bilingual label is
// resolved in the app from i18n (brands.categories.<key>). This is the single
// source of truth — the zod schema and the directory chip both read from it.
//
// NOTE: intentionally NOT mirrored by a DB CHECK (see 0014_brand_category.sql) —
// the set is product-curated and expected to grow, and the value only ever comes
// from the app's closed <select>. To add a category: add the key here + an EN/AR
// label under brands.categories in both locale catalogs. 'other' stays last.
export const BRAND_CATEGORIES = [
  "barbershop",
  "tailor",
  "supermarket",
  "pharmacy",
  "restaurant_large",
  "restaurant_medium",
  "restaurant_small",
  "cafe",
  "mobiles",
  "sweets",
  "food_truck",
  "entertainment",
  "furniture",
  "carpet",
  "hotel",
  "eyewear",
  "chocolate",
  "kunafa",
  "grape_leaves",
  "slimming",
  "camp",
  "butcher",
  "laundry",
  "juice",
  "bakery",
  "clinic",
  "car_electrician",
  "clothing",
  "training",
  "school",
  "other",
] as const;

export type BrandCategory = (typeof BRAND_CATEGORIES)[number];

export type Brand = {
  id: string;
  user_id: string;
  name_en: string;
  name_ar: string;
  category: BrandCategory | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
  created_at: string;
};
