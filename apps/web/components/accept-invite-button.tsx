"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AcceptInviteButton({ token }: { token: string }) {
  const router = useRouter();
  const [status, setStatus] = useState("");
  async function accept() {
    setStatus("参加しています");
    const response = await fetch("/api/invites/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const body = (await response.json().catch(() => null)) as {
      destination?: string;
      error?: string;
    } | null;
    if (!response.ok) {
      setStatus(
        body?.error === "already_member"
          ? "すでにこの家族に参加しています。"
          : "この招待は利用できません。",
      );
      return;
    }
    router.push(body?.destination ?? "/home");
    router.refresh();
  }
  return (
    <div>
      <button className="button" type="button" onClick={() => void accept()}>
        家族として参加する
      </button>
      {status ? (
        <p className="small muted" role="status">
          {status}
        </p>
      ) : null}
    </div>
  );
}
