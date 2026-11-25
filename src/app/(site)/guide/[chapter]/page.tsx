"use client";
import { useParams } from "next/navigation";
import { findChapter } from "@/features/guide/guide-content";
import { ChapterScreen, GuideNotFound } from "@/features/guide/learn-screen";

export default function GuideChapterPage() {
  const { chapter } = useParams<{ chapter: string }>();
  const c = findChapter(chapter);
  return c ? <ChapterScreen chapter={c} /> : <GuideNotFound />;
}
