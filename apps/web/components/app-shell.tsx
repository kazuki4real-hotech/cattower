"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { BrandWordmark } from "@/components/brand-wordmark";
import { CatSwitcher } from "@/components/cat-switcher";
import { Icon } from "@/components/icon";
import { OnboardingResumeBanner } from "@/components/onboarding-resume-banner";

const primary = [
  ["/home", "おうち", "home"],
  ["/boards", "ボード", "collections_bookmark"],
  ["/record", "記録する", "add"],
  ["/walk", "お散歩", "explore"],
] as const;

const mobilePrimary = primary.filter(([href]) => href !== "/record");

const secondary = [
  ["/search", "記録を探す", "search"],
  ["/notifications", "お知らせ", "notifications"],
  ["/settings", "家族と設定", "settings"],
] as const;

function Brand() {
  return (
    <Link className="brand" href="/home">
      <BrandWordmark priority />
    </Link>
  );
}

function NavLink({
  item,
  pathname,
  mobile = false,
}: {
  item: readonly [string, string, string];
  pathname: string;
  mobile?: boolean;
}) {
  const [href, label, icon] = item;
  const current =
    pathname === href || (href !== "/home" && pathname.startsWith(`${href}/`));
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={mobile ? "mobile-nav-link" : undefined}
    >
      <Icon name={icon} filled={current} />
      <span>{label}</span>
      {!mobile && href === "/notifications" ? (
        <span className="nav-count">2</span>
      ) : null}
    </Link>
  );
}

export function AppShell({
  children,
  narrow = false,
  wide = false,
}: {
  children: ReactNode;
  narrow?: boolean;
  wide?: boolean;
}) {
  const pathname = usePathname();
  const [navCollapsed, setNavCollapsed] = useState(false);
  return (
    <>
      <a className="skip-link" href="#main">
        本文へ移動
      </a>
      <div className="app-shell">
        <aside className="sidebar">
          <Brand />
          <CatSwitcher />
          <nav className="nav" aria-label="主要ナビゲーション">
            {primary.map((item) => (
              <NavLink key={item[0]} item={item} pathname={pathname} />
            ))}
          </nav>
          <nav className="sidebar-foot" aria-label="補助ナビゲーション">
            {secondary.map((item) => (
              <NavLink key={item[0]} item={item} pathname={pathname} />
            ))}
          </nav>
        </aside>
        <header className="mobile-top">
          <Brand />
          <div className="mobile-top-actions">
            <Link
              className="icon-button record-button"
              href="/record"
              aria-label="記録する"
            >
              <Icon name="pets" variant="outlined" />
            </Link>
            <Link
              className="icon-button"
              href="/notifications"
              aria-label="未読のお知らせ2件"
            >
              <Icon name="notifications" filled />
            </Link>
            <Link
              className="icon-button"
              href="/settings"
              aria-label="家族と設定"
            >
              <Icon name="settings" />
            </Link>
          </div>
        </header>
        <main className="main" id="main">
          <div
            className={`page${narrow ? " page-narrow" : ""}${wide ? " page-wide" : ""}`}
          >
            <div className="mobile-cat-select">
              <CatSwitcher compact />
            </div>
            <OnboardingResumeBanner />
            {children}
          </div>
        </main>
        <button
          className="mobile-nav-fab"
          type="button"
          aria-label="ナビゲーションを表示"
          data-visible={navCollapsed ? "true" : "false"}
          onClick={() => setNavCollapsed(false)}
        >
          <Icon name="menu" />
        </button>
        <nav
          className="mobile-nav"
          aria-label="主要ナビゲーション"
          data-collapsed={navCollapsed ? "true" : "false"}
        >
          {mobilePrimary.map((item) => (
            <NavLink key={item[0]} item={item} pathname={pathname} mobile />
          ))}
          <button
            className="mobile-nav-collapse"
            type="button"
            aria-label="ナビゲーションを縮小"
            onClick={() => setNavCollapsed(true)}
          >
            <Icon name="close_fullscreen" />
          </button>
        </nav>
      </div>
    </>
  );
}
