import { useLocale } from "@/hooks/useLocale";
import { brandTint } from "@/features/brands/brandTint";
import type { Brand } from "@shared/types/brand.types";

type Props = {
  brand: Brand;
  size?: "md" | "lg";
};

// Circular brand avatar: a deterministic pastel tint (from the brand id) with the
// active-locale name's first glyph in a deeper tone of the same family. Decorative
// — the brand name is always shown as text alongside it, so aria-hidden.
export function BrandAvatar({ brand, size = "md" }: Props) {
  const { isArabic } = useLocale();
  const tint = brandTint(brand.id);
  const name = (isArabic ? brand.name_ar : brand.name_en).trim();
  const initial = (name.charAt(0) || "?").toUpperCase();
  const sizeClass = size === "lg" ? "size-14 text-xl" : "size-11 text-base";

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${sizeClass} ${tint.bg} ${tint.text}`}
    >
      {initial}
    </span>
  );
}
