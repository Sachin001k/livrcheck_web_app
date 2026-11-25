"use client";
// Port of lib/survey/body_map.dart — tappable body outline with 5 organs,
// drawn in a 200 × 270 coordinate space.
import { useT } from "@/lib/i18n";
import type { OrganResult } from "./assess";
import { levelColor, levelText, organName } from "./health-ui";

const oval = (cx: number, cy: number, w: number, h: number) => {
  const rx = w / 2, ry = h / 2;
  return `M${cx - rx},${cy} a${rx},${ry} 0 1,0 ${w},0 a${rx},${ry} 0 1,0 ${-w},0 Z`;
};

export const organPaths: Record<string, string> = {
  lungs: oval(78, 112, 34, 60) + oval(122, 112, 34, 60),
  heart: "M106,110 C112,102 124,106 122,116 C120,125 110,131 106,135 C102,131 92,125 90,116 C88,106 100,102 106,110 Z",
  liver: "M60,152 C62,141 90,139 118,143 C127,145 125,153 116,157 C100,165 80,173 67,171 C59,167 56,158 60,152 Z",
  pancreas: "M94,178 C104,171 126,171 135,175 C137,180 128,183 118,183 C108,183 100,184 94,181 Z",
  kidneys: oval(78, 206, 18, 28) + oval(122, 206, 18, 28),
};

const DRAW_ORDER = ["lungs", "heart", "liver", "pancreas", "kidneys"];

const BODY =
  "M66,62 Q100,55 134,62 L152,78 Q162,92 160,132 L154,232 Q151,252 130,258 L70,258 Q49,252 46,232 L40,132 Q38,92 48,78 Z";

export function BodyMap({ organs, selected, onTap, className }: {
  /** null/undefined = grey preview. */
  organs?: Record<string, OrganResult> | null;
  selected?: string | null;
  onTap?: (key: string) => void;
  className?: string;
}) {
  const { t } = useT();
  return (
    <svg viewBox="0 0 200 270" className={className} role={onTap ? "group" : "img"} aria-hidden={!onTap}>
      <g fill="#e3ebe8">
        <circle cx={100} cy={34} r={21} />
        <rect x={90} y={50} width={20} height={14} rx={4} />
        <path d={BODY} />
      </g>
      {DRAW_ORDER.map((k) => {
        const o = organs?.[k];
        const fill = o ? levelColor(o.level) : "rgb(92 107 103 / 0.27)";
        const isSel = k === selected;
        const label = o ? `${organName(t, k, true)}: ${levelText(o.level, t)}` : organName(t, k, true);
        return (
          <path
            key={k}
            d={organPaths[k]}
            fill={fill}
            fillRule="nonzero"
            stroke={isSel ? "#1b2422" : "none"}
            strokeWidth={3}
            className={onTap ? "cursor-pointer outline-none transition-opacity hover:opacity-85 focus-visible:opacity-70" : undefined}
            onClick={onTap ? () => onTap(k) : undefined}
            onKeyDown={onTap ? (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onTap(k)) : undefined}
            tabIndex={onTap ? 0 : undefined}
            role={onTap ? "button" : undefined}
            aria-label={onTap ? label : undefined}
            aria-pressed={onTap ? isSel : undefined}
          >
            {onTap && <title>{label}</title>}
          </path>
        );
      })}
    </svg>
  );
}
