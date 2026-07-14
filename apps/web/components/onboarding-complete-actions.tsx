"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Icon } from "@/components/icon";

export function OnboardingCompleteActions() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/onboarding", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: "complete" }),
    }).then((response) => {
      if (!active) return;
      if (response.ok) setReady(true);
      else setError("完了状態を保存できませんでした。再読み込みしてください。");
    });
    return () => { active = false; };
  }, []);

  if (error) return <p className="form-status error" role="alert">{error}</p>;
  if (!ready) return <p className="form-status" role="status">最後の仕上げを保存しています</p>;
  return <div className="onboarding-actions"><Link className="button" href="/home">おうちへ入る<Icon name="arrow_forward" /></Link><Link className="button button-secondary" href="/add"><Icon name="add" />最初の記録を作る</Link></div>;
}
