// Port of lib/survey/assess.dart — the health check scoring. Pure; runs in
// the browser like it does in the app. The JSON shape (toJson/fromJson) is
// exactly what the app stores in survey_responses.result, so results saved
// on Android open on the web and vice versa.
import { fib4Tier, roundFib4 } from "./fib4";

export type Level = "low" | "mod" | "high";
export type Answers = Record<string, unknown>;

export interface OrganResult {
  key: string;
  name: string;
  does: string;
  level: Level;
  confidence: string;
  reasons: string[];
  extra: string | null;
}

export interface PlanItem {
  emoji: string;
  title: string;
  sub: string;
}

export type PlanKey = "eatMore" | "eatLess" | "move" | "habits";
export type HealthPlan = Record<PlanKey, PlanItem[]>;

export interface AssessmentResult {
  score: number;
  tier: string;
  bmi: number;
  waistEstimated: boolean;
  organs: Record<string, OrganResult>;
  tests: string[];
  notes: string[];
  seeDoctor: boolean;
  plan: HealthPlan;
  /** FIB-4 score when blood test values were entered, otherwise null. */
  fib4: number | null;
}

// ---------------------------------------------------------------- JSON

type Json = Record<string, unknown>;

export function resultToJson(r: AssessmentResult): Json {
  const plan = (x: PlanItem[]) => x.map((p) => ({ e: p.emoji, t: p.title, s: p.sub }));
  return {
    score: r.score,
    tier: r.tier,
    bmi: r.bmi,
    waistEstimated: r.waistEstimated,
    organs: Object.fromEntries(
      Object.entries(r.organs).map(([k, o]) => [k, {
        key: o.key, name: o.name, does: o.does, level: o.level,
        confidence: o.confidence, reasons: o.reasons, extra: o.extra,
      }]),
    ),
    tests: r.tests,
    notes: r.notes,
    seeDoctor: r.seeDoctor,
    plan: { eatMore: plan(r.plan.eatMore), eatLess: plan(r.plan.eatLess), move: plan(r.plan.move), habits: plan(r.plan.habits) },
    fib4: r.fib4,
  };
}

/** Throws if the JSON doesn't have the expected shape. */
export function resultFromJson(j: Json): AssessmentResult {
  const plan = (x: unknown): PlanItem[] =>
    (x as Json[]).map((p) => ({ emoji: String(p.e), title: String(p.t), sub: String(p.s) }));
  const p = j.plan as Json;
  const organs: Record<string, OrganResult> = {};
  for (const [k, v] of Object.entries(j.organs as Record<string, Json>)) {
    organs[k] = {
      key: String(v.key), name: String(v.name), does: String(v.does),
      level: v.level as Level, confidence: String(v.confidence),
      reasons: (v.reasons as unknown[]).map(String),
      extra: v.extra == null ? null : String(v.extra),
    };
  }
  return {
    score: Math.trunc(Number(j.score)),
    tier: String(j.tier),
    bmi: Number(j.bmi),
    waistEstimated: Boolean(j.waistEstimated),
    organs,
    tests: (j.tests as unknown[]).map(String),
    notes: (j.notes as unknown[]).map(String),
    seeDoctor: Boolean(j.seeDoctor),
    plan: { eatMore: plan(p.eatMore), eatLess: plan(p.eatLess), move: plan(p.move), habits: plan(p.habits) },
    fib4: j.fib4 == null ? null : Number(j.fib4),
  };
}

export const planByKey = (plan: HealthPlan, k: string): PlanItem[] =>
  k === "eatMore" ? plan.eatMore : k === "eatLess" ? plan.eatLess : k === "move" ? plan.move : plan.habits;

// ---------------------------------------------------------------- helpers

const NONE = "sv_reasonNone";

/** Translatable text reference for saved results: a translation key plus
 * `|name=value` per placeholder. Shown with trText() in health-ui. */
export function textRef(key: string, args: Record<string, string | number> = {}): string {
  return [key, ...Object.entries(args).map(([k, v]) => `${k}=${v}`)].join("|");
}

/** Converts a platelet count typed in unit ('lakh', 'ul' or 'g') to ×10⁹/L. */
export function plateletsToG(raw: number, unit: string): number {
  return unit === "lakh" ? raw * 100 : unit === "ul" ? raw / 1000 : raw;
}

const numOr = (v: unknown, d: number): number => (typeof v === "number" && !Number.isNaN(v) ? v : d);
const strOr = (v: unknown, d: string): string => (typeof v === "string" ? v : d);
const list = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);

// ---------------------------------------------------------------- assess

export function assess(a: Answers): AssessmentResult {
  const male = a.sex === "m";
  const age = numOr(a.age, 30);
  const height = numOr(a.height, 165);
  const weight = numOr(a.weight, 65);
  const sleep = numOr(a.sleep, 7);
  const waist = typeof a.waist === "number" ? a.waist : null;
  const activity = strOr(a.activity, "light");
  const sugar = strOr(a.sugar, "rarely");
  const fried = strOr(a.fried, "rarely");
  const smoke = strOr(a.smoke, "never");
  const alcohol = strOr(a.alcohol, "never");
  const cond = list(a.conditions);
  const fam = list(a.family);
  const has = (c: string) => cond.includes(c);
  const famHas = (c: string) => fam.includes(c);
  const diabetes = has("diabetes"), bp = has("bp"), chol = has("chol");
  const sedentary = activity === "sit";
  const hM = height / 100;
  const bmi = weight / (hM * hM); // Asian cut-offs: 23 overweight, 25 obese
  const tests = new Set<string>();
  const notes: string[] = [];
  const organs: Record<string, OrganResult> = {};
  let fib4Value: number | null = null;
  const lvl = (p: number, m: number, h: number): Level => (p >= h ? "high" : p >= m ? "mod" : "low");

  // Waist: real value, or estimated from BMI when unknown
  const waistEst = waist === null;
  let waistScore: number;
  let waistHigh: boolean;
  if (waist !== null) {
    waistHigh = male ? waist >= 90 : waist >= 80;
    waistScore = male
      ? waist >= 100 ? 20 : waist >= 90 ? 10 : 0
      : waist >= 90 ? 20 : waist >= 80 ? 10 : 0;
  } else {
    waistScore = bmi >= 25 ? 20 : bmi >= 23 ? 10 : 0;
    waistHigh = bmi >= 25;
  }

  // ---- Pancreas / blood sugar: Indian Diabetes Risk Score
  {
    const r: string[] = [];
    let idrs = age < 35 ? 0 : age < 50 ? 20 : 30;
    idrs += ({ heavy: 0, regular: 10, light: 20, sit: 30 } as Record<string, number>)[activity] ?? 20;
    idrs += famHas("diabetes") ? 10 : 0;
    idrs += waistScore;
    let level: Level = idrs >= 60 ? "high" : idrs >= 30 ? "mod" : "low";
    if (diabetes) {
      level = "high";
      r.push("sv_rPanHasDiabetes");
    }
    if (age >= 35) r.push("sv_rPanAge35");
    if (waistScore > 0) r.push(waistEst ? "sv_rPanWeightBelly" : "sv_rPanWaistHigh");
    if (sedentary || activity === "light") r.push("sv_rPanLowActivity");
    if (famHas("diabetes")) r.push("sv_rPanFamilyDiabetes");
    if (sugar === "daily") r.push("sv_rPanDailySugar");
    if (r.length === 0) r.push(NONE);
    if (level !== "low" || has("unsure")) tests.add("sv_testHba1c");
    organs.pancreas = {
      key: "pancreas", name: "sv_organPancreas", does: "sv_doesPancreas",
      level, reasons: r, confidence: "sv_confPancreas",
      extra: textRef("sv_extraRiskScore", { n: idrs }),
    };
  }

  // ---- Liver
  {
    const r: string[] = [];
    let p = 0;
    if (bmi >= 25) { p += 2; r.push("sv_rLivBmi25"); }
    else if (bmi >= 23) { p += 1; r.push("sv_rLivBmi23"); }
    if (waistHigh) { p += 2; r.push("sv_rLivBelly"); }
    if (diabetes) { p += 3; r.push("sv_rLivDiabetes"); }
    if (bp) { p += 1; r.push("sv_rLivBp"); }
    if (chol) { p += 1; r.push("sv_rLivChol"); }
    if (sedentary) { p += 1; r.push("sv_rLivSitting"); }
    if (sugar === "daily") { p += 1; r.push("sv_rLivSugar"); }
    if (fried === "often") { p += 1; r.push("sv_rLivFried"); }
    if (alcohol === "weekly") { p += 2; r.push("sv_rLivAlcohol"); }
    if (famHas("liver")) { p += 1; r.push("sv_rLivFamily"); }
    if (has("pcos")) { p += 1; r.push("sv_rLivPcos"); }
    if (has("thyroid")) { p += 1; r.push("sv_rLivThyroid"); }

    let level = lvl(p, 3, 6);
    let conf = "sv_confLiverLifestyle";
    let extra: string | null = null;
    const labs = (a.labs && typeof a.labs === "object" ? a.labs : null) as Record<string, unknown> | null;
    const ast = typeof labs?.ast === "number" ? labs.ast : null;
    const alt = typeof labs?.alt === "number" ? labs.alt : null;
    const pltRaw = typeof labs?.plt === "number" ? labs.plt : null;
    if (ast !== null && alt !== null && pltRaw !== null && ast > 0 && alt > 0 && pltRaw > 0) {
      const plt = plateletsToG(pltRaw, strOr(labs!.unit, "lakh")); // → ×10⁹/L
      // Rounded once; the same value decides the tier, is shown and saved.
      const fib4 = roundFib4((age * ast) / (plt * Math.sqrt(alt)));
      fib4Value = fib4;
      const tier = fib4Tier(fib4, age);
      extra = textRef("sv_extraFib4", { n: fib4.toFixed(2) });
      conf = "sv_confLiverFib4";
      if (tier === "high") {
        level = "high";
        r.unshift("sv_rLivFib4High");
        tests.add("sv_testFibroscan");
      } else if (tier === "intermediate") {
        level = "mod";
        r.unshift("sv_rLivFib4Mid");
        tests.add("sv_testFibroscan");
      } else {
        r.unshift("sv_rLivFib4Low");
        if (level === "high") level = "mod";
      }
      if (alt > 40) r.push("sv_rLivAltHigh");
      if (age < 35) notes.push("sv_noteFib4Under35");
    } else {
      tests.add("sv_testLft");
      tests.add("sv_testCbc");
      if (level === "high") tests.add("sv_testUltrasound");
    }
    if (r.length === 0) r.push(NONE);
    organs.liver = {
      key: "liver", name: "sv_organLiver", does: "sv_doesLiver",
      level, reasons: r, confidence: conf, extra,
    };
  }

  // ---- Heart
  {
    const r: string[] = [];
    let p = 0;
    if ((male && age >= 45) || (!male && age >= 55)) { p += 2; r.push("sv_rHeartAge"); }
    if (age >= 65) p += 1;
    if (smoke === "current") { p += 3; r.push("sv_rHeartSmoke"); }
    else if (smoke === "past") { p += 1; r.push("sv_rHeartPastSmoke"); }
    if (bp) { p += 2; r.push("sv_rHeartBp"); }
    if (diabetes) { p += 2; r.push("sv_rHeartDiabetes"); }
    if (chol) { p += 2; r.push("sv_rHeartChol"); }
    if (bmi >= 25 || waistHigh) { p += 1; r.push("sv_rHeartBelly"); }
    if (sedentary) { p += 1; r.push("sv_rHeartNoExercise"); }
    if (famHas("heart")) { p += 1; r.push("sv_rHeartFamily"); }
    if (sleep < 6) { p += 1; r.push("sv_rHeartSleep"); }
    const level = lvl(p, 3, 6);
    if (level !== "low" || chol) tests.add("sv_testLipid");
    if (level !== "low") tests.add("sv_testBp");
    if (r.length === 0) r.push(NONE);
    organs.heart = {
      key: "heart", name: "sv_organHeart", does: "sv_doesHeart",
      level, reasons: r, confidence: "sv_confHeart", extra: null,
    };
  }

  // ---- Kidneys
  {
    const r: string[] = [];
    let p = 0;
    if (diabetes) { p += 3; r.push("sv_rKidDiabetes"); }
    if (bp) { p += 3; r.push("sv_rKidBp"); }
    if (age >= 60) { p += 2; r.push("sv_rKidAge"); }
    if (famHas("kidney")) { p += 2; r.push("sv_rKidFamily"); }
    if (smoke === "current") { p += 1; r.push("sv_rKidSmoke"); }
    if (bmi >= 25) { p += 1; r.push("sv_rKidObesity"); }
    const level = lvl(p, 3, 5);
    if (level !== "low") {
      tests.add("sv_testCreatinine");
      tests.add("sv_testAcr");
    }
    if (r.length === 0) r.push(NONE);
    organs.kidneys = {
      key: "kidneys", name: "sv_organKidneys", does: "sv_doesKidneys",
      level, reasons: r, confidence: "sv_confKidneys", extra: null,
    };
  }

  // ---- Lungs
  {
    const r: string[] = [];
    let level: Level = "low";
    if (smoke === "current") { level = "high"; r.push("sv_rLungSmoke"); }
    else if (smoke === "past") { level = "mod"; r.push("sv_rLungPastSmoke"); }
    else r.push("sv_rLungNoTobacco");
    if (sedentary) r.push("sv_rLungWalking");
    organs.lungs = {
      key: "lungs", name: "sv_organLungs", does: "sv_doesLungs",
      level, reasons: r, confidence: "sv_confLungs", extra: null,
    };
  }

  // ---- Overall score
  const pen: Record<Level, number> = { low: 0, mod: 9, high: 18 };
  let score = 100;
  for (const o of Object.values(organs)) score -= pen[o.level];
  if (sleep < 6 || sleep > 9.5) score -= 4;
  score = Math.max(10, score);
  const tier = score >= 80 ? "Thriving" : score >= 60 ? "Strong" : score >= 40 ? "Building" : "Needs care";

  return {
    score,
    tier,
    bmi: Number(bmi.toFixed(1)),
    waistEstimated: waistEst,
    organs,
    tests: [...tests],
    notes,
    seeDoctor: Object.values(organs).some((o) => o.level === "high"),
    plan: buildPlan(organs, bmi, weight, activity, sugar, fried, smoke, alcohol, sleep, bp),
    fib4: fib4Value,
  };
}

const item = (emoji: string, title: string, sub: string): PlanItem => ({ emoji, title, sub });

function buildPlan(
  o: Record<string, OrganResult>, bmi: number, weight: number, activity: string,
  sugar: string, fried: string, smoke: string, alcohol: string, sleep: number, bp: boolean,
): HealthPlan {
  const eatMore: PlanItem[] = [
    item("🥬", "sv_pVegTitle", "sv_pVegSub"),
    item("🫘", "sv_pProteinTitle", "sv_pProteinSub"),
    item("🌾", "sv_pGrainsTitle", "sv_pGrainsSub"),
    ...(o.liver.level !== "low" ? [item("☕", "sv_pCoffeeTitle", "sv_pCoffeeSub")] : []),
    ...(o.heart.level !== "low" ? [item("🥜", "sv_pNutsTitle", "sv_pNutsSub")] : []),
    item("🍎", "sv_pFruitTitle", "sv_pFruitSub"),
  ];
  const eatLess: PlanItem[] = [
    ...(sugar !== "rarely" ? [item("🥤", "sv_pSugaryDrinksTitle", "sv_pSugaryDrinksSub")] : []),
    ...(fried !== "rarely" ? [item("🥟", "sv_pFriedTitle", "sv_pFriedSub")] : []),
    item("🍞", "sv_pMaidaTitle", "sv_pMaidaSub"),
    ...(bp || o.kidneys.level !== "low" ? [item("🧂", "sv_pSaltTitle", "sv_pSaltSub")] : []),
    ...(alcohol !== "never" ? [item("🍺", "sv_pAlcoholTitle", "sv_pAlcoholSub")] : []),
    item("🛢️", "sv_pOilTitle", "sv_pOilSub"),
  ];
  const move: PlanItem[] = [];
  if (bmi >= 23) {
    // Dart's round() rounds halves away from zero; weights are positive.
    const lo = Math.round(weight * 0.05), hi = Math.round(weight * 0.1);
    move.push(item("🎯", textRef("sv_pLoseTitle", { lo, hi }), "sv_pLoseSub"));
  }
  if (o.heart.level === "high") move.push(item("🩺", "sv_pDoctorFirstTitle", "sv_pDoctorFirstSub"));
  switch (activity) {
    case "sit":
      move.push(
        item("🚶", "sv_pSitWalkTitle", "sv_pSitWalkSub"),
        item("⏱️", "sv_pSitBriskTitle", "sv_pSitBriskSub"),
        item("🪑", "sv_pSitSquatsTitle", "sv_pSitSquatsSub"),
        item("⏰", "sv_pSitStandTitle", "sv_pSitStandSub"),
      );
      break;
    case "light":
      move.push(
        item("⏱️", "sv_pLightBriskTitle", "sv_pLightBriskSub"),
        item("💪", "sv_pLightStrengthTitle", "sv_pLightStrengthSub"),
        item("🧘", "sv_pLightSuryaTitle", "sv_pLightSuryaSub"),
      );
      break;
    case "regular":
      move.push(
        item("✅", "sv_pRegKeepTitle", "sv_pRegKeepSub"),
        item("💪", "sv_pRegStrengthTitle", "sv_pRegStrengthSub"),
        item("⚡", "sv_pRegIntervalsTitle", "sv_pRegIntervalsSub"),
      );
      break;
    default:
      move.push(
        item("✅", "sv_pHeavyGreatTitle", "sv_pHeavyGreatSub"),
        item("🧘", "sv_pHeavyYogaTitle", "sv_pHeavyYogaSub"),
      );
  }
  const habits: PlanItem[] = [
    item("😴", "sv_pSleepTitle", sleep < 7 ? "sv_pSleepShortSub" : "sv_pSleepOkSub"),
    ...(smoke === "current" ? [item("🚭", "sv_pQuitTitle", "sv_pQuitSub")] : []),
    item("🍽️", "sv_pDinnerTitle", "sv_pDinnerSub"),
    item("💧", "sv_pWaterTitle", "sv_pWaterSub"),
    item("📅", "sv_pRecheckTitle", "sv_pRecheckSub"),
  ];
  return { eatMore, eatLess, move, habits };
}
