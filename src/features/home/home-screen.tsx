"use client";
// Port of lib/screens/home_screen.dart. Home tab: the health check and
// today's check-in side by side (stacked on phones), then tip of the day,
// the Guide card, food cards (dummy data, home-content.ts), the guidebook's
// 5 steps and the FAQ for the reader's age group.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useProfile } from "@/components/session";
import { EmojiBadge, SurfaceCard } from "@/components/ui";
import { useT } from "@/lib/i18n";
import { DailyCheckinCard } from "@/features/daily/daily-checkin-card";
import { faqFor, fiveSteps, guideTopicHref } from "@/features/guide/guide-content";
import { foodTips, type FoodTip } from "./home-content";
import { FoodDetailSheet } from "./food-detail-sheet";
import { HomeFaq, HomeSteps, SpecialSurveyBanner, TipOfTheDayCard } from "./home-extras";

export function HomeScreen() {
  const { t } = useT();
  const router = useRouter();
  const { profile } = useProfile();
  const [openFood, setOpenFood] = useState<FoodTip | null>(null);
  const firstName = (profile.fullName ?? "").trim().split(" ")[0];

  return (
    <div className="pb-6">
      <h2 className="text-2xl font-semibold lg:text-3xl">
        {t("greeting")}, {firstName} 👋
      </h2>
      <div className="mt-4">
        <SpecialSurveyBanner />
      </div>

      {/* Phones: stacked. Tablets: check + check-in side by side.
          Laptops: those two, plus tip and guide in a third column. */}
      <div className="grid grid-cols-1 gap-4 min-[620px]:grid-cols-2 xl:grid-cols-3">
        <CheckCard onStart={() => router.push("/check")} />
        <DailyCheckinCard profile={profile} />
        <div className="flex flex-col gap-3 min-[620px]:col-span-2 xl:col-span-1">
          <TipOfTheDayCard />
          <GuideCard />
        </div>
      </div>

      <SectionTitle>{t("foodSectionTitle")}</SectionTitle>
      {/* A swipeable row on phones, a grid on bigger screens. */}
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:thin] md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0 lg:grid-cols-6 md:[&>button]:w-full">
        {foodTips.map((tip) => (
          <FoodCard key={tip.nameKey} tip={tip} onOpen={() => setOpenFood(tip)} />
        ))}
      </div>

      <div className="lg:grid lg:grid-cols-2 lg:gap-8">
        <div>
          <SectionTitle>{t("gd_homeStepsTitle")}</SectionTitle>
          <HomeSteps items={fiveSteps} />
        </div>
        <div>
          <SectionTitle>{t("faqSectionTitle")}</SectionTitle>
          <HomeFaq faqFor={faqFor} />
        </div>
      </div>
      <div className="flex justify-end">
        <Link
          href={guideTopicHref("faq")}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-teal-dark hover:bg-mint"
        >
          <span aria-hidden>📖</span>
          {t("gd_homeFaqMore")}
        </Link>
      </div>

      <FoodDetailSheet tip={openFood} onClose={() => setOpenFood(null)} />
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mt-7 mb-3 text-base font-semibold">{children}</h2>;
}

/** Gradient card that starts the health check, with a gently floating 🩺. */
function CheckCard({ onStart }: { onStart: () => void }) {
  const { t } = useT();
  const organs = [
    `🍃 ${t("hm_ptLiver")}`,
    `❤️ ${t("hm_ptHeart")}`,
    `🫘 ${t("hm_ptKidneys")}`,
    `🫁 ${t("hm_organLungs")}`,
    `🍬 ${t("hm_organSugar")}`,
  ];
  // Minimum (not fixed) height, in rem so it grows with the text size,
  // matching the daily check-in card beside it.
  return (
    <div className="flex min-h-[27.5rem] flex-col rounded-[20px] bg-gradient-to-br from-teal-dark to-teal-light p-[22px] shadow-[0_6px_16px_rgb(31_94_85/0.25)]">
      <h3 className="text-[22px] font-extrabold text-white">{t("homeCheckCardTitle")}</h3>
      <p className="mt-1.5 text-[15px] text-white/70">{t("homeCheckCardBody")}</p>
      <div className="flex flex-1 items-center justify-center py-4">
        <span aria-hidden className="text-[88px] leading-none animate-float">🩺</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {organs.map((o) => (
          <span key={o} className="rounded-full bg-white/[0.18] px-2.5 py-1 text-xs text-white">{o}</span>
        ))}
      </div>
      <button
        onClick={onStart}
        className="mt-4 w-full rounded-full bg-white py-3.5 font-bold text-teal-dark transition hover:bg-mint active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        {t("startCheck")}
      </button>
    </div>
  );
}

export function FoodCard({ tip, onOpen }: { tip: FoodTip; onOpen: () => void }) {
  const { t } = useT();
  const good = tip.recommended;
  return (
    <button
      onClick={onOpen}
      className="flex min-h-[13rem] w-40 shrink-0 snap-start flex-col rounded-2xl border border-line bg-white p-3.5 text-left transition hover:shadow-md active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-teal-dark"
    >
      <div className="flex items-center justify-between gap-1.5">
        <span aria-hidden className="text-[30px] leading-none">{tip.emoji}</span>
        <span
          className="truncate rounded-full px-2 py-0.5 text-[11px] font-semibold"
          style={good ? { backgroundColor: "#4CAF501f", color: "#2E7D32" } : { backgroundColor: "#F443361f", color: "#C62828" }}
        >
          {t(good ? "eatMore" : "limitFood")}
        </span>
      </div>
      <div className="mt-2.5 font-semibold">{t(tip.nameKey)}</div>
      <div className="mt-1 line-clamp-4 flex-1 text-xs text-muted">{t(tip.whyKey)}</div>
      <div className="mt-1.5 flex items-center gap-0.5 text-xs font-semibold text-teal-dark">
        <span className="truncate">{t("viewDetails")}</span>
        <span aria-hidden>›</span>
      </div>
    </button>
  );
}

/** Opens the Guide tab (the liver guidebook). */
function GuideCard() {
  const { t } = useT();
  return (
    <Link href="/guide" className="block rounded-[20px] focus-visible:outline-2 focus-visible:outline-teal-dark">
      <SurfaceCard className="transition hover:shadow-md">
        <div className="flex items-center gap-3.5">
          <EmojiBadge emoji="📖" color="#2F6FD6" size={52} />
          <div className="min-w-0 flex-1">
            <div className="text-base font-extrabold">{t("gd_homeCardTitle")}</div>
            <div className="mt-0.5 text-muted">{t("gd_homeCardBody")}</div>
          </div>
          <span aria-hidden className="text-xl text-teal-dark">›</span>
        </div>
      </SurfaceCard>
    </Link>
  );
}
