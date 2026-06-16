-- brand category: a single, optional industry classifier on each brand
-- (restaurant, cafe, salon, …). Stored as a stable key; the bilingual label is
-- resolved in the app from i18n, so the value stays consistent and groupable
-- across both locales. Post-v1 feature.
--
-- NULLABLE + no backfill: existing brands stay "Uncategorized" until edited
-- (developer decision). New brands may also be left unset.
--
-- DELIBERATE deviation from the status/kind CHECK convention: NO check
-- constraint. The category set is product-curated and expected to grow; a CHECK
-- would force a migration on this live table for every new category, for ~zero
-- safety gain — the value can only ever come from the app's closed <select>,
-- never user free-text. The allowed keys are enforced in app code (the
-- BRAND_CATEGORIES TS union + the zod brand schema).
--
-- No RLS or grant change: the new column is covered by the existing brands
-- policies and table grants from 0004.

alter table public.brands
  add column if not exists category text;
