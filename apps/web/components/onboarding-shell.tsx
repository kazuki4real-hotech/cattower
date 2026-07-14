import Link from "next/link";
import type { ReactNode } from "react";

import { Icon } from "@/components/icon";

const labels = ["はじめまして", "猫を登録", "できあがり"];
const rooms = [
  ["home", "あなたのおうち", "猫との時間を残す場所"],
  ["pets", "猫のプロフィール", "名前と好きな色を覚えます"],
] as const;

export function OnboardingShell({ current, children, complete = false }: { current: number; children: ReactNode; complete?: boolean }) {
  return (
    <main className="onboarding">
      <section className="onboarding-copy">
        <Link className="brand" href="/"><span className="brand-mark">T</span>cattower</Link>
        <div className="onboarding-content">
          <nav className="onboarding-steps" aria-label="オンボーディングの進行">
            {labels.map((label, index) => (
              <span className={`onboarding-step${index < current ? " done" : ""}${index === current ? " current" : ""}`} aria-current={index === current ? "step" : undefined} key={label}>
                <Icon name={index < current ? "check_circle" : index === current ? "pets" : "lock"} filled={index < current} />
                <span>{label}</span>
              </span>
            ))}
          </nav>
          {children}
        </div>
      </section>
      <aside className="onboarding-stage" aria-label="猫のおうちが少しずつ完成していく様子">
        <div className="tower">
          <div className="tower-roof" />
          {rooms.map(([icon, title, text], index) => {
            const state = complete || index < current ? "done" : index === current ? "current" : "locked";
            return (
              <section className={`tower-room ${state}`} key={title}>
                <Icon name={state === "locked" ? "lock" : icon} filled={state === "done"} />
                <div><h2>{title}</h2><p>{state === "locked" ? "この先でひらきます" : text}</p></div>
              </section>
            );
          })}
          <div className="tower-base" />
        </div>
      </aside>
    </main>
  );
}
