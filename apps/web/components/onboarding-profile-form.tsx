"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Icon } from "@/components/icon";

export function OnboardingProfileForm({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(formData: FormData) {
    setPending(true);
    setError("");
    const response = await fetch("/api/onboarding", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: "profile", displayName: formData.get("displayName") }),
    });
    if (!response.ok) {
      setError("呼び名を保存できませんでした。もう一度お試しください。");
      setPending(false);
      return;
    }
    router.push("/onboarding/cat");
  }

  return (
    <form className="onboarding-form" action={submit}>
      <div className="field">
        <label htmlFor="display-name">あなたの呼び名</label>
        <input id="display-name" name="displayName" required maxLength={50} defaultValue={initialName} />
      </div>
      {error && <p className="form-status error" role="alert">{error}</p>}
      <div className="onboarding-actions">
        <button className="button" type="submit" disabled={pending}>
          {pending ? "保存しています" : "次へ進む"}<Icon name="arrow_forward" />
        </button>
      </div>
    </form>
  );
}
