"use client";
import { useParams } from "next/navigation";
import { useSession } from "@/components/session";
import { findChapter } from "@/features/guide/guide-content";
import { GuideNotFound, TopicScreen } from "@/features/guide/learn-screen";

export default function GuideTopicPage() {
  const { chapter, topic } = useParams<{ chapter: string; topic: string }>();
  // Visitors who aren't signed in keep the challenge / plan on this device.
  const userId = useSession().session?.user.id ?? "guest";
  const c = findChapter(chapter);
  const index = c ? c.topics.findIndex((t) => t.id === topic) : -1;
  if (!c || index < 0) return <GuideNotFound />;
  return <TopicScreen key={userId} chapter={c} index={index} userId={userId} />;
}
