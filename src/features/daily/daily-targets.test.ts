import { describe, expect, test } from "vitest";
import { scoreDay, targetsFor } from "./daily-targets";

describe("targetsFor", () => {
  test("water is about 35 ml per kg, within 2–3.5 L", () => {
    expect(targetsFor({ weightKg: 60 }).waterMl).toBe(2100);
    expect(targetsFor({ weightKg: 40 }).waterMl).toBe(2000);
    expect(targetsFor({ weightKg: 150 }).waterMl).toBe(3500);
  });

  test("calories include a deficit above the Asian BMI limit", () => {
    const healthy = targetsFor({ gender: "male", age: 30, heightCm: 175, weightKg: 65 });
    const heavy = targetsFor({ gender: "male", age: 30, heightCm: 175, weightKg: 85 });
    expect(healthy.caloriesNote).toContain("keep");
    expect(heavy.caloriesNote).toContain("deficit");
    expect(healthy.calories % 50).toBe(0);
  });

  test("calories never go below a safe minimum", () => {
    const t = targetsFor({ gender: "female", age: 70, heightCm: 145, weightKg: 60 });
    expect(t.calories).toBeGreaterThanOrEqual(1200);
  });

  test("older adults get a lower step goal", () => {
    expect(targetsFor({ age: 65 }).steps).toBeLessThan(targetsFor({ age: 30 }).steps);
  });
});

describe("scoreDay", () => {
  const t = targetsFor({ gender: "male", age: 30, heightCm: 175, weightKg: 70 });

  test("meeting every target scores 100", () => {
    const r = scoreDay({
      waterMl: t.waterMl, calories: t.calories, exerciseMin: 30,
      steps: t.steps, sleepHours: 8, fruitVeg: 5, sugaryItems: 0,
    }, t);
    expect(r.score).toBe(100);
    expect(r.items.length).toBe(7);
  });

  test("skipped items are not counted", () => {
    const r = scoreDay({ exerciseMin: 30 }, t);
    expect(r.score).toBe(100);
    expect(r.items.length).toBe(1);
  });

  test("an empty log scores 0", () => {
    expect(scoreDay({}, t).score).toBe(0);
  });

  test("half the water target gives half marks for water", () => {
    expect(scoreDay({ waterMl: Math.trunc(t.waterMl / 2) }, t).score).toBe(50);
  });

  test("eating far above the calorie target scores 0 for calories", () => {
    expect(scoreDay({ calories: Math.round(t.calories * 1.5) }, t).score).toBe(0);
  });

  test("short sleep and sweets pull the score down", () => {
    expect(scoreDay({ sleepHours: 5, sugaryItems: 3 }, t).score).toBeLessThan(50);
  });
});
