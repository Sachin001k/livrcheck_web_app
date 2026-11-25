"use client";
// Port of lib/rewards/rewards_screen.dart. Rewards tab: coins and level,
// how to earn, special surveys, badges, redeem (coming soon), coin history.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CountUp, ErrorState, FriendlyState, ProgressBar, SectionTitle, SkeletonList, SurfaceCard, cx, useToast } from "@/components/ui";
import { useT, type T } from "@/lib/i18n";
import { check, fetchAllRows, fetchAssessments, useDataVersion } from "@/lib/data";
import { friendlyError } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { parseDateOnly } from "@/lib/dates";
import { longestStreak } from "@/lib/streak";
import { computeBadges, type Achievement } from "./badges";
import {
  loadRewards, reasonLabels, ruleDescriptionKeys,
  type CoinEvent, type RewardRule, type RewardsData, type SpecialSurvey,
} from "./reward-store";

export const coinsPerLevel = 100;

/** "5 Oct" in the current language. */
export function shortDayMonth(t: T, d: Date) {
  return `${d.getDate()} ${t(`sv_month${d.getMonth() + 1}`)}`;
}

/** Translated name of a coin source; unknown reasons show the code. */
export function reasonName(t: T, reason: string) {
  const key = reasonLabels[reason]?.[1];
  return key ? t(key) : reason;
}

/** Badge inputs, read the same way as the app (all daily history, so
 * streak and 90+ day badges never re-lock as old days age out). */
async function loadBadges(rewards: RewardsData): Promise<Achievement[]> {
  const db = supabase();
  const [checks, days, fib4] = await Promise.all([
    db.from("survey_responses").select("score").order("created_at").limit(500).then(check),
    fetchAllRows(() => db.from("daily_checkins").select("day, score").order("day", { ascending: true })),
    fetchAssessments(1),
  ]);
  const history = (checks as { score: number | null }[]).map((r) => Number(r.score ?? 0));
  return computeBadges({
    healthChecks: history.length,
    scoreImproved: history.length > 1 && history[history.length - 1] > history[0],
    longestStreak: longestStreak(days.map((r) => parseDateOnly(String(r.day)))),
    bestDayScore: days.reduce((m, r) => Math.max(m, Number(r.score ?? 0)), 0),
    coins: rewards.totalCoins,
    bloodReportAdded: fib4.length > 0,
    specialSurveysDone: rewards.specialSurveysDone,
  });
}

export function RewardsScreen() {
  const { t, lang } = useT();
  const toast = useToast();
  const version = useDataVersion();
  const [data, setData] = useState<{ rewards: RewardsData; badges: Achievement[] } | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [nonce, setNonce] = useState(0);
  const request = useRef(0);
  const hasData = useRef(false);

  useEffect(() => {
    const req = ++request.current;
    (async () => {
      try {
        const rewards = await loadRewards();
        const badges = await loadBadges(rewards);
        if (req !== request.current) return;
        setData({ rewards, badges });
        hasData.current = true;
        setError(null);
      } catch (e) {
        if (req !== request.current) return;
        // Keep showing what we have, but say the refresh failed.
        if (hasData.current) toast(friendlyError(e, lang));
        setError(e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, nonce]);

  if (!data && error) return <SurfaceCard><ErrorState error={error} onRetry={() => setNonce((n) => n + 1)} /></SurfaceCard>;
  if (!data) return <SkeletonList count={4} height={150} />;

  const { rewards, badges } = data;
  return (
    <div className="animate-fade-up">
      <BalanceCard coins={rewards.totalCoins} />
      <SectionTitle>{t("rewardsHowToEarn")}</SectionTitle>
      <HowToEarn rules={rewards.rules} />
      <SectionTitle>{t("rewardsSpecialSurveys")}</SectionTitle>
      <SurveysList surveys={rewards.surveys} />
      <SectionTitle>{t("rewardsBadges")}</SectionTitle>
      <BadgesGrid badges={badges} />
      <SectionTitle>{t("rewardsRedeem")}</SectionTitle>
      <RedeemPlaceholder />
      <SectionTitle>{t("rewardsHistory")}</SectionTitle>
      <CoinHistory events={rewards.events} />
    </div>
  );
}

function BalanceCard({ coins }: { coins: number }) {
  const { t, tf } = useT();
  const level = Math.floor(coins / coinsPerLevel) + 1;
  const into = coins % coinsPerLevel;
  return (
    // Deep amber/brown, dark enough for white text.
    <div className="flex items-center gap-4 rounded-[20px] bg-gradient-to-r from-[#9A5B00] to-[#B45309] p-5 text-white">
      <span className="text-[56px] leading-none animate-float" aria-hidden>🪙</span>
      <div className="min-w-0 flex-1">
        <div className="font-semibold">{t("rewardsYourCoins")}</div>
        <div className="text-[40px] leading-tight font-black"><CountUp value={coins} duration={900} /></div>
        <div className="mt-1.5 text-[13px]">{tf("rw_levelLine", { level, n: coinsPerLevel - into })}</div>
        <ProgressBar value={into / coinsPerLevel} color="#ffffff" className="mt-1.5 h-[7px] bg-white/30!" />
      </div>
    </div>
  );
}

function HowToEarn({ rules }: { rules: RewardRule[] }) {
  const { t } = useT();
  return (
    <SurfaceCard className="py-1.5!">
      {rules.map((r) => (
        <div key={r.reason} className="flex items-center gap-4 border-b border-line/50 py-3 last:border-0">
          <span className="text-2xl" aria-hidden>{reasonLabels[r.reason]?.[0] ?? "🪙"}</span>
          <div className="min-w-0 flex-1">
            <div className="font-semibold">{reasonName(t, r.reason)}</div>
            <div className="text-xs text-muted">{ruleDescriptionKeys[r.reason] ? t(ruleDescriptionKeys[r.reason]) : r.description}</div>
          </div>
          <span className="shrink-0 font-extrabold text-mod-dark">
            {r.reason === "special_survey" ? t("rewardsPerSurvey") : `+${r.amount}`}
          </span>
        </div>
      ))}
    </SurfaceCard>
  );
}

function SurveysList({ surveys }: { surveys: SpecialSurvey[] }) {
  const { t } = useT();
  if (surveys.length === 0) {
    return <SurfaceCard><FriendlyState emoji="📣" title={t("rewardsSpecialSurveys")} message={t("rewardsNoSurveys")} /></SurfaceCard>;
  }
  return (
    <div className="flex flex-col gap-2.5">
      {surveys.map((s) => (
        <SurfaceCard key={s.id} className="flex items-center gap-3 p-3.5!">
          <span className="text-[28px]" aria-hidden>{s.completed ? "✅" : "📣"}</span>
          <div className="min-w-0 flex-1">
            <div className="font-bold">{s.title}</div>
            <div className="text-xs text-muted">
              {s.completed
                ? t("rewardsCompleted")
                : `🪙 ${s.rewardCoins}${s.endsAt ? ` · ${t("rewardsEnds")} ${shortDayMonth(t, s.endsAt)}` : ""}`}
            </div>
          </div>
          {!s.completed && (
            <Link href={`/rewards/survey/${encodeURIComponent(s.id)}`}
              className="inline-flex min-h-10 items-center rounded-full bg-teal-dark px-4 text-sm font-semibold text-white hover:bg-[#184c45]">
              {t("rewardsStart")}
            </Link>
          )}
        </SurfaceCard>
      ))}
    </div>
  );
}

/** Badge tiles, 3 per row on phones (5 on wide screens). */
export function BadgesGrid({ badges }: { badges: Achievement[] }) {
  const { t, tf } = useT();
  const unlocked = badges.filter((b) => b.unlocked).length;
  return (
    <SurfaceCard>
      <div className="text-xs text-muted">{tf("rw_badgesUnlocked", { n: unlocked, total: badges.length })}</div>
      <div className="mt-3 grid grid-cols-3 gap-2.5 sm:grid-cols-5">
        {badges.map((b) => (
          <div key={b.id} title={t(b.unlocked ? b.labelKey : b.hintKey)}
            className={cx("flex flex-col items-center justify-center rounded-[14px] p-2 text-center", b.unlocked ? "bg-mint" : "bg-gray-100")}>
            <span className={cx("text-[28px]", !b.unlocked && "opacity-35")} aria-hidden>{b.unlocked ? b.emoji : "🔒"}</span>
            <span className={cx("mt-1.5 w-full truncate text-[11px] font-semibold", !b.unlocked && "text-gray-500")}>{t(b.labelKey)}</span>
            {!b.unlocked && <span className="line-clamp-2 text-[9px] text-gray-500">{t(b.hintKey)}</span>}
          </div>
        ))}
      </div>
    </SurfaceCard>
  );
}

/** Placeholder until there is something to spend coins on. */
function RedeemPlaceholder() {
  const { t } = useT();
  return (
    <SurfaceCard className="flex items-center gap-3.5">
      <span className="text-4xl" aria-hidden>🎁</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold">{t("rewardsRedeem")}</span>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px]">{t("comingSoon")}</span>
        </div>
        <div className="mt-1 text-[13px] text-muted">{t("rewardsRedeemSoon")}</div>
      </div>
    </SurfaceCard>
  );
}

function CoinHistory({ events }: { events: CoinEvent[] }) {
  const { t } = useT();
  if (events.length === 0) {
    return <SurfaceCard><FriendlyState emoji="🪙" title={t("rewardsHistory")} message={t("rewardsNoHistory")} /></SurfaceCard>;
  }
  return (
    <SurfaceCard className="py-1.5!">
      {events.slice(0, 30).map((e, i) => (
        <div key={i} className="flex items-center gap-3.5 border-b border-line/50 py-2.5 last:border-0">
          <span className="text-xl" aria-hidden>{reasonLabels[e.reason]?.[0] ?? "🪙"}</span>
          <div className="min-w-0 flex-1">
            <div className="text-sm">{reasonName(t, e.reason)}</div>
            <div className="text-xs text-muted">{shortDayMonth(t, e.createdAt)}</div>
          </div>
          <span className="font-extrabold text-mod-dark">+{e.amount}</span>
        </div>
      ))}
    </SurfaceCard>
  );
}
