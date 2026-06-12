import { z } from "zod";

// Error messages are i18n catalog KEYS, not human strings — the form resolves
// them with t() at render time so they're localized and never shown raw.
const email = z
  .string()
  .min(1, "auth.errors.emailRequired")
  .email("auth.errors.emailInvalid");

// Sign-in only needs a non-empty password (don't lock out existing accounts on
// a length rule). Sign-up enforces the minimum length for new passwords.
export const signInSchema = z.object({
  email,
  password: z.string().min(1, "auth.errors.passwordRequired"),
});

export const signUpSchema = z.object({
  email,
  password: z
    .string()
    .min(1, "auth.errors.passwordRequired")
    .min(8, "auth.errors.passwordMin"),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
