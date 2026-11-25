// Port of lib/rewards/badges.dart. Achievement badges on the Rewards tab.

export interface Achievement {
  /** Stable id (never shown). */
  id: string;
  emoji: string;
  /** Translation key of the badge name. */
  labelKey: string;
  /** Translation key of how to earn it, shown while locked. */
  hintKey: string;
  unlocked: boolean;
}

export function computeBadges(p: {
  healthChecks: number; scoreImproved: boolean; longestStreak: number; bestDayScore: number;
  coins: number; bloodReportAdded: boolean; specialSurveysDone: number;
}): Achievement[] {
  const b = (id: string, emoji: string, key: string, unlocked: boolean): Achievement =>
    ({ id, emoji, labelKey: key, hintKey: `${key}Hint`, unlocked });
  return [
    b("first_check", "🩺", "rw_badgeFirstCheck", p.healthChecks >= 1),
    b("improved", "📈", "rw_badgeImproved", p.scoreImproved),
    b("streak3", "🔥", "rw_badgeStreak3", p.longestStreak >= 3),
    b("streak7", "🏆", "rw_badgeStreak7", p.longestStreak >= 7),
    b("streak30", "💎", "rw_badgeStreak30", p.longestStreak >= 30),
    b("day90", "🎯", "rw_badgeDay90", p.bestDayScore >= 90),
    b("coins100", "🪙", "rw_badgeCoins100", p.coins >= 100),
    b("coins500", "💰", "rw_badgeCoins500", p.coins >= 500),
    b("blood_report", "🧪", "rw_badgeBloodReport", p.bloodReportAdded),
    b("survey_star", "📣", "rw_badgeSurveyStar", p.specialSurveysDone >= 1),
  ];
}
