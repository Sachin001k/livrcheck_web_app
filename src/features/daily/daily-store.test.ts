import { expect, test } from "vitest";
import { sumCoins } from "./daily-store";
import { weeklySummary } from "./weekly-summary";
import { itemScore, dailyItems, formatItemValue, logFromValues, valuesFromLog } from "./daily-items";
import { targetsFor } from "./daily-targets";

test("coins without a day (special surveys) count in the total only", () => {
  const r = sumCoins([
    { day: "2026-10-01", amount: 1 },
    { day: "2026-10-01", amount: 10 },
    { day: null, amount: 50 }, // special survey
    { day: "2026-09-30", amount: 1 },
  ]);
  expect(r.total).toBe(62);
  expect(r.byDay).toEqual({ "2026-10-01": 11, "2026-09-30": 1 });
});

test("weekly summary compares Monday–Sunday weeks", () => {
  const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);
  const entry = (day: Date, score: number | null) => ({
    day, checkedIn: true, log: score === null ? null : { waterMl: 2000 }, score, coins: 0,
  });
  // Thu 19 Nov 2026; week starts Mon 16 Nov.
  const s = weeklySummary([
    entry(d(2026, 11, 16), 80), entry(d(2026, 11, 18), 60), entry(d(2026, 11, 19), null),
    entry(d(2026, 11, 10), 50), entry(d(2026, 11, 15), 70), entry(d(2026, 11, 1), 10),
  ], d(2026, 11, 19));
  expect(s.averageScore).toBe(70);
  expect(s.lastWeekAverage).toBe(60);
  expect(s.change).toBe(10);
  expect(s.daysLogged).toBe(2);
  expect(s.daysCheckedIn).toBe(3);
  expect(s.bestScore).toBe(80);
});

test("item values round-trip through a log", () => {
  const v = valuesFromLog(logFromValues({ water: 1.75, sleep: 7.5, steps: 3000 }));
  expect(v.water).toBe(1.75);
  expect(v.sleep).toBe(7.5);
  expect(v.steps).toBe(3000);
  expect(v.calories).toBeNull();
  const water = dailyItems[0];
  expect(formatItemValue(water, 1.5)).toBe("1.5");
  expect(formatItemValue(water, 2)).toBe("2");
  expect(itemScore(water, 1, targetsFor({ weightKg: 60 }))).toBeCloseTo(1000 / 2100);
});
