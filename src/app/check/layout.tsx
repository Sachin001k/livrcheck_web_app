"use client";
// /check works without an account. Signed in, it is the app's Check tab
// (behind the usual Gate); signed out, it opens inside the public website.
import type { ReactNode } from "react";
import { useSession } from "@/components/session";
import { Gate, Splash } from "@/components/gate";
import { SiteFrame } from "@/components/shell";

export default function CheckLayout({ children }: { children: ReactNode }) {
  const { session } = useSession();
  if (session === undefined) return <Splash />;
  if (session) return <Gate>{children}</Gate>;
  return (
    <SiteFrame>
      <main className="mx-auto w-full max-w-[720px] px-4 pt-6 pb-12 sm:pt-10">{children}</main>
    </SiteFrame>
  );
}
