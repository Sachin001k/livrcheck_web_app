"use client";
import { useParams } from "next/navigation";
import { SpecialSurveyPage } from "@/features/rewards/special-survey-screen";

export default function SpecialSurveyRoute() {
  const { id } = useParams<{ id: string }>();
  return <SpecialSurveyPage id={decodeURIComponent(id)} />;
}
