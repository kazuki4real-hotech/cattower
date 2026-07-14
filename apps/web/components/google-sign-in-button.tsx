"use client";

import { useState } from "react";

import { Icon } from "@/components/icon";
import { authClient } from "@/lib/auth-client";

export function GoogleSignInButton() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function signIn() {
    setPending(true);
    setError("");
    const result = await authClient.signIn.social({ provider: "google", callbackURL: "/onboarding/welcome" });
    if (result.error) {
      setError("Googleログインを始められませんでした。設定を確認して、もう一度お試しください。");
      setPending(false);
    }
  }

  return (
    <div className="onboarding-form">
      <button className="button" type="button" onClick={signIn} disabled={pending}>
        <Icon name="login" />
        {pending ? "Googleへ移動しています" : "Googleで始める"}
      </button>
      {error && <p className="form-status error" role="alert">{error}</p>}
      <p className="small muted">ログイン情報は認証にだけ使い、猫の記録は公開しません。</p>
    </div>
  );
}
