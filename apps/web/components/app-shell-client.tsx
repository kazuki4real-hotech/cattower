"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { BrandWordmark } from "@/components/brand-wordmark";
import { CatSwitcher } from "@/components/cat-switcher";
import { Icon } from "@/components/icon";
import { OnboardingResumeBanner } from "@/components/onboarding-resume-banner";

type CatOption = { id: string; name: string; archivedAt: string | null };

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
  unreadCount = 0,
}: {
  item: readonly [string, string, string];
  pathname: string;
  mobile?: boolean;
  unreadCount?: number;
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
      {!mobile && href === "/notifications" && unreadCount ? (
        <span className="nav-count">{Math.min(unreadCount, 99)}</span>
      ) : null}
    </Link>
  );
}

export function AppShellClient({
  children,
  cats,
  activeCatId,
  narrow = false,
  wide = false,
}: {
  children: ReactNode;
  cats: CatOption[];
  activeCatId: string | null;
  narrow?: boolean;
  wide?: boolean;
}) {
  const pathname = usePathname();
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const loadUnreadCount = useCallback(async () => {
    const response = await fetch("/api/notifications?summary=1", {
      cache: "no-store",
    });
    if (!response.ok) return;
    const body = (await response.json()) as { unreadCount?: unknown };
    if (typeof body.unreadCount === "number") setUnreadCount(body.unreadCount);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/notifications?summary=1", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json() as Promise<{ unreadCount?: unknown }>;
      })
      .then((body) => {
        if (typeof body?.unreadCount === "number")
          setUnreadCount(body.unreadCount);
      })
      .catch(() => undefined);
    window.addEventListener("cattower:notifications-changed", loadUnreadCount);
    return () => {
      controller.abort();
      window.removeEventListener(
        "cattower:notifications-changed",
        loadUnreadCount,
      );
    };
  }, [loadUnreadCount]);

  return (
    <>
      <a className="skip-link" href="#main">
        本文へ移動
      </a>
      <div className="app-shell">
        <aside className="sidebar">
          <Brand />
          <CatSwitcher cats={cats} activeCatId={activeCatId} />
          <nav className="nav" aria-label="主要ナビゲーション">
            {primary.map((item) => (
              <NavLink key={item[0]} item={item} pathname={pathname} />
            ))}
          </nav>
          <nav className="sidebar-foot" aria-label="補助ナビゲーション">
            {secondary.map((item) => (
              <NavLink
                key={item[0]}
                item={item}
                pathname={pathname}
                unreadCount={unreadCount}
              />
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
              aria-label={
                unreadCount ? `未読のお知らせ${unreadCount}件` : "お知らせ"
              }
            >
              <Icon name="notifications" filled={Boolean(unreadCount)} />
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
              <CatSwitcher cats={cats} activeCatId={activeCatId} compact />
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
