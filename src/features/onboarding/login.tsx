"use client";
// Port of lib/screens/login_screen.dart: sign in / sign up with email + password,
// as the website's /login and /signup pages (split layout: brand panel + form).
// Phone OTP and Google sign-in exist in lib/auth.ts but stay hidden, as in the app,
// until they are configured in Supabase. The gate swaps this screen out when a
// session arrives.
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { LanguageSelect } from "@/components/ui";
import { Logo } from "@/components/shell";
import { useT } from "@/lib/i18n";
import { describeError, sendPasswordReset, signInWithEmail, signUpWithEmail } from "@/lib/auth";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function LoginScreen({ initialSignUp = false }: { initialSignUp?: boolean }) {
  const { t, lang } = useT();
  const [isSignUp, setIsSignUpState] = useState(initialSignUp);
  // Keep the address bar in step (/login ↔ /signup) without a navigation.
  const setIsSignUp = (v: boolean | ((x: boolean) => boolean)) => {
    setIsSignUpState((cur) => {
      const next = typeof v === "function" ? v(cur) : v;
      const url = new URL(window.location.href);
      url.pathname = next ? "/signup" : "/login";
      window.history.replaceState(window.history.state, "", url);
      return next;
    });
  };
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const trimmedEmail = email.trim();
  const emailLooksValid = EMAIL_RE.test(trimmedEmail);

  /** Runs action with a spinner, showing any Supabase error in plain words. */
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await action();
    } catch (e) {
      setError(describeError(e, t("genericError"), lang));
    } finally {
      setBusy(false);
    }
  };

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (isSignUp && !name.trim()) return setError(t("nameRequiredError"));
    if (!emailLooksValid) return setError(t("emailRequiredError"));
    if (password.length < 6) return setError(t("passwordLengthError"));
    void run(async () => {
      if (isSignUp) {
        const { data, error } = await signUpWithEmail(trimmedEmail, password, name.trim());
        if (error) throw error;
        // No session means Supabase wants the email confirmed first.
        if (!data.session) {
          setInfo(t("checkEmailConfirm"));
          setIsSignUp(false);
        }
      } else {
        const { error } = await signInWithEmail(trimmedEmail, password);
        if (error) throw error;
      }
    });
  };

  const forgotPassword = () => {
    if (!emailLooksValid) return setError(t("forgotPasswordNeedsEmail"));
    void run(async () => {
      const { error } = await sendPasswordReset(trimmedEmail);
      if (error) throw error;
      setInfo(t("resetEmailSent"));
    });
  };

  const perks = [
    ["🩺", "welcome1Title"],
    ["📅", "welcome2Title"],
    ["🪙", "welcome3Title"],
    ["🔒", "welcome4Title"],
  ] as const;

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* Brand panel: a short strip on phones, a full column on desktop. */}
      <aside className="relative overflow-hidden bg-gradient-to-br from-teal-dark to-teal-light px-6 pt-5 pb-8 text-white lg:px-12 lg:py-10">
        <div className="flex items-center justify-between">
          <Logo light />
          <LanguageSelect light className="lg:hidden" />
        </div>
        <div className="mt-6 lg:mt-24 lg:max-w-md">
          <h1 className="text-3xl font-extrabold leading-tight lg:text-4xl">{t(isSignUp ? "createAccountTitle" : "loginTitle")}</h1>
          <p className="mt-2 text-white/80">{t("loginSubtitle")}</p>
          <div className="mt-10 hidden lg:block">
            <p className="text-2xl font-bold leading-snug">{t("web_authSideTitle")}</p>
            <ul className="mt-6 space-y-3">
              {perks.map(([e, k]) => (
                <li key={k} className="flex items-center gap-3 text-white/90">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-white/15 text-xl" aria-hidden>{e}</span>
                  <span className="font-semibold">{t(k)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-8 text-sm text-white/70">{t("web_authSideBody")}</p>
          </div>
        </div>
        <span aria-hidden className="pointer-events-none absolute -right-10 -bottom-10 text-[180px] opacity-10 lg:text-[260px]">🩺</span>
      </aside>

      <main className="flex flex-col bg-page px-4 pt-4 pb-10 sm:px-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-teal-dark hover:bg-mint">
            <span aria-hidden>←</span> {t("web_backHome")}
          </Link>
          <LanguageSelect className="hidden lg:block" />
        </div>
        <div className="flex flex-1 items-start justify-center pt-6 lg:items-center lg:pt-0">
        <form
          onSubmit={submit}
          noValidate
          className="flex w-full max-w-[440px] flex-col rounded-[24px] border border-line/70 bg-white px-6 pt-7 pb-6 shadow-[0_8px_30px_rgb(0_0_0/0.06)] sm:px-8"
        >
          {isSignUp && (
            <>
              <UnderlineField
                label={t("fullNameLabel")} placeholder={t("fullNameHint")}
                value={name} onChange={setName} autoComplete="name"
              />
              <div className="h-6" />
            </>
          )}
          <UnderlineField
            label={t("emailLabel")} placeholder={t("emailHint")} type="email" inputMode="email"
            value={email} onChange={setEmail} autoComplete="email"
          />
          <div className="h-6" />
          <UnderlineField
            label={t("passwordLabel")} placeholder={t("passwordHint")}
            type={showPassword ? "text" : "password"}
            value={password} onChange={setPassword}
            autoComplete={isSignUp ? "new-password" : "current-password"}
            suffix={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="flex size-10 items-center justify-center rounded-full text-black/45 hover:bg-black/5"
              >
                {showPassword ? <EyeIcon /> : <EyeOffIcon />}
              </button>
            }
          />
          {!isSignUp ? (
            <div className="flex justify-end">
              <button
                type="button" onClick={forgotPassword} disabled={busy}
                className="min-h-10 rounded-full px-3 text-[13px] text-black/85 hover:bg-black/5 disabled:opacity-50"
              >
                {t("forgotPassword")}
              </button>
            </div>
          ) : (
            <div className="h-4" />
          )}
          <div className="h-2" />
          <button
            type="submit" disabled={busy}
            className="flex min-h-12 items-center justify-center rounded-lg bg-teal-dark py-3.5 font-semibold text-white transition hover:bg-[#184c45] disabled:opacity-60"
          >
            {busy ? (
              <span className="size-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              t(isSignUp ? "createAccountButton" : "signIn")
            )}
          </button>
          {error && <p role="alert" className="mt-4 whitespace-pre-line text-center text-[13px] text-red-700">{error}</p>}
          {info && <p role="status" className="mt-4 text-center text-[13px] text-teal-dark">{info}</p>}
          <div className="mt-3 flex flex-wrap items-center justify-center">
            <span className="text-[13px]">{t(isSignUp ? "haveAccountPrompt" : "noAccountPrompt")}</span>
            <button
              type="button" disabled={busy}
              onClick={() => { setIsSignUp((v) => !v); setError(null); setInfo(null); }}
              className="min-h-10 rounded-full px-3 text-sm font-semibold text-teal-dark hover:bg-black/5 disabled:opacity-50"
            >
              {t(isSignUp ? "signInLink" : "createAccountLink")}
            </button>
          </div>
        </form>
        </div>
      </main>
    </div>
  );
}

function UnderlineField({ label, placeholder, value, onChange, type = "text", inputMode, autoComplete, suffix }: {
  label: string; placeholder: string; value: string; onChange: (v: string) => void;
  type?: string; inputMode?: "email" | "text"; autoComplete?: string; suffix?: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[15px] font-medium">{label}</span>
      <span className="flex items-center border-b border-black/25 focus-within:border-b-2 focus-within:border-teal-dark">
        <input
          type={type} inputMode={inputMode} autoComplete={autoComplete} value={value}
          placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
          className="min-h-12 min-w-0 flex-1 bg-transparent py-2 text-base outline-none placeholder:text-[13px] placeholder:text-black/40"
        />
        {suffix}
      </span>
    </label>
  );
}

const EyeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
  </svg>
);
const EyeOffIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 7a5 5 0 0 1 5 5c0 .65-.13 1.26-.36 1.83l2.92 2.92A11.8 11.8 0 0 0 23 12c-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46A11.8 11.8 0 0 0 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65a3 3 0 0 0 3 3c.22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53a5 5 0 0 1-5-5c0-.79.2-1.53.53-2.2zm4.31-.78 3.15 3.15.02-.16a3 3 0 0 0-3-3l-.17.01z" />
  </svg>
);
