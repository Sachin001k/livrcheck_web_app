"use client";
// Port of lib/widgets/home_extras.dart (SpecialSurveyBanner, TipOfTheDayCard),
// plus Home's versions of the Guide's GuideSteps and GuideFaq (onlySelected)
// from lib/learn/guide_blocks.dart.
import Link from "next/link";
import { useEffect, useState } from "react";
import { SurfaceCard } from "@/components/ui";
import { useDataVersion } from "@/lib/data";
import { useT } from "@/lib/i18n";
import { openSurveys, type SpecialSurvey } from "@/features/rewards/reward-store";
import { guideTips, type GuideItem } from "@/features/guide/guide-content";
import { useGuideAgeGroup, type AgeGroup } from "@/features/guide/age-group";

/** Shows the newest open special survey, if any. Hidden otherwise. */
export function SpecialSurveyBanner() {
  const { t } = useT();
  const version = useDataVersion();
  const [survey, setSurvey] = useState<SpecialSurvey | null>(null);

  useEffect(() => {
    let alive = true;
    openSurveys().then(
      (open) => alive && setSurvey(open[0] ?? null),
      // No banner if surveys can't be loaded; the Rewards tab shows errors.
      () => alive && setSurvey(null),
    );
    return () => { alive = false; };
  }, [version]);

  if (!survey) return null;
  return (
    <Link
      href={`/rewards/survey/${survey.id}`}
      className="mb-4 flex items-center gap-3.5 rounded-[18px] bg-[#E8EAF6] p-4 transition hover:brightness-[0.98] animate-fade-up focus-visible:outline-2 focus-visible:outline-teal-dark"
    >
      <span aria-hidden className="text-[32px] leading-none">📣</span>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-extrabold tracking-[0.8px] text-[#303F9F] uppercase">{t("surveyNewBadge")}</div>
        <div className="text-base font-bold">{survey.title}</div>
        {survey.description && <div className="line-clamp-2 text-[13px]">{survey.description}</div>}
      </div>
      <div className="flex flex-col items-center">
        <span className="text-lg font-black text-[#FF8F00]">+{survey.rewardCoins}</span>
        <span aria-hidden>🪙</span>
      </div>
    </Link>
  );
}

/** One guidebook tip a day, rotating through the 5 steps and the facts. */
export function TipOfTheDayCard() {
  const { t } = useT();
  const now = new Date();
  const dayOfYear = Math.floor(
    (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(now.getFullYear(), 0, 1)) / 86400000,
  );
  const tip = guideTips[dayOfYear % guideTips.length];
  return (
    <SurfaceCard>
      <div className="flex items-start gap-3.5">
        <div aria-hidden className="flex size-[52px] shrink-0 items-center justify-center rounded-[14px] bg-mint text-[26px]">
          {tip.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-teal-dark">💡 {t("tipOfTheDay")}</div>
          <div className="mt-0.5 text-[15px] font-bold">{t(tip.titleKey)}</div>
          {tip.bodyKey && <div className="mt-0.5 text-muted">{t(tip.bodyKey)}</div>}
        </div>
      </div>
    </SurfaceCard>
  );
}

const stepColors = ["#3E8E4F", "#2F6FD6", "#B7791F", "#D6455D", "#7B57C2"];

/** Numbered steps (GuideSteps). */
export function HomeSteps({ items }: { items: GuideItem[] }) {
  const { t } = useT();
  return (
    <ol className="flex flex-col gap-2.5">
      {items.map((item, n) => (
        <li key={item.titleKey}>
          <SurfaceCard className="p-3.5">
            <div className="flex items-start gap-3">
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-full font-black text-white"
                style={{ backgroundColor: stepColors[n % stepColors.length] }}
              >
                {n + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-bold">{item.emoji}{"  "}{t(item.titleKey)}</div>
                {item.bodyKey && <div className="mt-0.5 text-sm leading-snug text-muted">{t(item.bodyKey)}</div>}
              </div>
            </div>
          </SurfaceCard>
        </li>
      ))}
    </ol>
  );
}

const ageGroupColor: Record<AgeGroup, string> = {
  children: "#3E8E4F",
  adults: "#2F6FD6",
  older: "#7B57C2",
};

/** The guidebook FAQ for the chosen age group only (GuideFaq onlySelected). */
export function HomeFaq({ faqFor }: { faqFor: (g: AgeGroup) => GuideItem[] }) {
  const { t } = useT();
  const [group] = useGuideAgeGroup();
  const color = ageGroupColor[group];
  const items = faqFor(group);
  return (
    <SurfaceCard className="mb-3 overflow-hidden p-0">
      {items.map((q, n) => (
        <details key={`${group}-${n}`} className="group border-b border-line/60 last:border-b-0">
          <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-mint/50 [&::-webkit-details-marker]:hidden">
            <span
              aria-hidden
              className="flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-black"
              style={{ backgroundColor: `${color}26`, color }}
            >
              Q
            </span>
            <span className="min-w-0 flex-1 font-semibold">{t(q.titleKey)}</span>
            <span aria-hidden className="text-muted transition group-open:rotate-180">⌄</span>
          </summary>
          {q.bodyKey && <p className="px-4 pb-4 leading-relaxed">{t(q.bodyKey)}</p>}
        </details>
      ))}
    </SurfaceCard>
  );
}
