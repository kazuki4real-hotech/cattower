"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Icon } from "@/components/icon";

export function OnboardingCatForm({
  initialName = "",
}: {
  initialName?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(formData: FormData) {
    setPending(true);
    setError("");
    const response = await fetch("/api/onboarding", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: "cat", name: formData.get("name") }),
    });
    if (!response.ok) {
      setError("猫の名前を保存できませんでした。もう一度お試しください。");
      setPending(false);
      return;
    }
    router.push("/onboarding/photo");
  }

  return (
    <form className="onboarding-form" action={submit}>
      <div className="field">
        <label htmlFor="cat-name">猫の名前</label>
        <input
          id="cat-name"
          name="name"
          required
          maxLength={50}
          defaultValue={initialName}
        />
      </div>
      {error && (
        <p className="form-status error" role="alert">
          {error}
        </p>
      )}
      <div className="onboarding-actions">
        <Link className="button button-quiet" href="/onboarding/profile">
          <Icon name="arrow_back" />
          戻る
        </Link>
        <button className="button" type="submit" disabled={pending}>
          {pending ? "保存しています" : "次へ"}
          <Icon name="arrow_forward" />
        </button>
      </div>
    </form>
  );
}
