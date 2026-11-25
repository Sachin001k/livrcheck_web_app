// Port of lib/fib4.dart — FIB-4 and BMI maths.
//
//   FIB-4 = (Age × AST) / (Platelets × √ALT)
// (Sterling RK et al., Hepatology 2006;43(6):1317-1325)
//
// The score is rounded once to 2 decimals; that rounded value decides the
// tier and is shown and saved, so they always agree.
//   < 1.30 (< 2.0 at age 65+) → low · up to 2.67 → intermediate · ≥ 2.67 → high

export const lowRiskCutoff = 1.3;
export const lowRiskCutoffAge65 = 2.0;
export const highRiskCutoff = 2.67;
export const validatedAgeMin = 35;
export const validatedAgeMax = 65;

export type RiskTier = "low" | "intermediate" | "high";

export class InvalidInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidInputError";
  }
}

export interface Fib4Result {
  score: number;
  tier: RiskTier;
  ageOutOfValidatedRange: boolean;
}

export function calculateFib4({ age, ast, alt, platelets }: { age: number; ast: number; alt: number; platelets: number }): Fib4Result {
  const values: Record<string, number> = { age, AST: ast, ALT: alt, platelets };
  for (const [k, v] of Object.entries(values)) {
    if (!(v > 0)) throw new InvalidInputError(`${k} must be a positive number.`);
  }
  const score = roundFib4((age * ast) / (platelets * Math.sqrt(alt)));
  return {
    score,
    tier: fib4Tier(score, age),
    ageOutOfValidatedRange: age < validatedAgeMin || age > validatedAgeMax,
  };
}

/** Rounds a raw FIB-4 value to 2 decimals (done once, before any cut-off). */
export function roundFib4(raw: number): number {
  return Number(raw.toFixed(2));
}

/** Tier for an already rounded FIB-4 score. The low cut-off is 2.0 from age 65. */
export function fib4Tier(score: number, age: number): RiskTier {
  const lowCut = age >= 65 ? lowRiskCutoffAge65 : lowRiskCutoff;
  if (score >= highRiskCutoff) return "high";
  if (score >= lowCut) return "intermediate";
  return "low";
}

export type BmiCategory = "underweight" | "normal" | "overweight" | "obese";

/** BMI rounded to 1 decimal; throws on non-positive input (like the app).
 * src/lib/data.ts has a non-throwing calculateBmi for profile display. */
export function calculateBmi({ heightCm, weightKg }: { heightCm: number; weightKg: number }): number {
  if (!(heightCm > 0) || !(weightKg > 0)) {
    throw new InvalidInputError("Height and weight must be positive numbers.");
  }
  const m = heightCm / 100;
  return Number((weightKg / (m * m)).toFixed(1));
}

/** Asian BMI thresholds: 23 overweight, 25 obese (same as the health check). */
export function bmiCategory(bmi: number): BmiCategory {
  if (bmi < 18.5) return "underweight";
  if (bmi < 23.0) return "normal";
  if (bmi < 25.0) return "overweight";
  return "obese";
}
