"use client";
// Port of lib/survey/health_survey_screen.dart — the one-question-per-screen
// health check in the Check tab. In-progress answers are kept in
// sessionStorage (the app keeps them alive in an IndexedStack), and browser
// Back steps to the previous question / closes the results.
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n";
import { useLoad, type Profile } from "@/lib/data";
import { describeError } from "@/lib/auth";
import { useProfile } from "@/components/session";
import { BigButton, ProgressBar, ScoreRing, SurfaceCard, cx, haptic } from "@/components/ui";
import { assess, plateletsToG, type Answers, type AssessmentResult } from "./assess";
import { BodyMap } from "./body-map";
import { kDisclaimer, kHigh, kModDark, scoreColor, shortDate, tierText, trText } from "./health-ui";
import { lastEntry, loadProgress, newSaveProgress, saveResult, type ScoreEntry } from "./progress-store";
import { toggleMulti, visibleQuestions, type Opt, type Question } from "./questions";
import { ResultsView } from "./results";

/** How often we suggest re-taking the check (the plan says 3 months). */
const RECHECK_DAYS = 90;

type Labs = {
  ast: number | null; alt: number | null; plt: number | null;
  unit: string; skip: Record<string, boolean>; unitPicked?: boolean;
};

interface Stored {
  started: boolean;
  step: number;
  answers: Answers;
  fromProfile: Record<string, number>;
}

type ResultsState = {
  result: AssessmentResult;
  takenAt?: Date;
  fresh: boolean;
  saveError: string | null;
  retry?: () => Promise<string | null>;
};

const storeKey = (uid: string) => `livrcheck_check_${uid}`;
function readStored(uid: string): Stored | null {
  try {
    const raw = sessionStorage.getItem(storeKey(uid));
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    return null;
  }
}
function writeStored(uid: string, s: Stored) {
  try { sessionStorage.setItem(storeKey(uid), JSON.stringify(s)); } catch { /* ignore */ }
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Pre-fills what the profile already knows; the user only confirms. With
 * `old`, only fields that differ from `old` are applied. */
function prefill(a: Answers, fromProfile: Record<string, number>, p: Profile, old?: Profile) {
  if (!old || p.gender !== old.gender) {
    if (p.gender === "male") a.sex = "m";
    if (p.gender === "female") a.sex = "f";
  }
  const stat = (k: string, value: number | null, oldValue: number | null | undefined, min: number, max: number) => {
    if (value == null || (old && value === oldValue)) return;
    const v = Math.round(clamp(value, min, max));
    a[k] = v;
    fromProfile[k] = v;
  };
  stat("age", p.age, old?.age, 18, 90);
  stat("height", p.heightCm, old?.heightCm, 130, 210);
  stat("weight", p.weightKg, old?.weightKg, 30, 180);
}

/** Pushes one history entry while `active`, so browser Back calls onBack
 * instead of leaving the page; re-armed after each Back while still active. */
function useBackGuard(active: boolean, onBack: () => void) {
  const pushed = useRef(false);
  const ignoreNext = useRef(false);
  const onBackRef = useRef(onBack);
  const [rearm, setRearm] = useState(0);
  useEffect(() => { onBackRef.current = onBack; });

  useEffect(() => {
    if (active && !pushed.current) {
      window.history.pushState({ lcCheckGuard: true }, "");
      pushed.current = true;
    } else if (!active && pushed.current) {
      // Left by a button: drop the guard entry we added.
      pushed.current = false;
      ignoreNext.current = true;
      window.history.back();
    }
  }, [active, rearm]);

  useEffect(() => {
    const h = () => {
      if (ignoreNext.current) { ignoreNext.current = false; return; }
      if (!pushed.current) return;
      pushed.current = false;
      onBackRef.current();
      setRearm((n) => n + 1);
    };
    window.addEventListener("popstate", h);
    return () => window.removeEventListener("popstate", h);
  }, []);

  /** Forget the guard entry without going back (the caller replaces it). */
  return useCallback(() => { pushed.current = false; }, []);
}

export function CheckScreen() {
  const { t, tf } = useT();
  const router = useRouter();
  const { profile, reloadProfile } = useProfile();

  const [state, setState] = useState<Stored>(() => {
    const stored = typeof window === "undefined" ? null : readStored(profile.id);
    if (stored) return stored;
    const answers: Answers = {};
    const fromProfile: Record<string, number> = {};
    prefill(answers, fromProfile, profile);
    return { started: false, step: 0, answers, fromProfile };
  });
  const [saving, setSaving] = useState(false);
  const [results, setResults] = useState<ResultsState | null>(null);
  const advancing = useRef(false);
  const { started, step, answers: a } = state;

  useEffect(() => writeStored(profile.id, state), [profile.id, state]);

  // Pick up profile edits (only the fields that changed).
  const prevProfile = useRef(profile);
  useEffect(() => {
    const old = prevProfile.current;
    prevProfile.current = profile;
    if (old === profile) return;
    setState((s) => {
      const answers = { ...s.answers };
      const fromProfile = { ...s.fromProfile };
      prefill(answers, fromProfile, profile, old);
      return { ...s, answers, fromProfile };
    });
  }, [profile]);

  const last = useLoad(loadProgress);
  const lastCheck = last.data ? lastEntry(last.data) : null;

  const visible = visibleQuestions(a);
  const setAnswer = (k: string, v: unknown) => setState((s) => ({ ...s, answers: { ...s.answers, [k]: v } }));

  useEffect(() => { window.scrollTo({ top: 0 }); }, [step, started, results]);

  const start = () => {
    setState((s) => {
      // Keep earlier lifestyle answers for a quick re-check, but always ask
      // about the blood report again. Body stats come fresh from the profile.
      const answers = { ...s.answers };
      const fromProfile = { ...s.fromProfile };
      prefill(answers, fromProfile, profile);
      delete answers.hasReport;
      delete answers.labs;
      return { started: true, step: 0, answers, fromProfile };
    });
  };

  const back = useCallback(() => {
    setState((s) => (s.step === 0 ? { ...s, started: false } : { ...s, step: s.step - 1 }));
  }, []);

  const finish = async (answers: Answers = a) => {
    if (saving) return;
    const input: Answers = { ...answers };
    if (input.hasReport !== "yes") delete input.labs;
    const result = assess(input);
    // Body stats left at the pre-filled value aren't written back, so the
    // profile's real value (e.g. 200 kg, beyond the slider) is kept.
    const skip = new Set(
      Object.entries(state.fromProfile).filter(([k, v]) => input[k] === v).map(([k]) => k),
    );
    const unknownError = t("sv_unknownError");
    setSaving(true);
    // Shared by the first try and every retry, so rows aren't inserted twice.
    const progress = newSaveProgress();
    const save = async (): Promise<string | null> => {
      try {
        await saveResult(result, input, { progress, skipProfileStats: skip });
        await reloadProfile();
        return null;
      } catch (e) {
        return describeError(e, unknownError);
      }
    };
    const error = await save();
    setSaving(false);
    setState((s) => ({ ...s, started: false, step: 0 }));
    setResults({ result, fresh: true, saveError: error, retry: save });
  };

  const next = () => {
    if (step >= visible.length - 1) void finish();
    else setState((s) => ({ ...s, step: s.step + 1 }));
  };

  const releaseGuard = useBackGuard((started && !saving) || results !== null, () => {
    if (results) setResults(null);
    else back();
  });

  if (saving) {
    return (
      <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-4" role="status">
        <span className="size-10 animate-spin rounded-full border-4 border-mint border-t-teal-dark" />
        <span>{t("sv_savingResults")}</span>
      </div>
    );
  }

  if (results) {
    return (
      <ResultsView
        result={results.result}
        takenAt={results.takenAt}
        saveError={results.saveError}
        onRetrySave={results.fresh ? results.retry : undefined}
        onTrackHabits={results.fresh ? () => {
          // Replace the guard entry with Profile, so Back returns to Check.
          releaseGuard();
          setResults(null);
          router.replace("/profile");
        } : undefined}
        onClose={() => setResults(null)}
      />
    );
  }

  if (!started) {
    return (
      <Intro
        last={lastCheck}
        onStart={start}
        onOpenLast={(e) => e.result && setResults({ result: e.result, takenAt: e.date, fresh: false, saveError: null })}
      />
    );
  }

  const idx = Math.min(step, visible.length - 1);
  const q = visible[idx];

  let body: React.ReactNode;
  if (q.type === "choice") {
    body = (
      <div className="flex flex-col gap-2.5">
        {q.options!(a).map((o) => (
          <OptionCard
            key={o.v}
            opt={o}
            selected={a[q.id] === o.v}
            onTap={async () => {
              if (advancing.current) return;
              haptic();
              const updated = { ...a, [q.id]: o.v };
              setAnswer(q.id, o.v);
              advancing.current = true;
              await new Promise((r) => setTimeout(r, 220)); // let the tick show
              advancing.current = false;
              // The answer may change which questions follow (e.g. "labs").
              if (idx >= visibleQuestions(updated).length - 1) void finish(updated);
              else setState((s) => ({ ...s, step: idx + 1 }));
            }}
          />
        ))}
      </div>
    );
  } else if (q.type === "multi") {
    const opts = q.options!(a);
    // Drop earlier picks no longer offered (e.g. PCOS after changing sex).
    const cur = (Array.isArray(a[q.id]) ? (a[q.id] as string[]) : []).filter((x) => opts.some((o) => o.v === x));
    body = (
      <div className="flex flex-col gap-2.5">
        {opts.map((o) => (
          <OptionCard key={o.v} opt={o} selected={cur.includes(o.v)} onTap={() => { haptic(); setAnswer(q.id, toggleMulti(cur, o, opts)); }} />
        ))}
        <BigButton className="mt-2" disabled={cur.length === 0} onClick={() => { setAnswer(q.id, cur); next(); }}>
          {t("continueButton")}
        </BigButton>
      </div>
    );
  } else if (q.type === "slider") {
    body = <SliderStep key={q.id} q={q} answers={a} setAnswer={setAnswer} onNext={next} />;
  } else {
    const labs: Labs = (a.labs as Labs | undefined) ?? { ast: null, alt: null, plt: null, unit: "lakh", skip: {} };
    body = <LabsStep labs={labs} onChange={(l) => setAnswer("labs", l)} onDone={() => void finish()} />;
  }

  return (
    <div className="mx-auto max-w-[520px] pb-10">
      <div className="flex items-center gap-3">
        <button
          onClick={back}
          aria-label={t("sv_back")}
          title={t("sv_back")}
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-mint text-xl text-teal-dark hover:bg-[#d6ece6]"
        >
          ‹
        </button>
        <ProgressBar value={idx / visible.length} className="h-2" />
        <span className="shrink-0 text-xs text-muted">{tf("sv_stepOf", { n: idx + 1, total: visible.length })}</span>
      </div>
      <SurfaceCard key={q.id} className="mt-4 animate-fade-up !p-5">
        <h2 className="text-2xl font-bold">{t(q.title)}</h2>
        {q.why && <div className="mt-3 rounded-[14px] bg-mint p-3.5 text-teal-dark">{t(q.why)}</div>}
        <div className="mt-[18px]">{body}</div>
      </SurfaceCard>
    </div>
  );
}

function Intro({ last, onStart, onOpenLast }: { last: ScoreEntry | null; onStart: () => void; onOpenLast: (e: ScoreEntry) => void }) {
  const { t } = useT();
  const points = ["sv_introPoint1", "sv_introPoint2", "sv_introPoint3"];
  return (
    <div className="mx-auto max-w-[520px] pb-10 animate-fade-up">
      {last && <LastCheckCard entry={last} onOpen={() => onOpenLast(last)} />}
      <SurfaceCard className={cx("!p-5", last && "mt-4")}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[200px] flex-1">
            <h2 className="text-[28px] leading-tight font-extrabold">{t("sv_introTitle")}</h2>
            <p className="mt-2 text-lg text-muted">{t("sv_introSubtitle")}</p>
          </div>
          <BodyMap className="mx-auto w-[110px] shrink-0" />
        </div>
        <ul className="mt-5 space-y-2.5">
          {points.map((s) => (
            <li key={s} className="flex items-start gap-2.5 text-lg">
              <span className="mt-2.5 size-2.5 shrink-0 rounded-full bg-teal-dark" />
              <span>{t(s)}</span>
            </li>
          ))}
        </ul>
        <BigButton className="mt-5" onClick={onStart}>{t("sv_startCheck")}</BigButton>
      </SurfaceCard>
      <p className="mt-4 text-xs text-muted">{t(kDisclaimer)}</p>
    </div>
  );
}

/** "Your last check": score, date, when the next one is due, and a link to the results. */
function LastCheckCard({ entry, onOpen }: { entry: ScoreEntry; onOpen: () => void }) {
  const { t, tf } = useT();
  const [now] = useState(() => Date.now());
  const daysSince = Math.floor((now - entry.date.getTime()) / 86400000);
  const daysLeft = RECHECK_DAYS - daysSince;
  return (
    <SurfaceCard className="flex items-center gap-3.5">
      <ScoreRing value={entry.score} size={64} stroke={7} color={scoreColor(entry.score)} track="#dbe5e2">
        <span className="text-xl font-extrabold">{entry.score}</span>
      </ScoreRing>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted">{t("lastCheckTitle")}</div>
        <div className="text-[15px] font-bold">
          {entry.tier ? `${tierText(t, entry.tier)} · ` : ""}{shortDate(t, entry.date)}
        </div>
        <div className="mt-0.5 text-xs" style={{ color: daysLeft <= 0 ? kModDark : undefined }}>
          <span className={daysLeft <= 0 ? "" : "text-muted"}>
            {daysLeft <= 0 ? `⏰ ${t("lastCheckDueNow")}` : tf("sv_nextCheckInDays", { n: daysLeft })}
          </span>
        </div>
      </div>
      {entry.result && (
        <button onClick={onOpen} className="shrink-0 rounded-full px-3 py-2 text-sm font-semibold text-teal-dark hover:bg-mint">
          {t("lastCheckSeeResults")}
        </button>
      )}
    </SurfaceCard>
  );
}

function OptionCard({ opt, selected, onTap }: { opt: Opt; selected: boolean; onTap: () => void }) {
  const { t } = useT();
  return (
    <button
      onClick={onTap}
      aria-pressed={selected}
      className={cx(
        "flex w-full items-center gap-3.5 rounded-[18px] border-2 px-4 py-3.5 text-left transition active:scale-[0.99]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-dark",
        selected ? "border-teal-dark bg-mint" : "border-line bg-[#f7faf9] hover:bg-mint/50",
      )}
    >
      <span className="w-10 text-center text-[28px] leading-none">{opt.emoji}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[17px] font-bold">{t(opt.label)}</span>
        {opt.sub && <span className="block text-sm text-muted">{t(opt.sub)}</span>}
      </span>
      {selected && <span className="flex size-6 items-center justify-center rounded-full bg-teal-dark text-sm text-white">✓</span>}
    </button>
  );
}

function SliderStep({ q, answers, setAnswer, onNext }: {
  q: Question; answers: Answers; setAnswer: (k: string, v: unknown) => void; onNext: () => void;
}) {
  const { t } = useT();
  const has = q.id in answers;
  useEffect(() => {
    if (!has) setAnswer(q.id, q.def);
  }, [has, q.id, q.def, setAnswer]);
  const raw = has ? (answers[q.id] as number | null) : q.def;
  const unknown = raw === null;
  const v = raw ?? q.def;
  const fmt = (x: number) => (q.step < 1 ? x.toFixed(1) : String(Math.round(x)));
  const update = (x: number) => setAnswer(q.id, clamp(Math.round(x / q.step) * q.step, q.min, q.max));

  return (
    <div className="flex flex-col items-center">
      <div className="mt-3" aria-live="polite">
        <span className="text-[60px] leading-none font-extrabold">{unknown ? "?" : fmt(v)}</span>
        {!unknown && <span className="text-lg text-muted"> {t(q.unit)}</span>}
      </div>
      <div className="mt-1.5 min-h-6 text-muted">{unknown ? t("sv_waistEstimateNote") : trText(t, q.alt?.(v) ?? "")}</div>
      <div className="mt-4 flex w-full items-center gap-2">
        <StepButton label={t("sv_less")} onClick={() => update(v - q.step)}>−</StepButton>
        <input
          type="range"
          min={q.min}
          max={q.max}
          step={q.step}
          value={v}
          aria-label={t(q.title)}
          onChange={(e) => update(Number(e.target.value))}
          className="h-10 min-w-0 flex-1 cursor-pointer accent-teal-dark"
        />
        <StepButton label={t("sv_more")} onClick={() => update(v + q.step)}>+</StepButton>
      </div>
      {/* A "?" (I don't know) stays unknown unless the slider is moved. */}
      <BigButton className="mt-5" onClick={onNext}>{t("continueButton")}</BigButton>
      {q.unknownLabel && (
        <BigButton outlined className="mt-2.5" onClick={() => { setAnswer(q.id, null); onNext(); }}>
          {t(q.unknownLabel)}
        </BigButton>
      )}
    </div>
  );
}

function StepButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={() => { haptic(); onClick(); }}
      aria-label={label}
      title={label}
      className="flex size-11 shrink-0 items-center justify-center rounded-full border border-line text-2xl text-teal-dark hover:bg-mint"
    >
      {children}
    </button>
  );
}

const LAB_KEYS = ["ast", "alt", "plt"] as const;
const WARN_TEXT = "sv_labWarnUnusual";

function LabsStep({ labs, onChange, onDone }: { labs: Labs; onChange: (l: Labs) => void; onDone: () => void }) {
  const { t } = useT();
  const [text, setText] = useState<Record<string, string>>(() =>
    Object.fromEntries(LAB_KEYS.map((k) => [k, labs[k]?.toString() ?? ""])),
  );
  const [warn, setWarn] = useState<Record<string, string | null>>({});

  // Make sure the labs map exists in the answers.
  useEffect(() => {
    onChange(labs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pltWarn = (v: number | null, unit: string) => {
    if (v == null) return null;
    const g = plateletsToG(v, unit);
    return g < 20 || g > 1000 ? WARN_TEXT : null;
  };

  const changed = (k: (typeof LAB_KEYS)[number], s: string) => {
    setText((x) => ({ ...x, [k]: s }));
    const trimmed = s.trim();
    const v = trimmed === "" ? null : Number(trimmed);
    const valid = v !== null && !Number.isNaN(v);
    const next: Labs = { ...labs, [k]: valid && v > 0 ? v : null };
    let w: string | null = null;
    if (valid && v <= 0) w = "sv_labMustBePositive";
    else if (valid) {
      if (k === "plt") {
        // Guess the unit from the size of the number until the user picks
        // one: 2.5 → lakh, 250 → ×10⁹/L, 15000 or 250000 → per µL.
        if (!labs.unitPicked) next.unit = v < 20 ? "lakh" : v >= 1000 ? "ul" : "g";
        w = pltWarn(v, next.unit);
      } else if (v < 5 || v > 1000) w = WARN_TEXT;
    }
    setWarn((x) => ({ ...x, [k]: w }));
    onChange(next);
  };

  const field = (k: (typeof LAB_KEYS)[number], label: string, hint: string, example: string) => {
    const skip = labs.skip?.[k] === true;
    const id = `lab-${k}`;
    return (
      <div key={k} className="rounded-[18px] border-2 border-line bg-[#f7faf9] p-3.5">
        <label htmlFor={id} className="block text-[17px] font-bold">{t(label)}</label>
        <div className="text-sm text-muted">{t(hint)}</div>
        <div className="mt-2.5 flex items-center gap-2">
          <input
            id={id}
            type="number"
            inputMode="decimal"
            step="any"
            disabled={skip}
            value={text[k]}
            placeholder={t(example)}
            onChange={(e) => changed(k, e.target.value)}
            className="min-w-0 flex-1 rounded-xl border border-line bg-white px-3 py-3 text-xl font-bold outline-none focus:border-teal-dark disabled:opacity-50"
          />
          {k === "plt" && (
            <select
              value={labs.unit}
              disabled={skip}
              aria-label={t(label)}
              onChange={(e) => {
                const u = e.target.value;
                onChange({ ...labs, unit: u, unitPicked: true });
                setWarn((x) => ({ ...x, plt: pltWarn(labs.plt, u) }));
              }}
              className="min-h-12 rounded-xl border border-line bg-white px-2 text-sm font-semibold disabled:opacity-50"
            >
              <option value="lakh">lakh/cmm</option>
              <option value="ul">/µL</option>
              <option value="g">×10⁹/L</option>
            </select>
          )}
        </div>
        <button
          onClick={() => {
            const s = !skip;
            const next: Labs = { ...labs, skip: { ...labs.skip, [k]: s } };
            if (s) {
              next[k] = null;
              setText((x) => ({ ...x, [k]: "" }));
              setWarn((x) => ({ ...x, [k]: null }));
            }
            onChange(next);
          }}
          aria-pressed={skip}
          className={cx(
            "mt-2 inline-flex min-h-8 items-center gap-1 rounded-lg border px-3 text-sm font-medium",
            skip ? "border-teal-dark bg-mint text-teal-dark" : "border-line bg-white",
          )}
        >
          {skip && "✓ "}{t("sv_labDontHave")}
        </button>
        {warn[k] && <div className="mt-1.5 text-sm" style={{ color: kHigh }}>{t(warn[k]!)}</div>}
      </div>
    );
  };

  // Some values typed but not all three: FIB-4 can't be worked out.
  const filled = LAB_KEYS.filter((k) => labs[k] != null).length;
  const incomplete = filled > 0 && filled < LAB_KEYS.length;

  return (
    <div className="flex flex-col gap-3">
      {field("ast", "sv_labAst", "sv_labAstHint", "sv_labAstExample")}
      {field("alt", "sv_labAlt", "sv_labAltHint", "sv_labAltExample")}
      {field("plt", "sv_labPlt", "sv_labPltHint", "sv_labPltExample")}
      {incomplete && (
        <div className="flex items-center gap-1.5 text-muted"><span aria-hidden>ⓘ</span>{t("sv_labNeedAllThree")}</div>
      )}
      <BigButton className="mt-2" onClick={onDone}>{t("sv_seeMyResults")}</BigButton>
    </div>
  );
}
