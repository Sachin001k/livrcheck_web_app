"use client";
// Port of lib/onboarding/consent_screen.dart: shown once after sign-in (and
// again if the consent version changes); records the user's agreement.
import { useState } from "react";
import { BigButton, Button, SurfaceCard } from "@/components/ui";
import { useT } from "@/lib/i18n";
import { saveConsent } from "@/lib/data";
import { describeError, signOut } from "@/lib/auth";
import { PageFrame, Spinner } from "./page-frame";
import { PrivacyPolicyContent } from "./privacy-policy";

const CHECKS = ["consentNotDiagnosis", "consentStore"] as const;
const POINTS = [
  ["📋", "consentCollectTitle", "consentCollectBody"],
  ["🎯", "consentWhyTitle", "consentWhyBody"],
  ["🔒", "consentWhoTitle", "consentWhoBody"],
  ["🗑️", "consentRightsTitle", "consentRightsBody"],
] as const;

export function ConsentScreen({ onAccepted }: { onAccepted: () => void }) {
  const { t, lang } = useT();
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPolicy, setShowPolicy] = useState(false);
  const allTicked = ticked.size === CHECKS.length;

  const agree = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveConsent();
      onAccepted();
    } catch (e) {
      setSaving(false);
      setError(`${t("consentSaveError")} ${describeError(e, "", lang)}`);
    }
  };

  if (showPolicy) {
    return (
      <PageFrame title={t("privacyTitle")} onBack={() => setShowPolicy(false)} maxWidth={640}>
        <PrivacyPolicyContent />
      </PageFrame>
    );
  }

  return (
    <PageFrame
      title={t("consentTitle")}
      action={<Button variant="text" onClick={() => void signOut()}>{t("signOut")}</Button>}
    >
      <p className="text-base text-muted">{t("consentIntro")}</p>
      <div className="mt-4 flex flex-col gap-2.5">
        {POINTS.map(([emoji, title, body]) => (
          <SurfaceCard key={title} className="flex items-start gap-3.5 !p-3.5">
            <span className="text-[26px] leading-none">{emoji}</span>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-bold">{t(title)}</div>
              <div className="mt-0.5 text-muted">{t(body)}</div>
            </div>
          </SurfaceCard>
        ))}
      </div>
      <Button variant="text" className="mt-2" onClick={() => { setShowPolicy(true); window.scrollTo(0, 0); }}>
        📄 {t("consentReadPolicy")}
      </Button>
      <SurfaceCard className="mt-1 !py-1">
        {CHECKS.map((key) => (
          <label key={key} className="flex min-h-14 cursor-pointer items-center gap-3 px-1 py-2">
            <input
              type="checkbox"
              checked={ticked.has(key)}
              onChange={(e) => {
                const next = new Set(ticked);
                if (e.target.checked) next.add(key); else next.delete(key);
                setTicked(next);
              }}
              className="size-5 shrink-0 accent-teal-dark"
            />
            <span className="text-sm">{t(key)}</span>
          </label>
        ))}
      </SurfaceCard>
      {error && <p role="alert" className="mt-3 text-high">{error}</p>}
      <BigButton className="mt-5" disabled={!allTicked || saving} onClick={agree}>
        {saving ? <Spinner /> : t("consentAgree")}
      </BigButton>
    </PageFrame>
  );
}
