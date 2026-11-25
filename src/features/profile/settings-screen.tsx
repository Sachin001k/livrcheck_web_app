"use client";
// Port of lib/screens/settings_screen.dart: language, reminder (coming soon),
// account, privacy & data, about. Opened from the gear on the Profile header.
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Button, Dialog, ErrorState, LanguageSelect, SurfaceCard, cx, useToast } from "@/components/ui";
import { useProfile, useSession } from "@/components/session";
import { useT } from "@/lib/i18n";
import { exportMyData } from "@/lib/data";
import { signOut } from "@/lib/auth";
import { appVersion, supportEmail } from "@/lib/supabase";
import { EditProfileSheet } from "@/features/onboarding/profile-setup";
import { DeleteAccountDialog } from "./delete-account-dialog";

export function SettingsScreen() {
  const { t } = useT();
  const { session } = useSession();
  const { profile, reloadProfile } = useProfile();
  const email = session?.user.email ?? "";
  const [editing, setEditing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <div className="mx-auto max-w-[560px]">
      <h1 className="text-2xl font-extrabold">{t("settingsTitle")}</h1>

      <Section title={t("settingsLanguage")}>
        <Tile icon="🌐" title={t("settingsLanguage")} trailing={<LanguageSelect />} />
      </Section>

      <Section title={t("settingsReminder")}>
        <Tile
          icon="🔔" title={t("settingsReminder")} subtitle={t("settingsReminderSoon")}
          trailing={
            <span aria-disabled className="relative inline-block h-7 w-12 rounded-full bg-line opacity-60" title={t("settingsReminderSoon")}>
              <span className="absolute top-1 left-1 size-5 rounded-full bg-white shadow" />
            </span>
          }
        />
      </Section>

      <Section title={t("settingsAccount")}>
        <Tile icon="👤" title={t("editProfile")} subtitle={email || undefined} chevron onClick={() => setEditing(true)} />
        <Tile icon="🚪" title={t("signOut")} onClick={() => void signOut()} />
      </Section>

      <Section title={t("settingsPrivacyData")}>
        <Tile icon="🛡️" title={t("privacyTitle")} chevron href="/privacy" />
        <Tile icon="⬇️" title={t("settingsDownload")} subtitle={t("settingsDownloadBody")} onClick={() => setExporting(true)} />
        <Tile icon="🗑️" title={t("deleteAccount")} danger onClick={() => setDeleting(true)} />
      </Section>

      <Section title={t("settingsAbout")}>
        <Tile icon="ℹ️" title="LivrCheck" subtitle={`${t("settingsVersion")} ${appVersion}`} />
        <Tile icon="✉️" title={t("settingsContact")} subtitle={supportEmail} href={`mailto:${supportEmail}?subject=LivrCheck`} />
      </Section>

      <EditProfileSheet open={editing} onClose={() => setEditing(false)} initial={profile} onSaved={() => void reloadProfile()} />
      {exporting && <ExportDialog onClose={() => setExporting(false)} />}
      <DeleteAccountDialog open={deleting} onClose={() => setDeleting(false)} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="px-1 pt-5 pb-2 font-bold text-muted">{title}</h2>
      <SurfaceCard className="divide-y divide-line/60 !py-1 !px-0">{children}</SurfaceCard>
    </section>
  );
}

function Tile({ icon, title, subtitle, trailing, chevron, danger, onClick, href }: {
  icon: string; title: string; subtitle?: string; trailing?: ReactNode; chevron?: boolean;
  danger?: boolean; onClick?: () => void; href?: string;
}) {
  const body = (
    <>
      <span aria-hidden className="w-7 shrink-0 text-center text-xl">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className={cx("block font-medium", danger && "text-high")}>{title}</span>
        {subtitle && <span className="block truncate text-sm text-muted">{subtitle}</span>}
      </span>
      {trailing}
      {chevron && <span aria-hidden className="text-xl text-muted">›</span>}
    </>
  );
  const cls = "flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left";
  const interactive = "transition hover:bg-mint/60 focus-visible:outline-2 focus-visible:outline-teal-dark";
  if (href) {
    return href.startsWith("/")
      ? <Link href={href} className={cx(cls, interactive)}>{body}</Link>
      : <a href={href} className={cx(cls, interactive)}>{body}</a>;
  }
  if (onClick) return <button onClick={onClick} className={cx(cls, interactive)}>{body}</button>;
  return <div className={cls}>{body}</div>;
}

/** "Download my data": shows counts + JSON, with Copy and Download buttons. */
function ExportDialog({ onClose }: { onClose: () => void }) {
  const { t } = useT();
  const toast = useToast();
  const [state, setState] = useState<{ json?: string; counts?: string; error?: unknown }>({});
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    exportMyData().then(
      (data) => {
        if (!alive) return;
        const counts = Object.entries(data)
          .filter(([, v]) => Array.isArray(v))
          .map(([k, v]) => `${k}: ${(v as unknown[]).length}`)
          .join(" · ");
        setState({ json: JSON.stringify(data, null, 2), counts });
      },
      (error) => alive && setState({ error }),
    );
    return () => { alive = false; };
  }, [nonce]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(state.json ?? "");
      toast(t("settingsCopied"));
    } catch {
      toast(t("genericError"));
    }
  };

  const download = () => {
    const blob = new Blob([state.json ?? ""], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `livrcheck-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <Dialog
      open onClose={onClose} title={t("settingsDownload")}
      actions={<Button variant="text" onClick={onClose}>{t("close")}</Button>}
    >
      {state.error ? (
        <ErrorState error={state.error} onRetry={() => { setState({}); setNonce((n) => n + 1); }} />
      ) : !state.json ? (
        <div className="flex h-[120px] items-center justify-center">
          <span className="size-8 animate-spin rounded-full border-[3px] border-mint border-t-teal-dark" />
        </div>
      ) : (
        <div className="flex flex-col">
          <p>{t("settingsDownloadBody")}</p>
          <p className="mt-2 text-xs text-muted">{state.counts}</p>
          <pre className="mt-3 h-[220px] overflow-auto rounded-lg bg-page p-2 font-mono text-[11px] whitespace-pre-wrap break-all select-text">{state.json}</pre>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="tonal" onClick={copy}>📋 {t("settingsCopy")}</Button>
            <Button variant="filled" onClick={download}>⬇️ JSON</Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
