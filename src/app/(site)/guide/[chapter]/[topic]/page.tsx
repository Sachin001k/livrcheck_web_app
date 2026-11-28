import { notFound } from "next/navigation";
import { findChapter, guideChapters } from "@/features/guide/guide-content";
import { TopicClient } from "./topic-client";

export function generateStaticParams() {
  return guideChapters.flatMap((c) => c.topics.map((t) => ({ chapter: String(c.number), topic: t.id })));
}

/** A real 404 (not a soft "not found" page) for an unknown chapter or topic. */
export default async function GuideTopicPage({ params }: { params: Promise<{ chapter: string; topic: string }> }) {
  const { chapter, topic } = await params;
  if (!findChapter(chapter)?.topics.some((t) => t.id === topic)) notFound();
  return <TopicClient />;
}
