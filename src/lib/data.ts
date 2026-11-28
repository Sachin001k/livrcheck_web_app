// Port of lib/services/data_service.dart. All reads and writes of the user's
// own data; RLS in Supabase limits every query to the signed-in user.
import { useEffect, useState, useSyncExternalStore } from "react";
import { supabase } from "./supabase";
import { dateOnly, parseDateOnly } from "./dates";
import { isLang, type Lang } from "./i18n";

/** Bump when the consent text changes, so users are asked to agree again. */
export const currentConsentVersion = "v1";

export interface Profile {
  id: string;
  fullName: string | null;
  age: number | null;
  gender: string | null;
  heightCm: number | null;
  weightKg: number | null;
  preferredLanguage: Lang;
  createdAt: Date;
  consentAt: Date | null;
  consentVersion: string | null;
}

export const hasConsented = (p: Profile) =>
  p.consentAt !== null && p.consentVersion === currentConsentVersion;

/** Name and age are required before the user can reach the home page. */
export const isProfileComplete = (p: Profile) =>
  (p.fullName?.trim().length ?? 0) > 0 && p.age !== null;

/** BMI = kg / m², rounded to 1 decimal (calculateBmi in fib4.dart). */
export function calculateBmi(heightCm: number, weightKg: number): number {
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

export function profileBmi(p: Profile): number | null {
  if (!p.heightCm || !p.weightKg || p.heightCm <= 0 || p.weightKg <= 0) return null;
  return calculateBmi(p.heightCm, p.weightKg);
}

type Row = Record<string, unknown>;
const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

export function profileFromRow(r: Row): Profile {
  return {
    id: r.id as string,
    fullName: (r.full_name as string | null) ?? null,
    age: num(r.age),
    gender: (r.gender as string | null) ?? null,
    heightCm: num(r.height_cm),
    weightKg: num(r.weight_kg),
    preferredLanguage: isLang(r.preferred_language) ? r.preferred_language : "en",
    createdAt: new Date(r.created_at as string),
    consentAt: r.consent_at ? new Date(r.consent_at as string) : null,
    consentVersion: (r.consent_version as string | null) ?? null,
  };
}

// ---------------------------------------------------------------- changes
/** Bumped after every write, so screens showing saved data can reload
 * (DataService.changes in the app). */
let version = 0;
const listeners = new Set<() => void>();
export function bumpChanges() {
  version++;
  listeners.forEach((l) => l());
}
export function useDataVersion(): number {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => version,
    () => 0,
  );
}

const db = () => supabase();
async function userId(): Promise<string | null> {
  const { data } = await db().auth.getSession();
  return data.session?.user.id ?? null;
}
const now = () => new Date().toISOString();

/** Throws the Supabase error, if any, so callers can try/catch. */
export function check<T>(res: { data: T; error: unknown }): T {
  if (res.error) throw res.error;
  return res.data;
}

export async function fetchProfile(): Promise<Profile | null> {
  const id = await userId();
  if (!id) return null;
  const row = check(await db().from("profiles").select().eq("id", id).maybeSingle());
  return row ? profileFromRow(row as Row) : null;
}

export async function saveProfile(p: {
  fullName: string; age: number; gender: string | null;
  heightCm: number | null; weightKg: number | null; language: Lang;
}) {
  const id = await userId();
  if (!id) return;
  check(await db().from("profiles").upsert({
    id, full_name: p.fullName, age: p.age, gender: p.gender,
    height_cm: p.heightCm, weight_kg: p.weightKg,
    preferred_language: p.language, updated_at: now(),
  }));
  bumpChanges();
}

export async function saveConsent() {
  const id = await userId();
  if (!id) return;
  check(await db().from("profiles").upsert({
    id, consent_at: now(), consent_version: currentConsentVersion,
  }));
}

/** Updates only the body measurements that are given (from the health check). */
export async function updateBodyStats(f: { age?: number | null; heightCm?: number | null; weightKg?: number | null }) {
  const id = await userId();
  if (!id) return;
  const fields: Row = {};
  if (f.age != null) fields.age = f.age;
  if (f.heightCm != null) fields.height_cm = f.heightCm;
  if (f.weightKg != null) fields.weight_kg = f.weightKg;
  if (Object.keys(fields).length === 0) return;
  fields.updated_at = now();
  check(await db().from("profiles").update(fields).eq("id", id));
}

/** Best effort: a failed language save shouldn't interrupt the user. */
export async function saveLanguage(lang: Lang) {
  const id = await userId();
  if (!id) return;
  try {
    await db().from("profiles").update({ preferred_language: lang }).eq("id", id);
  } catch (e) {
    console.warn("Could not save language", e);
  }
}

export async function saveAssessment(a: {
  age: number; ast: number; alt: number; platelets: number;
  score: number; tier: string; heightCm?: number | null; weightKg?: number | null;
  bmi?: number | null; hasDiabetes?: string | null; familyHistory?: string | null;
}) {
  check(await db().from("assessments").insert({
    age: a.age, ast: a.ast, alt: a.alt, platelets: a.platelets,
    fib4_score: a.score, risk_tier: a.tier,
    height_cm: a.heightCm ?? null, weight_kg: a.weightKg ?? null, bmi: a.bmi ?? null,
    has_diabetes: a.hasDiabetes ?? null, family_history: a.familyHistory ?? null,
  }));
  bumpChanges();
}

export interface Assessment { id: string; score: number; tier: string; createdAt: Date }

export async function fetchAssessments(limit = 100): Promise<Assessment[]> {
  const rows = check(await db().from("assessments")
    .select("id, fib4_score, risk_tier, created_at")
    .order("created_at", { ascending: false }).limit(limit)) as Row[];
  return rows.map((r) => ({
    id: r.id as string, score: Number(r.fib4_score), tier: r.risk_tier as string,
    createdAt: new Date(r.created_at as string),
  }));
}

/** Marks today (local time) as an active day. */
export async function logActivityToday() {
  const id = await userId();
  if (!id) return;
  check(await db().from("daily_activity").upsert(
    { user_id: id, activity_date: dateOnly(new Date()) },
    { onConflict: "user_id,activity_date", ignoreDuplicates: true },
  ));
}

export async function fetchActivityDays(days = 365): Promise<Date[]> {
  const since = new Date(Date.now() - days * 86400000);
  const rows = check(await db().from("daily_activity").select("activity_date")
    .gte("activity_date", dateOnly(since))) as Row[];
  return rows.map((r) => parseDateOnly(r.activity_date as string));
}

/** Pages with .range() until a short page, past Supabase's 1000-row cap.
 * `query` must build a fresh, sorted query each call. */
export async function fetchAllRows(
  query: () => { range: (a: number, b: number) => PromiseLike<{ data: unknown; error: unknown }> },
  pageSize = 1000,
): Promise<Row[]> {
  const all: Row[] = [];
  for (let from = 0; ; from += pageSize) {
    const page = check(await query().range(from, from + pageSize - 1)) as Row[];
    all.push(...page);
    if (page.length < pageSize) return all;
  }
}

/** Everything stored about the user, for "Download my data". */
export async function exportMyData(): Promise<Row> {
  const { data } = await db().auth.getSession();
  const user = data.session?.user;
  if (!user) throw new Error("Not signed in");
  const tables: Record<string, string> = {
    survey_responses: "id", assessments: "id", daily_checkins: "day",
    coin_events: "id", special_survey_responses: "id",
    daily_activity: "activity_date", daily_habits: "day",
    login_events: "signed_in_at",
  };
  const names = Object.keys(tables);
  const [profile, ...rest] = await Promise.all([
    db().from("profiles").select().eq("id", user.id).maybeSingle().then(check),
    ...names.map((t) => fetchAllRows(() => db().from(t).select().order(tables[t], { ascending: true }))),
  ]);
  const out: Row = {
    exported_at: now(),
    account: { id: user.id, email: user.email, phone: user.phone },
    profile,
  };
  names.forEach((n, i) => (out[n] = rest[i]));
  return out;
}

/** Small helper hook: runs `load` on mount and whenever deps or the data
 * version change. Returns { data, error, loading, reload }. `data` keeps the
 * last good value while a reload runs. */
export function useLoad<T>(load: () => Promise<T>, deps: unknown[] = []) {
  const v = useDataVersion();
  const [nonce, setNonce] = useState(0);
  const key = JSON.stringify([v, nonce, ...deps]);
  const [state, setState] = useState<{ data: T | null; error: unknown; forKey: string | null }>({
    data: null, error: null, forKey: null,
  });
  useEffect(() => {
    let alive = true;
    load().then(
      (data) => alive && setState({ data, error: null, forKey: key }),
      (error) => alive && setState((s) => ({ data: s.data, error, forKey: key })),
    );
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return {
    data: state.data,
    error: state.forKey === key ? state.error : null,
    loading: state.forKey !== key,
    reload: () => setNonce((n) => n + 1),
  };
}
