"use client";
// Port of lib/screens/food_detail_sheet.dart — the pop-up for a food card.
import type { ReactNode } from "react";
import { Sheet } from "@/components/ui";
import { useT } from "@/lib/i18n";
import type { FoodAgeGroup, FoodDetail, FoodTip, HealthPoint, IntakeGuide } from "./home-content";

/** Material colour swatches used by the app (shade 50-ish tint / 700 / 800 / 900). */
const palette = {
  green: { base: "#4CAF50", s700: "#388E3C", s800: "#2E7D32", s900: "#1B5E20" },
  red: { base: "#F44336", s700: "#D32F2F", s800: "#C62828", s900: "#B71C1C" },
  orange: { base: "#FF9800", s700: "#F57C00", s800: "#EF6C00", s900: "#E65100" },
  blue: { base: "#2196F3", s700: "#1976D2", s800: "#1565C0", s900: "#0D47A1" },
} as const;
type Swatch = (typeof palette)[keyof typeof palette];

const INDIGO = "#3F51B5";
const DEEP_ORANGE = "#FF5722";

/** Food card pop-up: open when `tip` is set. */
export function FoodDetailSheet({ tip, onClose }: { tip: FoodTip | null; onClose: () => void }) {
  const { t } = useT();
  return (
    <Sheet open={tip !== null} onClose={onClose} maxWidth={640}>
      {tip && (
        <div className="flex flex-col gap-4 pb-4">
          <Header tip={tip} />
          {!tip.detail ? (
            <p>{t("detailsComingSoon")}</p>
          ) : (
            <DetailBody detail={tip.detail} />
          )}
        </div>
      )}
    </Sheet>
  );
}

function DetailBody({ detail }: { detail: FoodDetail }) {
  const { t } = useT();
  return (
    <>
      <NutritionCard detail={detail} />
      <IntakeCard intake={detail.intake} />
      {(detail.benefits?.length ?? 0) > 0 && (
        <PointsCard title={t("benefitsTitle")} icon="❤️" swatch={palette.green} points={detail.benefits!} />
      )}
      <PointsCard title={t("overconsumptionTitle")} icon="⚠️" swatch={palette.orange} points={detail.overconsumption} />
      {(detail.swaps?.length ?? 0) > 0 && (
        <PointsCard title={t("swapsTitle")} icon="🔄" swatch={palette.blue} points={detail.swaps!} />
      )}
      <PrecautionsCard keys={detail.precautionKeys} />
      <p className="text-xs text-muted">{t("sampleContentNote")}</p>
    </>
  );
}

function Header({ tip }: { tip: FoodTip }) {
  const { t } = useT();
  const sw = tip.recommended ? palette.green : palette.red;
  return (
    <div className="flex items-start gap-4">
      <div className="flex size-[72px] shrink-0 items-center justify-center rounded-[20px] bg-mint text-[40px]" aria-hidden>
        {tip.emoji}
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-[22px] font-semibold leading-tight">{t(tip.nameKey)}</h2>
        <span
          className="mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold"
          style={{ backgroundColor: `${sw.base}1f`, color: sw.s800 }}
        >
          {t(tip.recommended ? "eatMore" : "limitFood")}
        </span>
        <p className="mt-2">{t(tip.whyKey)}</p>
      </div>
    </div>
  );
}

/** A titled card, shared by every section of the pop-up. */
function SectionCard({ title, icon, color, children }: { title: string; icon: string; color: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <span aria-hidden className="text-lg leading-none" style={{ color }}>{icon}</span>
        <h3 className="flex-1 text-base font-semibold">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function NutritionCard({ detail }: { detail: FoodDetail }) {
  const { t } = useT();
  return (
    <SectionCard title={t("nutritionTitle")} icon="🔥" color={DEEP_ORANGE}>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-4xl font-bold" style={{ color: DEEP_ORANGE }}>{detail.kcal}</span>
        <span className="font-semibold">{t("kcalUnit")}</span>
        <span className="min-w-0 flex-1 text-xs text-muted">
          {t("perServing")} {t(detail.servingKey)}
        </span>
      </div>
      {/* Three columns on wide sheets, two on phones. */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {detail.nutrients.map((n) => (
          <div key={n.nameKey} className="rounded-xl border border-teal-light/35 bg-white px-3 py-2.5">
            <div className="text-base font-bold text-teal-dark">{n.amount ?? t(n.amountKey!)}</div>
            <div className="text-xs text-muted">{t(n.nameKey)}</div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

const intakeEmoji: Record<FoodAgeGroup, string> = { children: "🧒", adults: "🧑", elders: "🧓" };
const intakeLabelKey: Record<FoodAgeGroup, string> = { children: "ageChildren", adults: "ageAdults", elders: "ageElders" };

function IntakeCard({ intake }: { intake: IntakeGuide[] }) {
  const { t } = useT();
  return (
    <SectionCard title={t("dailyAmountTitle")} icon="🍽️" color="#1f5e55">
      <div className="flex flex-col gap-2">
        {intake.map((g) => (
          <div key={g.group} className="flex items-start gap-3 rounded-xl bg-mint p-3">
            <span aria-hidden className="text-[28px] leading-none">{intakeEmoji[g.group]}</span>
            <div className="min-w-0 flex-1">
              <div className="text-xs text-muted">
                {t(intakeLabelKey[g.group])} · {t(g.agesKey)}
              </div>
              <div className="font-semibold">{t(g.amountKey)}</div>
              {g.noteKey && <div className="mt-0.5 text-xs text-muted">{t(g.noteKey)}</div>}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

/** Benefits (green), over-consumption risks (orange) or swaps (blue). */
function PointsCard({ title, icon, swatch, points }: { title: string; icon: string; swatch: Swatch; points: HealthPoint[] }) {
  const { t } = useT();
  return (
    <SectionCard title={title} icon={icon} color={swatch.s700}>
      <div className="flex flex-col gap-2">
        {points.map((p) => (
          <div
            key={p.titleKey + p.bodyKey}
            className="flex items-start gap-3 rounded-xl border-l-[3px] p-3"
            style={{ backgroundColor: `${swatch.base}14`, borderLeftColor: swatch.base }}
          >
            <span aria-hidden className="text-[22px] leading-none">{p.emoji}</span>
            <div className="min-w-0 flex-1">
              <div className="font-semibold" style={{ color: swatch.s900 }}>{t(p.titleKey)}</div>
              <div className="mt-0.5 text-xs text-muted">{t(p.bodyKey)}</div>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function PrecautionsCard({ keys }: { keys: string[] }) {
  const { t } = useT();
  return (
    <SectionCard title={t("precautionsTitle")} icon="🛡️" color={INDIGO}>
      <ul className="flex flex-col gap-2.5">
        {keys.map((k) => (
          <li key={k} className="flex items-start gap-2.5">
            <span aria-hidden className="mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full text-[11px] text-white" style={{ backgroundColor: INDIGO }}>✓</span>
            <span className="flex-1">{t(k)}</span>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
