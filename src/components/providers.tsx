"use client";
import type { ReactNode } from "react";
import { SessionProvider } from "./session";
import { AuthLinkHandlers } from "./gate";
import { CelebrateProvider, ToastProvider } from "./ui";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <CelebrateProvider>
        <SessionProvider>
          {children}
          <AuthLinkHandlers />
        </SessionProvider>
      </CelebrateProvider>
    </ToastProvider>
  );
}
