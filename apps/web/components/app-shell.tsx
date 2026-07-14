"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { Icon } from "@/components/icon";
import { images } from "@/lib/demo-data";

const primary = [
  ["/home", "おうち", "home"],
  ["/collections", "コレクション", "collections_bookmark"],
  ["/add", "追加", "add"],
  ["/town", "猫町", "explore"],
] as const;

const secondary = [
  ["/search", "記録を探す", "search"],
  ["/notifications", "お知らせ", "notifications"],
  ["/settings", "家族と設定", "settings"],
] as const;

function Brand() {
  return (
    <Link className="brand" href="/home">
      <span className="brand-mark">T</span>
      cattower
    </Link>
  );
}

function NavLink({ item, pathname, mobile = false }: { item: readonly [string, string, string]; pathname: string; mobile?: boolean }) {
  const [href, label, icon] = item;
  const current = pathname === href || (href !== "/home" && pathname.startsWith(`${href}/`));
  return (
    <Link href={href} aria-current={current ? "page" : undefined} className={mobile ? "mobile-nav-link" : undefined}>
      <Icon name={icon} filled={current} />
      <span>{label}</span>
      {!mobile && href === "/notifications" ? <span className="nav-count">2</span> : null}
    </Link>
  );
}

export function AppShell({ children, narrow = false, wide = false }: { children: ReactNode; narrow?: boolean; wide?: boolean }) {
  const pathname = usePathname();
  return (
    <>
      <a className="skip-link" href="#main">本文へ移動</a>
      <div className="app-shell">
        <aside className="sidebar">
          <Brand />
          <button className="cat-switcher" type="button">
            <Image src={images.window} width={40} height={40} alt="こむぎのプロフィール写真" />
            <span><strong>こむぎ</strong><small>3歳・おうち</small></span>
            <Icon name="expand_more" />
          </button>
          <nav className="nav" aria-label="主要ナビゲーション">
            {primary.map((item) => <NavLink key={item[0]} item={item} pathname={pathname} />)}
          </nav>
          <nav className="sidebar-foot" aria-label="補助ナビゲーション">
            {secondary.map((item) => <NavLink key={item[0]} item={item} pathname={pathname} />)}
          </nav>
        </aside>
        <header className="mobile-top">
          <Brand />
          <Link className="icon-button" href="/notifications" aria-label="未読のお知らせ2件"><Icon name="notifications" filled /></Link>
        </header>
        <main className="main" id="main">
          <div className={`page${narrow ? " page-narrow" : ""}${wide ? " page-wide" : ""}`}>{children}</div>
        </main>
        <nav className="mobile-nav" aria-label="主要ナビゲーション">
          {primary.map((item) => <NavLink key={item[0]} item={item} pathname={pathname} mobile />)}
        </nav>
      </div>
    </>
  );
}
