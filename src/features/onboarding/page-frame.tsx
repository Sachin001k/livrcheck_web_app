"use client";
// App-bar + centred column for full-page screens outside the tab shell
// (consent, profile setup, privacy policy).
import type { ReactNode } from "react";
import { cx } from "@/components/ui";

export function PageFrame({ title, action, onBack, maxWidth = 560, children }: {
  title: string; action?: ReactNode; onBack?: () => void; maxWidth?: number; children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line/60 bg-page/90 backdrop-blur">
        <div className="mx-auto flex h-14 items-center gap-2 px-4" style={{ maxWidth }}>
          {onBack && (
            <button onClick={onBack} aria-label="Back" className="-ml-2 flex size-10 items-center justify-center rounded-full text-xl text-teal-dark hover:bg-mint">←</button>
          )}
          <h1 className="min-w-0 flex-1 truncate text-lg font-bold">{title}</h1>
          {action}
        </div>
      </header>
      <main className={cx("mx-auto w-full flex-1 px-4 pt-2 pb-8")} style={{ maxWidth }}>{children}</main>
    </div>
  );
}

/** Spinner for busy buttons. */
export function Spinner({ className }: { className?: string }) {
  return <span className={cx("inline-block size-5 animate-spin rounded-full border-2 border-white/30 border-t-white", className)} />;
}
