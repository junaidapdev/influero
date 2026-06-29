import { z } from "zod";

import { normalizeDigits } from "@/lib/numbers";

// Error messages are i18n catalog KEYS, not human strings — the form resolves
// them with t() at render time so they're localized and never shown raw.
const email = z
  .string()
  .min(1, "auth.errors.emailRequired")
  .email("auth.errors.emailInvalid");

// Sign-in only needs a non-empty password (don't lock out existing accounts on
// a length rule). Sign-up enforces the minimum length for new passwords.
const signInPassword = z.string().min(1, "auth.errors.passwordRequired");
const signUpPassword = signInPassword.min(8, "auth.errors.passwordMin");

export const signInSchema = z.object({
  email,
  password: signInPassword,
});

export const signUpSchema = z.object({
  email,
  password: signUpPassword,
});

// Normalizes a Saudi mobile number to E.164 (+9665XXXXXXXX), or null if it
// isn't a valid KSA mobile. Accepts the forms a Saudi user actually types:
// 05XXXXXXXX, 5XXXXXXXX, +9665XXXXXXXX, 9665XXXXXXXX, 009665XXXXXXXX — with
// spaces / dashes / parens, and Arabic-Indic digits (reuses normalizeDigits,
// the same helper the deal + snap inputs use). A KSA mobile is exactly nine
// national digits starting with 5.
export function toE164Saudi(raw: string): string | null {
  const cleaned = normalizeDigits(raw).replace(/[\s()-]/g, "");
  // Work in pure digits: drop a leading "+" or the "00" international prefix.
  let digits = cleaned.replace(/^\+/, "").replace(/^00/, "");
  if (!/^\d+$/.test(digits)) return null;
  if (digits.startsWith("966")) digits = digits.slice(3);
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (!/^5\d{8}$/.test(digits)) return null;
  return `+966${digits}`;
}

// Phone is validated by whether it normalizes to a KSA mobile; the value stays
// the raw user input here and is normalized to E.164 in the form's onSubmit
// (via toE164Saudi) before it reaches Supabase.
const phone = z
  .string()
  .min(1, "auth.errors.phoneRequired")
  .refine((value) => toE164Saudi(value) !== null, "auth.errors.phoneInvalid");

export const signInPhoneSchema = z.object({
  phone,
  password: signInPassword,
});

export const signUpPhoneSchema = z.object({
  phone,
  password: signUpPassword,
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInPhoneInput = z.infer<typeof signInPhoneSchema>;
export type SignUpPhoneInput = z.infer<typeof signUpPhoneSchema>;

// What the phone auth hooks consume: an already-normalized E.164 phone + the
// password. (The schema validates raw input; onSubmit normalizes before this.)
export type PhoneAuthInput = { phone: string; password: string };
