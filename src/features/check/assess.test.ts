import { describe, expect, it } from "vitest";
import { assess, plateletsToG, resultFromJson, resultToJson, textRef, type Answers } from "./assess";
import { healthQuestions, toggleMulti, visibleQuestions } from "./questions";

const healthy: Answers = {
  sex: "f", age: 28, height: 162, weight: 55, waist: 72, activity: "regular",
  sugar: "rarely", fried: "rarely", sleep: 7.5, smoke: "never", alcohol: "never",
  conditions: ["none"], family: ["none"],
};

describe("assess", () => {
  it("a healthy young adult scores well with no doctor warning", () => {
    const r = assess(healthy);
    expect(r.score).toBeGreaterThanOrEqual(80);
    expect(r.tier).toBe("Thriving");
    expect(r.seeDoctor).toBe(false);
    expect(Object.keys(r.organs)).toEqual(expect.arrayContaining(["liver", "heart", "kidneys", "lungs", "pancreas"]));
    expect(r.fib4).toBeNull();
  });

  it("diabetes, BP and smoking give a low score and a doctor warning", () => {
    const r = assess({
      ...healthy, sex: "m", age: 55, weight: 85, waist: 102, activity: "sit",
      sugar: "daily", smoke: "current", conditions: ["diabetes", "bp"],
    });
    expect(r.score).toBeLessThan(40);
    expect(r.seeDoctor).toBe(true);
    expect(r.organs.liver.level).toBe("high");
    expect(r.organs.lungs.level).toBe("high");
  });

  it("FIB-4 is calculated from lab values, with lakh platelets converted", () => {
    const r = assess({ ...healthy, age: 50, labs: { ast: 40, alt: 30, plt: 2, unit: "lakh" } });
    // (50 × 40) / (200 × √30) = 1.83 → grey zone.
    expect(r.fib4).toBeCloseTo(1.83, 2);
    expect(r.organs.liver.level).toBe("mod");
    expect(r.tests).toContain("sv_testFibroscan");
  });

  describe("FIB-4 boundaries use the rounded value", () => {
    // 50 × AST / (100 × √25) = AST / 10
    const withAst = (ast: number): Answers => ({ ...healthy, age: 50, labs: { ast, alt: 25, plt: 100, unit: "g" } });
    it("2.6704 → 2.67 → high", () => {
      const r = assess(withAst(26.704));
      expect(r.fib4).toBe(2.67);
      expect(r.organs.liver.level).toBe("high");
      expect(r.organs.liver.extra).toContain("2.67");
    });
    it("2.6696 → 2.67 → high", () => {
      const r = assess(withAst(26.696));
      expect(r.fib4).toBe(2.67);
      expect(r.organs.liver.level).toBe("high");
    });
    it("1.2996 → 1.30 → moderate", () => {
      const r = assess(withAst(12.996));
      expect(r.fib4).toBe(1.3);
      expect(r.organs.liver.level).toBe("mod");
      expect(r.organs.liver.reasons[0]).toBe("sv_rLivFib4Mid");
    });
    it("zero or negative lab values give no FIB-4", () => {
      expect(assess({ ...healthy, labs: { ast: 0, alt: 25, plt: 100, unit: "g" } }).fib4).toBeNull();
    });
  });

  it("missing waist is estimated", () => {
    expect(assess({ ...healthy, waist: null }).waistEstimated).toBe(true);
  });

  it("results survive a JSON round trip (as stored in Supabase)", () => {
    const r = assess({ ...healthy, labs: { ast: 40, alt: 30, plt: 250000, unit: "ul" } });
    const back = resultFromJson(JSON.parse(JSON.stringify(resultToJson(r))));
    expect(back.score).toBe(r.score);
    expect(back.tier).toBe(r.tier);
    expect(back.fib4).toBe(r.fib4);
    expect(back.organs.liver.reasons).toEqual(r.organs.liver.reasons);
    expect(back.plan.move.length).toBe(r.plan.move.length);
    expect(back).toEqual(r);
  });

  it("reads JSON in the app's shape (plan items as e/t/s)", () => {
    const j = resultToJson(assess(healthy)) as { plan: { habits: Record<string, string>[] } };
    expect(Object.keys(j.plan.habits[0]).sort()).toEqual(["e", "s", "t"]);
  });

  it("platelet units convert to ×10⁹/L", () => {
    expect(plateletsToG(2.5, "lakh")).toBe(250);
    expect(plateletsToG(250000, "ul")).toBe(250);
    expect(plateletsToG(250, "g")).toBe(250);
  });

  it("textRef joins placeholder values", () => {
    expect(textRef("sv_pLoseTitle", { lo: 3, hi: 6 })).toBe("sv_pLoseTitle|lo=3|hi=6");
  });
});

describe("questions (health_survey_test logic)", () => {
  it("has 15 questions; labs only show with a report", () => {
    expect(healthQuestions).toHaveLength(15);
    expect(visibleQuestions({}).map((q) => q.id)).not.toContain("labs");
    expect(visibleQuestions({ hasReport: "yes" }).map((q) => q.id)).toContain("labs");
  });
  it("PCOS is offered only to women", () => {
    const cond = healthQuestions.find((q) => q.id === "conditions")!;
    expect(cond.options!({ sex: "m" }).some((o) => o.v === "pcos")).toBe(false);
    expect(cond.options!({ sex: "f" }).some((o) => o.v === "pcos")).toBe(true);
  });
  it("exclusive options clear other picks and vice versa", () => {
    const opts = healthQuestions.find((q) => q.id === "family")!.options!({});
    const none = opts.find((o) => o.v === "none")!;
    const heart = opts.find((o) => o.v === "heart")!;
    expect(toggleMulti(["diabetes", "heart"], none, opts)).toEqual(["none"]);
    expect(toggleMulti(["none"], heart, opts)).toEqual(["heart"]);
    expect(toggleMulti(["heart"], heart, opts)).toEqual([]);
  });
  it("tapping through with defaults gives a result", () => {
    const a: Answers = {};
    for (const q of visibleQuestions(a)) {
      if (q.type === "choice" || q.type === "multi") a[q.id] = q.type === "multi" ? [q.options!(a)[0].v] : q.options!(a)[0].v;
      if (q.type === "slider") a[q.id] = q.def;
    }
    const r = assess(a);
    expect(r.score).toBeGreaterThanOrEqual(10);
    expect(r.score).toBeLessThanOrEqual(100);
  });
});
