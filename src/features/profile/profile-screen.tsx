"use client";
// Port of lib/screens/profile_screen.dart: health score, coins and levels,
// streak, this week vs last, stats, score chart, "Every day" history and an
// activity grid. Data lives in Supabase (ProgressStore and DailyStore).
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ErrorState, ProgressBar, ScoreRing, SectionTitle, SkeletonList, Sheet, SurfaceCard, cx, useToast } from "@/components/ui";
import { useProfile, useSession } from "@/components/session";
import { useT, type T } from "@/lib/i18n";
import { fetchAssessments, profileBmi, useDataVersion, type Assessment } from "@/lib/data";
import { friendlyError } from "@/lib/auth";
import { addDays, sameDay, startOfDay } from "@/lib/dates";
import { currentStreak, longestStreak } from "@/lib/streak";
import { kHigh, kLow, kModDark, monthShort, organName, shortDate, tierText } from "@/features/check/health-ui";
import { loadProgress, dayKey, type ProgressData, type ScoreEntry } from "@/features/check/progress-store";
import { bmiCategory } from "@/features/check/fib4";
import { ResultsView } from "@/features/check/results";
import { DailyStore, entryLogged, type DailyEntry, type DailySummary } from "@/features/daily/daily-store";
import { weeklySummary, type WeeklySummary } from "@/features/daily/weekly-summary";
import { bonusScore } from "@/features/daily/daily-targets";
import { EditProfileSheet } from "@/features/onboarding/profile-setup";

/** Coins needed per level. */
const coinsPerLevel = 100;
const tealDark = "#1f5e55";
const tealLight = "#5fa79a";
const amber = "#b45309";

function scoreColor(score: number) {
  return score >= 80 ? kLow : score >= 60 ? tealDark : score >= 40 ? kModDark : kHigh;
}

/** Mon = 1 … Sun = 7 (Dart's DateTime.weekday). */
const weekday = (d: Date) => (d.getDay() === 0 ? 7 : d.getDay());

function timeText(t: T, tf: (k: string, a: Record<string, unknown>) => string, d: Date) {
  const h = d.getHours() % 12 === 0 ? 12 : d.getHours() % 12;
  return tf(d.getHours() < 12 ? "pf_timeAm" : "pf_timePm", { t: `${h}:${String(d.getMinutes()).padStart(2, "0")}` });
}

function dayLabel(t: T, d: Date) {
  const diff = Math.round((startOfDay(new Date()).getTime() - startOfDay(d).getTime()) / 86400000);
  if (diff === 0) return t("pf_today");
  if (diff === 1) return t("pf_yesterday");
  return shortDate(t, d);
}

const fib4TierColor: Record<string, string> = { low: "#2e7d32", intermediate: "#e65100", high: "#c62828" };
const fib4TierKey: Record<string, string> = { low: "tierLow", intermediate: "tierIntermediate", high: "tierHigh" };
const bmiKey = { underweight: "bmiUnderweight", normal: "bmiNormal", overweight: "bmiOverweight", obese: "bmiObese" } as const;

interface ProfileData { progress: ProgressData; fib4Checks: Assessment[]; daily: DailySummary }

export function ProfileScreen() {
  const { t, tf, lang } = useT();
  const toast = useToast();
  const router = useRouter();
  const { profile, reloadProfile } = useProfile();
  const version = useDataVersion();
  const [data, setData] = useState<ProfileData | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [nonce, setNonce] = useState(0);
  const [editing, setEditing] = useState(false);
  const [openResult, setOpenResult] = useState<ScoreEntry | null>(null);
  const loadId = useRef(0);
  const hasData = useRef(false);

  // Refresh when a check or habit is saved.
  useEffect(() => {
    const id = ++loadId.current;
    Promise.all([loadProgress(), fetchAssessments(), DailyStore.load(365)]).then(
      ([progress, fib4Checks, daily]) => {
        if (id !== loadId.current) return;
        setData({ progress, fib4Checks, daily });
        hasData.current = true;
        setError(null);
      },
      (e) => {
        if (id !== loadId.current) return;
        setError(e);
        // The error card only shows when nothing is loaded yet.
        if (hasData.current) toast(friendlyError(e, lang));
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, nonce]);

  const onOpenCheck = () => router.push("/check");
  const openEntry = (e: ScoreEntry) => e.result && setOpenResult(e);

  let body: ReactNode;
  if (!data && error) body = <SurfaceCard><ErrorState error={error} onRetry={() => setNonce((n) => n + 1)} /></SurfaceCard>;
  else if (!data) body = <SkeletonList count={3} height={120} />;
  else {
    const { daily, progress } = data;
    const now = new Date();
    // A streak day = checked in or logged that day.
    const entries = Object.values(daily.days);
    const streakDays = entries.map((e) => e.day);
    const coins = daily.totalCoins;
    const level = Math.floor(coins / coinsPerLevel) + 1;
    const into = coins % coinsPerLevel;
    const history = progress.history;
    const last = history.length ? history[history.length - 1] : null;
    const prev = history.length > 1 ? history[history.length - 2] : null;
    const delta = last && prev ? last.score - prev.score : null;
    const latestFib4 = data.fib4Checks[0] ?? null;
    const bmi = profileBmi(profile);
    body = (
      <div className="grid animate-fade-up gap-x-6 lg:grid-cols-2 lg:items-start">
        {/* Left on laptops: score, streak, this week, stats. */}
        <div className="flex min-w-0 flex-col">
        <ScoreCard last={last} delta={delta} level={level} into={into}
          onOpenLast={last?.result ? () => openEntry(last) : null} onStartCheck={onOpenCheck} />
        <div className="h-4" />
        <StreakCard streak={currentStreak(streakDays, now)} longest={longestStreak(streakDays)} streakDays={streakDays} today={now} />
        <div className="h-4" />
        <WeeklyCard summary={weeklySummary(entries, now)} />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <StatCard icon="🐷" label={t("pf_coins")} value={`${coins}`} caption={tf("pf_levelN", { level })} color={amber} />
          <StatCard icon="✅" label={t("checksDone")} value={`${history.length}`} caption={t("pf_healthChecks")} color={tealDark} />
          <StatCard icon="🩸" label={t("latestFib4")} value={latestFib4 ? latestFib4.score.toFixed(2) : "—"}
            caption={latestFib4 ? t(fib4TierKey[latestFib4.tier] ?? "tierLow") : t("pf_addBloodReport")}
            color={latestFib4 ? fib4TierColor[latestFib4.tier] ?? "#757575" : "#9e9e9e"} />
          <StatCard icon="⚖️" label={t("bmiLabel")} value={bmi != null ? bmi.toFixed(1) : "—"}
            caption={bmi == null ? t("noDataYet") : t(bmiKey[bmiCategory(bmi)])} color="#7b1fa2" />
        </div>
        </div>
        {/* Right on laptops: history, everyday list, activity. */}
        <div className="flex min-w-0 flex-col lg:[&>h2:first-child]:mt-0">
        {history.length > 1 && (<><SectionTitle>{t("pf_scoreHistory")}</SectionTitle><ScoreChart history={history} /></>)}
        <SectionTitle>{t("pf_everyDay")}</SectionTitle>
        <EverydayList daily={daily} history={history} onOpen={openEntry} onStartCheck={onOpenCheck} />
        <div className="h-4" />
        <ActivityCard daily={daily} today={now} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <HeaderCard onEdit={() => setEditing(true)} />
      <div className="h-4" />
      {body}
      <EditProfileSheet open={editing} onClose={() => setEditing(false)} initial={profile} onSaved={() => void reloadProfile()} />
      <Sheet open={openResult !== null} onClose={() => setOpenResult(null)} maxWidth={1040}
        title={openResult ? shortDate(t, openResult.date) : undefined}>
        {openResult?.result && <ResultsView result={openResult.result} takenAt={openResult.date} onClose={() => setOpenResult(null)} />}
      </Sheet>
    </div>
  );
}

function HeaderCard({ onEdit }: { onEdit: () => void }) {
  const { t, tf } = useT();
  const { profile } = useProfile();
  const { session } = useSession();
  const user = session?.user;
  const contact = user?.email ? user.email : user?.phone ? `+${user.phone}` : "";
  const name = profile.fullName?.trim() ?? "";
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("");
  const since = profile.createdAt;
  const meta = [
    tf("pf_memberSinceDate", { m: monthShort(t, since.getMonth() + 1), y: since.getFullYear() }),
    ...(profile.age != null ? [tf("pf_ageYears", { n: profile.age })] : []),
  ].join(" · ");
  const iconBtn = "flex size-10 items-center justify-center rounded-full text-lg text-white hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white";
  return (
    <div className="flex items-center gap-4 rounded-[20px] bg-gradient-to-r from-teal-dark to-teal-light p-5 text-white">
      <div className="flex size-[68px] shrink-0 items-center justify-center rounded-full bg-white text-2xl font-bold text-teal-dark">
        {initials || "🙂"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xl font-semibold">{name}</div>
        {contact && <div className="truncate text-white/70">{contact}</div>}
        <div className="mt-1 text-xs text-white/70">{meta}</div>
      </div>
      <div className="flex flex-col">
        <Link href="/settings" title={t("settingsTitle")} aria-label={t("settingsTitle")} className={iconBtn}>⚙️</Link>
        <button onClick={onEdit} title={t("editProfile")} aria-label={t("editProfile")} className={iconBtn}>✏️</button>
      </div>
    </div>
  );
}

/** Latest health score ring, change since last check, and level bar. */
function ScoreCard({ last, delta, level, into, onOpenLast, onStartCheck }: {
  last: ScoreEntry | null; delta: number | null; level: number; into: number;
  onOpenLast: (() => void) | null; onStartCheck: () => void;
}) {
  const { t, tf } = useT();
  if (!last) {
    return (
      <SurfaceCard>
        <div className="text-lg font-bold">{t("pf_getScoreTitle")}</div>
        <div className="mt-1 text-muted">{t("pf_getScoreBody")}</div>
        <button onClick={onStartCheck} className="mt-3 min-h-10 rounded-full bg-teal-dark px-5 text-sm font-semibold text-white hover:bg-[#184c45]">
          {t("pf_startMyCheck")}
        </button>
      </SurfaceCard>
    );
  }
  return (
    <SurfaceCard className="flex items-center gap-4">
      <ScoreRing value={last.score} size={96} stroke={11} color={scoreColor(last.score)} track="#dbe5e2">
        <span className="text-[28px] font-extrabold">{last.score}</span>
      </ScoreRing>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2">
          <span className="text-lg font-bold">{last.tier ? tierText(t, last.tier) : t("pf_healthScore")}</span>
          {delta !== null && (
            <span className="font-semibold" style={{ color: delta >= 0 ? kLow : kHigh }}>
              {tf("pf_sinceLastCheck", { n: `${delta >= 0 ? "+" : ""}${delta}` })}
            </span>
          )}
        </div>
        <div className="text-[13px] text-muted">{tf("pf_levelProgress", { level, n: coinsPerLevel - into, next: level + 1 })}</div>
        <ProgressBar value={into / coinsPerLevel} className="mt-1.5 h-1.5" />
        {onOpenLast && (
          <button onClick={onOpenLast} className="mt-1 min-h-9 text-sm font-semibold text-teal-dark hover:underline">{t("pf_seeLastResults")}</button>
        )}
      </div>
    </SurfaceCard>
  );
}

/** Bars for the last 10 health checks. */
function ScoreChart({ history }: { history: ScoreEntry[] }) {
  const { t } = useT();
  const shown = history.slice(Math.max(0, history.length - 10));
  const W = 320, barArea = 80, top = 16, bottom = 18;
  const H = top + barArea + bottom;
  const slot = W / shown.length;
  const bw = Math.min(28, slot - 6);
  return (
    <SurfaceCard className="px-3! pt-3! pb-2!">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={t("pf_scoreHistory")}>
        {shown.map((e, i) => {
          const h = (barArea * e.score) / 100;
          const x = i * slot + (slot - bw) / 2;
          const y = top + barArea - h;
          return (
            <g key={e.id}>
              <title>{`${e.score} · ${shortDate(t, e.date)}`}</title>
              <path d={`M${x},${y + h} V${y + 5} Q${x},${y} ${x + 5},${y} H${x + bw - 5} Q${x + bw},${y} ${x + bw},${y + 5} V${y + h} Z`}
                fill={scoreColor(e.score)} />
              <text x={x + bw / 2} y={y - 4} textAnchor="middle" fontSize="10" fill="#5c6b67">{e.score}</text>
              <text x={x + bw / 2} y={H - 4} textAnchor="middle" fontSize={shown.length > 7 ? 8 : 9.5} fill="#5c6b67">
                {`${e.date.getDate()} ${monthShort(t, e.date.getMonth() + 1)}`}
              </text>
            </g>
          );
        })}
      </svg>
    </SurfaceCard>
  );
}

const MAX_DAYS = 14;

/** One card per day, newest first: check-in, daily log score, coins earned
 * and any health checks taken that day (tap to reopen). */
function EverydayList({ daily, history, onOpen, onStartCheck }: {
  daily: DailySummary; history: ScoreEntry[]; onOpen: (e: ScoreEntry) => void; onStartCheck: () => void;
}) {
  const { t, tf } = useT();
  const checksByDay: Record<string, ScoreEntry[]> = {};
  for (const e of [...history].reverse()) (checksByDay[dayKey(e.date)] ??= []).push(e);
  const keys = [...new Set([...Object.keys(daily.days), ...Object.keys(checksByDay)])].sort((a, b) => b.localeCompare(a));
  if (keys.length === 0) {
    return (
      <SurfaceCard className="flex items-center gap-3">
        <span className="text-2xl" aria-hidden>🕘</span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{t("pf_nothingYet")}</div>
          <div className="text-sm text-muted">{t("pf_nothingYetBody")}</div>
        </div>
        <button onClick={onStartCheck} className="min-h-10 rounded-full px-3 text-sm font-semibold text-teal-dark hover:bg-mint">{t("rewardsStart")}</button>
      </SurfaceCard>
    );
  }
  return (
    <div className="flex flex-col gap-2.5">
      {keys.slice(0, MAX_DAYS).map((key) => {
        const [y, m, d] = key.split("-").map(Number);
        return <DayCard key={key} day={new Date(y, m - 1, d)} entry={daily.days[key]} checks={checksByDay[key] ?? []} onOpen={onOpen} />;
      })}
      {keys.length > MAX_DAYS && <p className="text-xs text-muted">{tf("pf_showingLastDays", { n: MAX_DAYS })}</p>}
    </div>
  );
}

function DayCard({ day, entry: e, checks, onOpen }: { day: Date; entry?: DailyEntry; checks: ScoreEntry[]; onOpen: (e: ScoreEntry) => void }) {
  const { t, tf } = useT();
  const score = e && entryLogged(e) ? e.score : null;
  const outline = "#8a9a96";
  return (
    <SurfaceCard className="pt-3! pr-2! pb-2!">
      <div className="flex items-center">
        <span className="flex-1 text-[15px] font-bold">{dayLabel(t, day)}</span>
        {e && e.coins > 0 && <span className="mr-2 font-bold text-mod-dark">🪙 +{e.coins}</span>}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <DayChip icon={e?.checkedIn ? "✓" : "○"} color={e?.checkedIn ? kLow : outline} text={t(e?.checkedIn ? "pf_checkedIn" : "pf_noCheckin")} />
        <DayChip icon="📅" color={score == null ? outline : scoreColor(score)}
          text={score == null ? t("pf_noDailyLog") : tf("pf_dailyLogScore", { n: score })} />
      </div>
      {checks.map((c) => <HistoryRow key={c.id} entry={c} onTap={() => onOpen(c)} />)}
      {checks.length === 0 && <div className="h-1.5" />}
    </SurfaceCard>
  );
}

function DayChip({ icon, color, text }: { icon: string; color: string; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ backgroundColor: `${color}1a`, color }}>
      <span aria-hidden>{icon}</span>{text}
    </span>
  );
}

function HistoryRow({ entry, onTap }: { entry: ScoreEntry; onTap: () => void }) {
  const { t, tf } = useT();
  const result = entry.result;
  // The organ needing most attention, e.g. "Liver needs attention".
  let concern: string | null = null;
  if (result) {
    const worst = Object.values(result.organs).filter((o) => o.level !== "low")
      .sort((a, b) => (a.level === "high" ? 0 : 1) - (b.level === "high" ? 0 : 1));
    concern = worst.length === 0
      ? t("pf_allOrgansGood")
      : tf(worst[0].level === "high" ? "pf_organHighRisk" : "pf_organNeedsAttention", { organ: organName(t, worst[0].key) });
  }
  const color = scoreColor(entry.score);
  const content = (
    <>
      <ScoreRing value={entry.score} size={44} stroke={4} color={color} track="#dbe5e2">
        <span className="text-sm font-extrabold">{entry.score}</span>
      </ScoreRing>
      <div className="min-w-0 flex-1">
        <div className="font-semibold">{tf("pf_healthCheckTitle", { tier: entry.tier ? tierText(t, entry.tier) : `${entry.score}/100` })}</div>
        <div className="text-sm text-muted">{[timeText(t, tf, entry.date), concern].filter(Boolean).join(" · ")}</div>
      </div>
      {result && <span className="px-2 text-xl text-muted" aria-hidden>›</span>}
    </>
  );
  const cls = "mt-2 flex w-full items-center gap-3 rounded-xl py-1.5 text-left";
  return result
    ? <button onClick={onTap} className={cx(cls, "hover:bg-mint/60")}>{content}</button>
    : <div className={cls}>{content}</div>;
}

function StreakCard({ streak, longest, streakDays, today }: { streak: number; longest: number; streakDays: Date[]; today: Date }) {
  const { t } = useT();
  const last7 = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const isActive = (d: Date) => streakDays.some((s) => sameDay(s, d));
  return (
    <SurfaceCard>
      <div className="flex items-center gap-3">
        <span className={streak > 0 ? "text-[40px]" : "text-[32px]"} aria-hidden>🔥</span>
        <div className="min-w-0 flex-1">
          <div className="text-[32px] leading-none font-bold text-[#e64a19]">{streak}</div>
          <div>{t("dayStreak")}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted">{t("longestStreak")}</div>
          <div className="font-semibold">{longest} {t("daysUnit")}</div>
        </div>
      </div>
      <div className="mt-4 flex justify-between">
        {last7.map((day, i) => {
          const on = isActive(day);
          return (
            <div key={i} className="flex flex-col items-center">
              <div className={cx("flex size-[34px] items-center justify-center rounded-full text-sm font-bold text-white",
                on ? "bg-[#e64a19]" : "bg-gray-200", i === 6 && "ring-2 ring-[#e64a19] ring-offset-0")}>
                {on && "✓"}
              </div>
              <span className="mt-1 text-xs text-muted">{t(`pf_wdLetter${weekday(day)}`)}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted">{t("pf_streakHint")}</p>
    </SurfaceCard>
  );
}

/** One number on the Profile (coins, checks done, FIB-4, BMI). */
function StatCard({ icon, label, value, caption, color }: { icon: string; label: string; value: string; caption: string; color: string }) {
  return (
    <SurfaceCard className="flex flex-col p-3.5!">
      <div className="flex items-center gap-1.5">
        <span className="text-base" aria-hidden>{icon}</span>
        <span className="truncate text-xs text-muted">{label}</span>
      </div>
      <div className="mt-auto truncate pt-1.5 text-[26px] font-bold" style={{ color }}>{value}</div>
      <div className="truncate text-xs text-muted">{caption}</div>
    </SurfaceCard>
  );
}

/** GitHub-style grid: one column per week, one row per weekday. Light =
 * checked in, darker = logged the day, darkest = scored 90+. */
function ActivityCard({ daily, today }: { daily: DailySummary; today: Date }) {
  const { t } = useT();
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const gap = 4, target = 18;
  const weeks = Math.min(26, Math.max(4, Math.floor((width + gap) / (target + gap))));
  const cell = width > 0 ? (width - gap * (weeks - 1)) / weeks : 0;
  const todayDay = startOfDay(today);
  // Monday of the first week shown.
  const start = addDays(todayDay, -(weekday(todayDay) - 1) - (weeks - 1) * 7);
  const shade = (e?: DailyEntry) => {
    if (!e) return "#eeeeee";
    if (!entryLogged(e)) return `${tealLight}66`;
    if ((e.score ?? 0) < bonusScore) return tealLight;
    return tealDark;
  };
  return (
    <SurfaceCard>
      <div className="font-semibold">{t("activityTitle")}</div>
      <div ref={ref} className="mt-3 flex" style={{ gap }}>
        {cell > 0 && Array.from({ length: weeks }, (_, w) => (
          <div key={w} className="flex flex-col" style={{ gap }}>
            {Array.from({ length: 7 }, (_, d) => {
              const day = addDays(start, w * 7 + d);
              const future = day > todayDay;
              return (
                <div key={d} title={future ? undefined : dayKey(day)}
                  style={{
                    width: cell, height: cell, borderRadius: 3,
                    backgroundColor: future ? "transparent" : shade(daily.days[dayKey(day)]),
                    outline: sameDay(day, todayDay) ? "1px solid #e64a19" : undefined,
                  }} />
              );
            })}
          </div>
        ))}
      </div>
    </SurfaceCard>
  );
}

/** This week vs last week: average daily score, days logged, best day. */
function WeeklyCard({ summary: s }: { summary: WeeklySummary }) {
  const { t, tf } = useT();
  if (s.averageScore == null) {
    return (
      <SurfaceCard className="flex items-center gap-3">
        <span className="text-[28px]" aria-hidden>📊</span>
        <span className="flex-1 text-muted">{t("weeklyEmpty")}</span>
      </SurfaceCard>
    );
  }
  const change = s.change;
  const stat = (value: string, label: string, color?: string) => (
    <div className="flex flex-1 flex-col items-center text-center">
      <span className="text-[22px] font-extrabold" style={{ color }}>{value}</span>
      <span className="text-[11px] text-muted">{label}</span>
    </div>
  );
  return (
    <SurfaceCard>
      <div className="flex items-center gap-2">
        <span className="flex-1 text-base font-bold">{t("weeklyTitle")}</span>
        {change != null && (
          <span className="text-right text-xs font-bold" style={{ color: change >= 0 ? kLow : kHigh }}>
            {change >= 0 ? "▲" : "▼"} {tf("pf_vsLastWeek", { n: Math.abs(change) })}
          </span>
        )}
      </div>
      <div className="mt-3 flex">
        {stat(`${s.averageScore}`, t("weeklyAverage"), scoreColor(s.averageScore))}
        {stat(`${s.daysLogged}/7`, t("weeklyDaysLogged"))}
        {stat(s.bestDay ? t(`pf_wd${weekday(s.bestDay)}`) : "—", `${t("weeklyBest")}${s.bestScore == null ? "" : ` · ${s.bestScore}`}`)}
      </div>
    </SurfaceCard>
  );
}
