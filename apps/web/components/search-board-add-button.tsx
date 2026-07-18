"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Icon } from "@/components/icon";

export function SearchBoardAddButton({
  boardId,
  entryId,
  version,
  initiallyAdded,
}: {
  boardId: string;
  entryId: string;
  version: number;
  initiallyAdded: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [added, setAdded] = useState(initiallyAdded);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/boards/${boardId}/items`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entryId, version }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(boardAddError(body.error));
        return;
      }
      setAdded(true);
      router.refresh();
    } catch {
      setError(boardAddError());
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="search-board-add">
      <button
        className="button button-secondary"
        type="button"
        onClick={() => void add()}
        disabled={added || pending}
      >
        <Icon name={added ? "check" : "add"} />
        {added ? "追加済み" : pending ? "追加中…" : "ボードへ追加"}
      </button>
      {error ? (
        <small className="error" role="alert">
          {error}
        </small>
      ) : null}
    </span>
  );
}

function boardAddError(code?: string) {
  if (code === "version_conflict")
    return "ボードが更新されました。再読み込みしてください。";
  if (code === "board_item_limit_reached") return "ボードは500件までです。";
  return "追加できませんでした。";
}
