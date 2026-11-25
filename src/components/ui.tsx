"use client";
// Shared UI kit — web versions of SurfaceCard, BigButton, Skeleton,
// FriendlyState, EmojiBadge, InfoBox and the app's sheets, dialogs and
// snackbars. Colours come from the tokens in globals.css.
import {
  createContext, useCallback, useContext, useEffect, useRef, useState,
  type ButtonHTMLAttributes, type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { LANGUAGES, isLang, setLang, useT } from "@/lib/i18n";
import { saveLanguage } from "@/lib/data";
import { friendlyError, rawError } from "@/lib/auth";

export function cx(...parts: unknown[]) {
  return parts.filter(Boolean).join(" ");
}

/** White card with a soft border and shadow, for content on the tinted page. */
export function SurfaceCard({ children, className, onClick, as = "div" }: {
  children: ReactNode; className?: string; onClick?: () => void; as?: "div" | "button" | "section";
}) {
  const Tag = onClick ? "button" : as;
  return (
    <Tag
      onClick={onClick}
      className={cx(
        "block w-full rounded-[20px] border border-line/70 bg-white p-4 text-left shadow-[0_4px_12px_rgb(0_0_0/0.04)]",
        onClick && "transition hover:shadow-md active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-teal-dark",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/** 56 px full-width primary or outlined button. */
export function BigButton({ outlined, className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { outlined?: boolean }) {
  return (
    <button
      {...rest}
      className={cx(
        "flex min-h-14 w-full items-center justify-center rounded-full px-5 py-3 text-center text-[17px] font-bold transition",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-dark disabled:opacity-50",
        outlined
          ? "border border-teal-dark/40 bg-transparent text-teal-dark hover:bg-mint"
          : "bg-teal-dark text-white hover:bg-[#184c45] active:scale-[0.99]",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Small tonal / text button. */
export function Button({ variant = "tonal", className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "filled" | "tonal" | "text" | "outlined" | "danger" }) {
  return (
    <button
      {...rest}
      className={cx(
        "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition disabled:opacity-50",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-dark",
        variant === "filled" && "bg-teal-dark text-white hover:bg-[#184c45]",
        variant === "tonal" && "bg-mint text-teal-dark hover:bg-[#d6ece6]",
        variant === "text" && "text-teal-dark hover:bg-mint",
        variant === "outlined" && "border border-line text-teal-dark hover:bg-mint",
        variant === "danger" && "bg-high text-white hover:opacity-90",
        className,
      )}
    />
  );
}

export function Pill({ children, className, color }: { children: ReactNode; className?: string; color?: string }) {
  return (
    <span
      className={cx("inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold", className)}
      style={color ? { backgroundColor: `${color}1f`, color } : undefined}
    >
      {children}
    </span>
  );
}

/** Rounded tinted square with an emoji. */
export function EmojiBadge({ emoji, color = "#1f5e55", size = 44 }: { emoji: string; color?: string; size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: `${color}1f`, fontSize: size * 0.5 }}
    >
      {emoji}
    </span>
  );
}

export type Tone = "info" | "good" | "warn" | "urgent";
export const toneColors: Record<Tone, { bg: string; accent: string }> = {
  info: { bg: "#EEF4FD", accent: "#2F5FA8" },
  good: { bg: "#EAF6EF", accent: "#2E7350" },
  warn: { bg: "#FFF5E2", accent: "#8A5A00" },
  urgent: { bg: "#FDECEA", accent: "#B3261E" },
};

/** Tinted callout in 4 tones. */
export function InfoBox({ tone = "info", emoji, title, children }: { tone?: Tone; emoji?: string; title?: ReactNode; children?: ReactNode }) {
  const c = toneColors[tone];
  return (
    <div className="rounded-[18px] border p-4" style={{ backgroundColor: c.bg, borderColor: `${c.accent}40` }}>
      {(emoji || title) && (
        <div className="flex items-start gap-2.5">
          {emoji && <span className="text-[22px] leading-none">{emoji}</span>}
          {title && <div className="text-base font-extrabold" style={{ color: c.accent }}>{title}</div>}
        </div>
      )}
      {children && <div className={cx("text-[14.5px] leading-relaxed", (emoji || title) && "mt-2")}>{children}</div>}
    </div>
  );
}

/** Shimmering placeholder shaped like the content that is coming. */
export function Skeleton({ className, height = 16, width, radius = 12 }: { className?: string; height?: number; width?: number | string; radius?: number }) {
  return (
    <div
      aria-hidden
      className={cx("animate-shimmer bg-[length:200%_100%]", className)}
      style={{
        height, width: width ?? "100%", borderRadius: radius,
        backgroundImage: "linear-gradient(90deg,#e6eeeb 25%,#f6faf8 50%,#e6eeeb 75%)",
      }}
    />
  );
}

export function SkeletonList({ count = 3, height = 72 }: { count?: number; height?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-busy>
      {Array.from({ length: count }, (_, i) => <Skeleton key={i} height={height} radius={20} />)}
    </div>
  );
}

/** Emoji + message + optional action, for empty and error states. */
export function FriendlyState({ emoji, title, message, actionLabel, onAction }: {
  emoji: string; title: string; message?: string; actionLabel?: string; onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center p-5 text-center">
      <div className="text-[44px]">{emoji}</div>
      <div className="mt-2.5 text-[17px] font-bold">{title}</div>
      {message && <div className="mt-1 text-muted">{message}</div>}
      {actionLabel && onAction && <Button className="mt-3" onClick={onAction}>{actionLabel}</Button>}
    </div>
  );
}

/** Standard error state with Try again (FriendlyState.error). */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t, lang } = useT();
  return (
    <div>
      <FriendlyState emoji="😕" title={t("er_couldNotLoad")} message={friendlyError(error, lang)} actionLabel={t("er_tryAgain")} onAction={onRetry} />
      {process.env.NODE_ENV !== "production" && (
        <p className="line-clamp-3 px-5 text-center text-[11px] text-muted/70">{rawError(error)}</p>
      )}
    </div>
  );
}

/** Language picker. Saves the choice to the profile when signed in. */
export function LanguageSelect({ className, light }: { className?: string; light?: boolean }) {
  const { lang, t } = useT();
  return (
    <select
      aria-label={t("languageLabel") === "languageLabel" ? "Language" : t("languageLabel")}
      value={lang}
      onChange={(e) => {
        const v = e.target.value;
        if (!isLang(v)) return;
        void setLang(v);
        void saveLanguage(v);
      }}
      className={cx(
        "min-h-10 cursor-pointer rounded-full border px-3 py-1.5 text-sm font-semibold outline-none focus-visible:ring-2",
        light ? "border-white/40 bg-white/15 text-white [&>option]:text-ink" : "border-line bg-white text-teal-dark",
        className,
      )}
    >
      {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
    </select>
  );
}

// ---------------------------------------------------------------- overlays

function useEscape(onClose: () => void, open: boolean) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", h); document.body.style.overflow = prev; };
  }, [open, onClose]);
}

/** Bottom sheet on phones, centred panel on wide screens. */
export function Sheet({ open, onClose, children, title, maxWidth = 560 }: {
  open: boolean; onClose: () => void; children: ReactNode; title?: ReactNode; maxWidth?: number;
}) {
  useEscape(onClose, open);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-black/40 animate-[fade-up_0.2s_ease-out]" onClick={onClose} />
      <div
        className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[24px] bg-white shadow-2xl animate-fade-up sm:m-4 sm:rounded-[24px]"
        style={{ maxWidth }}
      >
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-line sm:hidden" />
        <div className="flex items-center gap-2 px-5 pt-3 pb-2">
          <div className="min-w-0 flex-1 text-lg font-bold">{title}</div>
          <button onClick={onClose} aria-label="Close" className="flex size-10 items-center justify-center rounded-full text-xl text-muted hover:bg-mint">✕</button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-5 pb-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

/** Centred alert dialog. */
export function Dialog({ open, onClose, title, children, actions }: {
  open: boolean; onClose: () => void; title?: ReactNode; children?: ReactNode; actions?: ReactNode;
}) {
  useEscape(onClose, open);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="alertdialog" aria-modal>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-[24px] bg-white p-6 shadow-2xl animate-fade-up">
        {title && <h2 className="mb-3 text-xl font-bold">{title}</h2>}
        {children}
        {actions && <div className="mt-5 flex flex-wrap justify-end gap-2">{actions}</div>}
      </div>
    </div>,
    document.body,
  );
}

// ---------------------------------------------------------------- toasts

const ToastCtx = createContext<(msg: string) => void>(() => {});
/** `const toast = useToast(); toast("Saved")` — the app's SnackBar. */
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<{ text: string; id: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((text: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMsg({ text, id: Date.now() });
    timer.current = setTimeout(() => setMsg(null), 4000);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4">
        {msg && (
          <div key={msg.id} className="pointer-events-auto max-w-md rounded-2xl bg-ink px-4 py-3 text-sm text-white shadow-lg animate-fade-up whitespace-pre-line">
            {msg.text}
          </div>
        )}
      </div>
    </ToastCtx.Provider>
  );
}

/** Big celebratory "+N coins" overlay shown after earning. */
const CelebrateCtx = createContext<(coins: number, label?: string) => void>(() => {});
export const useCelebrate = () => useContext(CelebrateCtx);

export function CelebrateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ coins: number; label?: string; id: number } | null>(null);
  const show = useCallback((coins: number, label?: string) => {
    setState({ coins, label, id: Date.now() });
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(30);
    setTimeout(() => setState(null), 1800);
  }, []);
  return (
    <CelebrateCtx.Provider value={show}>
      {children}
      {state && (
        <div key={state.id} className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center">
          <div className="flex flex-col items-center rounded-[28px] bg-white/95 px-8 py-6 shadow-2xl animate-fade-up">
            <div className="text-5xl animate-float">🪙</div>
            <div className="mt-2 text-3xl font-extrabold text-teal-dark">+{state.coins}</div>
            {state.label && <div className="mt-1 text-sm font-semibold text-muted">{state.label}</div>}
          </div>
        </div>
      )}
    </CelebrateCtx.Provider>
  );
}

/** Light haptic tap where the device supports it. */
export function haptic(ms = 10) {
  try { navigator.vibrate?.(ms); } catch { /* unsupported */ }
}

/** Animated count-up number (TweenAnimationBuilder for counters). */
export function CountUp({ value, duration = 700, decimals = 0 }: { value: number; duration?: number; decimals?: number }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(a + (value - a) * eased);
      if (p < 1) raf = requestAnimationFrame(step);
      else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{shown.toFixed(decimals)}</>;
}

/** Circular score ring (0–100), animated. */
export function ScoreRing({ value, size = 120, stroke = 12, color = "#1f5e55", track = "#e8f4f1", children }: {
  value: number; size?: number; stroke?: number; color?: string; track?: string; children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [v, setV] = useState(0);
  useEffect(() => { const id = requestAnimationFrame(() => setV(Math.max(0, Math.min(100, value)))); return () => cancelAnimationFrame(id); }, [value]);
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)}
          style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(.2,.8,.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

/** Animated horizontal progress bar (0–1). */
export function ProgressBar({ value, color = "#1f5e55", className }: { value: number; color?: string; className?: string }) {
  return (
    <div className={cx("h-2 w-full overflow-hidden rounded-full bg-mint", className)}>
      <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, backgroundColor: color }} />
    </div>
  );
}

/** Page section heading. */
export function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cx("mt-6 mb-3 text-lg font-extrabold text-ink", className)}>{children}</h2>;
}
