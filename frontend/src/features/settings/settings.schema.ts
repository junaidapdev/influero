import { z } from "zod";

// Settings form validation. Error messages are i18n catalog KEYS (resolved with
// t() at render) — never raw strings shown to the user, matching auth.schema.ts.
//
// Lives in features/ for now (where zod resolves): backend/shared sits outside
// frontend/node_modules, so a bare `zod` import can't resolve there. It moves to
// backend/shared/schemas/ when the first edge function needs to share it — the
// pattern library-docs.md describes.
//
// display_name may be blank (the user can clear it); the empty string is mapped
// to null at the write layer.
export const settingsSchema = z.object({
  displayName: z.string().trim().max(80, "settings.errors.displayNameMax"),
});

export type SettingsInput = z.infer<typeof settingsSchema>;
