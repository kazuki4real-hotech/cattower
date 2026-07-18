"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Icon } from "@/components/icon";
import { sanitizeReturnTo } from "@/lib/onboarding-routes";

export function OnboardingCompleteActions() {
  const [destination, setDestination] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/onboarding", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: "complete" }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = (await response.json().catch(() => null)) as {
          destination?: unknown;
        } | null;
        if (!response.ok) throw new Error("complete_failed");
        const next =
          typeof body?.destination === "string"
            ? sanitizeReturnTo(body.destination)
            : null;
        setDestination(next ?? "/home");
      })
      .catch((cause) => {
        if (cause instanceof DOMException && cause.name === "AbortError")
          return;
        setError("完了状態を保存できませんでした。もう一度お試しください。");
      });
    return () => controller.abort();
  }, []);

  if (error)
    return (
      <div className="onboarding-complete-actions">
        <p className="form-status error" role="alert">
          {error}
        </p>
        <button
          className="button button-secondary"
          type="button"
          onClick={() => location.reload()}
        >
          もう一度試す
        </button>
      </div>
    );
  if (!destination)
    return (
      <p className="form-status" role="status">
        最後の仕上げを保存しています
      </p>
    );
  return (
    <div className="onboarding-actions onboarding-complete-actions">
      <Link className="button button-secondary" href="/record">
        <Icon name="add" />
        記録を残す
      </Link>
      <Link className="button" href={destination}>
        {destination === "/home" ? "おうちへ" : "元のページへ"}
        <Icon name="arrow_forward" />
      </Link>
    </div>
  );
}
