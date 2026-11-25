"use client";
// Public privacy policy (no sign-in needed), in the visitor's chosen language.
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LanguageSelect } from "@/components/ui";
import { initLangFromDevice, useT } from "@/lib/i18n";
import { PageFrame } from "@/features/onboarding/page-frame";
import { PrivacyPolicyContent } from "@/features/onboarding/privacy-policy";

export default function PrivacyPage() {
  const { t } = useT();
  const router = useRouter();
  useEffect(() => initLangFromDevice(), []);
  return (
    <PageFrame
      title={t("privacyTitle")}
      maxWidth={640}
      onBack={() => (window.history.length > 1 ? router.back() : router.push("/"))}
      action={<LanguageSelect />}
    >
      <PrivacyPolicyContent />
    </PageFrame>
  );
}
