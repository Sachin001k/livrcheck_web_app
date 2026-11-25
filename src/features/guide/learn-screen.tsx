"use client";
// Port of lib/learn/learn_screen.dart — Guide tab, chapter page, topic page.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EmojiBadge, FriendlyState, SurfaceCard } from "@/components/ui";
import { useT } from "@/lib/i18n";
import { alpha, AgeGroupChips, GuideBlockView, GuideInfoBox } from "./guide-blocks";
import { guideChapterHref, guideChapters, type GuideChapter } from "./guide-content";

/** Guide tab: the guidebook's chapters, with an age-group switch.
 * The age group starts from the profile age (set by the app shell). */
export function LearnScreen() {
  const { t } = useT();
  return (
    <div className="flex flex-col pb-4 animate-fade-up">
      <Hero />
      <SurfaceCard className="mt-4">
        <div className="mb-2.5 font-bold">{t("gd_showFor")}</div>
        <AgeGroupChips />
      </SurfaceCard>
      <div className="mt-4 flex flex-col gap-3">
        {guideChapters.map((c) => <ChapterCard key={c.number} chapter={c} />)}
      </div>
      <div className="mt-5">
        <GuideInfoBox b={{ type: "info", emoji: "❗", titleKey: "gd_important", bodyKey: "gd_disclaimer", tone: "urgent" }} />
      </div>
      <div className="mt-3">
        <GuideInfoBox b={{ type: "info", emoji: "🩺", titleKey: "gd_tabTitle", bodyKey: "gd_reviewed", tone: "info" }} />
      </div>
    </div>
  );
}

function Hero() {
  const { t } = useT();
  return (
    <div className="flex items-center gap-2 rounded-[22px] bg-gradient-to-br from-[#1D3F8A] to-teal-dark p-[22px]">
      <div className="min-w-0 flex-1">
        <h2 className="text-2xl font-black text-white">{t("gd_heroTitle")}</h2>
        <p className="mt-1 text-base font-bold text-[#BFF0E6]">{t("gd_heroSub")}</p>
        <p className="mt-2 text-sm text-white/70">{t("gd_heroBody")}</p>
      </div>
      <span className="text-[54px] leading-none animate-float" aria-hidden>📖</span>
    </div>
  );
}

function ChapterCard({ chapter }: { chapter: GuideChapter }) {
  const { t, tf } = useT();
  const c = chapter.color;
  return (
    <Link
      href={guideChapterHref(chapter)}
      className="flex items-center gap-3.5 rounded-[20px] border p-4 transition hover:shadow-md active:scale-[0.99] focus-visible:outline-2"
      style={{ backgroundColor: alpha(c, 0.07), borderColor: alpha(c, 0.25), outlineColor: c }}
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full text-xl font-black text-white" style={{ backgroundColor: c }}>
        {chapter.number}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[17px] font-extrabold" style={{ color: c }}>{chapter.emoji}  {t(chapter.titleKey)}</div>
        <div className="mt-[3px] text-[13.5px]">{t(chapter.bodyKey)}</div>
        <div className="mt-1.5 text-xs font-bold" style={{ color: c }}>{tf("gd_topics", { n: chapter.topics.length })}</div>
      </div>
      <span className="text-xl" style={{ color: c }} aria-hidden>›</span>
    </Link>
  );
}

/** Tinted strip at the top of a pushed guide page (the app's tinted app bar). */
function PageBar({ chapter, title }: { chapter: GuideChapter; title: string }) {
  return (
    <div
      className="-mx-4 -mt-4 mb-4 truncate px-4 py-2.5 text-sm font-bold"
      style={{ backgroundColor: alpha(chapter.color, 0.12), color: chapter.color }}
    >
      {title}
    </div>
  );
}

/** One chapter: its topics, numbered like the guidebook. */
export function ChapterScreen({ chapter }: { chapter: GuideChapter }) {
  const { t, tf } = useT();
  const c = chapter.color;
  return (
    <div className="pb-4 animate-fade-up">
      <PageBar chapter={chapter} title={tf("gd_chapter", { n: chapter.number })} />
      <h2 className="text-2xl font-black" style={{ color: c }}>{chapter.emoji}  {t(chapter.titleKey)}</h2>
      <p className="mt-1.5 text-[15px]">{t(chapter.bodyKey)}</p>
      <div className="mt-[18px] flex flex-col gap-2.5">
        {chapter.topics.map((topic, n) => (
          <Link
            key={topic.id}
            href={`${guideChapterHref(chapter)}/${topic.id}`}
            className="flex items-center gap-3.5 rounded-[20px] border border-line/70 bg-white px-3.5 py-3 shadow-[0_4px_12px_rgb(0_0_0/0.04)] transition hover:shadow-md active:scale-[0.99]"
          >
            <EmojiBadge emoji={topic.emoji} color={c} />
            <div className="min-w-0 flex-1">
              <div className="text-[15.5px] font-bold">{t(topic.titleKey)}</div>
              <div className="text-sm font-bold" style={{ color: c }}>{chapter.number}.{n + 1}</div>
            </div>
            <span className="text-xl" style={{ color: c }} aria-hidden>›</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/** One topic page, with "Next" to the following topic in the chapter. */
export function TopicScreen({ chapter, index, userId }: { chapter: GuideChapter; index: number; userId: string }) {
  const { t, tf } = useT();
  const router = useRouter();
  const topic = chapter.topics[index];
  const next = chapter.topics[index + 1] ?? null;
  const c = chapter.color;
  return (
    <div key={topic.id} className="pb-4 animate-fade-up">
      <PageBar chapter={chapter} title={t(chapter.titleKey)} />
      <div className="flex items-center gap-3.5">
        <EmojiBadge emoji={topic.emoji} color={c} size={52} />
        <div className="min-w-0 flex-1">
          <div className="text-[11.5px] font-extrabold tracking-[0.06em]" style={{ color: c }}>
            {chapter.number}.{index + 1} · {t(chapter.titleKey).toUpperCase()}
          </div>
          <h2 className="mt-0.5 text-[22px] leading-[1.15] font-black">{t(topic.titleKey)}</h2>
        </div>
      </div>
      <div className="mt-[18px] flex flex-col gap-4">
        {topic.blocks.map((b, n) => <GuideBlockView key={n} block={b} color={c} userId={userId} />)}
      </div>
      <div className="mt-6">
        {next ? (
          <button
            type="button"
            // Replace, so Back returns to the chapter (pushReplacement in the app).
            onClick={() => router.replace(`${guideChapterHref(chapter)}/${next.id}`)}
            className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl px-4 font-bold text-white transition hover:opacity-90 active:scale-[0.99]"
            style={{ backgroundColor: c }}
          >
            <span aria-hidden>→</span>
            <span className="truncate">{tf("gd_next", { title: t(next.titleKey) })}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => router.push(guideChapterHref(chapter))}
            className="flex min-h-[52px] w-full items-center justify-center rounded-2xl border border-line font-bold text-teal-dark transition hover:bg-mint"
          >
            {t("gd_backToChapter")}
          </button>
        )}
      </div>
    </div>
  );
}

/** Shown for an unknown chapter or topic in the URL. */
export function GuideNotFound() {
  const { t } = useT();
  const router = useRouter();
  return (
    <FriendlyState emoji="📖" title={t("er_couldNotLoad")} actionLabel={t("gd_tabTitle")} onAction={() => router.replace("/guide")} />
  );
}
