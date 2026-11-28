// AgeGroup data, safe to import from Server Components (no React hooks).
// The guideAgeGroup signal is in ./age-group.

export type AgeGroup = "children" | "adults" | "older";

/** Children under 18, older adults 65+, adults otherwise (and when unknown). */
export function ageGroupFor(age: number | null | undefined): AgeGroup {
  if (age == null) return "adults";
  if (age < 18) return "children";
  if (age >= 65) return "older";
  return "adults";
}

/** The guidebook's three audiences, in display order. */
export const AGE_GROUPS: AgeGroup[] = ["children", "adults", "older"];

export const ageGroupInfo: Record<AgeGroup, { labelKey: string; shortKey: string; emoji: string; color: string }> = {
  children: { labelKey: "gd_ageChildren", shortKey: "gd_ageChildrenShort", emoji: "🧒", color: "#3E8E4F" },
  adults: { labelKey: "gd_ageAdults", shortKey: "gd_ageAdultsShort", emoji: "🧑", color: "#2F6FD6" },
  older: { labelKey: "gd_ageOlder", shortKey: "gd_ageOlderShort", emoji: "🧓", color: "#7B57C2" },
};
