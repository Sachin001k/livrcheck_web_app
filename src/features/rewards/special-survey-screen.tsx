"use client";
// Port of lib/rewards/special_survey_screen.dart: answers one special
// survey and claims its coins.
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BigButton, Button, CountUp, Dialog, ErrorState, FriendlyState, SkeletonList, SurfaceCard, cx, haptic } from "@/components/ui";
import { useT } from "@/lib/i18n";
import { bumpChanges } from "@/lib/data";
import { describeError } from "@/lib/auth";
import { fetchSpecialSurvey, submitSpecialSurvey, type SpecialSurvey, type SurveyQuestion } from "./reward-store";

/** Loads the survey by id, then shows the form. */
export function SpecialSurveyPage({ id }: { id: string }) {
  const { t } = useT();
  const router = useRouter();
  const [survey, setSurvey] = useState<SpecialSurvey | null | undefined>(undefined);
  const [error, setError] = useState<unknown>(null);
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    let alive = true;
    fetchSpecialSurvey(id).then(
      (s) => { if (alive) { setError(null); setSurvey(s); } },
      (e) => { if (alive) setError(e); },
    );
    return () => { alive = false; };
  }, [id, nonce]);

  if (error) return <SurfaceCard><ErrorState error={error} onRetry={() => { setError(null); setSurvey(undefined); setNonce((n) => n + 1); }} /></SurfaceCard>;
  if (survey === undefined) return <SkeletonList count={3} height={140} />;
  if (survey === null || survey.completed) {
    return (
      <SurfaceCard>
        <FriendlyState
          emoji={survey?.completed ? "✅" : "📣"}
          title={survey?.completed ? t("rewardsCompleted") : t("rewardsSpecialSurveys")}
          message={survey?.completed ? survey.title : t("rewardsNoSurveys")}
          actionLabel={t("navRewards")}
          onAction={() => router.push("/rewards")}
        />
      </SurfaceCard>
    );
  }
  return <SpecialSurveyScreen survey={survey} onDone={() => router.push("/rewards")} />;
}

type Answer = string | number | string[];

export function SpecialSurveyScreen({ survey: s, onDone }: { survey: SpecialSurvey; onDone: () => void }) {
  const { t, tf } = useT();
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [coins, setCoins] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const answered = (q: SurveyQuestion) => {
    const a = answers[q.id];
    if (a === undefined) return false;
    if (typeof a === "string") return a.trim().length > 0;
    if (Array.isArray(a)) return a.length > 0;
    return true;
  };
  const complete = s.questions.every(answered);
  const set = (id: string, v: Answer) => setAnswers((a) => ({ ...a, [id]: v }));

  const submit = async () => {
    if (!complete) return setError(t("surveyAnswerAll"));
    setSaving(true);
    setError(null);
    try {
      const earned = await submitSpecialSurvey(s, answers);
      haptic(30);
      setDone(true);
      setCoins(earned);
    } catch (e) {
      // The answers may have been saved even though the coins weren't.
      bumpChanges();
      setSaving(false);
      setError(describeError(e, t("genericError")));
    }
  };

  return (
    <div className="mx-auto max-w-[560px] animate-fade-up">
      <h2 className="mb-3 text-xl font-extrabold">{s.title}</h2>
      <SurfaceCard className="flex items-center gap-3.5">
        <span className="text-[32px]" aria-hidden>📣</span>
        <div className="min-w-0 flex-1">
          {s.description && <div>{s.description}</div>}
          <div className="mt-1 font-bold text-mod-dark">{tf("rw_surveyEarnLine", { coins: s.rewardCoins, n: s.questions.length })}</div>
        </div>
      </SurfaceCard>
      {s.questions.map((q, i) => (
        <SurfaceCard key={q.id} className="mt-3">
          <div className="text-base font-bold">{i + 1}. {q.title}</div>
          <div className="mt-3"><QuestionInput q={q} value={answers[q.id]} onChange={(v) => set(q.id, v)} /></div>
        </SurfaceCard>
      ))}
      {error && <p className="mt-3 text-high" role="alert">{error}</p>}
      <div className="mt-3 pb-4">
        {done ? (
          <div className="flex h-14 items-center justify-center text-4xl text-low" aria-label="Done">✔</div>
        ) : saving ? (
          <div className="flex h-14 items-center justify-center"><div className="size-8 animate-spin rounded-full border-[3px] border-mint border-t-teal-dark" /></div>
        ) : (
          <BigButton disabled={!complete} onClick={submit}>{t("surveySubmit")}  ·  +{s.rewardCoins} 🪙</BigButton>
        )}
      </div>
      <RewardDialog coins={coins} onClose={() => { setCoins(null); onDone(); }} />
    </div>
  );
}

function QuestionInput({ q, value, onChange }: { q: SurveyQuestion; value: Answer | undefined; onChange: (v: Answer) => void }) {
  const { t } = useT();
  switch (q.type) {
    case "text":
      return (
        <textarea rows={3} placeholder={t("surveyTypeAnswer")} value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-line px-3 py-2.5 text-base outline-none focus:border-teal-dark" />
      );
    case "scale":
      return (
        <div className="flex flex-wrap justify-between gap-2" role="radiogroup">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} role="radio" aria-checked={value === n} onClick={() => { haptic(); onChange(n); }}
              className={cx("min-h-11 min-w-12 rounded-xl border px-4 text-base font-semibold transition",
                value === n ? "border-teal-dark bg-mint text-teal-dark" : "border-line bg-white hover:bg-mint/50")}>
              {n}
            </button>
          ))}
        </div>
      );
    case "multi": {
      const picked = Array.isArray(value) ? value : [];
      return (
        <div className="flex flex-wrap gap-2">
          {q.options.map((o) => {
            const on = picked.includes(o.v);
            return (
              <button key={o.v} aria-pressed={on}
                onClick={() => { haptic(); onChange(on ? picked.filter((x) => x !== o.v) : [...picked, o.v]); }}
                className={cx("min-h-10 rounded-xl border px-3 py-1.5 text-sm font-medium transition",
                  on ? "border-teal-dark bg-mint text-teal-dark" : "border-line bg-white hover:bg-mint/50")}>
                {on && "✓ "}{`${o.emoji} ${o.label}`.trim()}
              </button>
            );
          })}
        </div>
      );
    }
    default: // 'choice'
      return (
        <div className="flex flex-col gap-2" role="radiogroup">
          {q.options.map((o) => {
            const on = value === o.v;
            return (
              <button key={o.v} role="radio" aria-checked={on} onClick={() => { haptic(); onChange(o.v); }}
                className={cx("flex min-h-14 items-center gap-3 rounded-[14px] border px-4 py-2 text-left transition",
                  on ? "border-teal-dark bg-mint" : "border-line bg-[#f7faf9] hover:bg-mint/50")}>
                {o.emoji && <span className="text-[22px]" aria-hidden>{o.emoji}</span>}
                <span className="flex-1">{o.label}</span>
                {on && <span className="text-xl text-teal-dark" aria-hidden>✔</span>}
              </button>
            );
          })}
        </div>
      );
  }
}

/** "+N coins" celebration: the coin pops in, the number counts up. */
function RewardDialog({ coins, onClose }: { coins: number | null; onClose: () => void }) {
  const { t } = useT();
  return (
    <Dialog open={coins !== null} onClose={onClose}>
      <div className="flex flex-col items-center pt-2 text-center">
        <div className="flex size-[110px] items-center justify-center rounded-full bg-amber-50 text-[64px] shadow-[0_0_30px_4px_rgb(251_191_36/0.35)] animate-[fade-up_0.8s_cubic-bezier(.3,1.6,.5,1)_both]">🪙</div>
        <div className="mt-4 text-[44px] font-black text-amber-700">+<CountUp value={coins ?? 0} duration={900} /></div>
        <div className="font-semibold">{t("surveyCoinsAdded")}</div>
        <div className="mt-2 text-muted">{t("surveyThanks")}</div>
        <Button className="mt-5 min-h-12 w-full bg-amber-600! font-extrabold text-white! hover:bg-amber-700!" onClick={onClose}>
          {t("rw_collect")}
        </Button>
      </div>
    </Dialog>
  );
}
