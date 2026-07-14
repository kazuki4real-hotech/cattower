"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

import { BrandWordmark } from "@/components/brand-wordmark";

export function OnboardingShell({
  current,
  children,
}: {
  current: number;
  children: ReactNode;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const previous = Number(sessionStorage.getItem("cattower-onboarding-step"));
    if (contentRef.current)
      contentRef.current.dataset.direction =
        previous > current ? "backward" : "forward";
    sessionStorage.setItem("cattower-onboarding-step", String(current));
    const heading = contentRef.current?.querySelector("h1");
    heading?.setAttribute("tabindex", "-1");
    heading?.focus();
  }, [current]);

  return (
    <main className="onboarding">
      <header className="onboarding-header">
        <div className="brand">
          <BrandWordmark priority />
        </div>
        <span className="onboarding-count">{Math.min(current, 4)} / 4</span>
      </header>
      <div
        className="onboarding-progress"
        role="progressbar"
        aria-label={`オンボーディング ステップ${Math.min(current, 4)} / 4`}
        aria-valuemin={1}
        aria-valuemax={4}
        aria-valuenow={Math.min(current, 4)}
      >
        <span style={{ transform: `scaleX(${Math.min(current, 4) / 4})` }} />
      </div>
      <section
        className="onboarding-content"
        data-direction="forward"
        ref={contentRef}
      >
        {children}
      </section>
      <p className="onboarding-privacy">
        入力した内容は、あなたのおうちだけに保存されます。
      </p>
    </main>
  );
}
