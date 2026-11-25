"use client";
// Port of lib/learn/guide_tools.dart — the Guide's interactive tools.
import { useState, type ReactNode } from "react";
import { EmojiBadge, ProgressBar, SurfaceCard, cx, haptic } from "@/components/ui";
import { useT } from "@/lib/i18n";
import { dateOnly, parseDateOnly } from "@/lib/dates";
import { ageGroupInfo, useGuideAgeGroup, type AgeGroup } from "./age-group";
import { challengeHabits, planFields, type GuideBlock } from "./guide-content";
import { AgeGroupChips, GuideInfoBox, alpha } from "./guide-blocks";
import { ChallengeWeek, loadPlan, loadWeek, savePlan, saveWeek, weekStart } from "./guide-store";

const kLow = "#3E8E6B";
const tealDark = "#1F5E55";
const tealLight = "#5FA79A";

/** Today's weekday index, 0 = Monday. */
const todayIndex = () => (new Date().getDay() + 6) % 7;

// ------------------------------------------------------------ risk checklist

/** "Could you be at risk?" — tick boxes for the chosen age group. Not saved:
 * it is a reflection tool, not a test. */
export function RiskChecklist({ b }: { b: Extract<GuideBlock, { type: "checklist" }> }) {
  const { t } = useT();
  const [g] = useGuideAgeGroup();
  const [ticked, setTicked] = useState<Record<AgeGroup, number[]>>({ children: [], adults: [], older: [] });
  const qs = b.questions[g] ?? [];
  const mine = ticked[g];
  const note = b.notes[g];
  const color = ageGroupInfo[g].color;

  const toggle = (n: number) => {
    haptic();
    setTicked((s) => ({ ...s, [g]: s[g].includes(n) ? s[g].filter((x) => x !== n) : [...s[g], n] }));
  };

  return (
    <div className="flex flex-col">
      <AgeGroupChips />
      <SurfaceCard className="mt-3 !px-0 !py-1.5">
        {qs.map((q, n) => (
          <label key={`${g}-${n}`} className="flex cursor-pointer items-start gap-3 px-4 py-2.5 hover:bg-mint/40">
            <input
              type="checkbox"
              checked={mine.includes(n)}
              onChange={() => toggle(n)}
              className="mt-0.5 size-5 shrink-0 cursor-pointer"
              style={{ accentColor: color }}
            />
            <span className="text-[14.5px]">{t(q)}</span>
          </label>
        ))}
      </SurfaceCard>
      {note && <p className="mt-2 font-semibold" style={{ color }}>👪 {t(note)}</p>}
      <div key={`${g}${mine.length}`} className="mt-3 animate-fade-up">
        <GuideInfoBox
          b={mine.length === 0
            ? { type: "info", emoji: "🙂", titleKey: "gd_ckNone", tone: "good" }
            : { type: "info", emoji: "🩺", titleKey: "gd_ckResult", tone: "warn" }}
          args={{ n: mine.length, total: qs.length }}
        />
      </div>
    </div>
  );
}

// --------------------------------------------------------- 7-day challenge

/** "My 7-day liver health challenge": 8 habits × 7 days, this week. */
export function ChallengeTool({ userId }: { userId: string }) {
  const { t, tf } = useT();
  const [monday] = useState(() => weekStart(new Date()));
  const [day, setDay] = useState(todayIndex);
  // Rendered only on the client (behind the session gate), so read storage directly.
  const [week, setWeek] = useState<ChallengeWeek>(() => loadWeek(userId, monday));

  const update = (change: (w: ChallengeWeek) => void) => {
    const next = week.clone();
    change(next);
    setWeek(next);
    saveWeek(userId, monday, next);
  };
  const toggle = (n: number) => {
    haptic();
    update((w) => w.toggle(n, day));
  };

  const habits = challengeHabits;
  const total = habits.length * 7;
  const today = todayIndex();

  return (
    <div className="flex flex-col gap-3">
      <SurfaceCard>
        <div className="flex flex-wrap justify-between gap-x-3">
          <span className="text-base font-extrabold">{t("gd_chWeek")}</span>
          <span className="font-bold text-teal-dark">{tf("gd_chDone", { n: week.total, total })}</span>
        </div>
        <ProgressBar value={week.total / total} color={tealLight} className="mt-2" />
        {/* Day picker: one column per weekday with its count. */}
        <div className="mt-3.5 grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }, (_, d) => {
            const done = week.doneOn(d);
            const full = done === habits.length;
            const selected = d === day;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDay(d)}
                aria-pressed={selected}
                className={cx("flex min-w-0 flex-col items-center rounded-xl py-2 transition", selected ? "bg-teal-dark" : full ? "" : "bg-mint hover:bg-[#d6ece6]")}
                style={!selected && full ? { backgroundColor: alpha(kLow, 0.15) } : undefined}
              >
                <span className={cx("truncate text-xs font-extrabold", selected ? "text-white" : "text-teal-dark", d === today && "underline")}>
                  {t(`pf_wd${d + 1}`)}
                </span>
                <span className={cx("mt-0.5 text-[11px]", selected && "text-white/70")}>
                  {full ? "⭐" : tf("gd_chDayDone", { n: done, total: habits.length })}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[12.5px] text-muted">{t("gd_chTapHint")}</p>
      </SurfaceCard>

      <SurfaceCard className="!px-0 !py-1.5">
        {habits.map((h, n) => (
          <div
            key={n}
            role="button"
            tabIndex={0}
            onClick={() => toggle(n)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(n); } }}
            className="flex cursor-pointer items-center gap-3 py-2.5 pr-3 pl-3.5 hover:bg-mint/40"
          >
            <EmojiBadge emoji={h.emoji} color={tealDark} size={40} />
            <div className="min-w-0 flex-1">
              <div className="text-[14.5px] font-bold">{t(h.titleKey)}</div>
              <div className="text-[12.5px] text-muted">{t(h.bodyKey!)}</div>
              {/* This habit across the week. */}
              <div className="mt-1.5 flex gap-1">
                {Array.from({ length: 7 }, (_, d) => (
                  <span
                    key={d}
                    className="size-2.5 rounded-full"
                    style={{
                      backgroundColor: week.isTicked(n, d) ? kLow : "#dbe5e2",
                      boxShadow: d === day ? `0 0 0 1.5px ${tealDark}` : undefined,
                    }}
                  />
                ))}
              </div>
            </div>
            <input
              type="checkbox"
              aria-label={t(h.titleKey)}
              checked={week.isTicked(n, day)}
              onChange={() => toggle(n)}
              onClick={(e) => e.stopPropagation()}
              className="size-5 shrink-0 cursor-pointer"
              style={{ accentColor: kLow }}
            />
          </div>
        ))}
      </SurfaceCard>

      <NoteField
        emoji="🏆" titleKey="gd_chSuccessT" hintKey="gd_chSuccessH" color={kLow}
        value={week.success} onChange={(v) => update((w) => { w.success = v; })}
      />
      <NoteField
        emoji="📈" titleKey="gd_chImproveT" hintKey="gd_chImproveH" color="#E07A2E"
        value={week.improve} onChange={(v) => update((w) => { w.improve = v; })}
      />
      <SavedOnPhone />
    </div>
  );
}

// --------------------------------------------------------- personal plan

const planColors = ["#1F7A6E", "#2F6FD6", "#B7791F", "#D6455D", "#7B57C2", "#3E8E4F"];

/** "My personal action plan": six short answers + next check date. */
export function PlanTool({ userId }: { userId: string }) {
  const { t } = useT();
  const [plan, setPlan] = useState<Record<string, string>>(() => loadPlan(userId));

  const set = (key: string, value: string) => {
    const next = { ...plan, [key]: value };
    setPlan(next);
    savePlan(userId, next);
  };

  // The app stores an ISO date-time; read either that or YYYY-MM-DD.
  const rawDate = plan.date ?? "";
  const date = /^\d{4}-\d{2}-\d{2}/.test(rawDate) ? parseDateOnly(rawDate) : null;
  const now = new Date();

  return (
    <div className="flex flex-col gap-3">
      {planFields.map((f, n) => {
        const isCheckup = f.titleKey === "gd_pl5T";
        return (
          <NoteField
            key={f.titleKey}
            emoji={f.emoji}
            titleKey={f.titleKey}
            hintKey={f.hintKey}
            color={planColors[n]}
            value={plan[f.titleKey] ?? ""}
            onChange={(v) => set(f.titleKey, v)}
            fieldLabelKey={isCheckup ? "gd_pl5Ask" : undefined}
            extra={isCheckup ? (
              <div className="mb-2.5">
                <label className="relative inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-teal-dark hover:bg-mint">
                  <span aria-hidden>📅</span>
                  {date ? shortDate(t, date) : t("gd_plPickDate")}
                  <input
                    type="date"
                    value={date ? dateOnly(date) : ""}
                    min={`${now.getFullYear() - 1}-01-01`}
                    max={`${now.getFullYear() + 3}-12-31`}
                    onChange={(e) => e.target.value && set("date", parseDateOnly(e.target.value).toISOString())}
                    onClick={(e) => { try { (e.currentTarget as HTMLInputElement).showPicker?.(); } catch { /* unsupported */ } }}
                    className="absolute inset-0 cursor-pointer opacity-0"
                    aria-label={t("gd_plPickDate")}
                  />
                </label>
              </div>
            ) : undefined}
          />
        );
      })}
      <SavedOnPhone />
    </div>
  );
}

/** "5 Oct 2026" in the app's language. */
function shortDate(t: (k: string) => string, d: Date): string {
  return `${d.getDate()} ${t(`sv_month${d.getMonth() + 1}`)} ${d.getFullYear()}`;
}

// ---------------------------------------------------------------- shared

function NoteField({ emoji, titleKey, hintKey, value, onChange, color, extra, fieldLabelKey }: {
  emoji: string; titleKey: string; hintKey: string; value: string; onChange: (v: string) => void;
  color: string; extra?: ReactNode; fieldLabelKey?: string;
}) {
  const { t } = useT();
  return (
    <div className="flex flex-col rounded-[18px] border p-3.5" style={{ backgroundColor: alpha(color, 0.07), borderColor: alpha(color, 0.25) }}>
      <div className="flex items-center gap-2.5">
        <EmojiBadge emoji={emoji} color={color} size={36} />
        <div className="flex-1 text-[15px] font-extrabold" style={{ color }}>{t(titleKey)}</div>
      </div>
      <p className="mt-1.5 text-[12.5px] text-muted">{t(hintKey)}</p>
      <div className="mt-2.5">
        {extra}
        <label className="block">
          {fieldLabelKey && <span className="mb-1 block text-xs font-semibold text-muted">{t(fieldLabelKey)}</span>}
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={2}
            aria-label={fieldLabelKey ? undefined : t(titleKey)}
            className="block w-full resize-y rounded-xl border border-line bg-white px-3 py-2.5 text-[15px] outline-none [field-sizing:content] focus:border-teal-dark"
            style={{ minHeight: 44, maxHeight: 140 }}
          />
        </label>
      </div>
    </div>
  );
}

function SavedOnPhone() {
  const { t } = useT();
  return (
    <p className="flex items-center justify-center gap-1 pt-1 text-xs text-muted">
      <span aria-hidden>📱</span>
      {t("gd_savedOnPhone")}
    </p>
  );
}
