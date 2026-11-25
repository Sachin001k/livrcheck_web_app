// Port of lib/survey/health_ui.dart — shared helpers for health results.
// (BigButton / SurfaceCard live in src/components/ui.tsx.)
import { fill, type T } from "@/lib/i18n";

export const kLow = "#3E8E6B";
export const kMod = "#D99A2B";
export const kHigh = "#C4513A";
/** Darker amber for text/icons on white, and behind white text. */
export const kModDark = "#8A5A00";

export const levelColor = (level: string): string => (level === "low" ? kLow : level === "mod" ? kMod : kHigh);

/** Translation key for an organ risk level ('low' / 'mod' / 'high'). */
export const levelKey = (level: string): string =>
  level === "low" ? "sv_levelLow" : level === "mod" ? "sv_levelMod" : "sv_levelHigh";

/** Label for a level, translated when `t` is given, otherwise English. */
export function levelText(level: string, t?: T): string {
  if (t) return t(levelKey(level));
  return level === "low" ? "Looking good" : level === "mod" ? "Needs attention" : "High risk";
}

const TIER_KEYS: Record<string, string> = {
  Thriving: "sv_tierThriving",
  Strong: "sv_tierStrong",
  Building: "sv_tierBuilding",
  "Needs care": "sv_tierNeedsCare",
};

/** Translation key for an overall tier (the English value saved in survey_responses.tier). */
export const tierKey = (tier: string): string | null => TIER_KEYS[tier] ?? null;

export function tierText(t: T, tier: string): string {
  const k = tierKey(tier);
  return k ? t(k) : tier;
}

/** Organ name ('liver', 'heart', 'kidneys', 'lungs', 'pancreas'); short = one-word chip label. */
export function organName(t: T, organKey: string, short = false): string {
  const k = organKey ? organKey[0].toUpperCase() + organKey.slice(1) : organKey;
  return t(short ? `sv_organShort${k}` : `sv_organ${k}`);
}

/** Shows a text reference (see textRef in assess.ts): a key, optionally with
 * `|name=value` placeholder values. Plain text is shown unchanged. */
export function trText(t: T, ref: string): string {
  if (!ref.startsWith("sv_") || !ref.includes("|")) return t(ref);
  const [key, ...parts] = ref.split("|");
  const args: Record<string, string> = {};
  for (const p of parts) {
    const i = p.indexOf("=");
    if (i > 0) args[p.slice(0, i)] = p.slice(i + 1);
  }
  return fill(t(key), args);
}

/** Short month name (1–12) in the app's language. */
export const monthShort = (t: T, month: number): string => t(`sv_month${month}`);

/** "5 Oct 2026" style date in the app's language. */
export const shortDate = (t: T, d: Date): string => `${d.getDate()} ${monthShort(t, d.getMonth() + 1)} ${d.getFullYear()}`;

/** Translation key for the screening disclaimer. */
export const kDisclaimer = "sv_disclaimer";

/** Score-ring colour used by results and the last-check card. */
export const scoreColor = (score: number): string =>
  score >= 80 ? kLow : score >= 60 ? "#1f5e55" : score >= 40 ? kMod : kHigh;
