// WhatsApp click-to-chat helpers (React-free, Supabase-free — a cross-cutting
// lib util like date/currency). Shapes a wa.me deep link: the brand's phone in
// international digits + a prewritten, URL-encoded message. Opening the link is
// the caller's job (window.open); this module only builds the URL string.

const WA_BASE = "https://wa.me";

// Saudi Arabia country code. The whole app is for a Saudi influencer's Saudi
// brands, so a local 05XXXXXXXX number is normalized to 9665XXXXXXXX. A number
// that already carries a country code (with or without +/00) is kept as-is
// after stripping non-digits.
const SAUDI_CC = "966";

// Normalize a free-text contact_phone to wa.me's required form: digits only,
// leading country code, no +/spaces/dashes. Returns null when there's nothing
// dialable (empty / no digits) so the caller can disable the action. Best-effort
// for already-international numbers — it reshapes the local-mobile forms and
// otherwise passes the digits through unchanged (no length validation).
export function normalizeSaudiPhone(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");
  if (digits === "") return null;

  // 00966… international-access prefix → drop the 00.
  if (digits.startsWith("00")) digits = digits.slice(2);

  // Local mobile 05XXXXXXXX (10 digits) → country code + the 9 after the 0.
  if (digits.length === 10 && digits.startsWith("05")) {
    return SAUDI_CC + digits.slice(1);
  }
  // Bare mobile 5XXXXXXXX (9 digits) → prefix the country code.
  if (digits.length === 9 && digits.startsWith("5")) {
    return SAUDI_CC + digits;
  }
  // Already country-coded (or some other international number) → as-is.
  return digits;
}

// Assemble the click-to-chat URL. `intlDigits` must already be normalized.
export function whatsappDeepLink(intlDigits: string, text: string): string {
  return `${WA_BASE}/${intlDigits}?text=${encodeURIComponent(text)}`;
}
