// Port of lib/rewards/reward_store.dart: reward rules, coin history,
// special surveys and claiming their coins. Coin amounts are set and
// checked on the server (award_coins trigger), never trusted from the app.
import { supabase } from "@/lib/supabase";
import { bumpChanges, check } from "@/lib/data";

/** One way to earn coins (table reward_rules). */
export interface RewardRule { reason: string; amount: number; description: string }

/** One coin reward the user received (table coin_events). */
export interface CoinEvent { reason: string; amount: number; createdAt: Date; refId: string | null }

export interface SurveyOption { v: string; label: string; emoji: string }

/** One question of a special survey (JSON in special_surveys.questions). */
export interface SurveyQuestion {
  id: string;
  /** 'choice', 'multi', 'scale' (1–5) or 'text'. */
  type: string;
  title: string;
  options: SurveyOption[];
}

/** An announced survey with its own coin reward (table special_surveys). */
export interface SpecialSurvey {
  id: string;
  title: string;
  description: string | null;
  questions: SurveyQuestion[];
  rewardCoins: number;
  endsAt: Date | null;
  completed: boolean;
}

export interface RewardsData {
  rules: RewardRule[];
  /** Newest first. */
  events: CoinEvent[];
  surveys: SpecialSurvey[];
  /** All coins ever earned (coin_balances view, not cut short like events). */
  totalCoins: number;
  /** Special surveys answered, including ones that have since closed. */
  specialSurveysDone: number;
}

export const openSurveysOf = (d: RewardsData) => d.surveys.filter((s) => !s.completed);

// Mirrors daily_targets.dart (coinsForCheckin / coinsForLog / coinsForBonus).
const COINS_FOR_CHECKIN = 1;
const COINS_FOR_LOG = 10;
const COINS_FOR_BONUS = 20;

/** Fallback rules shown if reward_rules can't be read. */
export const defaultRules: RewardRule[] = [
  { reason: "checkin", amount: COINS_FOR_CHECKIN, description: "Tapped Check in on the Home page (once a day)" },
  { reason: "daily_log", amount: COINS_FOR_LOG, description: "Filled in the daily health log (once a day)" },
  { reason: "daily_bonus", amount: COINS_FOR_BONUS, description: "Daily log scored 90 or more (once a day)" },
  { reason: "special_survey", amount: 0, description: "Completed a special survey" },
];

/** Emoji and translation key of each coin source (reason codes never change). */
export const reasonLabels: Record<string, [emoji: string, key: string]> = {
  checkin: ["👋", "rw_reasonCheckin"],
  daily_log: ["📝", "rw_reasonDailyLog"],
  daily_bonus: ["🎯", "rw_reasonDailyBonus"],
  special_survey: ["📣", "rw_reasonSpecialSurvey"],
};

/** "How to earn" text keys for known reasons (instead of the English description). */
export const ruleDescriptionKeys: Record<string, string> = {
  checkin: "rw_ruleCheckin",
  daily_log: "rw_ruleDailyLog",
  daily_bonus: "rw_ruleDailyBonus",
  special_survey: "rw_ruleSpecialSurvey",
};

type Row = Record<string, unknown>;

/** SurveyQuestion.fromJson. Throws if the id or title is missing; option
 * values are read as text, so {"v": 1} works like {"v": "1"}. */
export function surveyQuestionFromJson(j: Row): SurveyQuestion {
  if (j == null || typeof j !== "object") throw new Error("Survey question must be an object");
  const id = j.id, title = j.title;
  if (id == null || title == null) throw new Error("Survey question needs an id and a title");
  const rawOptions = j.options ?? [];
  if (!Array.isArray(rawOptions)) throw new Error("Survey options must be a list");
  return {
    id: String(id),
    type: String(j.type ?? "choice"),
    title: String(title),
    options: rawOptions.map((o: Row) => {
      if (o == null || typeof o !== "object") throw new Error("Survey option must be an object");
      return { v: String(o.v), label: String(o.label ?? o.v), emoji: String(o.emoji ?? "") };
    }),
  };
}

/** Builds SpecialSurveys from special_surveys rows. A malformed row is
 * skipped (and logged) so one bad survey can't break the Rewards tab. */
export function parseSpecialSurveys(rows: Row[], answered: Set<string>): SpecialSurvey[] {
  const out: SpecialSurvey[] = [];
  for (const r of rows) {
    try {
      if (r.id == null || r.title == null) throw new Error("Survey needs an id and a title");
      const id = String(r.id);
      const qs = r.questions ?? [];
      if (!Array.isArray(qs)) throw new Error("questions must be a list");
      out.push({
        id,
        title: String(r.title),
        description: r.description == null ? null : String(r.description),
        questions: qs.map((q) => surveyQuestionFromJson(q as Row)),
        rewardCoins: Math.trunc(Number(r.reward_coins ?? 0)),
        endsAt: r.ends_at == null ? null : new Date(String(r.ends_at)),
        completed: answered.has(id),
      });
    } catch (e) {
      console.warn(`Skipping malformed special survey ${String(r.id)}:`, e);
    }
  }
  return out;
}

const db = () => supabase();

/** All coins the user has ever earned, from the coin_balances view. */
export async function fetchCoinTotal(): Promise<number> {
  const row = check(await db().from("coin_balances").select("total").maybeSingle()) as Row | null;
  return Math.trunc(Number(row?.total ?? 0));
}

export async function loadRewards(): Promise<RewardsData> {
  const [rulesRows, eventRows, surveyRows, answeredRows, total] = await Promise.all([
    db().from("reward_rules").select("reason, amount, description").eq("active", true).then(check),
    // History list only; the total comes from coin_balances.
    db().from("coin_events").select("reason, amount, created_at, ref_id")
      .order("created_at", { ascending: false }).limit(200).then(check),
    // RLS returns live surveys plus ones this user has answered (migration 7).
    db().from("special_surveys").select().order("starts_at", { ascending: false }).then(check),
    db().from("special_survey_responses").select("survey_id").then(check),
    fetchCoinTotal(),
  ]);
  const rules = (rulesRows as Row[]).map((r) => ({
    reason: String(r.reason), amount: Math.trunc(Number(r.amount)), description: String(r.description ?? ""),
  }));
  const events = (eventRows as Row[]).map((r) => ({
    reason: String(r.reason), amount: Math.trunc(Number(r.amount)),
    createdAt: new Date(String(r.created_at)), refId: (r.ref_id as string | null) ?? null,
  }));
  const answered = new Set((answeredRows as Row[]).map((r) => String(r.survey_id)));
  return {
    rules: rules.length === 0 ? defaultRules : rules,
    events,
    surveys: parseSpecialSurveys(surveyRows as Row[], answered),
    totalCoins: total,
    specialSurveysDone: answered.size,
  };
}

/** Same as RewardStore.load in the app. */
export const load = loadRewards;

/** Live surveys the user hasn't answered yet (for the Home banner). */
export async function openSurveys(): Promise<SpecialSurvey[]> {
  return openSurveysOf(await loadRewards());
}

/** One survey by id (for the /rewards/survey/[id] page), or null. */
export async function fetchSpecialSurvey(id: string): Promise<SpecialSurvey | null> {
  const data = await loadRewards();
  return data.surveys.find((s) => s.id === id) ?? null;
}

/** Saves the answers, then claims the survey's coins (the server checks the
 * survey is open and answered, and sets the amount). Safe to repeat. */
export async function submitSpecialSurvey(survey: SpecialSurvey, answers: Record<string, unknown>): Promise<number> {
  const { data } = await db().auth.getSession();
  const uid = data.session?.user.id;
  if (!uid) throw new Error("Not signed in");
  check(await db().from("special_survey_responses").upsert(
    { survey_id: survey.id, user_id: uid, answers },
    { onConflict: "survey_id,user_id", ignoreDuplicates: true },
  ));
  const { error } = await db().from("coin_events").insert({
    user_id: uid, reason: "special_survey", ref_id: survey.id,
    amount: 0, // replaced by the server with the survey's reward
  });
  // 23505 = unique violation: the coins were already paid.
  if (error && (error as { code?: string }).code !== "23505") throw error;
  bumpChanges();
  return survey.rewardCoins;
}
