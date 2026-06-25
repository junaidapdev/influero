import { User } from "lucide-react";

import type { AppUser } from "@shared/types/appUser.types";

type Props = {
  appUser: AppUser | undefined;
  size?: "sm" | "lg" | "xl" | "2xl";
  // "circle" (default) for the in-menu/snap-card avatar; "square" (rounded-2xl)
  // for the shell greeting header (F17 design).
  shape?: "circle" | "square";
  // false (default) = soft accent tint (bg-accent-light / text-accent);
  // true = solid accent fill (bg-accent / text-on-accent), the greeting avatar.
  solid?: boolean;
  // Color family. "accent" (default) is the in-app violet; "snap" is the bright
  // Snapchat yellow + dark ink used only by the exported Snap report card.
  tone?: "accent" | "snap";
  // Suppress the network avatar image and render the initials / glyph only.
  // Used by the exported Snap report card (16B): html-to-image serializes the
  // DOM to a canvas, and a cross-origin avatar (e.g. a Google OAuth photo on
  // lh3.googleusercontent.com) either taints the canvas or 429-rate-limits the
  // re-fetch, rejecting the whole export. The initials in an accent square are
  // bulletproof — a brand deliverable can't hinge on an external CDN.
  noImage?: boolean;
};

const SIZE = {
  sm: "size-9 text-sm",
  lg: "size-12 text-lg",
  xl: "size-14 text-xl",
  "2xl": "size-16 text-2xl",
} as const;

// The signed-in user's avatar — the profile-menu trigger in the shell header and
// the menu's own header. Presentational: the uploaded avatar image when set,
// else up to two initials of the display name, else a neutral User glyph. Uses
// the accent tint (a person, not a brand, so no per-id tinting).
export function ProfileAvatar({
  appUser,
  size = "sm",
  shape = "circle",
  solid = false,
  noImage = false,
  tone = "accent",
}: Props) {
  const name = appUser?.display_name?.trim();
  const initials = name
    ? name
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word.charAt(0))
        .join("")
        .toUpperCase()
    : null;

  const shapeClass = shape === "square" ? "rounded-2xl" : "rounded-full";
  const toneClass =
    tone === "snap"
      ? "bg-snap-yellow text-snap-ink"
      : solid
        ? "bg-accent text-text-on-accent"
        : "bg-accent-light text-accent";

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden font-semibold ${shapeClass} ${toneClass} ${SIZE[size]}`}
      aria-hidden="true"
    >
      {!noImage && appUser?.avatar_url ? (
        <img src={appUser.avatar_url} alt="" className="size-full object-cover" />
      ) : initials ? (
        initials
      ) : (
        <User className={size === "sm" ? "size-5" : "size-6"} aria-hidden="true" />
      )}
    </span>
  );
}
