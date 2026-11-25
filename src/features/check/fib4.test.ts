import { describe, expect, it } from "vitest";
import { InvalidInputError, bmiCategory, calculateBmi, calculateFib4, fib4Tier, highRiskCutoff, lowRiskCutoff } from "./fib4";

describe("calculateFib4", () => {
  it("known value matches manual calculation", () => {
    const r = calculateFib4({ age: 50, ast: 40, alt: 30, platelets: 200 });
    expect(r.score).toBe(Number(((50 * 40) / (200 * Math.sqrt(30))).toFixed(2)));
  });
  it("low risk tier", () => {
    const r = calculateFib4({ age: 30, ast: 20, alt: 30, platelets: 300 });
    expect(r.score).toBeLessThan(lowRiskCutoff);
    expect(r.tier).toBe("low");
  });
  it("high risk tier", () => {
    const r = calculateFib4({ age: 70, ast: 120, alt: 20, platelets: 80 });
    expect(r.score).toBeGreaterThan(highRiskCutoff);
    expect(r.tier).toBe("high");
  });
  it("tier uses the rounded score (2.6704 and 2.6696 show 2.67 → high)", () => {
    const a = calculateFib4({ age: 50, ast: 26.704, alt: 25, platelets: 100 });
    expect(a.score).toBe(2.67);
    expect(a.tier).toBe("high");
    const b = calculateFib4({ age: 50, ast: 26.696, alt: 25, platelets: 100 });
    expect(b.score).toBe(2.67);
    expect(b.tier).toBe("high");
  });
  it("1.2996 shows 1.30 → intermediate, not low", () => {
    const r = calculateFib4({ age: 50, ast: 12.996, alt: 25, platelets: 100 });
    expect(r.score).toBe(1.3);
    expect(r.tier).toBe("intermediate");
  });
  it("low cut-off is 2.0 from age 65", () => {
    expect(fib4Tier(1.8, 64)).toBe("intermediate");
    expect(fib4Tier(1.8, 65)).toBe("low");
    expect(fib4Tier(2.0, 65)).toBe("intermediate");
    expect(fib4Tier(2.66, 40)).toBe("intermediate");
    expect(fib4Tier(2.67, 40)).toBe("high");
  });
  it("age out of validated range", () => {
    expect(calculateFib4({ age: 25, ast: 30, alt: 30, platelets: 250 }).ageOutOfValidatedRange).toBe(true);
    expect(calculateFib4({ age: 45, ast: 30, alt: 30, platelets: 250 }).ageOutOfValidatedRange).toBe(false);
  });
  it("invalid inputs throw InvalidInputError", () => {
    expect(() => calculateFib4({ age: 0, ast: 30, alt: 30, platelets: 200 })).toThrow(InvalidInputError);
    expect(() => calculateFib4({ age: 40, ast: -5, alt: 30, platelets: 200 })).toThrow(InvalidInputError);
    expect(() => calculateFib4({ age: 40, ast: 30, alt: 0, platelets: 200 })).toThrow(InvalidInputError);
    expect(() => calculateFib4({ age: 40, ast: 30, alt: 30, platelets: 0 })).toThrow(InvalidInputError);
  });
});

describe("calculateBmi", () => {
  it("calculates BMI correctly", () => {
    expect(calculateBmi({ heightCm: 170, weightKg: 70 })).toBe(Number((70 / (1.7 * 1.7)).toFixed(1)));
  });
  it("categorizes BMI using Asian thresholds", () => {
    expect(bmiCategory(17)).toBe("underweight");
    expect(bmiCategory(22)).toBe("normal");
    expect(bmiCategory(24)).toBe("overweight");
    expect(bmiCategory(25)).toBe("obese");
    expect(bmiCategory(30)).toBe("obese");
  });
  it("invalid inputs throw InvalidInputError", () => {
    expect(() => calculateBmi({ heightCm: 0, weightKg: 70 })).toThrow(InvalidInputError);
    expect(() => calculateBmi({ heightCm: 170, weightKg: -1 })).toThrow(InvalidInputError);
  });
});
