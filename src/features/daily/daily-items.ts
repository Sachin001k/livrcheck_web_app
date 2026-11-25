// Port of lib/daily/daily_items.dart — the items in the daily check-in log.
import { fill, tr, type Lang } from "@/lib/i18n";
import { scoreDay, type DailyLog, type DailyTargets } from "./daily-targets";

/** Text for key in lang with `{name}` placeholders filled from args. */
export function trf(lang: Lang, key: string, args: Record<string, unknown> = {}): string {
  return fill(tr(lang, key), args);
}

export type DailyItemKey = "water" | "calories" | "exercise" | "steps" | "sleep" | "fruitVeg" | "sugar";

export interface DailyItem {
  /** Item id (stable; used in saved data and scoring). */
  key: DailyItemKey;
  emoji: string;
  titleKey: string;
  unitKey: string;
  goalKey: string;
  hintKey?: string;
  min: number;
  max: number;
  step: number;
  /** Size of one tap on the − / + buttons. */
  tapStep: number;
  /** Values for the `{placeholders}` in goalKey. */
  goalArgs: (t: DailyTargets) => Record<string, unknown>;
  /** Target the progress bar fills towards (null = lower is better). */
  goal: (t: DailyTargets) => number | null;
}

export const itemTitle = (item: DailyItem, lang: Lang) => tr(lang, item.titleKey);
export const itemUnit = (item: DailyItem, lang: Lang) => tr(lang, item.unitKey);
export const itemHint = (item: DailyItem, lang: Lang) => (item.hintKey ? tr(lang, item.hintKey) : null);
export const itemGoalText = (item: DailyItem, lang: Lang, t: DailyTargets) => trf(lang, item.goalKey, item.goalArgs(t));

/** Value as shown: up to 2 decimals for fractional steps, else a whole number. */
export function formatItemValue(item: DailyItem, v: number): string {
  return item.step < 1 ? v.toFixed(2).replace(/\.?0+$/, "") : String(Math.round(v));
}

/** Starting value when the user first touches this item. */
export function startValue(item: DailyItem, t: DailyTargets): number {
  switch (item.key) {
    case "water": return 1.5;
    case "calories": return t.calories;
    case "steps": return 3000;
    case "sleep": return 7;
    case "fruitVeg": return 2;
    default: return 0;
  }
}

export const dailyItems: DailyItem[] = [
  {
    key: "water", emoji: "💧", titleKey: "dl_water", unitKey: "dl_unitLitre",
    min: 0, max: 5, step: 0.25, tapStep: 0.25, goalKey: "dl_goalWater",
    goalArgs: (t) => ({ n: (t.waterMl / 1000).toFixed(1) }), goal: (t) => t.waterMl / 1000,
    hintKey: "dl_hintWater",
  },
  {
    key: "calories", emoji: "🍽️", titleKey: "dl_foodEaten", unitKey: "dl_unitKcal",
    min: 0, max: 4000, step: 50, tapStep: 100, goalKey: "dl_goalCalories",
    goalArgs: (t) => ({ n: t.calories }), goal: (t) => t.calories, hintKey: "dl_hintCalories",
  },
  {
    key: "exercise", emoji: "🏃", titleKey: "dl_exercise", unitKey: "dl_unitMin",
    min: 0, max: 120, step: 5, tapStep: 5, goalKey: "dl_goalExercise",
    goalArgs: (t) => ({ n: t.exerciseMin }), goal: (t) => t.exerciseMin, hintKey: "dl_hintExercise",
  },
  {
    key: "steps", emoji: "👣", titleKey: "dl_steps", unitKey: "dl_unitSteps",
    min: 0, max: 20000, step: 500, tapStep: 500, goalKey: "dl_goalSteps",
    goalArgs: (t) => ({ n: t.steps }), goal: (t) => t.steps, hintKey: "dl_hintSteps",
  },
  {
    key: "sleep", emoji: "😴", titleKey: "dl_sleep", unitKey: "dl_unitHours",
    min: 3, max: 12, step: 0.5, tapStep: 0.5, goalKey: "dl_goalSleep",
    goalArgs: (t) => ({ min: Math.round(t.sleepMin), max: Math.round(t.sleepMax) }), goal: (t) => t.sleepMin,
  },
  {
    key: "fruitVeg", emoji: "🥗", titleKey: "dl_fruitVeg", unitKey: "dl_unitServings",
    min: 0, max: 10, step: 1, tapStep: 1, goalKey: "dl_goalFruitVeg",
    goalArgs: (t) => ({ n: t.fruitVeg }), goal: (t) => t.fruitVeg, hintKey: "dl_hintFruitVeg",
  },
  {
    key: "sugar", emoji: "🍬", titleKey: "dl_sweets", unitKey: "dl_unitItems",
    min: 0, max: 6, step: 1, tapStep: 1, goalKey: "dl_goalSweets",
    goalArgs: () => ({}), goal: () => null, hintKey: "dl_hintSweets",
  },
];

/** Item values keyed by item key; null = skipped. */
export type ItemValues = Record<DailyItemKey, number | null>;

export function valuesFromLog(log: DailyLog | null | undefined): ItemValues {
  return {
    water: log?.waterMl == null ? null : log.waterMl / 1000,
    calories: log?.calories ?? null,
    exercise: log?.exerciseMin ?? null,
    steps: log?.steps ?? null,
    sleep: log?.sleepHours ?? null,
    fruitVeg: log?.fruitVeg ?? null,
    sugar: log?.sugaryItems ?? null,
  };
}

const r = (v: number | null | undefined) => (v == null ? null : Math.round(v));

export function logFromValues(v: Partial<ItemValues>, meals?: Record<string, number> | null): DailyLog {
  return {
    waterMl: v.water == null ? null : Math.round(v.water * 1000),
    calories: r(v.calories),
    exerciseMin: r(v.exercise),
    steps: r(v.steps),
    sleepHours: v.sleep ?? null,
    fruitVeg: r(v.fruitVeg),
    sugaryItems: r(v.sugar),
    meals: meals ?? null,
  };
}

/** How well `value` for `item` meets its target, 0–1, using the same rules
 * as scoreDay (so too much food or sleep scores low, not full). */
export function itemScore(item: DailyItem, value: number, t: DailyTargets): number {
  const items = scoreDay(logFromValues({ [item.key]: value }), t).items;
  return items.length === 0 ? 0 : items[0].value;
}
