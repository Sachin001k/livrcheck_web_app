// Port of lib/streak.dart. Dates compare by local calendar day only.
import { addDays, dateOnly, startOfDay } from "./dates";

/** Consecutive active days ending today — or ending yesterday, so a streak
 * isn't shown as broken before the user has opened the app today. */
export function currentStreak(activeDays: Iterable<Date>, today: Date): number {
  const days = new Set([...activeDays].map((d) => dateOnly(d)));
  let cursor = startOfDay(today);
  if (!days.has(dateOnly(cursor))) cursor = addDays(cursor, -1);
  let streak = 0;
  while (days.has(dateOnly(cursor))) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Longest run of consecutive active days ever. */
export function longestStreak(activeDays: Iterable<Date>): number {
  const days = [...new Set([...activeDays].map((d) => dateOnly(d)))].sort();
  let best = 0, run = 0;
  let previous: string | null = null;
  for (const day of days) {
    const isNext = previous !== null && dateOnly(addDays(new Date(previous + "T00:00:00"), 1)) === day;
    run = isNext ? run + 1 : 1;
    if (run > best) best = run;
    previous = day;
  }
  return best;
}
