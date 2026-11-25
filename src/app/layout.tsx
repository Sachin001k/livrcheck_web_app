import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: { default: "LivrCheck — liver health check", template: "%s · LivrCheck" },
  description:
    "A free 2-minute fatty liver (NAFLD/MASLD) screening, daily healthy-habit tracker and liver guide, in 9 Indian languages. A screening tool, not a diagnosis.",
  applicationName: "LivrCheck",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/favicon.png", apple: "/icons/Icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#1f5e55",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
