"use client";
// Port of lib/survey/results_screen.dart. Rendered in place (no separate
// route) by the Check tab, and reusable from Profile's history.
import { useState } from "react";
import { useT } from "@/lib/i18n";
import { BigButton, Button, ScoreRing, SurfaceCard, cx } from "@/components/ui";
import { planByKey, type AssessmentResult } from "./assess";
import { BodyMap } from "./body-map";
import { kDisclaimer, kHigh, kLow, kModDark, levelColor, levelText, organName, scoreColor, shortDate, tierText, trText } from "./health-ui";

const TABS: [string, string][] = [
  ["eatMore", "sv_tabEatMore"],
  ["eatLess", "sv_tabEatLess"],
  ["move", "sv_tabExercise"],
  ["habits", "sv_tabHabits"],
];

const LEVEL_ORDER: Record<string, number> = { high: 0, mod: 1, low: 2 };

export interface ResultsViewProps {
  result: AssessmentResult;
  /** When the check was taken; set when reopened from the history. */
  takenAt?: Date | null;
  /** Goes to the Profile tab. Without it, a single Close button shows. */
  onTrackHabits?: () => void;
  /** "Take again" (with onTrackHabits) or "Close" (without). */
  onClose: () => void;
  /** Why saving failed, or null if it worked. Only right after a check. */
  saveError?: string | null;
  /** Tries saving again; resolves to the new error, or null on success. */
  onRetrySave?: () => Promise<string | null>;
}

export function ResultsView({ result: r, takenAt, onTrackHabits, onClose, saveError: initialError = null, onRetrySave }: ResultsViewProps) {
  const { t, tf } = useT();
  // Open the organ that needs the most attention.
  const [sel, setSel] = useState(
    () => Object.keys(r.organs).sort((x, y) => LEVEL_ORDER[r.organs[x].level] - LEVEL_ORDER[r.organs[y].level])[0],
  );
  const [tab, setTab] = useState("eatMore");
  const [saveError, setSaveError] = useState<string | null>(initialError);
  const [retrying, setRetrying] = useState(false);
  const o = r.organs[sel];

  const retry = async () => {
    if (!onRetrySave) return;
    setRetrying(true);
    setSaveError(await onRetrySave());
    setRetrying(false);
  };

  const section = (s: string) => <h3 className="mt-6 mb-2.5 text-base font-bold">{s}</h3>;

  return (
    <div className="mx-auto max-w-[520px] animate-fade-up pb-10">
      <h2 className="mb-3 text-xl font-extrabold">
        {takenAt ? tf("sv_checkOnDate", { date: shortDate(t, takenAt) }) : t("sv_yourResults")}
      </h2>

      {onRetrySave && <SaveBanner error={saveError} retrying={retrying} onRetry={retry} />}

      <SurfaceCard className="flex items-center gap-4">
        <ScoreRing value={r.score} size={118} stroke={12} color={scoreColor(r.score)} track="#dbe5e2">
          <span className="text-[32px] leading-none font-extrabold">{r.score}</span>
          <span className="text-xs text-muted">{t("sv_ofHundred")}</span>
        </ScoreRing>
        <div className="min-w-0 flex-1">
          <div className="text-2xl font-extrabold">{tierText(t, r.tier)}</div>
          <div className="text-muted">
            {tf(r.waistEstimated ? "sv_scoreBmiWaistEst" : "sv_scoreBmi", { bmi: r.bmi.toFixed(1) })}
          </div>
        </div>
      </SurfaceCard>

      {r.seeDoctor && (
        <div className="mt-4 rounded-2xl border-l-[5px] p-3.5" style={{ borderColor: kHigh, backgroundColor: `${kHigh}1e` }}>
          <div className="font-bold">{t("sv_seeDoctorTitle")}</div>
          <div>{t("sv_seeDoctorBody")}</div>
        </div>
      )}
      {r.notes.map((n) => (
        <div key={n} className="mt-3 rounded-[14px] bg-mint p-3.5">{trText(t, n)}</div>
      ))}

      {section(t("sv_tapAnOrgan"))}
      <div className="flex flex-wrap gap-2" role="tablist">
        {Object.entries(r.organs).map(([k, v]) => (
          <button
            key={k}
            role="tab"
            aria-selected={k === sel}
            onClick={() => setSel(k)}
            className={cx(
              "inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition",
              k === sel ? "border-teal-dark bg-mint text-teal-dark" : "border-line bg-white hover:bg-mint/60",
            )}
          >
            <span className="size-3 rounded-full" style={{ backgroundColor: levelColor(v.level) }} />
            {organName(t, k, true)}
          </button>
        ))}
      </div>

      <SurfaceCard className="mt-3 flex items-start gap-3.5 !p-3.5">
        <BodyMap organs={r.organs} selected={sel} onTap={setSel} className="w-[115px] shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-lg font-bold">{trText(t, o.name)}</div>
          <span
            className="mt-1 inline-block rounded-full px-2.5 py-0.5 text-[13px] font-bold text-white"
            // Plain amber is too light behind white text.
            style={{ backgroundColor: o.level === "mod" ? kModDark : levelColor(o.level) }}
          >
            {levelText(o.level, t)}
          </span>
          <p className="mt-1.5 text-sm text-muted">{trText(t, o.does)}</p>
          <ul className="mt-2 space-y-1">
            {o.reasons.map((reason) => (
              <li key={reason} className="flex gap-2 text-[15px]"><span aria-hidden>•</span><span>{trText(t, reason)}</span></li>
            ))}
          </ul>
          <p className="mt-1.5 text-[13px] text-muted">
            {trText(t, o.confidence)}{o.extra ? `. ${trText(t, o.extra)}.` : ""}
          </p>
        </div>
      </SurfaceCard>

      {r.tests.length > 0 && (
        <>
          {section(t("sv_testsToAsk"))}
          <div className="flex flex-wrap gap-2">
            {r.tests.map((x) => (
              <span key={x} className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm">{trText(t, x)}</span>
            ))}
          </div>
        </>
      )}

      {section(t("sv_yourPlan"))}
      <div className="flex flex-wrap gap-2" role="tablist">
        {TABS.map(([k, label]) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={cx(
              "min-h-9 rounded-lg border px-3 py-1.5 text-sm font-medium transition",
              tab === k ? "border-teal-dark bg-mint text-teal-dark" : "border-line bg-white hover:bg-mint/60",
            )}
          >
            {tab === k && "✓ "}{t(label)}
          </button>
        ))}
      </div>
      <div key={tab} className="mt-3 flex flex-col gap-2.5 animate-fade-up">
        {planByKey(r.plan, tab).map((p) => (
          <SurfaceCard key={p.title} className="flex items-start gap-3 !p-3.5">
            <span className="text-2xl leading-none">{p.emoji}</span>
            <div>
              <div className="font-bold">{trText(t, p.title)}</div>
              <div className="text-sm text-muted">{trText(t, p.sub)}</div>
            </div>
          </SurfaceCard>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-2.5">
        {onTrackHabits ? (
          <>
            <BigButton onClick={onTrackHabits}>{t("sv_trackHabits")}</BigButton>
            <BigButton outlined onClick={onClose}>{t("sv_takeAgain")}</BigButton>
          </>
        ) : (
          <BigButton outlined onClick={onClose}>{t("close")}</BigButton>
        )}
      </div>
      <p className="mt-5 text-xs text-muted">{t(kDisclaimer)}</p>
    </div>
  );
}

/** Whether this check was saved to the profile, with a retry. */
function SaveBanner({ error, retrying, onRetry }: { error: string | null; retrying: boolean; onRetry: () => void }) {
  const { t, tf } = useT();
  const ok = error === null;
  const color = ok ? kLow : kHigh;
  return (
    <div
      className="mb-3 flex items-center gap-2.5 rounded-[14px] border py-2.5 pr-2 pl-3.5"
      style={{ backgroundColor: `${color}1c`, borderColor: `${color}5a` }}
      role={ok ? "status" : "alert"}
    >
      <span aria-hidden className="text-lg">{ok ? "☁️✓" : "⚠️"}</span>
      <span className="flex-1 font-semibold whitespace-pre-line" style={{ color }}>
        {ok ? t("sv_savedToProfile") : tf("sv_notSaved", { error })}
      </span>
      {!ok &&
        (retrying ? (
          <span className="m-3 size-[18px] animate-spin rounded-full border-2 border-line border-t-teal-dark" />
        ) : (
          <Button variant="text" onClick={onRetry}>{t("retry")}</Button>
        ))}
    </div>
  );
}
