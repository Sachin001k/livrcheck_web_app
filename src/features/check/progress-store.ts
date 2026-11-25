// Port of lib/survey/progress_store.dart — health check history, stored per
// user in survey_responses (RLS limits rows to the signed-in user).
import { supabase } from "@/lib/supabase";
import { bumpChanges, check, updateBodyStats } from "@/lib/data";
import { fib4Tier } from "./fib4";
import { plateletsToG, resultFromJson, resultToJson, type Answers, type AssessmentResult } from "./assess";

export interface ScoreEntry {
  id: string;
  date: Date;
  score: number;
  tier: string;
  /** Full result, so a past check can be reopened. Null for old rows. */
  result: AssessmentResult | null;
}

export interface ProgressData {
  /** Oldest first. */
  history: ScoreEntry[];
}

/** Most recent saved result, or null. */
export const lastResult = (p: ProgressData): AssessmentResult | null =>
  p.history.length === 0 ? null : p.history[p.history.length - 1].result;

/** Most recent entry, or null. */
export const lastEntry = (p: ProgressData): ScoreEntry | null =>
  p.history.length === 0 ? null : p.history[p.history.length - 1];

export const dayKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

type Row = Record<string, unknown>;

/** Loads up to 500 checks, oldest first (ProgressStore.load). */
export async function loadProgress(): Promise<ProgressData> {
  const rows = check(
    await supabase().from("survey_responses").select("id, score, tier, result, created_at")
      .order("created_at", { ascending: true }).limit(500),
  ) as Row[];
  const history: ScoreEntry[] = rows.map((row) => {
    let result: AssessmentResult | null = null;
    try {
      if (row.result != null) result = resultFromJson(row.result as Row);
    } catch (e) {
      console.warn(`Could not read saved result ${row.id}`, e);
    }
    return {
      id: row.id as string,
      date: new Date(row.created_at as string),
      score: row.score == null ? 0 : Math.trunc(Number(row.score)),
      tier: (row.tier as string | null) ?? "",
      result,
    };
  });
  return { history };
}

/** What saveResult has already saved, so a retry after a partial failure
 * doesn't insert the same rows twice. */
export interface SaveProgress {
  responseId: string | null;
  assessmentSaved: boolean;
}
export const newSaveProgress = (): SaveProgress => ({ responseId: null, assessmentSaved: false });

/** Saves a finished check; also records FIB-4 (when blood values were given)
 * and updates age/height/weight on the profile, except stats named in
 * skipProfileStats ('age' | 'height' | 'weight'). */
export async function saveResult(
  r: AssessmentResult,
  answers: Answers,
  { progress = newSaveProgress(), skipProfileStats = new Set<string>() }: { progress?: SaveProgress; skipProfileStats?: Set<string> } = {},
): Promise<void> {
  const db = supabase();
  if (progress.responseId === null) {
    const row = check(
      await db.from("survey_responses").insert({
        survey_version: "v1", answers, score: r.score, tier: r.tier, result: resultToJson(r),
      }).select("id").single(),
    ) as Row;
    progress.responseId = row.id as string;
  }

  const labs = answers.labs as Row | undefined | null;
  const fib4 = r.fib4;
  if (fib4 !== null && labs && !progress.assessmentSaved) {
    const age = Number(answers.age);
    check(await db.from("assessments").insert({
      age,
      ast: labs.ast,
      alt: labs.alt,
      platelets: plateletsToG(Number(labs.plt), (labs.unit as string | undefined) ?? "lakh"),
      // Same rounded value and cut-offs as the results screen.
      fib4_score: fib4,
      risk_tier: fib4Tier(fib4, age),
      height_cm: answers.height ?? null,
      weight_kg: answers.weight ?? null,
      bmi: r.bmi,
    }));
    progress.assessmentSaved = true;
  }

  const stat = (k: string): number | null =>
    skipProfileStats.has(k) || typeof answers[k] !== "number" ? null : (answers[k] as number);
  const age = stat("age");
  await updateBodyStats({ age: age == null ? null : Math.round(age), heightCm: stat("height"), weightKg: stat("weight") });
  bumpChanges();
}
