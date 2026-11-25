"use client";
// Port of lib/learn/guide_blocks.dart — draws each GuideBlock.
import type { ReactNode } from "react";
import { EmojiBadge, SurfaceCard, cx, toneColors } from "@/components/ui";
import { useT } from "@/lib/i18n";
import { AGE_GROUPS, ageGroupInfo, useGuideAgeGroup } from "./age-group";
import {
  type CompareSide, type FaqBlock, type GuideBlock, type GuideItem, type InfoBlock, type StepsBlock,
} from "./guide-content";
import { ChallengeTool, PlanTool, RiskChecklist } from "./guide-tools";

const kLow = "#3E8E6B";
const kMod = "#D99A2B";
const kModDark = "#8A5A00";
const kHigh = "#C4513A";
const tealDark = "#1F5E55";

/** `#rrggbb` + alpha (0–1) as an 8-digit hex colour. */
export function alpha(hex: string, a: number): string {
  return hex + Math.round(a * 255).toString(16).padStart(2, "0");
}

/** Draws one block. `color` is the chapter colour; `userId` is used by the tools. */
export function GuideBlockView({ block, color, userId }: { block: GuideBlock; color: string; userId: string }) {
  const { t } = useT();
  switch (block.type) {
    case "text":
      return <p className="whitespace-pre-line text-[15.5px] leading-[1.45]">{t(block.key)}</p>;
    case "key":
      return <KeyMessage text={t(block.key)} emoji={block.emoji} color={color} />;
    case "cards":
      return <Cards b={block} color={color} />;
    case "compare":
      return <Compare good={block.good} bad={block.bad} />;
    case "stages":
      return <Stages b={block} />;
    case "info":
      return <GuideInfoBox b={block} />;
    case "age":
      return <AgeAdvice titleKey={block.titleKey} items={block.items} />;
    case "tests":
      return <Tests items={block.items} />;
    case "swaps":
      return <Swaps swaps={block.swaps} />;
    case "myths":
      return <Myths pairs={block.pairs} />;
    case "faq":
      return <GuideFaq b={block} />;
    case "steps":
      return <GuideSteps b={block} />;
    case "sources":
      return <Sources refs={block.refs} />;
    case "checklist":
      return <RiskChecklist b={block} />;
    case "tool":
      return block.tool === "challenge" ? <ChallengeTool userId={userId} /> : <PlanTool userId={userId} />;
  }
}

// ---------------------------------------------------------------- helpers

/** Section heading inside a topic. */
export function GuideHeading({ children }: { children: ReactNode }) {
  return <h3 className="mb-2 text-[16.5px] font-extrabold">{children}</h3>;
}

/** Bold title + optional body. */
function TitleBody({ title, body, titleColor }: { title: string; body?: string | null; titleColor?: string }) {
  return (
    <div>
      <div className="text-[15px] font-bold" style={titleColor ? { color: titleColor } : undefined}>{title}</div>
      {body && <div className="mt-[3px] whitespace-pre-line text-sm leading-[1.35] text-muted">{body}</div>}
    </div>
  );
}

function Bullet({ text, color, icon }: { text: string; color: string; icon?: "check" | "error" }) {
  return (
    <div className="flex items-start">
      {icon ? (
        <span className="mt-0.5 mr-2.5 flex size-[18px] shrink-0 items-center justify-center rounded-full text-[11px] font-black text-white" style={{ backgroundColor: color }} aria-hidden>
          {icon === "check" ? "✓" : "!"}
        </span>
      ) : (
        <span className="mt-[7px] mr-3 ml-1 size-[7px] shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden />
      )}
      <div className="flex-1 whitespace-pre-line text-[14.5px] leading-[1.4]">{text}</div>
    </div>
  );
}

/** A row: emoji badge + title/body; plain bullet for title-only "•" items. */
export function GuideItemRow({ item, color }: { item: GuideItem; color: string }) {
  const { t } = useT();
  if (item.emoji === "•") return <Bullet text={t(item.titleKey)} color={color} />;
  return (
    <div className="flex items-start gap-3">
      <EmojiBadge emoji={item.emoji} color={item.color ?? color} size={40} />
      <div className="min-w-0 flex-1 pt-0.5">
        <TitleBody title={t(item.titleKey)} body={item.bodyKey ? t(item.bodyKey) : null} />
      </div>
    </div>
  );
}

/** Lays out children two per row when the container is wide enough. */
function TwoUp({ children, wide = 520 }: { children: ReactNode; wide?: 480 | 520 }) {
  return (
    <div className="@container">
      <div className={cx("grid grid-cols-1 gap-3", wide === 480 ? "@min-[480px]:grid-cols-2" : "@min-[520px]:grid-cols-2")}>
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- blocks

function KeyMessage({ text, emoji, color }: { text: string; emoji: string; color: string }) {
  const { t } = useT();
  return (
    <div
      className="flex items-center gap-3.5 rounded-[18px] border p-4"
      style={{ backgroundImage: `linear-gradient(90deg, ${alpha(color, 0.16)}, ${alpha(color, 0.06)})`, borderColor: alpha(color, 0.25) }}
    >
      <span className="text-[30px] leading-none" aria-hidden>{emoji}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-extrabold tracking-[0.08em] uppercase" style={{ color }}>{t("gd_keyMessage")}</div>
        <div className="mt-0.5 whitespace-pre-line text-base leading-[1.3] font-bold">{text}</div>
      </div>
    </div>
  );
}

function Cards({ b, color }: { b: Extract<GuideBlock, { type: "cards" }>; color: string }) {
  const { t } = useT();
  const cards = b.items.map((i, n) => (
    <SurfaceCard key={n} className="!p-3.5"><GuideItemRow item={i} color={color} /></SurfaceCard>
  ));
  return (
    <div>
      {b.titleKey && <GuideHeading>{t(b.titleKey)}</GuideHeading>}
      {b.introKey && <p className="mb-2.5 text-[14.5px]">{t(b.introKey)}</p>}
      {b.grid ? <TwoUp wide={480}>{cards}</TwoUp> : <div className="flex flex-col gap-2.5">{cards}</div>}
    </div>
  );
}

function Compare({ good, bad }: { good: CompareSide; bad: CompareSide }) {
  const { t } = useT();
  const side = (s: CompareSide, isGood: boolean) => {
    const c = isGood ? kLow : kHigh;
    return (
      <div className="rounded-[18px] border p-4" style={{ backgroundColor: alpha(c, 0.07), borderColor: alpha(c, 0.3) }}>
        <div className="flex items-center gap-2.5">
          {/* A simple liver-coloured blob: red-brown when healthy, yellowish when fatty. */}
          <span
            aria-hidden
            className="h-[30px] w-11 shrink-0"
            style={{ backgroundColor: isGood ? "#C9655A" : "#E8C15A", borderRadius: "22px 8px 30px 22px" }}
          />
          <div className="text-lg font-extrabold" style={{ color: c }}>{t(s.titleKey)}</div>
        </div>
        <p className="mt-2 text-sm leading-[1.35]">{t(s.bodyKey)}</p>
        <div className="mt-2.5 flex flex-col gap-1.5">
          {s.points.map((p) => <Bullet key={p} text={t(p)} color={c} icon={isGood ? "check" : "error"} />)}
        </div>
      </div>
    );
  };
  return <TwoUp>{side(good, true)}{side(bad, false)}</TwoUp>;
}

function Stages({ b }: { b: Extract<GuideBlock, { type: "stages" }> }) {
  const { t } = useT();
  return (
    <div>
      {b.titleKey && <GuideHeading>{t(b.titleKey)}</GuideHeading>}
      {b.items.map((i, n) => (
        <div key={n}>
          {n > 0 && (b.arrows
            ? <div className="py-0.5 text-center text-xl font-bold leading-none" style={{ color: i.color ?? tealDark }} aria-hidden>↓</div>
            : <div className="h-2.5" />)}
          <StageCard i={i} />
        </div>
      ))}
    </div>
  );
}

function StageCard({ i }: { i: GuideItem }) {
  const { t } = useT();
  const c = i.color ?? tealDark;
  return (
    <SurfaceCard className="flex overflow-hidden !p-0">
      <div className="w-1.5 shrink-0" style={{ backgroundColor: c }} />
      <div className="flex min-w-0 flex-1 items-start gap-3 p-3.5">
        <EmojiBadge emoji={i.emoji} color={c} size={40} />
        <div className="min-w-0 flex-1">
          <TitleBody title={t(i.titleKey)} body={i.bodyKey ? t(i.bodyKey) : null} titleColor={c === kMod ? kModDark : c} />
          {i.noteKey && (
            <div className="mt-2 rounded-[10px] px-2.5 py-1.5 text-[13px] font-semibold" style={{ backgroundColor: alpha(c, 0.1) }}>
              🔑 {t(i.noteKey)}
            </div>
          )}
        </div>
      </div>
    </SurfaceCard>
  );
}

/** Coloured info box for an InfoBlock. `args` fills `{name}` placeholders. */
export function GuideInfoBox({ b, args = {} }: { b: InfoBlock; args?: Record<string, unknown> }) {
  const { t, tf } = useT();
  const { bg, accent } = toneColors[b.tone];
  return (
    <div className="rounded-[18px] border p-4" style={{ backgroundColor: bg, borderColor: alpha(accent, 0.25) }}>
      <div className="flex items-start gap-2.5">
        <span className="text-[22px] leading-none" aria-hidden>{b.emoji}</span>
        <div className="flex-1 text-base font-extrabold" style={{ color: accent }}>{tf(b.titleKey, args)}</div>
      </div>
      {b.bodyKey && <p className="mt-2 whitespace-pre-line text-[14.5px] leading-[1.4]">{tf(b.bodyKey, args)}</p>}
      {(b.bullets ?? []).map((k) => <div key={k} className="mt-2"><Bullet text={t(k)} color={accent} /></div>)}
      {(b.items ?? []).map((i, n) => <div key={n} className="mt-3"><GuideItemRow item={i} color={accent} /></div>)}
    </div>
  );
}

/** Chips to switch the age group (shared by every page). */
export function AgeGroupChips() {
  const { t } = useT();
  const [selected, setSelected] = useGuideAgeGroup();
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup">
      {AGE_GROUPS.map((g) => {
        const info = ageGroupInfo[g];
        const on = g === selected;
        return (
          <button
            key={g}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => setSelected(g)}
            className={cx("inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition", on ? "font-extrabold" : "border-black/10 bg-white font-medium hover:bg-mint")}
            style={on ? { backgroundColor: alpha(info.color, 0.18), borderColor: info.color, color: info.color } : undefined}
          >
            <span aria-hidden>{info.emoji}</span>
            {t(info.shortKey)}
          </button>
        );
      })}
    </div>
  );
}

function AgeAdvice({ titleKey, items }: { titleKey: string; items: Record<string, GuideItem[]> }) {
  const { t } = useT();
  const [g] = useGuideAgeGroup();
  const c = ageGroupInfo[g].color;
  return (
    <div className="rounded-[18px] border p-4 transition-colors duration-200" style={{ backgroundColor: alpha(c, 0.07), borderColor: alpha(c, 0.3) }}>
      <div className="text-base font-extrabold" style={{ color: c }}>{t(titleKey)}</div>
      <div className="mt-2.5"><AgeGroupChips /></div>
      <div key={g} className="mt-3.5 flex flex-col gap-3 animate-fade-up">
        {(items[g] ?? []).map((i, n) => <GuideItemRow key={n} item={i} color={c} />)}
      </div>
    </div>
  );
}

function Tests({ items }: { items: GuideItem[] }) {
  const { t } = useT();
  const label = (key: string, c: string) => (
    <div className="text-[10.5px] font-extrabold tracking-[0.06em] uppercase" style={{ color: c }}>{t(key)}</div>
  );
  return (
    <div className="flex flex-col gap-2.5">
      {items.map((i, n) => (
        <SurfaceCard key={n} className="flex items-start gap-3 !p-3.5">
          <EmojiBadge emoji={i.emoji} color="#2F6FD6" size={40} />
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-extrabold">{t(i.titleKey)}</div>
            <div className="mt-2">{label("gd_measures", "#1F7A6E")}</div>
            <p className="text-sm">{t(i.bodyKey!)}</p>
            <div className="mt-1.5">{label("gd_limits", "#7B57C2")}</div>
            <p className="text-sm text-muted">{t(i.noteKey!)}</p>
          </div>
        </SurfaceCard>
      ))}
    </div>
  );
}

function Swaps({ swaps }: { swaps: [GuideItem, GuideItem][] }) {
  const { t } = useT();
  const cell = (i: GuideItem, c: string) => (
    <div className="h-full rounded-[14px] border p-3" style={{ backgroundColor: alpha(c, 0.08), borderColor: alpha(c, 0.25) }}>
      <div className="text-[28px] leading-tight" aria-hidden>{i.emoji}</div>
      <div className="mt-1 text-sm font-bold">{t(i.titleKey)}</div>
      {i.bodyKey && <div className="text-[12.5px] text-muted">{t(i.bodyKey)}</div>}
    </div>
  );
  return (
    <div>
      <div className="grid grid-cols-[1fr_28px_1fr] text-center font-extrabold">
        <div style={{ color: kHigh }}>{t("gd_chooseLess")}</div>
        <div />
        <div style={{ color: kLow }}>{t("gd_tryInstead")}</div>
      </div>
      <div className="mt-2 flex flex-col gap-2.5">
        {swaps.map(([a, b], n) => (
          <div key={n} className="grid grid-cols-[1fr_28px_1fr] items-stretch">
            {cell(a, kHigh)}
            <div className="flex items-center justify-center text-lg font-bold" style={{ color: kLow }} aria-hidden>→</div>
            {cell(b, kLow)}
          </div>
        ))}
      </div>
    </div>
  );
}

function Myths({ pairs }: { pairs: [GuideItem, GuideItem][] }) {
  const { t } = useT();
  const part = (i: GuideItem, myth: boolean) => {
    const c = myth ? kHigh : kLow;
    return (
      <div className="p-3.5" style={{ backgroundColor: alpha(c, myth ? 0.07 : 0.09) }}>
        <div className="flex items-center gap-1.5">
          <span className="flex size-5 items-center justify-center rounded-full text-xs font-black text-white" style={{ backgroundColor: c }} aria-hidden>
            {myth ? "✕" : "✓"}
          </span>
          <span className="font-black tracking-[0.08em] uppercase" style={{ color: c }}>{t(myth ? "gd_myth" : "gd_fact")}</span>
        </div>
        <div className="mt-1.5"><TitleBody title={t(i.titleKey)} body={t(i.bodyKey!)} /></div>
      </div>
    );
  };
  return (
    <div className="flex flex-col gap-3">
      {pairs.map(([m, f], n) => (
        <SurfaceCard key={n} className="overflow-hidden !p-0">
          {part(m, true)}
          {part(f, false)}
        </SurfaceCard>
      ))}
    </div>
  );
}

/** FAQ grouped by age, the reader's group first and its first answer open.
 * `onlySelected`: only the chosen group, all closed (Home's short version). */
export function GuideFaq({ b, onlySelected = false }: { b: FaqBlock; onlySelected?: boolean }) {
  const { t } = useT();
  const [g] = useGuideAgeGroup();
  const groups = [g, ...AGE_GROUPS.filter((x) => x !== g && !onlySelected)];
  return (
    <div>
      {!onlySelected && <div className="mb-3"><AgeGroupChips /></div>}
      {groups.map((group) => {
        const info = ageGroupInfo[group];
        return (
          <div key={group}>
            {!onlySelected && (
              <div className="mt-1.5 mb-2 font-extrabold" style={{ color: info.color }}>{info.emoji}  {t(info.labelKey)}</div>
            )}
            <SurfaceCard className="mb-3 overflow-hidden !p-0">
              {(b.items[group] ?? []).map((q, n) => (
                <details
                  key={`${g}-${group}-${n}`}
                  open={group === g && n === 0 && !onlySelected}
                  className="group border-t border-line/60 first:border-t-0"
                >
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 hover:bg-mint/50 [&::-webkit-details-marker]:hidden">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-black" style={{ backgroundColor: alpha(info.color, 0.15), color: info.color }}>Q</span>
                    <span className="flex-1 font-semibold">{t(q.titleKey)}</span>
                    <span className="text-muted transition group-open:rotate-180" aria-hidden>▾</span>
                  </summary>
                  <p className="px-4 pb-4 whitespace-pre-line leading-[1.4]">{t(q.bodyKey!)}</p>
                </details>
              ))}
            </SurfaceCard>
          </div>
        );
      })}
    </div>
  );
}

const stepColors = ["#3E8E4F", "#2F6FD6", "#B7791F", "#D6455D", "#7B57C2"];

/** Numbered steps (assessment pathway, the 5 steps). */
export function GuideSteps({ b }: { b: StepsBlock }) {
  const { t } = useT();
  return (
    <div>
      {b.titleKey && <GuideHeading>{t(b.titleKey)}</GuideHeading>}
      <div className="flex flex-col gap-2.5">
        {b.items.map((i, n) => (
          <SurfaceCard key={n} className="flex items-start gap-3 !p-3.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full font-black text-white" style={{ backgroundColor: stepColors[n % stepColors.length] }}>
              {n + 1}
            </span>
            <div className="min-w-0 flex-1">
              <TitleBody title={`${i.emoji}  ${t(i.titleKey)}`} body={i.bodyKey ? t(i.bodyKey) : null} />
            </div>
          </SurfaceCard>
        ))}
      </div>
    </div>
  );
}

function Sources({ refs }: { refs: string[] }) {
  const { t } = useT();
  return (
    <div className="flex flex-col gap-1.5">
      {refs.map((k, n) => (
        <p key={k} className="text-[12.5px] leading-[1.35] break-words text-muted">
          {refs.length > 1 ? `${n + 1}. ${t(k)}` : t(k)}
        </p>
      ))}
    </div>
  );
}
