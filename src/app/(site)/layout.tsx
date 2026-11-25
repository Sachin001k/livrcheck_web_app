"use client";
import type { ReactNode } from "react";
import { SiteFrame } from "@/components/shell";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return <SiteFrame>{children}</SiteFrame>;
}
