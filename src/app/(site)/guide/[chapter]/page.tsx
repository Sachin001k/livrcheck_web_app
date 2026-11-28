import { notFound } from "next/navigation";
import { findChapter, guideChapters } from "@/features/guide/guide-content";
import { ChapterClient } from "./chapter-client";

export function generateStaticParams() {
  return guideChapters.map((c) => ({ chapter: String(c.number) }));
}

/** A real 404 (not a soft "not found" page) for an unknown chapter. */
export default async function GuideChapterPage({ params }: { params: Promise<{ chapter: string }> }) {
  const { chapter } = await params;
  if (!findChapter(chapter)) notFound();
  return <ChapterClient />;
}
