"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signOut() {
    setPending(true);
    setError(null);
    const result = await authClient.signOut();
    if (result.error) {
      setError("ログアウトできませんでした。もう一度お試しください。");
      setPending(false);
      return;
    }
    router.push("/onboarding/welcome");
    router.refresh();
  }

  return (
    <div>
      <button
        className="button button-secondary"
        type="button"
        onClick={signOut}
        disabled={pending}
      >
        {pending ? "ログアウトしています" : "ログアウト"}
      </button>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
