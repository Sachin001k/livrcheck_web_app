"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import { useSession } from "@/components/session";
import { useT } from "@/lib/i18n";

/** The public Guide: readable by everyone, in a 720 px column. */
export default function GuideLayout({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const { t } = useT();
  return (
    <main className="mx-auto w-full max-w-[720px] px-4 pt-4">
      {children}
      {session === null && (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-[20px] bg-mint p-5 text-center sm:flex-row sm:text-left">
          <span className="text-3xl" aria-hidden>🩺</span>
          <p className="flex-1 text-sm font-semibold text-teal-dark">{t("web_guestGuideNote")}</p>
          <Link href="/signup" className="inline-flex min-h-11 items-center rounded-full bg-teal-dark px-5 text-sm font-semibold text-white hover:bg-[#184c45]">
            {t("web_signup")}
          </Link>
        </div>
      )}
    </main>
  );
}
