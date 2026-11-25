"use client";
// Port of lib/translations.dart + lib/app_language.dart.
// Text lives in src/i18n/<lang>.json, generated from the Flutter app by
// scripts/convert_translations.py. English is bundled; the others load on demand.
import { useCallback, useSyncExternalStore } from "react";
import en from "@/i18n/en.json";
import webEn from "@/i18n/web/en.json";
import { storage } from "./storage";

export const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "hi", name: "हिन्दी" },
  { code: "ta", name: "தமிழ்" },
  { code: "te", name: "తెలుగు" },
  { code: "kn", name: "ಕನ್ನಡ" },
  { code: "ml", name: "മലയാളം" },
  { code: "mr", name: "मराठी" },
  { code: "gu", name: "ગુજરાતી" },
  { code: "or", name: "ଓଡ଼ିଆ" },
] as const;

export type Lang = (typeof LANGUAGES)[number]["code"];
type Dict = Record<string, string>;

// App text (generated from the Flutter app) + website-only text (src/i18n/web/).
const english = { ...(en as Dict), ...(webEn as Dict) };
const webLoaders: Partial<Record<Lang, () => Promise<{ default: Dict }>>> = {
  hi: () => import("@/i18n/web/hi.json"),
};
const loaded: Partial<Record<Lang, Dict>> = { en: english };
const loaders: Record<Exclude<Lang, "en">, () => Promise<{ default: Dict }>> = {
  hi: () => import("@/i18n/hi.json"),
  ta: () => import("@/i18n/ta.json"),
  te: () => import("@/i18n/te.json"),
  kn: () => import("@/i18n/kn.json"),
  ml: () => import("@/i18n/ml.json"),
  mr: () => import("@/i18n/mr.json"),
  gu: () => import("@/i18n/gu.json"),
  or: () => import("@/i18n/or.json"),
};

export function isLang(v: unknown): v is Lang {
  return typeof v === "string" && LANGUAGES.some((l) => l.code === v);
}

const LANG_KEY = "app_language";
let current: Lang = "en";
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

/** Current app language (readable outside React). */
export function getLang(): Lang {
  return current;
}

/** Switches language, loading its text first. Does not save to the profile
 * — callers that should (the language picker) also call saveLanguage(). */
export async function setLang(lang: Lang): Promise<void> {
  if (!loaded[lang] && lang !== "en") {
    try {
      const [app, web] = await Promise.all([
        loaders[lang](),
        webLoaders[lang]?.() ?? Promise.resolve({ default: {} as Dict }),
      ]);
      loaded[lang] = { ...app.default, ...web.default };
    } catch {
      return; // offline: keep the current language
    }
  }
  current = lang;
  storage.set(LANG_KEY, lang);
  if (typeof document !== "undefined") document.documentElement.lang = lang;
  notify();
}

/** Restores the language picked on this device before sign-in. */
export function initLangFromDevice() {
  const saved = storage.get(LANG_KEY);
  if (isLang(saved) && saved !== current) void setLang(saved);
}

/** Text for key in lang, falling back to English, then to the key itself. */
export function tr(lang: Lang, key: string): string {
  return loaded[lang]?.[key] ?? english[key] ?? key;
}

/** Fills `{name}` placeholders. */
export function fill(text: string, args: Record<string, unknown>): string {
  let out = text;
  for (const [k, v] of Object.entries(args)) out = out.split(`{${k}}`).join(String(v));
  return out;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export type T = (key: string) => string;
export type TF = (key: string, args: Record<string, unknown>) => string;

/** `const { t, tf, lang } = useT()` — the web version of context.t / context.tf. */
export function useT() {
  const lang = useSyncExternalStore(subscribe, getLang, () => "en" as Lang);
  const t = useCallback<T>((key) => tr(lang, key), [lang]);
  const tf = useCallback<TF>((key, args) => fill(tr(lang, key), args), [lang]);
  return { t, tf, lang };
}
