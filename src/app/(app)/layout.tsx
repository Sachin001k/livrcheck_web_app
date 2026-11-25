"use client";
import type { ReactNode } from "react";
import { Gate } from "@/components/gate";

export default function AppLayout({ children }: { children: ReactNode }) {
  return <Gate>{children}</Gate>;
}
