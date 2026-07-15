"use client";

import { useState } from "react";

import { Icon } from "@/components/icon";
import { authClient } from "@/lib/auth-client";

export function GoogleSignInButton({
  callbackURL = "/auth/continue",
}: {
  callbackURL?: string;
}) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function signIn() {
    setPending(true);
    setError("");
    const result = await authClient.signIn.social({
      provider: "google",
      callbackURL,
    });
    if (result.error) {
      setError(
        "Googleログインを始められませんでした。設定を確認して、もう一度お試しください。",
      );
      setPending(false);
    }
  }

  return (
    <div className="entry-sign-in">
      <button
        className="button"
        type="button"
        onClick={signIn}
        disabled={pending}
      >
        <Icon name="login" />
        {pending ? "Googleへ移動しています" : "Googleで始める"}
      </button>
      {error && (
        <p className="form-status error" role="alert">
          {error}
        </p>
      )}
      <p className="small muted">
        猫の記録は、あなたが共有しない限り公開されません。
      </p>
    </div>
  );
}
