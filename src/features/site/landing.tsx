"use client";
// The public home page (/). Shows what LivrCheck is and real content from the
// app — the Guide's chapters, food cards, the 5 steps and the FAQ — before
// anyone signs up. Text comes from the app's translations where it exists
// (welcome*, gd_*, hm_*) and from src/i18n/web/ for website-only lines.
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useSession } from "@/components/session";
import { cx, ScoreRing } from "@/components/ui";
import { useT } from "@/lib/i18n";
import { AgeGroupChips, alpha } from "@/features/guide/guide-blocks";
import { faqFor, fiveSteps, guideChapterHref, guideChapters, guideTopicHref } from "@/features/guide/guide-content";
import { FoodCard } from "@/features/home/home-screen";
import { HomeFaq, HomeSteps } from "@/features/home/home-extras";
import { FoodDetailSheet } from "@/features/home/food-detail-sheet";
import { foodTips, type FoodTip } from "@/features/home/home-content";

export function LandingPage() {
  const [openFood, setOpenFood] = useState<FoodTip | null>(null);
  return (
    <>
      <Hero />
      <TrustBar />
      <Features />
      <About />
      <HowItWorks />
      <GuidePreview />
      <Foods onOpen={setOpenFood} />
      <Steps />
      <Faq />
      <AppAndCta />
      <FoodDetailSheet tip={openFood} onClose={() => setOpenFood(null)} />
    </>
  );
}

/** Primary call to action: sign up when signed out, the dashboard when signed in. */
function useCta() {
  const { session } = useSession();
  return session
    ? { href: "/check", labelKey: "web_heroCta", alt: { href: "/dashboard", labelKey: "web_openDashboard" } }
    : { href: "/signup", labelKey: "web_heroCta", alt: { href: "/guide", labelKey: "web_heroCta2" } };
}

function Section({ id, title, sub, children, className }: { id?: string; title: string; sub?: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={cx("mx-auto max-w-6xl scroll-mt-20 px-4 pt-16 sm:pt-20", className)}>
      <div className="mx-auto mb-8 max-w-2xl text-center">
        <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{title}</h2>
        {sub && <p className="mt-3 text-muted sm:text-lg">{sub}</p>}
      </div>
      {children}
    </section>
  );
}

function Hero() {
  const { t } = useT();
  const cta = useCta();
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-teal-dark via-[#2a6f64] to-teal-light text-white">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:py-20 lg:grid-cols-2">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">
            <span aria-hidden>🇮🇳</span> {t("web_heroKicker")}
          </span>
          <h1 className="mt-5 text-4xl leading-[1.1] font-extrabold tracking-tight sm:text-5xl">{t("web_heroTitle")}</h1>
          <p className="mt-5 max-w-xl text-lg text-white/85">{t("web_heroBody")}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href={cta.href} className="inline-flex min-h-14 items-center justify-center rounded-full bg-white px-7 text-lg font-bold text-teal-dark shadow-lg transition hover:bg-mint active:scale-[0.99]">
              {t(cta.labelKey)} →
            </Link>
            <Link href={cta.alt.href} className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/50 px-7 text-lg font-semibold text-white transition hover:bg-white/10">
              {t(cta.alt.labelKey)}
            </Link>
          </div>
        </div>
        <HeroMock />
      </div>
    </section>
  );
}

/** An illustration of a result card, built from the app's own components. */
function HeroMock() {
  const { t } = useT();
  const organs = [
    { e: "🍃", k: "hm_ptLiver", c: "#3E8E6B" },
    { e: "❤️", k: "hm_ptHeart", c: "#3E8E6B" },
    { e: "🫘", k: "hm_ptKidneys", c: "#3E8E6B" },
    { e: "🫁", k: "hm_organLungs", c: "#3E8E6B" },
    { e: "🍬", k: "hm_organSugar", c: "#D99A2B" },
  ];
  return (
    <div className="relative mx-auto w-full max-w-sm" aria-hidden>
      <div className="rotate-[-2deg] rounded-[28px] bg-white p-6 text-ink shadow-2xl">
        <div className="flex items-center gap-4">
          <ScoreRing value={82} size={104} stroke={11} color="#3E8E6B">
            <span className="text-3xl font-extrabold">82</span>
          </ScoreRing>
          <div>
            <div className="text-sm text-muted">{t("web_mockScore")}</div>
            <div className="text-2xl font-extrabold text-low">{t("web_mockTier")}</div>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {organs.map((o) => (
            <span key={o.k} className="rounded-full px-3 py-1 text-sm font-semibold" style={{ backgroundColor: `${o.c}1f`, color: o.c }}>
              {o.e} {t(o.k)}
            </span>
          ))}
        </div>
      </div>
      <div className="absolute -bottom-6 -left-4 rotate-[3deg] rounded-2xl bg-white px-4 py-3 text-ink shadow-xl sm:-left-10">
        <div className="flex items-center gap-2 text-sm font-bold">
          <span className="text-xl">🔥</span> 7 · <span className="text-xl">🪙</span> +10
        </div>
      </div>
      <div className="absolute -top-5 -right-2 animate-float rounded-2xl bg-white px-3 py-2 text-3xl shadow-xl">🥗</div>
    </div>
  );
}

function TrustBar() {
  const { t } = useT();
  const items = [
    ["🆓", "web_trustFree"],
    ["🗣️", "web_trustLangs"],
    ["🔒", "web_trustPrivate"],
    ["🩸", "web_trustNoReport"],
  ] as const;
  return (
    <div className="border-b border-line/70 bg-white">
      <ul className="mx-auto grid max-w-6xl grid-cols-2 gap-x-4 gap-y-3 px-4 py-5 sm:grid-cols-4">
        {items.map(([e, k]) => (
          <li key={k} className="flex items-center justify-center gap-2 text-sm font-semibold text-teal-dark">
            <span aria-hidden className="text-lg">{e}</span> {t(k)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Features() {
  const { t } = useT();
  const items = [
    { e: "🩺", title: "welcome1Title", body: "welcome1Body", c: "#1F5E55" },
    { e: "📅", title: "welcome2Title", body: "welcome2Body", c: "#2F6FD6" },
    { e: "🪙", title: "welcome3Title", body: "welcome3Body", c: "#B7791F" },
    { e: "🔒", title: "welcome4Title", body: "welcome4Body", c: "#7B57C2" },
  ];
  return (
    <Section title={t("web_featuresTitle")} sub={t("web_featuresSub")}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((f) => (
          <div key={f.title} className="rounded-[22px] border border-line/70 bg-white p-6 shadow-[0_4px_12px_rgb(0_0_0/0.04)]">
            <span className="flex size-12 items-center justify-center rounded-2xl text-2xl" style={{ backgroundColor: `${f.c}1a` }} aria-hidden>{f.e}</span>
            <h3 className="mt-4 text-lg font-bold">{t(f.title)}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">{t(f.body)}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function About() {
  const { t } = useT();
  // The Guide's 4 stages (topic 1.4); their titles already carry the number.
  const stages = [
    { k: "gd_st1", c: "#B7791F" },
    { k: "gd_st2", c: "#E07B39" },
    { k: "gd_st3", c: "#C4513A" },
    { k: "gd_st4", c: "#7B57C2" },
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 pt-16 sm:pt-20">
      <div className="grid items-center gap-8 rounded-[28px] bg-white p-6 shadow-[0_4px_12px_rgb(0_0_0/0.04)] sm:p-10 lg:grid-cols-2">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t("web_aboutTitle")}</h2>
          <p className="mt-4 leading-relaxed text-muted sm:text-lg">{t("web_aboutBody")}</p>
          <div className="mt-6 rounded-2xl bg-mint p-5">
            <h3 className="font-bold text-teal-dark">🍃 {t("notAlcoholHeading")}</h3>
            <p className="mt-2 text-[15px] leading-relaxed">{t("notAlcoholBody")}</p>
          </div>
        </div>
        <div>
          <ol className="flex flex-col gap-2">
            {stages.map((s) => (
              <li key={s.k} className="rounded-2xl border-l-4 bg-page p-3.5" style={{ borderColor: s.c }}>
                <div className="font-bold" style={{ color: s.c }}>{t(`${s.k}T`)}</div>
                <div className="mt-0.5 text-sm text-muted">{t(`${s.k}B`)}</div>
              </li>
            ))}
          </ol>
          <p className="mt-3 flex gap-2 rounded-2xl bg-[#EAF6EF] p-3.5 text-sm font-semibold text-[#2E7350]">
            <span aria-hidden>🔄</span> {t("gd_stSeq4")}
          </p>
          <Link href={guideTopicHref("stages")} className="mt-4 inline-flex min-h-11 items-center gap-1 rounded-full px-1 font-semibold text-teal-dark hover:underline">
            {t("web_aboutCta")} →
          </Link>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const { t } = useT();
  const cta = useCta();
  const steps = [
    { e: "✍️", title: "web_how1Title", body: "web_how1Body" },
    { e: "📝", title: "web_how2Title", body: "web_how2Body" },
    { e: "🌱", title: "web_how3Title", body: "web_how3Body" },
  ];
  return (
    <Section id="how" title={t("web_howTitle")}>
      <ol className="grid gap-4 md:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.title} className="relative rounded-[22px] border border-line/70 bg-white p-6">
            <span className="absolute top-5 right-5 text-5xl font-black text-mint">{i + 1}</span>
            <span className="text-3xl" aria-hidden>{s.e}</span>
            <h3 className="mt-3 text-lg font-bold">{t(s.title)}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">{t(s.body)}</p>
          </li>
        ))}
      </ol>
      <div className="mt-8 flex justify-center">
        <Link href={cta.href} className="inline-flex min-h-14 items-center justify-center rounded-full bg-teal-dark px-8 text-lg font-bold text-white hover:bg-[#184c45]">
          {t(cta.labelKey)} →
        </Link>
      </div>
    </Section>
  );
}

function GuidePreview() {
  const { t, tf } = useT();
  return (
    <Section id="guide" title={t("web_guideTitle")} sub={t("web_guideSub")}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {guideChapters.map((c) => (
          <Link
            key={c.number}
            href={guideChapterHref(c)}
            className="group flex flex-col rounded-[22px] border p-5 transition hover:-translate-y-0.5 hover:shadow-lg"
            style={{ backgroundColor: alpha(c.color, 0.06), borderColor: alpha(c.color, 0.25) }}
          >
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-full text-lg font-black text-white" style={{ backgroundColor: c.color }}>{c.number}</span>
              <span className="text-2xl" aria-hidden>{c.emoji}</span>
            </div>
            <h3 className="mt-4 text-lg font-extrabold" style={{ color: c.color }}>{t(c.titleKey)}</h3>
            <p className="mt-1.5 flex-1 text-[15px] text-ink/80">{t(c.bodyKey)}</p>
            <span className="mt-4 text-sm font-bold" style={{ color: c.color }}>
              {tf("gd_topics", { n: c.topics.length })} <span className="inline-block transition group-hover:translate-x-1">→</span>
            </span>
          </Link>
        ))}
      </div>
      <div className="mt-8 flex justify-center">
        <Link href="/guide" className="inline-flex min-h-12 items-center rounded-full border border-teal-dark/40 px-6 font-semibold text-teal-dark hover:bg-mint">
          📖 {t("web_guideAll")}
        </Link>
      </div>
    </Section>
  );
}

function Foods({ onOpen }: { onOpen: (tip: FoodTip) => void }) {
  const { t } = useT();
  return (
    <Section id="foods" title={t("web_foodsTitle")} sub={t("web_foodsSub")}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 [&>button]:w-full">
        {foodTips.map((tip) => <FoodCard key={tip.nameKey} tip={tip} onOpen={() => onOpen(tip)} />)}
      </div>
    </Section>
  );
}

function Steps() {
  const { t } = useT();
  return (
    <Section title={t("gd_homeStepsTitle")} sub={t("web_stepsSub")}>
      <div className="mx-auto max-w-3xl">
        <HomeSteps items={fiveSteps} />
      </div>
    </Section>
  );
}

function Faq() {
  const { t } = useT();
  return (
    <Section id="faq" title={t("web_faqTitle")} sub={t("web_faqSub")}>
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex justify-center"><AgeGroupChips /></div>
        <HomeFaq faqFor={faqFor} />
        <div className="flex justify-center">
          <Link href={guideTopicHref("faq")} className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 font-semibold text-teal-dark hover:bg-mint">
            📖 {t("gd_homeFaqMore")}
          </Link>
        </div>
      </div>
    </Section>
  );
}

function AppAndCta() {
  const { t } = useT();
  const cta = useCta();
  return (
    <section className="mx-auto max-w-6xl px-4 pt-16 sm:pt-20">
      <div className="grid items-center gap-8 overflow-hidden rounded-[28px] bg-gradient-to-br from-teal-dark to-teal-light p-8 text-white sm:p-12 lg:grid-cols-[3fr_2fr]">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">{t("web_ctaTitle")}</h2>
          <p className="mt-3 text-lg text-white/85">{t("web_ctaBody")}</p>
          <Link href={cta.href} className="mt-7 inline-flex min-h-14 items-center justify-center rounded-full bg-white px-8 text-lg font-bold text-teal-dark hover:bg-mint">
            {t(cta.labelKey)} →
          </Link>
        </div>
        <div className="rounded-[22px] bg-white/10 p-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl" aria-hidden>📱</span>
            <h3 className="text-lg font-bold">{t("web_appTitle")}</h3>
          </div>
          <p className="mt-3 text-[15px] leading-relaxed text-white/85">{t("web_appBody")}</p>
        </div>
      </div>
    </section>
  );
}
