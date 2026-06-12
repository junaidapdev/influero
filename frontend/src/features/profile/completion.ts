import type { AppUser } from "@shared/types/appUser.types";

// The fields Feature 07 treats as required for a "complete" profile. The order
// here is the order missing tags render in the banner. Each key doubles as the
// i18n suffix the banner resolves (dashboard.profileBanner.missing.<field>).
export const REQUIRED_PROFILE_FIELDS = ["displayName", "avatar"] as const;

export type RequiredProfileField = (typeof REQUIRED_PROFILE_FIELDS)[number];

export type ProfileCompletion = {
  isComplete: boolean;
  filledCount: number;
  requiredCount: number;
  completionPct: number; // 0–100, rounded — drives the ring arc + label
  missingFields: RequiredProfileField[];
};

function isFilled(value: string | null): boolean {
  return value !== null && value.trim() !== "";
}

// Pure, React-free derivation of profile completeness from an app_users row.
// Required fields are display_name + avatar_url (see build-plan Feature 07);
// completion is filled ÷ required. Keeping this out of the component makes the
// "what counts as complete" rule testable in isolation.
export function getProfileCompletion(appUser: AppUser): ProfileCompletion {
  const filledByField: Record<RequiredProfileField, boolean> = {
    displayName: isFilled(appUser.display_name),
    avatar: isFilled(appUser.avatar_url),
  };

  const missingFields = REQUIRED_PROFILE_FIELDS.filter(
    (field) => !filledByField[field],
  );
  const requiredCount = REQUIRED_PROFILE_FIELDS.length;
  const filledCount = requiredCount - missingFields.length;

  return {
    isComplete: missingFields.length === 0,
    filledCount,
    requiredCount,
    completionPct: Math.round((filledCount / requiredCount) * 100),
    missingFields,
  };
}
