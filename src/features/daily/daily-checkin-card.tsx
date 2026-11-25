"use client";
// Port of lib/daily/daily_checkin_card.dart — Home page daily check-in:
// check in (+1), then a swipeable card-by-card log (+10, +20 bonus at 90+),
// with animated score, coins and streak.
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Button, CountUp, ErrorState, ProgressBar, ScoreRing, Skeleton, cx, haptic, useToast } from "@/components/ui";
import { useT } from "@/lib/i18n";
import { describeError } from "@/lib/auth";
import { useLoad, type Profile } from "@/lib/data";
import { currentStreak } from "@/lib/streak";
import {
  bonusScore, coinsForBonus, coinsForCheckin, coinsForLog, scoreDay, targetsFor, type DailyTargets,
} from "./daily-targets";
import {
  dailyItems, formatItemValue, itemGoalText, itemHint, itemScore, itemTitle, itemUnit,
  logFromValues, startValue, valuesFromLog, type DailyItem, type ItemValues,
} from "./daily-items";
import { mealTotals } from "./meal-catalog";
import { MealPickerSheet } from "./meal-picker-sheet";
import { DailyStore, entryLogged, summaryToday, type DailySummary } from "./daily-store";

const kLow = "#3e8e6b";
const kMod = "#d99a2b";
const kModDark = "#8a5a00";
const kHigh = "#c4513a";
const tealDark = "#1f5e55";
const tealLight = "#5fa79a";

/** Height shared with the card beside it on the Home page (Flutter: 440,
 * growing with text size). The card fills its container and never gets
 * shorter than this. */
export const DAILY_CARD_MIN_HEIGHT = 440;

const scoreColor = (s: number) => (s >= 0.99 ? kLow : s >= 0.5 ? kMod : kHigh);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

type Phase = "overview" | "logging";

export function DailyCheckinCard({ profile, className }: {
  profile: Profile;
  /** Extra classes for the outer card (e.g. a fixed height on Home). */
  className?: string;
}) {
  const { t, tf } = useT();
  const toast = useToast();
  const { data: summary, error, reload } = useLoad(() => DailyStore.load());
  const [phase, setPhase] = useState<Phase>("overview");
  const [busy, setBusy] = useState(false);
  const [values, setValues] = useState<ItemValues>(valuesFromLog(null));
  const [meals, setMeals] = useState<Record<string, number>>({});
  const [startPage, setStartPage] = useState(0);
  const [mealsOpen, setMealsOpen] = useState(false);
  const [celebration, setCelebration] = useState<{ coins: number; message: string; id: number } | null>(null);
  const celebrationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const targets = targetsFor({
    gender: profile.gender, age: profile.age, heightCm: profile.heightCm, weightKg: profile.weightKg,
  });

  useEffect(() => () => { if (celebrationTimer.current) clearTimeout(celebrationTimer.current); }, []);

  // Escape closes the log, like Android back in the app.
  useEffect(() => {
    if (phase !== "logging" || mealsOpen) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && setPhase("overview");
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [phase, mealsOpen]);

  const celebrate = (coins: number, message: string) => {
    if (celebrationTimer.current) clearTimeout(celebrationTimer.current);
    setCelebration({ coins, message, id: Date.now() });
    celebrationTimer.current = setTimeout(() => setCelebration(null), 2200);
  };

  const showError = (e: unknown) => toast(describeError(e, t("genericError")));

  const checkIn = async () => {
    setBusy(true);
    try {
      const earned = await DailyStore.checkIn();
      haptic(25);
      if (earned) celebrate(coinsForCheckin, t("dl_checkedInCelebrate"));
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  };

  /** Opens the log, optionally at item `page` (tapping an item dot). */
  const startLog = (page = 0) => {
    const today = summary ? summaryToday(summary) : undefined;
    setValues(valuesFromLog(today?.log));
    setMeals({ ...(today?.log?.meals ?? {}) });
    setStartPage(page);
    setPhase("logging");
  };

  /** Fills calories from the meal picker; also fruit & veg and sweets if
   * the user hasn't set those yet. */
  const applyMeals = (picked: Record<string, number>) => {
    setMealsOpen(false);
    const totals = mealTotals(picked);
    setValues((prev) => {
      const v = { ...prev };
      if (Object.keys(picked).length === 0) {
        // All picks cleared: forget the calories they filled in, but keep a
        // number the user set by hand.
        const before = clamp(mealTotals(meals).kcal, 0, 4000);
        if (Object.keys(meals).length > 0 && v.calories === before) v.calories = null;
        return v;
      }
      v.calories = clamp(totals.kcal, 0, 4000);
      // Only fill unanswered items, and only with something actually picked.
      if (v.fruitVeg === null && totals.fruitVeg > 0) v.fruitVeg = clamp(totals.fruitVeg, 0, 10);
      if (v.sugar === null && totals.sweets > 0) v.sugar = clamp(totals.sweets, 0, 6);
      return v;
    });
    setMeals(picked);
  };

  const save = async () => {
    setBusy(true);
    try {
      haptic(15);
      const outcome = await DailyStore.saveLog(logFromValues(values, meals), targets);
      setPhase("overview");
      celebrate(
        outcome.coinsEarned,
        tf(outcome.score >= bonusScore ? "dl_scoreBonus" : "dl_scoreOutOf100", { score: outcome.score }),
      );
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  };

  let body: ReactNode;
  if (!summary) {
    body = error ? (
      <div className="flex flex-1 items-center justify-center"><ErrorState error={error} onRetry={reload} /></div>
    ) : (
      <CardSkeleton />
    );
  } else {
    const streak = currentStreak(Object.values(summary.days).map((e) => e.day), new Date());
    body = (
      <>
        <div className="flex items-center gap-1.5">
          <h2 className="min-w-0 flex-1 text-lg font-extrabold">{t("dl_dailyCheckin")}</h2>
          <CountPill emoji="🔥" value={streak} color="#e64a19" />
          <CountPill emoji="🪙" value={summary.totalCoins} color="#c77800" />
        </div>
        <div key={phase} className="mt-3 flex min-h-0 flex-1 flex-col animate-fade-up">
          {phase === "overview" ? (
            <Overview summary={summary} targets={targets} busy={busy} onCheckIn={checkIn} onStartLog={startLog} />
          ) : (
            <Logging
              values={values}
              setValue={(key, v) => setValues((prev) => ({ ...prev, [key]: v }))}
              targets={targets}
              startPage={startPage}
              busy={busy}
              mealCount={Object.values(meals).reduce((a, b) => a + b, 0)}
              onPickMeals={() => setMealsOpen(true)}
              onClose={() => setPhase("overview")}
              onSave={save}
            />
          )}
        </div>
      </>
    );
  }

  return (
    <div
      className={cx(
        "relative flex h-full flex-col overflow-hidden rounded-[20px] border border-line/70 bg-white p-[18px] shadow-[0_4px_12px_rgb(0_0_0/0.04)]",
        className,
      )}
      style={{ minHeight: DAILY_CARD_MIN_HEIGHT }}
    >
      {body}
      {celebration && <CelebrationOverlay key={celebration.id} coins={celebration.coins} message={celebration.message} />}
      <MealPickerSheet
        open={mealsOpen}
        initial={meals}
        targetKcal={targets.calories}
        onClose={() => setMealsOpen(false)}
        onDone={applyMeals}
      />
    </div>
  );
}

// ── Overview: check in, today's score, start/edit the log ──

function Overview({ summary, targets, busy, onCheckIn, onStartLog }: {
  summary: DailySummary; targets: DailyTargets; busy: boolean;
  onCheckIn: () => void; onStartLog: (page?: number) => void;
}) {
  const { t, tf } = useT();
  const today = summaryToday(summary);
  const checkedIn = today?.checkedIn ?? false;
  const logged = entryLogged(today);
  const score = today?.score ?? 0;

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 items-center justify-center">
        {logged ? (
          <AnimatedScoreRing score={score} />
        ) : checkedIn ? (
          <div className="flex flex-col items-center">
            <div className="text-5xl">✅</div>
            <div className="mt-1.5 font-bold">{t("dl_checkedIn")}</div>
          </div>
        ) : (
          <button
            onClick={onCheckIn}
            disabled={busy}
            className="flex size-[150px] flex-col items-center justify-center rounded-full bg-teal-dark text-white shadow-lg animate-pulse-soft hover:bg-[#184c45] disabled:opacity-60"
          >
            <span className="text-3xl">👋</span>
            <span className="mt-1 text-[15px] font-extrabold">{t("dl_checkIn")}</span>
            <span className="text-xs">+{coinsForCheckin} 🪙</span>
          </button>
        )}
      </div>
      {logged ? (
        <>
          <ItemDots values={valuesFromLog(today!.log)} targets={targets} onTap={busy ? undefined : onStartLog} />
          <p className="mt-2 text-center text-xs text-muted">
            {score >= bonusScore
              ? t("dl_bonusEarned")
              : tf("dl_reachForBonus", { score: bonusScore, coins: coinsForBonus })}
          </p>
        </>
      ) : (
        <p className="text-center text-xs text-muted">{tf("dl_quickQuestions", { n: dailyItems.length })}</p>
      )}
      <button
        onClick={() => onStartLog()}
        disabled={busy}
        className={cx(
          "mt-2.5 flex min-h-12 items-center justify-center gap-2 rounded-full px-4 py-3.5 font-semibold transition disabled:opacity-50",
          logged ? "bg-mint text-teal-dark hover:bg-[#d6ece6]" : "bg-mod-dark text-white hover:opacity-90",
        )}
      >
        <span aria-hidden>{logged ? "✏️" : "▶"}</span>
        {logged ? t("dl_editTodaysLog") : tf("dl_logToday", { coins: coinsForLog })}
      </button>
    </div>
  );
}

// ── Logging: one card per item, swipe or tap Next ──

function Logging({ values, setValue, targets, startPage, busy, mealCount, onPickMeals, onClose, onSave }: {
  values: ItemValues;
  setValue: (key: DailyItem["key"], v: number | null) => void;
  targets: DailyTargets;
  startPage: number;
  busy: boolean;
  mealCount: number;
  onPickMeals: () => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const { t, tf } = useT();
  const pager = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(startPage);
  const result = scoreDay(logFromValues(values), targets);
  const last = page === dailyItems.length - 1;

  const goTo = useCallback((p: number, smooth = true) => {
    const el = pager.current;
    if (!el) return;
    el.scrollTo({ left: p * el.clientWidth, behavior: smooth ? "smooth" : "auto" });
    setPage(p);
  }, []);

  useEffect(() => {
    if (startPage > 0) goTo(startPage, false);
  }, [startPage, goTo]);

  const onScroll = () => {
    const el = pager.current;
    if (!el || el.clientWidth === 0) return;
    const p = Math.round(el.scrollLeft / el.clientWidth);
    if (p !== page) setPage(clamp(p, 0, dailyItems.length - 1));
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center">
        <button
          onClick={onClose}
          aria-label={t("close")}
          title={t("close")}
          className="flex size-9 items-center justify-center rounded-full text-lg text-muted hover:bg-mint"
        >
          ✕
        </button>
        <div className="flex flex-1 items-center justify-center" role="tablist">
          {dailyItems.map((item, i) => (
            <button
              key={item.key}
              role="tab"
              aria-selected={i === page}
              aria-label={t(item.titleKey)}
              onClick={() => goTo(i)}
              className="flex h-6 items-center px-[3px]"
            >
              <span
                className="block h-[7px] rounded-full transition-all duration-250"
                style={{
                  width: i === page ? 18 : 7,
                  backgroundColor: i === page ? tealDark : values[item.key] === null ? "#c9d6d2" : tealLight,
                }}
              />
            </button>
          ))}
        </div>
        <span key={result.score} className="mr-2 text-base font-extrabold animate-fade-up">
          {result.items.length === 0 ? "—" : result.score}
        </span>
      </div>

      <div
        ref={pager}
        onScroll={onScroll}
        className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {dailyItems.map((item) => (
          <div key={item.key} className="flex w-full shrink-0 snap-center snap-always items-center justify-center px-1">
            <ItemPage
              item={item}
              value={values[item.key]}
              targets={targets}
              onChanged={(v) => setValue(item.key, v)}
              mealCount={mealCount}
              onPickMeals={item.key === "calories" ? onPickMeals : undefined}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        {page > 0 && (
          <button
            onClick={() => goTo(page - 1)}
            aria-label={t("dl_back")}
            title={t("dl_back")}
            className="flex size-12 items-center justify-center rounded-full border border-line text-xl text-teal-dark hover:bg-mint"
          >
            ‹
          </button>
        )}
        <button
          disabled={busy || (last && result.items.length === 0)}
          onClick={last ? onSave : () => goTo(page + 1)}
          className="flex min-h-12 flex-1 items-center justify-center rounded-full px-4 py-3.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: last ? kModDark : tealDark }}
        >
          {busy ? t("dl_saving") : last ? tf("dl_saveCoins", { coins: coinsForLog }) : t("dl_next")}
        </button>
      </div>
    </div>
  );
}

/** One item of the log: big value, − / + buttons, slider and a progress bar. */
function ItemPage({ item, value, targets, onChanged, onPickMeals, mealCount }: {
  item: DailyItem;
  value: number | null;
  targets: DailyTargets;
  onChanged: (v: number | null) => void;
  onPickMeals?: () => void;
  mealCount: number;
}) {
  const { t, tf, lang } = useT();
  const hint = itemHint(item, lang);
  const skipped = value === null;
  const v = value ?? startValue(item, targets);
  // Same per-item score as the day score, so going over a target shows a
  // short red bar, not a full one.
  const progress = skipped ? 0 : itemScore(item, v, targets);
  const set = (x: number) => onChanged(clamp(Math.round(x / item.step) * item.step, item.min, item.max));
  const title = itemTitle(item, lang);

  return (
    <div className="flex w-full flex-col items-center text-center">
      <div className="text-[40px] leading-tight animate-[fade-up_0.45s_cubic-bezier(.3,1.6,.5,1)_both]" aria-hidden>{item.emoji}</div>
      <h3 className="text-base font-bold">{title}</h3>
      <p className="text-xs text-muted">{itemGoalText(item, lang, targets)}</p>
      <div className="mt-1.5 flex w-full items-center">
        <RoundButton label="−" aria={`${title} −`} onClick={() => { haptic(); set(v - item.tapStep); }} />
        <div key={`${item.key}${value}`} className="flex-1 animate-fade-up">
          <span className={cx("text-[30px] font-extrabold", skipped && "text-muted/60")}>
            {skipped ? "—" : formatItemValue(item, v)}
          </span>
          <span className="text-xs text-muted"> {itemUnit(item, lang)}</span>
        </div>
        <RoundButton label="+" aria={`${title} +`} onClick={() => { haptic(); set(v + item.tapStep); }} />
      </div>
      <input
        type="range"
        min={item.min}
        max={item.max}
        step={item.step}
        value={clamp(v, item.min, item.max)}
        onChange={(e) => set(Number(e.target.value))}
        aria-label={title}
        className="my-2 w-full cursor-pointer accent-teal-dark"
      />
      <ProgressBar value={progress} color={scoreColor(progress)} className="h-1.5!" />
      <div className="mt-1 flex w-full items-center gap-2 text-left">
        {onPickMeals ? (
          <div className="flex-1">
            <Button onClick={onPickMeals}>
              <span aria-hidden>🍽️</span>
              {mealCount === 0 ? t("dl_pickWhatYouAte") : tf("dl_foodsPicked", { n: mealCount })}
            </Button>
          </div>
        ) : (
          <p className="line-clamp-2 flex-1 text-[11px] text-muted">{hint ?? ""}</p>
        )}
        <Button variant="text" onClick={() => onChanged(skipped ? startValue(item, targets) : null)}>
          {t(skipped ? "dl_add" : "dl_skip")}
        </Button>
      </div>
    </div>
  );
}

function RoundButton({ label, aria, onClick }: { label: string; aria: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={aria}
      className="flex size-12 shrink-0 items-center justify-center rounded-full bg-mint text-2xl font-bold text-teal-dark transition hover:bg-[#d6ece6] active:scale-95"
    >
      {label}
    </button>
  );
}

/** Small coloured chips showing how each item went today. */
function ItemDots({ values, targets, onTap }: {
  values: ItemValues; targets: DailyTargets; onTap?: (page: number) => void;
}) {
  const { lang } = useT();
  const scores = Object.fromEntries(scoreDay(logFromValues(values), targets).items.map((s) => [s.key, s.value]));
  return (
    <div className="flex flex-wrap justify-center gap-1.5">
      {dailyItems.map((item, i) => {
        const s = scores[item.key] as number | undefined;
        const color = s === undefined ? "#c9d6d2" : scoreColor(s);
        const title = itemTitle(item, lang);
        return (
          <button
            key={item.key}
            title={title}
            aria-label={title}
            disabled={!onTap}
            onClick={() => onTap?.(i)}
            className="rounded-full border px-2 py-1 text-sm transition hover:scale-105 disabled:cursor-default"
            style={{ backgroundColor: `${color}24`, borderColor: `${color}80` }}
          >
            {item.emoji}
          </button>
        );
      })}
    </div>
  );
}

function AnimatedScoreRing({ score }: { score: number }) {
  const { t } = useT();
  const color = score >= bonusScore ? kLow : score >= 60 ? tealDark : score >= 40 ? kMod : kHigh;
  return (
    <ScoreRing value={score} size={130} stroke={13} color={color} track="#dfe8e5">
      <span className="text-4xl leading-none font-extrabold"><CountUp value={score} duration={1100} /></span>
      <span className="text-[11px] text-muted">{t("dl_todaysScore")}</span>
    </ScoreRing>
  );
}

/** Streak / coin pill whose number counts up when it changes. */
function CountPill({ emoji, value, color }: { emoji: string; value: number; color: string }) {
  return (
    <span className="rounded-full px-2.5 py-1 text-[13px] font-extrabold" style={{ backgroundColor: `${color}1f`, color }}>
      {emoji} <CountUp value={value} duration={800} />
    </span>
  );
}

/** "+11 🪙" that pops up and floats away after coins are earned. */
function CelebrationOverlay({ coins, message }: { coins: number; message: string }) {
  const { t, tf } = useT();
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-white/75 animate-[celebrate-bg_2s_ease-out_forwards]">
      <style>{`
        @keyframes celebrate-bg { 0%,70% { opacity: 1 } 100% { opacity: 0 } }
        @keyframes celebrate-pop {
          0% { transform: scale(0.3); opacity: 0 }
          12% { transform: scale(1.12); opacity: 1 }
          20%, 70% { transform: scale(1) translateY(0); opacity: 1 }
          100% { transform: translateY(-40px); opacity: 0 }
        }
      `}</style>
      <div className="flex flex-col items-center animate-[celebrate-pop_2s_ease-out_forwards]">
        <div className="text-6xl">🪙</div>
        <div className="text-[28px] font-black text-[#c77800]">
          {coins > 0 ? tf("dl_plusCoins", { n: coins }) : t("dl_saved")}
        </div>
        <div className="font-semibold">{message}</div>
      </div>
    </div>
  );
}

/** Skeleton shaped like the card: header, big circle, button. */
function CardSkeleton() {
  return (
    <div className="flex flex-1 flex-col" aria-busy>
      <div className="flex items-center gap-1.5">
        <Skeleton width={140} height={22} />
        <div className="flex-1" />
        <Skeleton width={54} height={26} radius={99} />
        <Skeleton width={54} height={26} radius={99} />
      </div>
      <div className="flex flex-1 items-center justify-center"><Skeleton width={130} height={130} radius={99} /></div>
      <Skeleton width={180} height={14} className="mx-auto" />
      <Skeleton height={48} radius={24} className="mt-3" />
    </div>
  );
}
