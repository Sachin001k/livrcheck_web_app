"use client";
// Session + profile state: the web version of AuthGate/_ProfileGate's data.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { fetchProfile, logActivityToday, saveLanguage, type Profile } from "@/lib/data";
import { getLang, initLangFromDevice, setLang } from "@/lib/i18n";
import { ageGroupFor, setGuideAgeGroup } from "@/features/guide/age-group";
import { clearLeavingOnPurpose } from "@/lib/auth";

interface SessionState {
  /** undefined while the stored session is being restored. */
  session: Session | null | undefined;
  profile: Profile | null;
  profileLoaded: boolean;
  profileError: unknown;
  /** True after Supabase reports a password-recovery link was opened. */
  passwordRecovery: boolean;
  clearPasswordRecovery: () => void;
  reloadProfile: () => Promise<void>;
  /** An auth link error (expired/used) to show once. */
  authLinkError: string | null;
}

const Ctx = createContext<SessionState | null>(null);

export function useSession(): SessionState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSession outside SessionProvider");
  return v;
}

/** The signed-in user's complete profile (only inside the main shell). */
export function useProfile(): { profile: Profile; reloadProfile: () => Promise<void> } {
  const { profile, reloadProfile } = useSession();
  if (!profile) throw new Error("useProfile without a profile");
  return { profile, reloadProfile };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  // Tagged with the user it belongs to, so switching accounts resets it.
  const [ps, setPs] = useState<{ userId: string | null; profile: Profile | null; loaded: boolean; error: unknown }>({
    userId: null, profile: null, loaded: false, error: null,
  });
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  // Supabase puts sign-in/reset link errors (expired / used) in the URL hash.
  const [authLinkError] = useState<string | null>(() => {
    if (typeof window === "undefined" || !window.location.hash.includes("error=")) return null;
    const p = new URLSearchParams(window.location.hash.slice(1));
    return p.get("error_code") ?? p.get("error") ?? "otp_expired";
  });
  const request = useRef(0);
  const userId = session?.user.id;

  useEffect(() => {
    initLangFromDevice();
    if (window.location.hash.includes("error=")) {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    if (!isSupabaseConfigured) { setSession(null); return; }
    const auth = supabase().auth;
    auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (s) clearLeavingOnPurpose();
      if (event === "PASSWORD_RECOVERY") setPasswordRecovery(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const load = useCallback(async (forUser: string) => {
    const req = ++request.current;
    try {
      let p = await fetchProfile();
      if (p) {
        const current = getLang();
        if (p.consentAt === null && current !== "en" && p.preferredLanguage !== current) {
          // Brand-new account: keep the language picked before signing up.
          await saveLanguage(current);
          p = { ...p, preferredLanguage: current };
        } else {
          await setLang(p.preferredLanguage);
        }
      }
      // Counts today towards the streak; failure shouldn't block login.
      logActivityToday().catch((e) => console.warn("Could not log activity", e));
      if (req !== request.current) return;
      // The Guide (and the FAQ) start with advice for the user's age.
      if (p) setGuideAgeGroup(ageGroupFor(p.age));
      setPs({ userId: forUser, profile: p, loaded: true, error: null });
    } catch (e) {
      if (req !== request.current) return;
      // Keep a profile already on screen; just record the error.
      setPs((s) => (s.userId === forUser ? { ...s, error: e } : { userId: forUser, profile: null, loaded: false, error: e }));
    }
  }, []);

  // Keyed by user: switching accounts resets everything.
  useEffect(() => {
    if (userId) void load(userId);
  }, [userId, load]);

  const reloadProfile = useCallback(async () => {
    if (userId) await load(userId);
  }, [load, userId]);

  const mine = ps.userId === userId;
  const profile = mine ? ps.profile : null;
  const profileLoaded = mine && ps.loaded;
  const profileError = mine ? ps.error : null;

  return (
    <Ctx.Provider
      value={{
        session, profile, profileLoaded, profileError, passwordRecovery,
        clearPasswordRecovery: () => setPasswordRecovery(false),
        reloadProfile, authLinkError,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
