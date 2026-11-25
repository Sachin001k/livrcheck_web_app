// Port of lib/services/auth_service.dart + friendlyError (widgets/friendly_state.dart).
import { supabase } from "./supabase";
import { getLang, tr, type Lang } from "./i18n";

const auth = () => supabase().auth;
/** Where Supabase email links (confirm sign-up, reset password) return to.
 * Every path must be allowed in Supabase → Auth → URL Configuration
 * (add `<origin>/**`). */
const redirectUrl = (path = "/") => (typeof window === "undefined" ? undefined : window.location.origin + path);

export const signInWithEmail = (email: string, password: string) =>
  auth().signInWithPassword({ email, password });

/** `data.session` is null when Supabase requires email confirmation first. */
export const signUpWithEmail = (email: string, password: string, fullName: string) =>
  auth().signUp({ email, password, options: { data: { full_name: fullName }, emailRedirectTo: redirectUrl("/dashboard") } });

export const signInWithGoogle = () =>
  auth().signInWithOAuth({ provider: "google", options: { redirectTo: redirectUrl("/dashboard") } });

export const sendPhoneOtp = (phone: string) => auth().signInWithOtp({ phone });
export const verifyPhoneOtp = (phone: string, token: string) =>
  auth().verifyOtp({ phone, token, type: "sms" });

export const sendPasswordReset = (email: string) =>
  auth().resetPasswordForEmail(email, { redirectTo: redirectUrl() });

export const updatePassword = (password: string) => auth().updateUser({ password });

/** True while the user is signing out or deleting their account on purpose,
 * so the signed-in pages don't redirect to /login?next=… meanwhile. */
export let leavingOnPurpose = false;
/** Called when a session starts again (signed back in, same tab). */
export function clearLeavingOnPurpose() {
  leavingOnPurpose = false;
}

/** Signs out and goes to the website's home page. */
export async function signOut() {
  leavingOnPurpose = true;
  try {
    await auth().signOut();
  } finally {
    // A full page load (not router.push) so nothing of the previous user's
    // data stays in memory.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/");
  }
}

/** Deletes the account and all its data (RPC delete_my_account, migration 6). */
export async function deleteAccount() {
  const { error } = await supabase().rpc("delete_my_account");
  if (error) throw error;
  leavingOnPurpose = true;
  try { await auth().signOut({ scope: "local" }); } catch { /* account is gone */ }
}

function messageOf(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) return String((error as { message: unknown }).message);
  return String(error);
}

/** Translation key for errors we can explain in plain words, or null. */
export function errorKey(error: unknown): string | null {
  const text = messageOf(error).toLowerCase();
  const has = (p: string) => text.includes(p);
  if (has("rate limit")) return "authRateLimited";
  if (has("already registered")) return "authAlreadyRegistered";
  if (has("invalid login credentials")) return "authInvalidLogin";
  if (has("email not confirmed")) return "authEmailNotConfirmed";
  if (has("different from the old password")) return "au_samePassword";
  if (has("password should be") || has("weak password")) return "au_weakPassword";
  if (has("unable to validate email") || has("invalid email")) return "emailRequiredError";
  if (has("signups not allowed") || has("signup is disabled")) return "au_signupDisabled";
  if (has("token has expired") || has("otp expired") || has("otp_expired")) return "au_codeExpired";
  if (has("user not found")) return "au_userNotFound";
  if (has("not signed in") || has("jwt expired") || has("auth session missing")) return "au_sessionExpired";
  if (has("failed to fetch") || has("network") || has("load failed")) return "au_noInternet";
  return null;
}

const isDev = process.env.NODE_ENV !== "production";

/** An auth/Postgres error as text fit for the user (raw detail in dev only). */
export function describeError(error: unknown, fallback: string, lang: Lang = getLang()): string {
  console.warn("LivrCheck error:", error);
  const key = errorKey(error);
  if (key) return tr(lang, key);
  const msg = messageOf(error);
  return isDev ? `${fallback}\n${msg}` : fallback;
}

/** Plain-language error for load failures (friendlyError in the app). */
export function friendlyError(error: unknown, lang: Lang = getLang()): string {
  const raw = messageOf(error).toLowerCase();
  if (raw.includes("failed to fetch") || raw.includes("network") || raw.includes("connection") || raw.includes("load failed"))
    return tr(lang, "er_noInternet");
  if (raw.includes("could not find the table") || raw.includes("column")) return tr(lang, "er_needsUpdate");
  if (raw.includes("jwt") || raw.includes("not signed in")) return tr(lang, "er_sessionEnded");
  return tr(lang, "genericError");
}

export function rawError(error: unknown): string {
  return messageOf(error);
}
