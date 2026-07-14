"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Icon } from "@/components/icon";
import { getOnboardingRoute } from "@/lib/onboarding-routes";

export function OnboardingResumeBanner() {
  const [route, setRoute] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/onboarding", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json() as Promise<{
          completed?: boolean;
          prompted?: boolean;
          step?: number;
        }>;
      })
      .then((snapshot) => {
        if (snapshot && !snapshot.completed && snapshot.prompted)
          setRoute(getOnboardingRoute(snapshot.step ?? 0));
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  if (!route) return null;
  return (
    <aside className="onboarding-resume" aria-label="プロフィール設定">
      <div>
        <strong>プロフィール設定を続けますか？</strong>
        <p>保存したところから、いつでも再開できます。</p>
      </div>
      <Link className="button button-secondary" href={route}>
        設定を続ける
        <Icon name="arrow_forward" />
      </Link>
    </aside>
  );
}
