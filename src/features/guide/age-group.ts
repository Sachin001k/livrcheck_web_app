// AgeGroup + the guideAgeGroup signal (guide_content.dart / guide_store.dart).
import { useSyncExternalStore } from "react";

export type AgeGroup = "children" | "adults" | "older";

/** Children under 18, older adults 65+, adults otherwise (and when unknown). */
export function ageGroupFor(age: number | null | undefined): AgeGroup {
  if (age == null) return "adults";
  if (age < 18) return "children";
  if (age >= 65) return "older";
  return "adults";
}

let current: AgeGroup = "adults";
const listeners = new Set<() => void>();

export function setGuideAgeGroup(g: AgeGroup) {
  if (g === current) return;
  current = g;
  listeners.forEach((l) => l());
}

/** The age group the Guide (and Home's FAQ) shows advice for. */
export function useGuideAgeGroup(): [AgeGroup, (g: AgeGroup) => void] {
  const g = useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => current,
    () => "adults" as AgeGroup,
  );
  return [g, setGuideAgeGroup];
}

/** The guidebook's three audiences, in display order. */
export const AGE_GROUPS: AgeGroup[] = ["children", "adults", "older"];

export const ageGroupInfo: Record<AgeGroup, { labelKey: string; shortKey: string; emoji: string; color: string }> = {
  children: { labelKey: "gd_ageChildren", shortKey: "gd_ageChildrenShort", emoji: "🧒", color: "#3E8E4F" },
  adults: { labelKey: "gd_ageAdults", shortKey: "gd_ageAdultsShort", emoji: "🧑", color: "#2F6FD6" },
  older: { labelKey: "gd_ageOlder", shortKey: "gd_ageOlderShort", emoji: "🧓", color: "#7B57C2" },
};
