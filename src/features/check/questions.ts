// Port of lib/survey/questions.dart. All text fields hold translation keys
// (shown with t() / trText()).
import { textRef, type Answers } from "./assess";

export type QType = "choice" | "multi" | "slider" | "labs";

export interface Opt {
  v: string;
  label: string;
  emoji: string;
  sub?: string;
  /** e.g. "None of these" clears other picks. */
  exclusive?: boolean;
}

export interface Question {
  id: string;
  type: QType;
  title: string;
  why?: string;
  options?: (a: Answers) => Opt[];
  min: number;
  max: number;
  step: number;
  def: number;
  unit: string;
  alt?: (v: number) => string;
  unknownLabel?: string;
  showIf?: (a: Answers) => boolean;
}

const q = (x: Partial<Question> & Pick<Question, "id" | "type" | "title">): Question => ({
  min: 0, max: 0, step: 1, def: 0, unit: "", ...x,
});
const fixed = (o: Opt[]) => () => o;
const opt = (v: string, label: string, emoji: string, extra: Partial<Opt> = {}): Opt => ({ v, label, emoji, ...extra });

function feetInches(cm: number): string {
  const i = Math.round(cm / 2.54);
  return textRef("sv_altFeetInches", { ft: Math.floor(i / 12), in: i % 12 });
}

export const healthQuestions: Question[] = [
  q({
    id: "sex", type: "choice", title: "sv_qSexTitle", why: "sv_qSexWhy",
    options: fixed([opt("m", "sv_optMale", "👨"), opt("f", "sv_optFemale", "👩")]),
  }),
  q({ id: "age", type: "slider", title: "sv_qAgeTitle", min: 18, max: 90, step: 1, def: 30, unit: "sv_unitYears", why: "sv_qAgeWhy" }),
  q({ id: "height", type: "slider", title: "sv_qHeightTitle", min: 130, max: 210, step: 1, def: 165, unit: "sv_unitCm", alt: feetInches }),
  q({ id: "weight", type: "slider", title: "sv_qWeightTitle", min: 30, max: 180, step: 1, def: 65, unit: "sv_unitKg", why: "sv_qWeightWhy" }),
  q({
    id: "waist", type: "slider", title: "sv_qWaistTitle", min: 55, max: 150, step: 1, def: 85, unit: "sv_unitCm",
    alt: (v) => textRef("sv_altInches", { n: Math.round(v / 2.54) }),
    why: "sv_qWaistWhy", unknownLabel: "sv_qWaistUnknown",
  }),
  q({
    id: "activity", type: "choice", title: "sv_qActivityTitle",
    options: fixed([
      opt("sit", "sv_optSit", "🪑", { sub: "sv_optSitSub" }),
      opt("light", "sv_optLight", "🚶", { sub: "sv_optLightSub" }),
      opt("regular", "sv_optRegular", "🏃", { sub: "sv_optRegularSub" }),
      opt("heavy", "sv_optHeavy", "🏋️", { sub: "sv_optHeavySub" }),
    ]),
  }),
  q({
    id: "sugar", type: "choice", title: "sv_qSugarTitle",
    options: fixed([opt("rarely", "sv_optRarely", "🙂"), opt("weekly", "sv_optFewTimesWeek", "🍬"), opt("daily", "sv_optEveryDay", "🥤")]),
  }),
  q({
    id: "fried", type: "choice", title: "sv_qFriedTitle",
    options: fixed([opt("rarely", "sv_optRarely", "🥗"), opt("weekly", "sv_optOnceWeek", "🥟"), opt("often", "sv_optMostDays", "🍔")]),
  }),
  q({ id: "sleep", type: "slider", title: "sv_qSleepTitle", min: 3, max: 12, step: 0.5, def: 7, unit: "sv_unitHours" }),
  q({
    id: "smoke", type: "choice", title: "sv_qSmokeTitle", why: "sv_qSmokeWhy",
    options: fixed([opt("never", "sv_optNever", "🚭"), opt("past", "sv_optQuit", "🙌"), opt("current", "sv_optYes", "🚬")]),
  }),
  q({
    id: "alcohol", type: "choice", title: "sv_qAlcoholTitle",
    options: fixed([
      opt("never", "sv_optNever", "💧"),
      opt("sometimes", "sv_optOccasionally", "🥂", { sub: "sv_optOccasionallySub" }),
      opt("weekly", "sv_optEveryWeek", "🍺"),
    ]),
  }),
  q({
    id: "conditions", type: "multi", title: "sv_qConditionsTitle", why: "sv_pickAll",
    options: (a) => [
      opt("diabetes", "sv_optDiabetesPre", "🩸"),
      opt("bp", "sv_optBp", "📈"),
      opt("chol", "sv_optChol", "🧈"),
      opt("thyroid", "sv_optThyroid", "🦋"),
      ...(a.sex === "f" ? [opt("pcos", "sv_optPcos", "🌸")] : []),
      opt("none", "sv_optNoneOfThese", "👍", { exclusive: true }),
      opt("unsure", "sv_optNotSure", "🤷", { exclusive: true }),
    ],
  }),
  q({
    id: "family", type: "multi", title: "sv_qFamilyTitle", why: "sv_pickAll",
    options: fixed([
      opt("diabetes", "sv_optDiabetes", "🩸"),
      opt("heart", "sv_optHeart", "❤️"),
      opt("liver", "sv_optLiver", "🍃"),
      opt("kidney", "sv_optKidney", "🫘"),
      opt("none", "sv_optNoneOrDontKnow", "🤷", { exclusive: true }),
    ]),
  }),
  q({
    id: "hasReport", type: "choice", title: "sv_qReportTitle", why: "sv_qReportWhy",
    options: fixed([
      opt("yes", "sv_optHaveReport", "📄"),
      opt("no", "sv_optSkipReport", "⏭️", { sub: "sv_optSkipReportSub" }),
    ]),
  }),
  q({ id: "labs", type: "labs", title: "sv_qLabsTitle", showIf: (a) => a.hasReport === "yes" }),
];

/** Questions shown for the current answers (labs only with a report). */
export function visibleQuestions(a: Answers): Question[] {
  return healthQuestions.filter((x) => !x.showIf || x.showIf(a));
}

/** Multi-select toggle rule: exclusive picks clear the rest, and any
 * normal pick clears exclusive ones. */
export function toggleMulti(cur: string[], o: Opt, opts: Opt[]): string[] {
  let next = [...cur];
  if (next.includes(o.v)) next = next.filter((x) => x !== o.v);
  else if (o.exclusive) next = [o.v];
  else {
    next = next.filter((x) => !opts.some((p) => p.v === x && p.exclusive));
    next.push(o.v);
  }
  return next;
}
