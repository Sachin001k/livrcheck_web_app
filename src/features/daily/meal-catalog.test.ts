import { expect, test } from "vitest";
import { mealFoods, mealTotals } from "./meal-catalog";

test("totals add up calories, fruit & veg and sweets", () => {
  const t = mealTotals({ roti: 3, dal: 1, sabzi: 2, chai: 2 });
  expect(t.kcal).toBe(3 * 100 + 150 + 2 * 120 + 2 * 80);
  expect(t.fruitVeg).toBe(2);
  expect(t.sweets).toBe(2);
  expect(t.items).toBe(8);
});

test("unknown foods and zero counts are ignored", () => {
  const t = mealTotals({ unknown_food: 4, rice: 0 });
  expect(t.kcal).toBe(0);
  expect(t.items).toBe(0);
});

test("every food has a unique id and positive portion text", () => {
  expect(new Set(mealFoods.map((f) => f.id)).size).toBe(mealFoods.length);
  expect(mealFoods.length).toBe(40); // same as meal_catalog.dart
  expect(mealFoods.every((f) => f.portionKey.length > 0 && f.kcal >= 0)).toBe(true);
});
