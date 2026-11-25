"use client";
// Port of lib/onboarding/privacy_policy_screen.dart. DRAFT policy written to
// India's DPDP Act 2023 principles; needs legal review before release.
import { SurfaceCard } from "@/components/ui";
import { useT } from "@/lib/i18n";
import { supportEmail } from "@/lib/supabase";

/** Date of the last change to the policy text. */
const LAST_UPDATED = new Date(2026, 9, 1);

const SECTIONS = [
  ["pp_collectTitle", "pp_collectBody"],
  ["pp_whyTitle", "pp_whyBody"],
  ["pp_whereTitle", "pp_whereBody"],
  ["pp_whoTitle", "pp_whoBody"],
  ["pp_keepTitle", "pp_keepBody"],
  ["pp_rightsTitle", "pp_rightsBody"],
  ["pp_medicalTitle", "pp_medicalBody"],
  ["pp_changesTitle", "pp_changesBody"],
] as const;

export function PrivacyPolicyContent() {
  const { t, tf } = useT();
  const d = LAST_UPDATED;
  const date = `${d.getDate()} ${t(`sv_month${d.getMonth() + 1}`)} ${d.getFullYear()}`;
  return (
    <div>
      <p className="text-[13px] text-muted">{tf("pp_lastUpdated", { date })}</p>
      <div className="mt-3 flex flex-col gap-2.5">
        {SECTIONS.map(([title, body]) => (
          <SurfaceCard key={title}>
            <h2 className="text-base font-bold">{t(title)}</h2>
            <p className="mt-1.5 whitespace-pre-line leading-relaxed">{tf(body, { email: supportEmail })}</p>
          </SurfaceCard>
        ))}
      </div>
    </div>
  );
}
