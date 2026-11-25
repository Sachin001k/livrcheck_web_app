"use client";
// Port of screens/auth_gate.dart for the signed-in pages. Decides what they show:
//   signed out                 → redirect to /login?next=<this page>
//   signed in, no consent      → ConsentScreen
//   signed in, profile missing → ProfileSetupScreen
//   signed in, profile ready   → AppShell (5 tabs)
import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "./session";
import { AppShell } from "./shell";
import { BigButton, Button, Dialog, useToast } from "./ui";
import { useT } from "@/lib/i18n";
import { isSupabaseConfigured } from "@/lib/supabase";
import { hasConsented, isProfileComplete } from "@/lib/data";
import { describeError, rawError, signOut, updatePassword, errorKey, leavingOnPurpose } from "@/lib/auth";
import { ConsentScreen } from "@/features/onboarding/consent";
import { ProfileSetupScreen } from "@/features/onboarding/profile-setup";

export function Gate({ children }: { children: ReactNode }) {
  const { session, profile, profileLoaded, profileError, reloadProfile } = useSession();
  const router = useRouter();
  const path = usePathname();
  useEffect(() => {
    if (isSupabaseConfigured && session === null && !leavingOnPurpose) router.replace(`/login?next=${encodeURIComponent(path)}`);
  }, [session, path, router]);
  let screen: ReactNode;
  if (!isSupabaseConfigured) screen = <NotConfigured />;
  else if (!session) screen = <Splash />;
  else if (profileError && !profile) screen = <LoadError error={profileError} onRetry={reloadProfile} />;
  else if (!profileLoaded) screen = <Splash />;
  else if (!profile || !hasConsented(profile)) screen = <ConsentScreen onAccepted={reloadProfile} />;
  else if (!isProfileComplete(profile)) screen = <ProfileSetupScreen initial={profile} onSaved={reloadProfile} />;
  else screen = <AppShell key={profile.id}>{children}</AppShell>;

  return screen;
}

/** App-wide handlers for links from Supabase emails (they can land on any
 * page): the set-new-password dialog and "link expired" messages. */
export function AuthLinkHandlers() {
  const { passwordRecovery, clearPasswordRecovery, authLinkError } = useSession();
  const { t } = useT();
  const toast = useToast();
  useEffect(() => {
    if (authLinkError) toast(t(errorKey(authLinkError) ?? "au_codeExpired"));
  }, [authLinkError, toast, t]);
  return <SetNewPasswordDialog open={passwordRecovery} onClose={clearPasswordRecovery} />;
}

/** Branded loading screen. */
export function Splash() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-teal-dark to-teal-light text-white">
      <div className="flex flex-col items-center animate-fade-up">
        <div className="text-6xl">🩺</div>
        <div className="mt-3 text-3xl font-extrabold">LivrCheck</div>
        <div className="mt-6 size-7 animate-spin rounded-full border-[3px] border-white/30 border-t-white" />
      </div>
    </div>
  );
}

function LoadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { t } = useT();
  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="flex max-w-sm flex-col items-center text-center">
        <div className="text-5xl opacity-40">☁️</div>
        <h1 className="mt-3 text-lg font-semibold">{t("loadProfileError")}</h1>
        <p className="mt-2 text-sm text-muted">{rawError(error)}</p>
        <Button variant="filled" className="mt-4" onClick={onRetry}>{t("retry")}</Button>
        <Button variant="text" className="mt-1" onClick={() => void signOut()}>{t("signOut")}</Button>
      </div>
    </div>
  );
}

function NotConfigured() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="max-w-md rounded-[20px] bg-white p-6 shadow">
        <h1 className="text-xl font-bold text-teal-dark">Supabase is not configured</h1>
        <p className="mt-2 text-sm text-muted">
          Copy <code>.env.example</code> to <code>.env.local</code>, fill in
          <code> NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
          (the same values as the Flutter app&apos;s env.json), then restart <code>npm run dev</code>.
        </p>
      </div>
    </div>
  );
}

/** Shown after the user opens a password-reset link. */
function SetNewPasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT();
  const toast = useToast();
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (pw.length < 6) return toast(t("passwordLengthError"));
    setBusy(true);
    const { error } = await updatePassword(pw);
    setBusy(false);
    if (error) return toast(describeError(error, t("genericError")));
    toast(t("passwordUpdated"));
    setPw("");
    onClose();
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("setNewPasswordTitle")}
      actions={<>
        <Button variant="text" onClick={onClose}>{t("cancel")}</Button>
        <Button variant="filled" disabled={busy} onClick={submit}>{t("save")}</Button>
      </>}
    >
      <label className="block text-sm font-medium text-muted">
        {t("passwordLabel")}
        <input
          type="password" autoComplete="new-password" value={pw} autoFocus
          onChange={(e) => setPw(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          className="mt-1 w-full rounded-xl border border-line px-3 py-3 text-base text-ink outline-none focus:border-teal-dark"
        />
      </label>
    </Dialog>
  );
}

export { BigButton };
