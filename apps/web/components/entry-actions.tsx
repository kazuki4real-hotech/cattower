"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Icon } from "@/components/icon";

export function EntryActions({
  entryId,
  initialVersion,
  deleted,
}: {
  entryId: string;
  initialVersion: number;
  deleted: boolean;
}) {
  const router = useRouter();
  const [version, setVersion] = useState(initialVersion);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function mutate(action: "delete" | "restore") {
    setPending(true);
    setError("");
    const response = await fetch(
      action === "restore"
        ? `/api/entries/${entryId}/restore`
        : `/api/entries/${entryId}`,
      {
        method: action === "restore" ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version }),
      },
    );
    const result = (await response.json().catch(() => null)) as {
      version?: number;
    } | null;
    if (!response.ok || !result?.version) {
      setError(
        response.status === 409
          ? "別の画面で更新されています。再読み込みしてください。"
          : action === "restore"
            ? "記録を元に戻せませんでした。"
            : "記録を削除できませんでした。",
      );
      setPending(false);
      return;
    }
    setVersion(result.version);
    setConfirming(false);
    setPending(false);
    router.refresh();
  }

  if (deleted)
    return (
      <div className="entry-manage-actions">
        <button
          className="button"
          type="button"
          disabled={pending}
          onClick={() => void mutate("restore")}
        >
          <Icon name="restore" />
          {pending ? "戻しています" : "記録を元に戻す"}
        </button>
        {error ? (
          <p className="form-status error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );

  return (
    <div className="entry-manage-actions">
      <div className="button-row">
        <button
          className="button button-secondary"
          type="button"
          onClick={() => router.push(`/entries/${entryId}/edit`)}
          disabled={pending}
        >
          <Icon name="edit" />
          編集する
        </button>
        {!confirming ? (
          <button
            className="button button-quiet"
            type="button"
            onClick={() => setConfirming(true)}
            disabled={pending}
          >
            <Icon name="delete" />
            削除する
          </button>
        ) : null}
      </div>
      {confirming ? (
        <div
          className="entry-delete-confirm"
          role="group"
          aria-label="記録の削除確認"
        >
          <p>おうちからこの記録を隠します。あとから元に戻せます。</p>
          <div className="button-row">
            <button
              className="button button-danger"
              type="button"
              onClick={() => void mutate("delete")}
              disabled={pending}
            >
              {pending ? "削除しています" : "削除する"}
            </button>
            <button
              className="button button-secondary"
              type="button"
              onClick={() => setConfirming(false)}
              disabled={pending}
            >
              やめる
            </button>
          </div>
        </div>
      ) : null}
      {error ? (
        <p className="form-status error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
