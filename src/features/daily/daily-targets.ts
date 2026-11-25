// Port of lib/daily/daily_targets.dart — daily healthy targets and the day score.
// Targets are personalised from the profile (sex, age, height, weight).
// Sources: water ~35 ml/kg (ICMR-NIN / EFSA), calories from Mifflin-St Jeor,
// activity from WHO (150 min/week) and a common step goal. General guides only.

export interface DailyTargets {
  waterMl: number;
  calories: number;
  exerciseMin: number;
  steps: number;
  sleepMin: number;
  sleepMax: number;
  fruitVeg: number;
  /** Translation key saying why the calorie target is what it is
   * (`dl_keepWeightNote` or `dl_deficitNote`). */
  caloriesNote: string;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Personal targets. Missing profile values fall back to typical adults. */
export function targetsFor(p: {
  gender?: string | null; age?: number | null; heightCm?: number | null; weightKg?: number | null;
} = {}): DailyTargets {
  const male = p.gender !== "female";
  const a = p.age ?? 35;
  const h = p.heightCm ?? (male ? 168 : 155);
  const w = p.weightKg ?? (male ? 68 : 58);

  // Water: about 35 ml per kg, rounded to 100 ml, kept in a sensible range.
  const water = clamp(Math.round((w * 35) / 100) * 100, 2000, 3500);

  // Calories: BMR × light activity, minus 500 kcal if BMI ≥ 23 (Asian limit).
  const bmr = 10 * w + 6.25 * h - 5 * a + (male ? 5 : -161);
  let kcal = bmr * 1.375;
  const bmi = w / Math.pow(h / 100, 2);
  let note = "dl_keepWeightNote";
  if (bmi >= 23) {
    kcal -= 500;
    note = "dl_deficitNote";
  }
  const minKcal = male ? 1500 : 1200;
  const calories = Math.round(Math.max(kcal, minKcal) / 50) * 50;

  return {
    waterMl: water, calories, exerciseMin: 30, steps: a >= 60 ? 6000 : 8000,
    sleepMin: 7, sleepMax: 9, fruitVeg: 5, caloriesNote: note,
  };
}

/** One day's log. Null fields were skipped and are not scored. */
export interface DailyLog {
  waterMl?: number | null;
  calories?: number | null;
  exerciseMin?: number | null;
  steps?: number | null;
  sleepHours?: number | null;
  fruitVeg?: number | null;
  sugaryItems?: number | null;
  /** Foods picked in the meal picker ({food id: portions}); optional. */
  meals?: Record<string, number> | null;
}

export function isLogEmpty(log: DailyLog): boolean {
  return log.waterMl == null && log.calories == null && log.exerciseMin == null &&
    log.steps == null && log.sleepHours == null && log.fruitVeg == null && log.sugaryItems == null;
}

const intOrNull = (v: unknown) => (v == null ? null : Math.trunc(Number(v)));

export function logFromMap(m: Record<string, unknown>): DailyLog {
  const meals = m.meals as Record<string, unknown> | null | undefined;
  return {
    waterMl: intOrNull(m.water_ml),
    calories: intOrNull(m.calories),
    exerciseMin: intOrNull(m.exercise_min),
    steps: intOrNull(m.steps),
    sleepHours: m.sleep_hours == null ? null : Number(m.sleep_hours),
    fruitVeg: intOrNull(m.fruit_veg),
    sugaryItems: intOrNull(m.sugary_items),
    meals: meals == null
      ? null
      : Object.fromEntries(Object.entries(meals).map(([k, v]) => [k, Math.trunc(Number(v))])),
  };
}

export function logToMap(log: DailyLog): Record<string, unknown> {
  return {
    water_ml: log.waterMl ?? null,
    calories: log.calories ?? null,
    exercise_min: log.exerciseMin ?? null,
    steps: log.steps ?? null,
    sleep_hours: log.sleepHours ?? null,
    fruit_veg: log.fruitVeg ?? null,
    sugary_items: log.sugaryItems ?? null,
    // Always sent (null when empty) so clearing the meal picker also clears
    // the saved meals — the upsert merges, so a missing key would keep them.
    meals: !log.meals || Object.keys(log.meals).length === 0 ? null : log.meals,
  };
}

/** How well one item met its target, from 0 to 1. */
export interface ItemScore { key: string; value: number }

/** Scores a day's log out of 100. Only filled-in items count. */
export function scoreDay(log: DailyLog, t: DailyTargets): { score: number; items: ItemScore[] } {
  const upTo = (v: number, target: number) => clamp(v / target, 0, 1);
  const items: ItemScore[] = [];
  if (log.waterMl != null) items.push({ key: "water", value: upTo(log.waterMl, t.waterMl) });
  if (log.calories != null) {
    // Full marks within ±10% of target, falling to 0 at ±40%.
    const off = Math.abs(log.calories - t.calories) / t.calories;
    items.push({ key: "calories", value: clamp(1 - (off - 0.1) / 0.3, 0, 1) });
  }
  if (log.exerciseMin != null) items.push({ key: "exercise", value: upTo(log.exerciseMin, t.exerciseMin) });
  if (log.steps != null) items.push({ key: "steps", value: upTo(log.steps, t.steps) });
  if (log.sleepHours != null) {
    const s = log.sleepHours;
    let v = 1;
    if (!(s >= t.sleepMin && s <= t.sleepMax)) {
      const off = s < t.sleepMin ? t.sleepMin - s : s - t.sleepMax;
      v = clamp(1 - off / 3, 0, 1);
    }
    items.push({ key: "sleep", value: v });
  }
  if (log.fruitVeg != null) items.push({ key: "fruitVeg", value: upTo(log.fruitVeg, t.fruitVeg) });
  if (log.sugaryItems != null) {
    const n = log.sugaryItems;
    items.push({ key: "sugar", value: n === 0 ? 1 : n === 1 ? 0.6 : n === 2 ? 0.3 : 0 });
  }
  if (items.length === 0) return { score: 0, items };
  const avg = items.reduce((s, i) => s + i.value, 0) / items.length;
  return { score: Math.round(avg * 100), items };
}

/** Coins: +1 check-in, +10 for logging, +20 more at 90 or above.
 * Must match reward_rules on the server. */
export const coinsForCheckin = 1;
export const coinsForLog = 10;
export const coinsForBonus = 20;
export const bonusScore = 90;
