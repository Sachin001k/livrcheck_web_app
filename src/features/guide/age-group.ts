// AgeGroup + the guideAgeGroup signal (guide_content.dart / guide_store.dart).
import { useSyncExternalStore } from "react";
import type { AgeGroup } from "./age-group-data";

export { ageGroupFor, AGE_GROUPS, ageGroupInfo } from "./age-group-data";
export type { AgeGroup } from "./age-group-data";

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
