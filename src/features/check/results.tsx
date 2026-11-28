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
  /** Set for a check taken without an account: onTrackHabits then offers a
   * free account instead of the habit tracker. */
  guestName?: string;
}

export function ResultsView({ result: r, takenAt, onTrackHabits, onClose, saveError: initialError = null, onRetrySave, guestName }: ResultsViewProps) {
  const guest = guestName !== undefined;
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

  const heading = (s: string) => <h3 className="mb-3 text-lg font-extrabold">{s}</h3>;
  const pill = (on: boolean) => cx(
    "inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-dark",
    on ? "border-teal-dark bg-mint text-teal-dark" : "border-line bg-white hover:bg-mint/60",
  );

  // Shown under the summary on wide screens, at the very end on phones.
  const actions = (
    <div className="flex flex-col gap-2.5">
      {onTrackHabits ? (
        <>
          {guest && <p className="rounded-[14px] bg-mint p-3.5 text-[15px] text-teal-dark">{t("web_guestSaveNote")}</p>}
          <BigButton onClick={onTrackHabits}>{t(guest ? "web_guestSaveCta" : "sv_trackHabits")}</BigButton>
          <BigButton outlined onClick={onClose}>{t("sv_takeAgain")}</BigButton>
        </>
      ) : (
        <BigButton outlined onClick={onClose}>{t("close")}</BigButton>
      )}
    </div>
  );

  return (
    <div className="@container mx-auto w-full max-w-[1120px] animate-fade-up pb-10">
      <h2 className="mb-4 text-2xl font-extrabold tracking-tight @xl:text-3xl">
        {takenAt ? tf("sv_checkOnDate", { date: shortDate(t, takenAt) }) : guestName ? tf("web_guestResultsFor", { name: guestName }) : t("sv_yourResults")}
      </h2>

      {onRetrySave && <SaveBanner error={saveError} retrying={retrying} onRetry={retry} />}

      <div className="grid gap-5 @4xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)] @4xl:items-start @6xl:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
        {/* Summary: sticky beside the details on wide screens. */}
        <aside className="flex flex-col gap-4 @4xl:sticky @4xl:top-24">
          <SurfaceCard className="flex items-center gap-5 !p-5 @4xl:flex-col @4xl:text-center">
            <ScoreRing value={r.score} size={132} stroke={13} color={scoreColor(r.score)} track="#dbe5e2">
              <span className="text-[36px] leading-none font-extrabold">{r.score}</span>
              <span className="text-xs text-muted">{t("sv_ofHundred")}</span>
            </ScoreRing>
            <div className="min-w-0 flex-1">
              <div className="text-2xl font-extrabold sm:text-3xl" style={{ color: scoreColor(r.score) }}>{tierText(t, r.tier)}</div>
              <div className="mt-1 text-muted">
                {tf(r.waistEstimated ? "sv_scoreBmiWaistEst" : "sv_scoreBmi", { bmi: r.bmi.toFixed(1) })}
              </div>
            </div>
          </SurfaceCard>

          {r.seeDoctor && (
            <div className="rounded-2xl border-l-[5px] p-4" style={{ borderColor: kHigh, backgroundColor: `${kHigh}1e` }} role="alert">
              <div className="font-bold">{t("sv_seeDoctorTitle")}</div>
              <div className="mt-0.5">{t("sv_seeDoctorBody")}</div>
            </div>
          )}
          {r.notes.map((n) => (
            <div key={n} className="rounded-[14px] bg-mint p-4">{trText(t, n)}</div>
          ))}

          {r.tests.length > 0 && (
            <SurfaceCard className="!p-5">
              {heading(t("sv_testsToAsk"))}
              <ul className="flex flex-col gap-2">
                {r.tests.map((x) => (
                  <li key={x} className="flex items-center gap-2.5 rounded-xl bg-page px-3 py-2.5 text-[15px]">
                    <span aria-hidden>🧪</span> {trText(t, x)}
                  </li>
                ))}
              </ul>
            </SurfaceCard>
          )}

          <div className="hidden @4xl:block">{actions}</div>
        </aside>

        <div className="flex min-w-0 flex-col gap-5">
          <SurfaceCard as="section" className="!p-5">
            {heading(t("sv_tapAnOrgan"))}
            <div className="flex flex-wrap gap-2" role="tablist">
              {Object.entries(r.organs).map(([k, v]) => (
                <button key={k} role="tab" aria-selected={k === sel} onClick={() => setSel(k)} className={pill(k === sel)}>
                  <span className="size-3 rounded-full" style={{ backgroundColor: levelColor(v.level) }} />
                  {organName(t, k, true)}
                </button>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-[96px_minmax(0,1fr)] items-start gap-4 @xl:grid-cols-[170px_minmax(0,1fr)] @xl:gap-6" role="tabpanel">
              <BodyMap organs={r.organs} selected={sel} onTap={setSel} className="w-full" />
              <div className="min-w-0">
                <div className="text-xl font-bold">{trText(t, o.name)}</div>
                <span
                  className="mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-[13px] font-bold text-white"
                  // Plain amber is too light behind white text.
                  style={{ backgroundColor: o.level === "mod" ? kModDark : levelColor(o.level) }}
                >
                  {levelText(o.level, t)}
                </span>
                <p className="mt-2 text-muted">{trText(t, o.does)}</p>
                <ul className="mt-3 space-y-1.5">
                  {o.reasons.map((reason) => (
                    <li key={reason} className="flex gap-2 text-[15px] sm:text-base"><span aria-hidden>•</span><span>{trText(t, reason)}</span></li>
                  ))}
                </ul>
                <p className="mt-3 text-[13px] text-muted">
                  {trText(t, o.confidence)}{o.extra ? `. ${trText(t, o.extra)}.` : ""}
                </p>
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard as="section" className="!p-5">
            {heading(t("sv_yourPlan"))}
            <div className="flex flex-wrap gap-2" role="tablist">
              {TABS.map(([k, label]) => (
                <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={pill(tab === k)}>
                  {tab === k && "✓ "}{t(label)}
                </button>
              ))}
            </div>
            <div key={tab} className="mt-4 grid gap-3 animate-fade-up @xl:grid-cols-2" role="tabpanel">
              {planByKey(r.plan, tab).map((p) => (
                <div key={p.title} className="flex items-start gap-3 rounded-2xl border border-line/70 bg-page p-3.5">
                  <span className="text-2xl leading-none">{p.emoji}</span>
                  <div>
                    <div className="font-bold">{trText(t, p.title)}</div>
                    <div className="text-sm text-muted">{trText(t, p.sub)}</div>
                  </div>
                </div>
              ))}
            </div>
          </SurfaceCard>
        </div>
      </div>

      <div className="mt-5 @4xl:hidden">{actions}</div>
      <p className="mt-6 text-xs text-muted">{t(kDisclaimer)}</p>
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
