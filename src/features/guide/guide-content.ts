// Port of lib/learn/guide_content.dart — the liver guide (Guide tab),
// following the LivrCheck fatty liver guidebook chapter by chapter. Every
// text is a translation key; the English text is in src/i18n/en.json (gd_ keys).
import { AGE_GROUPS, ageGroupInfo, type AgeGroup } from "./age-group";

export { ageGroupFor, AGE_GROUPS, ageGroupInfo } from "./age-group";
export type { AgeGroup } from "./age-group";

// ---------------------------------------------------------------- model

/** An icon + title (+ body, + note). Bodies and notes are optional. */
export interface GuideItem {
  emoji: string;
  titleKey: string;
  bodyKey?: string;
  noteKey?: string;
  color?: string;
}

export function itemKeys(i: GuideItem): string[] {
  return [i.titleKey, i.bodyKey, i.noteKey].filter((k): k is string => !!k);
}

/** Item from a key stem: `gd_lm1` → title `gd_lm1T`, body `gd_lm1B` (and note `gd_lm1N`). */
function _i(emoji: string, stem: string, opts: { body?: boolean; note?: boolean; color?: string } = {}): GuideItem {
  const { body = true, note = false, color } = opts;
  return {
    emoji,
    titleKey: `${stem}T`,
    bodyKey: body ? `${stem}B` : undefined,
    noteKey: note ? `${stem}N` : undefined,
    color,
  };
}

/** Title-only item (a bullet). */
function _b(key: string, emoji = "•"): GuideItem {
  return { emoji, titleKey: key };
}

/** Colour of an information box. */
export type GuideTone = "info" | "good" | "warn" | "urgent";

export interface CompareSide { emoji: string; titleKey: string; bodyKey: string; points: string[] }

export type GuideTool = "challenge" | "plan";

export type GuideBlock =
  /** A plain paragraph. */
  | { type: "text"; key: string }
  /** The guidebook's "key message" banner. */
  | { type: "key"; key: string; emoji: string }
  /** A list of icon cards; `grid` = two per row on wide screens. */
  | { type: "cards"; items: GuideItem[]; titleKey?: string; introKey?: string; grid?: boolean }
  /** Healthy vs unhealthy, side by side (stacked on phones). */
  | { type: "compare"; good: CompareSide; bad: CompareSide }
  /** Coloured steps, joined by arrows when `arrows`. */
  | { type: "stages"; items: GuideItem[]; titleKey?: string; arrows: boolean }
  /** Coloured box: title, optional text, bullets and/or icon items. */
  | { type: "info"; emoji: string; titleKey: string; bodyKey?: string; bullets?: string[]; items?: GuideItem[]; tone: GuideTone }
  /** Advice for each age group; shows the chosen group (switchable). */
  | { type: "age"; titleKey: string; items: Record<AgeGroup, GuideItem[]> }
  /** Test → what it measures → limitations. */
  | { type: "tests"; items: GuideItem[] }
  /** "Choose less often" → "Try instead". */
  | { type: "swaps"; swaps: [GuideItem, GuideItem][] }
  /** Myth / fact pairs. */
  | { type: "myths"; pairs: [GuideItem, GuideItem][] }
  /** Questions and answers, grouped by age (your group first). */
  | { type: "faq"; items: Record<AgeGroup, GuideItem[]> }
  /** Numbered steps. */
  | { type: "steps"; items: GuideItem[]; titleKey?: string }
  /** Small print: sources and references. */
  | { type: "sources"; refs: string[] }
  /** Tick-box risk checklist for the chosen age group. */
  | { type: "checklist"; questions: Record<AgeGroup, string[]>; notes: Partial<Record<AgeGroup, string>> }
  /** Interactive tools from chapter 5. */
  | { type: "tool"; tool: GuideTool };

export type InfoBlock = Extract<GuideBlock, { type: "info" }>;
export type FaqBlock = Extract<GuideBlock, { type: "faq" }>;
export type StepsBlock = Extract<GuideBlock, { type: "steps" }>;

/** Every translation key a block uses (checked by a test). */
export function blockKeys(b: GuideBlock): string[] {
  switch (b.type) {
    case "text":
    case "key":
      return [b.key];
    case "cards":
      return [b.titleKey, b.introKey, ...b.items.flatMap(itemKeys)].filter((k): k is string => !!k);
    case "compare":
      return [b.good, b.bad].flatMap((s) => [s.titleKey, s.bodyKey, ...s.points]);
    case "stages":
    case "steps":
      return [b.titleKey, ...b.items.flatMap(itemKeys)].filter((k): k is string => !!k);
    case "info":
      return [b.titleKey, b.bodyKey, ...(b.bullets ?? []), ...(b.items ?? []).flatMap(itemKeys)].filter((k): k is string => !!k);
    case "age":
      return [b.titleKey, ...Object.values(b.items).flat().flatMap(itemKeys)];
    case "tests":
      return ["gd_measures", "gd_limits", ...b.items.flatMap(itemKeys)];
    case "swaps":
      return ["gd_chooseLess", "gd_tryInstead", ...b.swaps.flat().flatMap(itemKeys)];
    case "myths":
      return ["gd_myth", "gd_fact", ...b.pairs.flat().flatMap(itemKeys)];
    case "faq":
      return Object.values(b.items).flat().flatMap(itemKeys);
    case "sources":
      return b.refs;
    case "checklist":
      return ["gd_ckNone", "gd_ckResult", ...Object.values(b.questions).flat(), ...Object.values(b.notes).filter((k): k is string => !!k)];
    case "tool":
      return [];
  }
}

export interface GuideTopic { id: string; emoji: string; titleKey: string; blocks: GuideBlock[] }

export interface GuideChapter {
  number: number;
  emoji: string;
  titleKey: string;
  bodyKey: string;
  color: string;
  topics: GuideTopic[];
}

// --------------------------------------------------------------- colours

const cLiver = "#2F6FD6";
const cRisk = "#3E8E4F";
const cCheck = "#B7791F";
const cAction = "#7B57C2";
const cPlan = "#D6455D";
const cHelp = "#1F7A6E";

const green = "#3E8E6B";
const amber = "#D99A2B";
const orange = "#E07A2E";
const red = "#C4513A";
const purple = "#7B57C2";
const blue = "#2F6FD6";

// --------------------------------------------------------------- helpers

const text = (key: string): GuideBlock => ({ type: "text", key });
const keyMsg = (key: string, emoji = "🔑"): GuideBlock => ({ type: "key", key, emoji });
const cards = (items: GuideItem[], o: { titleKey?: string; introKey?: string; grid?: boolean } = {}): GuideBlock => ({ type: "cards", items, ...o });
const stages = (items: GuideItem[], o: { titleKey?: string; arrows?: boolean } = {}): GuideBlock => ({ type: "stages", items, titleKey: o.titleKey, arrows: o.arrows ?? true });
const info = (
  emoji: string,
  titleKey: string,
  o: { bodyKey?: string; bullets?: string[]; items?: GuideItem[]; tone?: GuideTone } = {},
): InfoBlock => ({ type: "info", emoji, titleKey, bodyKey: o.bodyKey, bullets: o.bullets ?? [], items: o.items ?? [], tone: o.tone ?? "info" });
const age = (items: Record<AgeGroup, GuideItem[]>, titleKey = "gd_forAge"): GuideBlock => ({ type: "age", titleKey, items });
const steps = (items: GuideItem[], titleKey?: string): StepsBlock => ({ type: "steps", items, titleKey });
const sources = (refs: string[]): GuideBlock => ({ type: "sources", refs });

/** "In practice" age advice where each group is a list of bullet keys. */
function _ages(children: string[], adults: string[], older: string[]): Record<AgeGroup, GuideItem[]> {
  return {
    children: children.map((k) => _b(k)),
    adults: adults.map((k) => _b(k)),
    older: older.map((k) => _b(k)),
  };
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

// --------------------------------------------------------------- content

/** "Remember these 5 steps" — also shown on Home. */
export const fiveSteps: GuideItem[] = [
  _i("📋", "gd_5s1"),
  _i("📅", "gd_5s2"),
  _i("🏥", "gd_5s3"),
  _i("🥗", "gd_5s4"),
  _i("⛰️", "gd_5s5"),
];

export const guideChapters: GuideChapter[] = [
  // ======================================================= 1. KNOW YOUR LIVER
  {
    number: 1, emoji: "🍃", titleKey: "gd_c1T", bodyKey: "gd_c1B", color: cLiver,
    topics: [
      {
        id: "liver-matters", emoji: "💪", titleKey: "gd_lmT",
        blocks: [
          text("gd_lmIntro"),
          cards([
            _i("🍴", "gd_lm1"), _i("⚡", "gd_lm2"), _i("💧", "gd_lm3"),
            _i("🛡️", "gd_lm4"), _i("🗄️", "gd_lm5"), _i("🧬", "gd_lm6"),
          ], { grid: true }),
          age(_ages(["gd_lmC"], ["gd_lmA"], ["gd_lmO"])),
          keyMsg("gd_lmKey", "⏱️"),
        ],
      },
      {
        id: "what-is-fatty-liver", emoji: "🔍", titleKey: "gd_flT",
        blocks: [
          text("gd_flIntro"),
          info("❓", "gd_flNormalT", { bodyKey: "gd_flNormalB" }),
          {
            type: "compare",
            good: { emoji: "🟥", titleKey: "gd_flGoodT", bodyKey: "gd_flGoodB", points: ["gd_flGood1", "gd_flGood2", "gd_flGood3"] },
            bad: { emoji: "🟨", titleKey: "gd_flBadT", bodyKey: "gd_flBadB", points: ["gd_flBad1", "gd_flBad2", "gd_flBad3", "gd_flBad4"] },
          },
          age(_ages(["gd_flC"], ["gd_flA"], ["gd_flO"])),
          keyMsg("gd_flKey", "🌍"),
          sources(["gd_flSrc"]),
        ],
      },
      {
        id: "types", emoji: "🗂️", titleKey: "gd_tyT",
        blocks: [
          info("❓", "gd_tyWhyT", { bodyKey: "gd_tyWhyB" }),
          stages([
            _i("1️⃣", "gd_ty1", { note: true, color: green }),
            _i("2️⃣", "gd_ty2", { note: true, color: orange }),
            _i("3️⃣", "gd_ty3", { note: true, color: blue }),
            _i("4️⃣", "gd_ty4", { note: true, color: purple }),
          ], { arrows: false }),
          age(_ages(["gd_tyC"], ["gd_tyA"], ["gd_tyO"])),
          keyMsg("gd_tyKey", "🩺"),
        ],
      },
      {
        id: "stages", emoji: "📉", titleKey: "gd_stT",
        blocks: [
          text("gd_stIntro"),
          stages([
            _i("🟡", "gd_st1", { color: amber }),
            _i("🟠", "gd_st2", { color: orange }),
            _i("🟤", "gd_st3", { color: red }),
            _i("🟣", "gd_st4", { color: purple }),
          ]),
          info("ℹ️", "gd_stDiffT", { bullets: ["gd_stDiff1", "gd_stDiff2"] }),
          info("🔄", "gd_stSeqT", { bullets: ["gd_stSeq1", "gd_stSeq2", "gd_stSeq3", "gd_stSeq4"], tone: "good" }),
          text("gd_stAll"),
          keyMsg("gd_stKey", "📋"),
        ],
      },
    ],
  },

  // ======================================================== 2. KNOW YOUR RISK
  {
    number: 2, emoji: "⚖️", titleKey: "gd_c2T", bodyKey: "gd_c2B", color: cRisk,
    topics: [
      {
        id: "who-is-at-risk", emoji: "👥", titleKey: "gd_rkT",
        blocks: [
          text("gd_rkIntro"),
          age({
            children: [
              _i("👪", "gd_rkC1", { body: false }),
              _i("⚖️", "gd_rkC2"),
              _i("🏃", "gd_rkC3"),
              _i("😴", "gd_rkC4"),
            ],
            adults: [
              _i("🩸", "gd_rkA1", { body: false }),
              _i("📏", "gd_rkA2"),
              _i("❤️", "gd_rkA3", { body: false }),
              _i("💤", "gd_rkA4"),
            ],
            older: [
              _i("🩸", "gd_rkA1", { body: false }),
              { emoji: "⚙️", titleKey: "gd_rkO2T", bodyKey: "gd_rkC2B" },
              _i("❤️", "gd_rkA3", { body: false }),
              _i("🛏️", "gd_rkO4"),
            ],
          }),
          info("🧍", "gd_rkLeanT", { bodyKey: "gd_rkLeanB" }),
          info("🇮🇳", "gd_rkSaT", { bodyKey: "gd_rkSaB", bullets: ["gd_rkSa1", "gd_rkSa2"], tone: "warn" }),
          keyMsg("gd_rkKey", "📏"),
        ],
      },
      {
        id: "checklist", emoji: "✅", titleKey: "gd_ckT",
        blocks: [
          text("gd_ckIntro"),
          {
            type: "checklist",
            questions: {
              children: ["gd_ckC1", "gd_ckC2", "gd_ckC3", "gd_ckC4", "gd_ckC5"],
              adults: ["gd_ckA1", "gd_ckA2", "gd_ckA3", "gd_ckA4", "gd_ckA5", "gd_ckA6"],
              older: ["gd_ckO1", "gd_ckO2", "gd_ckO3", "gd_ckO4", "gd_ckO5"],
            },
            notes: { children: "gd_ckCNote" },
          },
          keyMsg("gd_ckKey", "🩺"),
        ],
      },
      {
        id: "symptoms", emoji: "🤒", titleKey: "gd_syT",
        blocks: [
          text("gd_syIntro"),
          cards([_i("😩", "gd_sy1"), _i("🤕", "gd_sy2"), _i("😔", "gd_sy3")], { titleKey: "gd_syEarlyT", introKey: "gd_syEarlyB" }),
          info("⚠️", "gd_syLateT", { bodyKey: "gd_syLateB", items: [_i("👁️", "gd_sy4"), _i("🦵", "gd_sy5")], tone: "warn" }),
          age(_ages(["gd_syC1", "gd_syC2"], ["gd_syA1", "gd_syA2"], ["gd_syO1", "gd_syO2"])),
          info("⚖️", "gd_syWeightT", { bodyKey: "gd_syWeightB", tone: "urgent" }),
        ],
      },
      {
        id: "see-a-doctor", emoji: "👩‍⚕️", titleKey: "gd_drT",
        blocks: [
          text("gd_drIntro"),
          info("📅", "gd_drApptT", {
            items: [_i("🙍", "gd_dr1"), _i("🧪", "gd_dr2"), _i("📋", "gd_dr3"), _i("❓", "gd_dr4")],
            tone: "good",
          }),
          info("🚨", "gd_drUrgentT", {
            items: [_i("🩸", "gd_dr5"), _i("⚫", "gd_dr6"), _i("😵", "gd_dr7"), _i("💉", "gd_dr8"), _i("⏫", "gd_dr9")],
            tone: "urgent",
          }),
          age(_ages(["gd_drC1", "gd_drC2"], ["gd_drA1", "gd_drA2"], ["gd_drO1", "gd_drO2"])),
          keyMsg("gd_drKey", "⏳"),
        ],
      },
    ],
  },

  // =========================================================== 3. GET CHECKED
  {
    number: 3, emoji: "🧪", titleKey: "gd_c3T", bodyKey: "gd_c3B", color: cCheck,
    topics: [
      {
        id: "detection", emoji: "🔬", titleKey: "gd_dtT",
        blocks: [
          text("gd_dtIntro"),
          steps([_i("📋", "gd_dt1"), _i("🩺", "gd_dt2"), _i("🧪", "gd_dt3"), _i("🖥️", "gd_dt4")], "gd_dtPathT"),
          age({
            children: [_i("📋", "gd_dtC1"), _i("📏", "gd_dtC2"), _i("🧪", "gd_dtC3")],
            adults: [_i("🩸", "gd_dtA1"), _i("🧪", "gd_dtA2"), _i("📊", "gd_dtA3")],
            older: [_i("🩸", "gd_dtA1"), _i("🧪", "gd_dtA2"), _i("💊", "gd_dtO3")],
          }),
          keyMsg("gd_dtKey", "🎯"),
        ],
      },
      {
        id: "fib4", emoji: "🧮", titleKey: "gd_f4T",
        blocks: [
          text("gd_f4Intro"),
          cards([_i("📅", "gd_f4In1"), _i("🧪", "gd_f4In2"), _i("🧪", "gd_f4In3"), _i("🔴", "gd_f4In4")], { grid: true, titleKey: "gd_f4InT" }),
          stages([
            { emoji: "✅", titleKey: "gd_f4LowT", bodyKey: "gd_f4LowB", color: green },
            { emoji: "❔", titleKey: "gd_f4MidT", bodyKey: "gd_f4MidB", color: amber },
            { emoji: "❗", titleKey: "gd_f4HighT", bodyKey: "gd_f4HighB", color: red },
          ], { titleKey: "gd_f4ResT", arrows: false }),
          age(_ages(["gd_f4C"], ["gd_f4A"], ["gd_f4O"])),
          info("⚠️", "gd_f4LimT", { bodyKey: "gd_f4LimB", tone: "warn" }),
          keyMsg("gd_f4Key", "🩺"),
        ],
      },
      {
        id: "test-results", emoji: "📄", titleKey: "gd_tsT",
        blocks: [
          text("gd_tsIntro"),
          {
            type: "tests",
            items: [
              _i("🩸", "gd_ts1", { note: true }),
              _i("🍬", "gd_ts2", { note: true }),
              _i("🖥️", "gd_ts3", { note: true }),
              _i("📡", "gd_ts4", { note: true }),
              _i("🟡", "gd_ts5", { note: true }),
              _i("🧲", "gd_ts6", { note: true }),
              _i("💉", "gd_ts7", { note: true }),
            ],
          },
          age(_ages(["gd_tsC"], ["gd_tsA"], ["gd_tsO"])),
          keyMsg("gd_tsKey", "⚠️"),
        ],
      },
      {
        id: "after-testing", emoji: "➡️", titleKey: "gd_afT",
        blocks: [
          text("gd_afIntro"),
          age({
            children: [_i("🩺", "gd_afC1", { body: false }), _i("🧪", "gd_afC2"), _i("👩‍⚕️", "gd_afC3")],
            adults: [_i("🔍", "gd_afA1"), _i("🖥️", "gd_afA2"), _i("📅", "gd_afA3")],
            older: [_i("📋", "gd_afO1"), _i("🖥️", "gd_afO2"), _i("🔄", "gd_afO3")],
          }),
          info("💬", "gd_afAskT", { bullets: ["gd_afAsk1", "gd_afAsk2", "gd_afAsk3", "gd_afAsk4", "gd_afAsk5"], tone: "good" }),
          info("🏥", "gd_afSpecT", { bodyKey: "gd_afSpecB" }),
        ],
      },
      {
        id: "follow-up", emoji: "📅", titleKey: "gd_fuT",
        blocks: [
          text("gd_fuIntro"),
          age(
            Object.fromEntries(
              ([["children", "C"], ["adults", "A"], ["older", "O"]] as const).map(([g, s]) => [
                g,
                [
                  { emoji: "🔬", titleKey: "gd_fuWhatT", bodyKey: `gd_fu${s}What` },
                  { emoji: "👩‍⚕️", titleKey: "gd_fuWhoT", bodyKey: `gd_fu${s}Who` },
                  { emoji: "📅", titleKey: "gd_fuWhenT", bodyKey: `gd_fu${s}When` },
                ],
              ]),
            ) as Record<AgeGroup, GuideItem[]>,
          ),
          info("🗒️", "gd_fuRecT", { bodyKey: "gd_fuRecB" }),
          keyMsg("gd_fuKey", "🔍"),
        ],
      },
    ],
  },

  // ========================================================== 4. TAKE ACTION
  {
    number: 4, emoji: "🏃", titleKey: "gd_c4T", bodyKey: "gd_c4B", color: cAction,
    topics: [
      {
        id: "food", emoji: "🍽️", titleKey: "gd_fdT",
        blocks: [
          keyMsg("gd_fdKeyTop", "🥗"),
          cards([_i("🥦", "gd_fd1"), _i("🌾", "gd_fd2"), _i("🍳", "gd_fd3")]),
          info("🇮🇳", "gd_fdIndT", { bullets: ["gd_fdInd1", "gd_fdInd2", "gd_fdInd3", "gd_fdInd4", "gd_fdInd5"], tone: "good" }),
          age(_ages(["gd_fdC1", "gd_fdC2"], ["gd_fdA1", "gd_fdA2", "gd_fdA3"], ["gd_fdO1", "gd_fdO2"])),
          keyMsg("gd_fdKey", "💧"),
        ],
      },
      {
        id: "limit", emoji: "🚫", titleKey: "gd_ltT",
        blocks: [
          text("gd_ltIntro"),
          {
            type: "swaps",
            swaps: [
              [_i("🥤", "gd_lt1"), _i("💧", "gd_lt1s")],
              [_i("🧃", "gd_lt2"), _i("🍎", "gd_lt2s")],
              [_i("🥟", "gd_lt3"), _i("🫘", "gd_lt3s")],
              [_i("🍔", "gd_lt4"), _i("🍛", "gd_lt4s")],
            ],
          },
          age(_ages(["gd_ltC1", "gd_ltC2"], ["gd_ltA1", "gd_ltA2"], ["gd_ltO1", "gd_ltO2"])),
          keyMsg("gd_ltKey", "🎯"),
        ],
      },
      {
        id: "activity", emoji: "🚶", titleKey: "gd_acT",
        blocks: [
          text("gd_acIntro"),
          age({
            children: [_i("⚽", "gd_acC1", { body: false }), _i("⏱️", "gd_acC2", { body: false })],
            adults: [_i("🚴", "gd_acA1", { body: false }), _i("⏱️", "gd_acA2"), _i("🏋️", "gd_acA3", { body: false })],
            older: [_i("🚶", "gd_acO1", { body: false }), _i("⏱️", "gd_acO2", { body: false }), _i("🏋️", "gd_acO3", { body: false })],
          }),
          info("🛡️", "gd_acSafeT", { bodyKey: "gd_acSafeB" }),
          sources(["gd_acSrc1", "gd_acSrc2"]),
        ],
      },
      {
        id: "sleep", emoji: "😴", titleKey: "gd_slT",
        blocks: [
          text("gd_slIntro"),
          age({
            children: [_i("🛏️", "gd_slC1"), _i("📺", "gd_slC2"), _i("🌙", "gd_slC3")],
            adults: [_i("🛏️", "gd_slA1"), _i("🚶", "gd_slA2"), _i("😮‍💨", "gd_slA3")],
            older: [_i("🛏️", "gd_slO1"), _i("🚶", "gd_slO2"), _i("🩺", "gd_slO3")],
          }),
          cards([_b("gd_slHab1", "📵"), _b("gd_slHab2", "🌳"), _b("gd_slHab3", "🗓️")], { titleKey: "gd_slHabT" }),
          info("7️⃣", "gd_slChT", { bodyKey: "gd_slChB", tone: "good" }),
        ],
      },
      {
        id: "weight", emoji: "⚖️", titleKey: "gd_wtT",
        blocks: [
          text("gd_wtIntro"),
          age({
            children: [_b("gd_wtC1", "📏"), _b("gd_wtC2", "🥗"), _b("gd_wtC3", "🏃"), _b("gd_wtC4", "🩺")],
            adults: [_b("gd_wtA1", "📋"), _b("gd_wtA2", "📉")],
            older: [_b("gd_wtO1", "💪"), _b("gd_wtO2", "🥚"), _b("gd_wtO3", "🦯"), _b("gd_wtO4", "🩺")],
          }),
          info("🚫", "gd_wtCrashT", { bodyKey: "gd_wtCrashB", tone: "urgent" }),
        ],
      },
      {
        id: "metabolic", emoji: "🩸", titleKey: "gd_mbT",
        blocks: [
          text("gd_mbIntro"),
          cards([_i("🩸", "gd_mb1"), _i("🧈", "gd_mb2"), _i("❤️", "gd_mb3")]),
          age(_ages(["gd_mbC"], ["gd_mbA"], ["gd_mbO"])),
        ],
      },
      {
        id: "medicines", emoji: "💊", titleKey: "gd_mdT",
        blocks: [
          text("gd_mdIntro"),
          cards([_i("🥗", "gd_md1"), _i("🩸", "gd_md2"), _i("💊", "gd_md3")], { titleKey: "gd_mdOverT" }),
          age(_ages(["gd_mdC1", "gd_mdC2"], ["gd_mdA"], ["gd_mdO"])),
          info("⛔", "gd_mdSelfT", { bodyKey: "gd_mdSelfB", tone: "urgent" }),
        ],
      },
    ],
  },

  // ================================================ 5. YOUR LIVER HEALTH PLAN
  {
    number: 5, emoji: "📝", titleKey: "gd_c5T", bodyKey: "gd_c5B", color: cPlan,
    topics: [
      {
        id: "challenge", emoji: "🗓️", titleKey: "gd_chT",
        blocks: [
          text("gd_chIntro"),
          { type: "tool", tool: "challenge" },
          info("💡", "gd_rememberT", { bodyKey: "gd_rememberB", tone: "good" }),
        ],
      },
      {
        id: "action-plan", emoji: "🎯", titleKey: "gd_plT",
        blocks: [
          text("gd_plIntro"),
          { type: "tool", tool: "plan" },
          cards([_i("✅", "gd_plTip1"), _i("📈", "gd_plTip2"), _i("🗓️", "gd_plTip3"), _i("🔄", "gd_plTip4"), _i("👥", "gd_plTip5")], { titleKey: "gd_plTipsT" }),
          info("💡", "gd_plExT", { bullets: ["gd_plEx1", "gd_plEx2", "gd_plEx3", "gd_plEx4", "gd_plEx5"], tone: "warn" }),
          info("❗", "gd_rememberT", { bodyKey: "gd_rememberB", tone: "urgent" }),
        ],
      },
      {
        id: "myths", emoji: "🤔", titleKey: "gd_myT",
        blocks: [
          text("gd_myIntro"),
          { type: "myths", pairs: range(6).map((n) => [_i("❌", `gd_my${n}`), _i("✅", `gd_my${n}f`)] as [GuideItem, GuideItem]) },
          keyMsg("gd_myKey", "💡"),
        ],
      },
      {
        id: "faq", emoji: "❓", titleKey: "gd_fqT",
        blocks: [
          text("gd_fqIntro"),
          {
            type: "faq",
            items: {
              children: range(3).map((n) => _i("❓", `gd_fqC${n}`)),
              adults: range(3).map((n) => _i("❓", `gd_fqA${n}`)),
              older: range(3).map((n) => _i("❓", `gd_fqO${n}`)),
            },
          },
          info("❗", "gd_fqNoteT", { bodyKey: "gd_fqNoteB", tone: "urgent" }),
        ],
      },
      {
        id: "five-steps", emoji: "🖐️", titleKey: "gd_5sT",
        blocks: [
          text("gd_5sIntro"),
          steps(fiveSteps),
          age(
            _ages(["gd_5sC1", "gd_5sC2", "gd_5sC3"], ["gd_5sA1", "gd_5sA2", "gd_5sA3"], ["gd_5sO1", "gd_5sO2", "gd_5sO3"]),
            "gd_5sInPractice",
          ),
          keyMsg("gd_5sKey", "💚"),
        ],
      },
    ],
  },

  // ====================================================== 6. WHERE TO GET HELP
  {
    number: 6, emoji: "🏥", titleKey: "gd_c6T", bodyKey: "gd_c6B", color: cHelp,
    topics: [
      {
        id: "get-help", emoji: "🩺", titleKey: "gd_hpT",
        blocks: [
          text("gd_hpIntro"),
          info("❗", "gd_hpWhenT", { bullets: ["gd_hpWhen1", "gd_hpWhen2", "gd_hpWhen3"], tone: "warn" }),
          age(_ages(["gd_hpC"], ["gd_hpA"], ["gd_hpO"])),
          keyMsg("gd_hpKey", "🙌"),
        ],
      },
      {
        id: "references", emoji: "📚", titleKey: "gd_rfT",
        blocks: [sources(["gd_rf1", "gd_rf2", "gd_rf3", "gd_rf4", "gd_rf5", "gd_rf6"])],
      },
    ],
  },
];

/** The guidebook FAQ block (chapter 5). */
export const guideFaqBlock: FaqBlock = guideChapters
  .flatMap((c) => c.topics)
  .flatMap((t) => t.blocks)
  .find((b): b is FaqBlock => b.type === "faq")!;

/** The guidebook FAQ for one age group — Home shows the user's three. */
export function faqFor(group: AgeGroup): GuideItem[] {
  return guideFaqBlock.items[group];
}

/** Finds a topic and its chapter by id (for links from Home). */
export function findTopic(id: string): { chapter: GuideChapter; topic: GuideTopic; index: number } | null {
  for (const chapter of guideChapters) {
    const index = chapter.topics.findIndex((t) => t.id === id);
    if (index >= 0) return { chapter, topic: chapter.topics[index], index };
  }
  return null;
}

export function findChapter(number: number | string): GuideChapter | null {
  return guideChapters.find((c) => String(c.number) === String(number)) ?? null;
}

export function guideChapterHref(chapter: GuideChapter | number): string {
  return `/guide/${typeof chapter === "number" ? chapter : chapter.number}`;
}

/** URL of a guide topic — the web version of openGuideTopic(). Falls back
 * to the Guide tab for an unknown id. Use with router.push or <Link>. */
export function guideTopicHref(topicId: string): string {
  const found = findTopic(topicId);
  return found ? `/guide/${found.chapter.number}/${found.topic.id}` : "/guide";
}

/** Tip of the day on Home: the 5 steps, then the 6 facts. */
export const guideTips: GuideItem[] = [...fiveSteps, ...range(6).map((n) => _i("💡", `gd_my${n}f`))];

/** The 7-day challenge habits (guidebook p. 21). */
export const challengeHabits: GuideItem[] = [
  _i("💧", "gd_ch1"),
  _i("🥗", "gd_ch2"),
  _i("🍎", "gd_ch3"),
  _i("🍔", "gd_ch4"),
  _i("🚶", "gd_ch5"),
  _i("🪑", "gd_ch6"),
  _i("😴", "gd_ch7"),
  _i("💊", "gd_ch8"),
];

/** The personal action plan fields (guidebook p. 22). */
export const planFields: { emoji: string; titleKey: string; hintKey: string }[] = [
  { emoji: "🎯", titleKey: "gd_pl1T", hintKey: "gd_pl1H" },
  { emoji: "🥗", titleKey: "gd_pl2T", hintKey: "gd_pl2H" },
  { emoji: "👟", titleKey: "gd_pl3T", hintKey: "gd_pl3H" },
  { emoji: "🚫", titleKey: "gd_pl4T", hintKey: "gd_pl4H" },
  { emoji: "🩺", titleKey: "gd_pl5T", hintKey: "gd_pl5H" },
  { emoji: "👥", titleKey: "gd_pl6T", hintKey: "gd_pl6H" },
];

/** Every translation key the Guide uses (for the test). */
export function allGuideKeys(): string[] {
  const keys: string[] = [];
  for (const c of guideChapters) {
    keys.push(c.titleKey, c.bodyKey);
    for (const t of c.topics) {
      keys.push(t.titleKey);
      for (const b of t.blocks) keys.push(...blockKeys(b));
    }
  }
  for (const h of challengeHabits) keys.push(...itemKeys(h));
  for (const f of planFields) keys.push(f.titleKey, f.hintKey);
  for (const g of AGE_GROUPS) keys.push(ageGroupInfo[g].labelKey, ageGroupInfo[g].shortKey);
  return keys;
}
