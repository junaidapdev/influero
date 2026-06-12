import { z } from "zod";

// Brand create/edit form validation. Error messages are i18n catalog KEYS
// (resolved with t() at render) — never raw strings shown to the user, matching
// auth.schema.ts and settings.schema.ts.
//
// Lives in features/ for now (where zod resolves): backend/shared sits outside
// frontend/node_modules, so a bare `zod` import can't resolve there. It moves to
// backend/shared/schemas/ when the first edge function needs to share it.
//
// Every field is modelled as a string because react-hook-form hands a text input
// an empty string, never undefined. name_en/name_ar are required; the optional
// contact fields and notes validate format only when non-empty and are mapped to
// null at the write layer (useBrands), mirroring how Settings handles display_name.

const optionalEmpty = (max: number, maxKey: string) =>
  z.string().trim().max(max, maxKey);

// Lenient on purpose: brands can be international agencies, so we check shape, not
// a Saudi-specific format. Empty stays valid (the field is optional).
const PHONE_PATTERN = /^[+()\-\s\d]{7,20}$/;

export const brandSchema = z.object({
  nameEn: z
    .string()
    .trim()
    .min(1, "brands.errors.nameRequired")
    .max(80, "brands.errors.nameMax"),
  nameAr: z
    .string()
    .trim()
    .min(1, "brands.errors.nameRequired")
    .max(80, "brands.errors.nameMax"),
  contactName: optionalEmpty(80, "brands.errors.contactNameMax"),
  contactEmail: optionalEmpty(120, "brands.errors.emailMax").refine(
    (value) => value === "" || z.string().email().safeParse(value).success,
    "brands.errors.emailInvalid",
  ),
  contactPhone: optionalEmpty(20, "brands.errors.phoneMax").refine(
    (value) => value === "" || PHONE_PATTERN.test(value),
    "brands.errors.phoneInvalid",
  ),
  notes: optionalEmpty(1000, "brands.errors.notesMax"),
});

export type BrandFormInput = z.infer<typeof brandSchema>;
