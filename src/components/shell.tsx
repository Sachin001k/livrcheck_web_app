"use client";
// Website frame shared by every page: a sticky header (logo, nav, language,
// Log in / Sign up — or the app's 5 sections once signed in), a footer for
// public pages, and a bottom tab bar on phones when signed in.
// The signed-in nav is the web version of screens/main_shell.dart.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useSession } from "./session";
import { LanguageSelect, cx } from "./ui";
import { useT } from "@/lib/i18n";
import { supportEmail } from "@/lib/supabase";

/** The signed-in app's sections (the Flutter app's 5 tabs). */
export const TABS = [
  { href: "/dashboard", label: "web_navDashboard", icon: "🏠" },
  { href: "/check", label: "navCheck", icon: "🩺" },
  { href: "/guide", label: "gd_navGuide", icon: "📖" },
  { href: "/rewards", label: "navRewards", icon: "🏆" },
  { href: "/profile", label: "navProfile", icon: "👤" },
] as const;

/** Public website links (signed out). */
const SITE_LINKS = [
  { href: "/", label: "web_navHome" },
  { href: "/guide", label: "web_navGuide" },
  { href: "/#how", label: "web_navHow" },
  { href: "/#foods", label: "web_navFoods" },
  { href: "/#myths", label: "web_navMyths" },
  { href: "/#faq", label: "web_navFaq" },
] as const;

export function activeTab(path: string) {
  if (path.startsWith("/settings")) return TABS[4];
  return TABS.find((tab) => path === tab.href || path.startsWith(tab.href + "/")) ?? null;
}

export function Logo({ light }: { light?: boolean }) {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="LivrCheck home">
      <span className={cx("flex size-9 items-center justify-center rounded-xl text-xl", light ? "bg-white/15" : "bg-mint")} aria-hidden>🩺</span>
      <span className={cx("text-lg font-extrabold tracking-tight", light ? "text-white" : "text-teal-dark")}>LivrCheck</span>
    </Link>
  );
}

export function SiteHeader() {
  const { t } = useT();
  const path = usePathname();
  const { session } = useSession();
  const signedIn = !!session;
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]); // eslint-disable-line react-hooks/set-state-in-effect
  const tab = activeTab(path);

  const linkCls = (on: boolean) =>
    cx("rounded-full px-3 py-2 text-sm font-semibold transition", on ? "bg-mint text-teal-dark" : "text-muted hover:bg-white hover:text-ink");

  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-page/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Logo />
        <nav className="ml-4 hidden flex-1 items-center gap-1 lg:flex" aria-label="Main">
          {signedIn
            ? TABS.map((x) => <Link key={x.href} href={x.href} className={linkCls(tab === x)}>{t(x.label)}</Link>)
            : SITE_LINKS.map((x) => <Link key={x.href} href={x.href} className={linkCls(x.href === path)}>{t(x.label)}</Link>)}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <LanguageSelect className="max-w-[7.5rem]" />
          {session === null && (
            <>
              <Link href="/login" className="hidden min-h-10 items-center rounded-full px-4 text-sm font-semibold text-teal-dark hover:bg-mint sm:inline-flex">
                {t("web_login")}
              </Link>
              <Link href="/check" className="hidden min-h-10 items-center rounded-full bg-teal-dark px-4 text-sm font-semibold text-white hover:bg-[#184c45] sm:inline-flex">
                {t("web_heroCta")}
              </Link>
            </>
          )}
          {!signedIn && (
            <button
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-label={t("web_menu")}
              className="flex size-10 items-center justify-center rounded-full text-xl text-teal-dark hover:bg-mint lg:hidden"
            >
              {open ? "✕" : "☰"}
            </button>
          )}
        </div>
      </div>
      {open && !signedIn && (
        <div className="border-t border-line/60 bg-white px-4 py-3 shadow-lg animate-fade-up lg:hidden">
          <nav className="flex flex-col" aria-label="Main">
            {SITE_LINKS.map((x) => (
              <Link key={x.href} href={x.href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 font-semibold hover:bg-mint">
                {t(x.label)}
              </Link>
            ))}
          </nav>
          <div className="mt-2 grid grid-cols-2 gap-2 border-t border-line/60 pt-3">
            <Link href="/login" className="flex min-h-12 items-center justify-center rounded-full border border-teal-dark/40 font-semibold text-teal-dark">{t("web_login")}</Link>
            <Link href="/check" className="flex min-h-12 items-center justify-center rounded-full bg-teal-dark font-semibold text-white">{t("web_heroCta")}</Link>
          </div>
        </div>
      )}
    </header>
  );
}

/** Bottom tab bar on phones for signed-in users. */
export function MobileTabBar() {
  const { t } = useT();
  const tab = activeTab(usePathname());
  return (
    <nav aria-label="App" className="fixed inset-x-0 bottom-0 z-30 border-t border-line/70 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-[720px]">
        {TABS.map((x) => {
          const on = x === tab;
          return (
            <Link key={x.href} href={x.href} aria-current={on ? "page" : undefined}
              className="flex min-h-16 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold">
              <span className={cx("flex h-8 w-14 items-center justify-center rounded-full text-lg transition", on ? "bg-mint" : "opacity-70 grayscale")}>{x.icon}</span>
              <span className={on ? "text-teal-dark" : "text-muted"}>{t(x.label)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function SiteFooter() {
  const { t, tf } = useT();
  return (
    <footer className="mt-16 bg-teal-dark text-white/80">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <Logo light />
          <p className="mt-3 max-w-md text-sm leading-relaxed">{t("web_footerAbout")}</p>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-white">{t("web_footerLinks")}</h3>
          <ul className="space-y-2 text-sm">
            <li><Link className="hover:text-white" href="/guide">{t("web_navGuide")}</Link></li>
            <li><Link className="hover:text-white" href="/#how">{t("web_navHow")}</Link></li>
            <li><Link className="hover:text-white" href="/#myths">{t("web_navMyths")}</Link></li>
            <li><Link className="hover:text-white" href="/#faq">{t("web_navFaq")}</Link></li>
            <li><Link className="hover:text-white" href="/check">{t("web_heroCta")}</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-white">{t("web_footerLegal")}</h3>
          <ul className="space-y-2 text-sm">
            <li><Link className="hover:text-white" href="/privacy">{t("web_footerPrivacy")}</Link></li>
            <li><a className="hover:text-white" href="/delete-account.html">{t("web_footerDelete")}</a></li>
            <li><a className="hover:text-white" href={`mailto:${supportEmail}`}>{t("web_footerContact")}</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-white/60">
          {t("sv_disclaimer")} · {tf("web_footerRights", { year: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  );
}

/** Signed-in app pages: header, a wide column (each page picks its own
 * layout), bottom tabs on phones. */
export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  useEffect(() => { window.scrollTo(0, 0); }, [path]);
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5 pb-28 sm:px-6 lg:pt-8 lg:pb-12">{children}</main>
      <MobileTabBar />
    </div>
  );
}

/** Public pages: header, content, footer (plus the tab bar when signed in). */
export function SiteFrame({ children }: { children: ReactNode }) {
  const { session } = useSession();
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <div className={cx("flex-1", session && "pb-16 lg:pb-0")}>{children}</div>
      <SiteFooter />
      {session && <MobileTabBar />}
    </div>
  );
}
