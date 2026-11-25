// Port of lib/daily/weekly_summary.dart — this week vs last week (Profile).
import { addDays, startOfDay } from "@/lib/dates";
import { entryLogged, type DailyEntry } from "./daily-store";

export interface WeeklySummary {
  /** Average daily log score this week (null = nothing logged). */
  averageScore: number | null;
  lastWeekAverage: number | null;
  daysLogged: number;
  daysCheckedIn: number;
  bestDay: Date | null;
  bestScore: number | null;
  /** Change in average vs last week (null if either week is empty). */
  change: number | null;
}

/** Weeks run Monday–Sunday in local time. */
export function weeklySummary(days: Iterable<DailyEntry>, now: Date): WeeklySummary {
  const all = [...days];
  const today = startOfDay(now);
  const weekday = today.getDay() === 0 ? 7 : today.getDay(); // Mon = 1 … Sun = 7
  const weekStart = addDays(today, -(weekday - 1));
  const lastWeekStart = addDays(weekStart, -7);
  const inRange = (d: Date, from: Date, to: Date) => d >= from && d < to;
  const thisWeek = all.filter((e) => inRange(e.day, weekStart, addDays(today, 1)));
  const lastWeek = all.filter((e) => inRange(e.day, lastWeekStart, weekStart));

  const avg = (es: DailyEntry[]) => {
    const scores = es.filter((e) => entryLogged(e) && e.score != null).map((e) => e.score!);
    return scores.length === 0 ? null : Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  };

  let best: DailyEntry | null = null;
  for (const e of thisWeek) {
    if (entryLogged(e) && e.score != null && (best === null || e.score > best.score!)) best = e;
  }
  const averageScore = avg(thisWeek);
  const lastWeekAverage = avg(lastWeek);
  return {
    averageScore,
    lastWeekAverage,
    daysLogged: thisWeek.filter((e) => entryLogged(e)).length,
    daysCheckedIn: thisWeek.filter((e) => e.checkedIn).length,
    bestDay: best?.day ?? null,
    bestScore: best?.score ?? null,
    change: averageScore === null || lastWeekAverage === null ? null : averageScore - lastWeekAverage,
  };
}
