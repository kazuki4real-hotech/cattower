"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Icon } from "@/components/icon";

const themes = [
  ["mint", "ミント", "var(--mint)"],
  ["sky", "空", "var(--sky)"],
  ["peach", "桃", "var(--peach)"],
  ["apricot", "あんず", "var(--apricot)"],
  ["mint-soft", "淡いミント", "var(--mint-soft)"],
] as const;

export function OnboardingThemeForm({
  initialTheme = "mint",
}: {
  initialTheme?: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(initialTheme);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function save(themeColor: string) {
    setPending(true);
    setError("");
    const response = await fetch("/api/onboarding", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: "theme", themeColor }),
    });
    if (!response.ok) {
      setError("テーマ色を保存できませんでした。もう一度お試しください。");
      setPending(false);
      return;
    }
    router.push("/onboarding/complete");
  }

  return (
    <div className="onboarding-form">
      <fieldset className="theme-fieldset">
        <legend className="visually-hidden">テーマ色</legend>
        <div className="theme-options">
          {themes.map(([value, name, color]) => (
            <button
              type="button"
              className="theme-option"
              data-selected={selected === value}
              aria-pressed={selected === value}
              onClick={() => setSelected(value)}
              key={value}
            >
              <span className="theme-swatch" style={{ background: color }} />
              <span>{name}</span>
              <Icon
                name={selected === value ? "check_circle" : "chevron_right"}
                filled={selected === value}
              />
            </button>
          ))}
        </div>
      </fieldset>
      {error && (
        <p className="form-status error" role="alert">
          {error}
        </p>
      )}
      <div className="onboarding-actions">
        <Link className="button button-quiet" href="/onboarding/photo">
          <Icon name="arrow_back" />
          戻る
        </Link>
        <div className="onboarding-actions-primary">
          <button
            className="button button-secondary"
            type="button"
            onClick={() => save("mint")}
            disabled={pending}
          >
            おすすめの色で始める
          </button>
          <button
            className="button"
            type="button"
            onClick={() => save(selected)}
            disabled={pending}
          >
            {pending ? "保存しています" : "完了"}
            <Icon name="arrow_forward" />
          </button>
        </div>
      </div>
    </div>
  );
}
