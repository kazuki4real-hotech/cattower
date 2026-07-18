"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { Icon } from "@/components/icon";
import type { BoardDetailView } from "@/lib/boards";

type Entry = BoardDetailView["items"][number];

export function BoardDetailManager({
  initialDetail,
}: {
  initialDetail: BoardDetailView;
}) {
  const [items, setItems] = useState(initialDetail.items);
  const [candidates, setCandidates] = useState(initialDetail.candidates);
  const [version, setVersion] = useState(initialDetail.board.version);
  const [selectedEntryId, setSelectedEntryId] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canManage = initialDetail.board.canManage;

  async function addEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const entry = candidates.find((item) => item.id === selectedEntryId);
    if (!entry) return;
    setPending("add");
    setError(null);
    try {
      const response = await fetch(
        `/api/boards/${initialDetail.board.id}/items`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ entryId: entry.id, version }),
        },
      );
      const body = (await response.json()) as {
        error?: string;
        version?: number;
      };
      if (!response.ok || !body.version) {
        setError(boardItemError(body.error));
        return;
      }
      setVersion(body.version);
      setItems((current) =>
        sortEntries([...current, entry], initialDetail.board.sortMode),
      );
      setCandidates((current) =>
        current.filter((item) => item.id !== entry.id),
      );
      setSelectedEntryId("");
    } catch {
      setError(boardItemError());
    } finally {
      setPending(null);
    }
  }

  async function moveEntry(index: number, direction: -1 | 1) {
    const destination = index + direction;
    if (destination < 0 || destination >= items.length) return;
    const nextItems = [...items];
    const [moved] = nextItems.splice(index, 1);
    if (!moved) return;
    nextItems.splice(destination, 0, moved);
    setPending(`move:${moved.id}`);
    setError(null);
    try {
      const response = await fetch(
        `/api/boards/${initialDetail.board.id}/items`,
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            entryIds: nextItems.map((item) => item.id),
            version,
          }),
        },
      );
      const body = (await response.json()) as {
        error?: string;
        version?: number;
      };
      if (!response.ok || !body.version) {
        setError(boardItemError(body.error));
        return;
      }
      setItems(nextItems);
      setVersion(body.version);
    } catch {
      setError(boardItemError());
    } finally {
      setPending(null);
    }
  }

  async function removeEntry(entry: Entry) {
    setPending(`remove:${entry.id}`);
    setError(null);
    try {
      const response = await fetch(
        `/api/boards/${initialDetail.board.id}/items/${entry.id}`,
        {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ version }),
        },
      );
      const body = (await response.json()) as {
        error?: string;
        version?: number;
      };
      if (!response.ok || !body.version) {
        setError(boardItemError(body.error));
        return;
      }
      setItems((current) => current.filter((item) => item.id !== entry.id));
      setCandidates((current) =>
        sortEntries([entry, ...current], "newest").slice(0, 100),
      );
      setVersion(body.version);
      setConfirmRemoveId(null);
    } catch {
      setError(boardItemError());
    } finally {
      setPending(null);
    }
  }

  return (
    <>
      {canManage ? (
        <>
          <form className="board-add-form" onSubmit={addEntry}>
            <div>
              <label htmlFor="board-entry">記録を追加</label>
              <p>最近の記録から、このボードへ入れる一件を選びます。</p>
            </div>
            <select
              id="board-entry"
              value={selectedEntryId}
              onChange={(event) => setSelectedEntryId(event.target.value)}
              disabled={!candidates.length || pending !== null}
              required
            >
              <option value="">
                {candidates.length
                  ? "記録を選ぶ"
                  : "追加できる記録はありません"}
              </option>
              {candidates.map((entry) => (
                <option value={entry.id} key={entry.id}>
                  {formatShortDate(entry.occurredDate)}　{entryLabel(entry)}
                </option>
              ))}
            </select>
            <button
              className="button"
              type="submit"
              disabled={!selectedEntryId || pending !== null}
            >
              <Icon name="add" />
              {pending === "add" ? "追加中…" : "追加する"}
            </button>
          </form>
          <p className="board-search-link">
            <Link href={`/search?boardId=${initialDetail.board.id}`}>
              一覧にない記録を検索して追加する
            </Link>
          </p>
        </>
      ) : null}

      {error ? (
        <p className="form-status error board-status" role="alert">
          {error}
        </p>
      ) : null}

      {items.length ? (
        <div className="board-entry-list" aria-busy={pending !== null}>
          {items.map((entry, index) => (
            <article className="board-entry-row" key={entry.id}>
              <Link
                className="board-entry-link"
                href={`/entries/${entry.id}`}
                aria-label={`${entryLabel(entry)}をひらく`}
              >
                {entry.media ? (
                  <Image
                    src={`/api/media/${entry.media.assetId}?variant=entry`}
                    width={entry.media.width ?? 160}
                    height={entry.media.height ?? 120}
                    unoptimized
                    alt=""
                  />
                ) : (
                  <span className="board-entry-placeholder">
                    <Icon name="menu_book" />
                  </span>
                )}
                <span className="board-entry-copy">
                  <strong>{entryLabel(entry)}</strong>
                  <small>
                    {formatDate(entry.occurredDate)}
                    {entry.cats.length
                      ? `・${entry.cats.map((cat) => cat.name).join("、")}`
                      : ""}
                  </small>
                </span>
              </Link>

              {canManage ? (
                <div className="board-entry-actions">
                  {initialDetail.board.sortMode === "manual" ? (
                    <div className="board-order-actions" aria-label="並び順">
                      <button
                        className="icon-button"
                        type="button"
                        onClick={() => void moveEntry(index, -1)}
                        disabled={index === 0 || pending !== null}
                        aria-label={`${entryLabel(entry)}を上へ`}
                      >
                        <Icon name="arrow_upward" />
                      </button>
                      <button
                        className="icon-button"
                        type="button"
                        onClick={() => void moveEntry(index, 1)}
                        disabled={
                          index === items.length - 1 || pending !== null
                        }
                        aria-label={`${entryLabel(entry)}を下へ`}
                      >
                        <Icon name="arrow_downward" />
                      </button>
                    </div>
                  ) : null}
                  {confirmRemoveId === entry.id ? (
                    <div className="board-remove-confirm">
                      <span>元の記録は残ります</span>
                      <button
                        className="button button-quiet"
                        type="button"
                        onClick={() => setConfirmRemoveId(null)}
                        disabled={pending !== null}
                      >
                        やめる
                      </button>
                      <button
                        className="button button-danger"
                        type="button"
                        onClick={() => void removeEntry(entry)}
                        disabled={pending !== null}
                      >
                        {pending === `remove:${entry.id}` ? "処理中…" : "外す"}
                      </button>
                    </div>
                  ) : (
                    <button
                      className="board-remove-link"
                      type="button"
                      onClick={() => setConfirmRemoveId(entry.id)}
                      disabled={pending !== null}
                    >
                      ボードから外す
                    </button>
                  )}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <section
          className="board-record-empty"
          aria-labelledby="board-record-empty-title"
        >
          <Icon name="menu_book" />
          <div>
            <h2 id="board-record-empty-title">このボードはまだ空です</h2>
            <p>
              {candidates.length
                ? "まとめたい記録ができたときに追加できます。記録は元の場所にも残ります。"
                : "記録が増えたら、必要なものだけここへまとめられます。空のままでも問題ありません。"}
            </p>
          </div>
        </section>
      )}

      <p className="small muted board-help">
        ボードから外しても、元の記録は削除されません。
      </p>
    </>
  );
}

function sortEntries(
  entries: Entry[],
  sortMode: "manual" | "newest" | "oldest",
) {
  if (sortMode === "manual") return entries;
  return [...entries].sort((left, right) => {
    const comparison = left.occurredDate.localeCompare(right.occurredDate);
    return sortMode === "newest" ? -comparison : comparison;
  });
}

function entryLabel(entry: Entry) {
  const label = entry.title || entry.body || "写真の記録";
  return label.length > 80 ? `${label.slice(0, 80)}…` : label;
}

function formatShortDate(value: string) {
  return value.replaceAll("-", "/");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function boardItemError(code?: string) {
  switch (code) {
    case "board_item_exists":
      return "この記録はすでにボードに入っています。";
    case "board_item_limit_reached":
      return "一つのボードには500件まで追加できます。";
    case "version_conflict":
      return "別の場所でボードが更新されました。画面を再読み込みしてください。";
    case "forbidden":
      return "このボードを変更する権限がありません。";
    case "entry_not_found":
      return "この記録は追加できません。";
    default:
      return "変更を保存できませんでした。通信を確認して、もう一度お試しください。";
  }
}
