// Ports the logic parts of test/reward_store_test.dart and test/rewards_test.dart.
import { describe, expect, it } from "vitest";
import { computeBadges } from "./badges";
import { parseSpecialSurveys, surveyQuestionFromJson } from "./reward-store";
import en from "@/i18n/en.json";

const good = {
  id: "s1", title: "Water habits", description: null,
  questions: [{
    id: "glasses", type: "choice", title: "How many glasses?",
    options: [{ v: 1, label: "One" }, { v: "lots", label: "Lots", emoji: "🥤" }],
  }],
  reward_coins: 50, ends_at: null,
};

describe("parseSpecialSurveys", () => {
  it("a malformed survey is skipped, the rest still load", () => {
    const s = parseSpecialSurveys([
      good,
      { id: "s2", title: "Broken", questions: [{ id: "q", type: "text" }], reward_coins: 10 },
      { id: "s3", questions: "not a list", reward_coins: 10 },
    ], new Set(["s1"]));
    expect(s.map((x) => x.id)).toEqual(["s1"]);
    expect(s[0].completed).toBe(true);
  });
  it("numeric option values are read as text", () => {
    const [s] = parseSpecialSurveys([good], new Set());
    expect(s.questions[0].options[0].v).toBe("1");
    expect(s.questions[0].options[1].emoji).toBe("🥤");
    expect(s.completed).toBe(false);
  });
});

describe("badges", () => {
  it("a brand-new user has nothing unlocked", () => {
    const b = computeBadges({ healthChecks: 0, scoreImproved: false, longestStreak: 0, bestDayScore: 0, coins: 0, bloodReportAdded: false, specialSurveysDone: 0 });
    expect(b).toHaveLength(10);
    expect(b.filter((x) => x.unlocked)).toHaveLength(0);
    expect(b.every((x) => x.hintKey.length > 0)).toBe(true);
  });
  it("streak, coin and survey badges unlock at their thresholds", () => {
    const b = Object.fromEntries(computeBadges({ healthChecks: 1, scoreImproved: true, longestStreak: 7, bestDayScore: 92, coins: 120, bloodReportAdded: true, specialSurveysDone: 1 }).map((x) => [x.id, x.unlocked]));
    expect(b.streak3).toBe(true);
    expect(b.streak7).toBe(true);
    expect(b.streak30).toBe(false);
    expect(b.coins100).toBe(true);
    expect(b.coins500).toBe(false);
    expect(b.survey_star).toBe(true);
  });
  it("every badge name and hint has English text", () => {
    const dict = en as Record<string, string>;
    for (const x of computeBadges({ healthChecks: 0, scoreImproved: false, longestStreak: 0, bestDayScore: 0, coins: 0, bloodReportAdded: false, specialSurveysDone: 0 })) {
      expect(dict[x.labelKey], x.labelKey).toBeTruthy();
      expect(dict[x.hintKey], x.hintKey).toBeTruthy();
    }
  });
});

it("special survey questions are read from JSON", () => {
  const q = surveyQuestionFromJson({
    id: "water", type: "choice", title: "How much water do you drink?",
    options: [{ v: "low", label: "Under 1 L", emoji: "🥤" }, { v: "ok", label: "2–3 L" }],
  });
  expect(q.type).toBe("choice");
  expect(q.options).toHaveLength(2);
  expect(q.options[1].emoji).toBe("");
  expect(surveyQuestionFromJson({ id: "x", title: "Note" }).type).toBe("choice");
});
