"use client";

import { MAX_BOARD_NAME_LENGTH, type BoardSortMode } from "@cattower/domain";
import { PageHeading } from "@cattower/ui";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { Icon } from "@/components/icon";
import type { BoardView } from "@/lib/boards";

type Board = BoardView;
type EditorValue = { name: string; sortMode: BoardSortMode };

const SORT_LABELS: Record<BoardSortMode, string> = {
  manual: "自分で並べる",
  newest: "新しい記録から",
  oldest: "古い記録から",
};

const EMPTY_EDITOR: EditorValue = { name: "", sortMode: "manual" };

export function BoardManager({ initialBoards }: { initialBoards: Board[] }) {
  const [boards, setBoards] = useState(initialBoards);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  function startCreate() {
    setError(null);
    setEditingId(null);
    setDeletingId(null);
    setCreating(true);
  }

  return (
    <>
      <PageHeading
        eyebrow="任意の整理"
        title="ボード"
        description="一緒に眺めたい記録だけを、好きなまとまりにできます。"
        actions={
          <button
            className="button button-secondary"
            type="button"
            onClick={startCreate}
            disabled={creating || pendingId !== null}
          >
            <Icon name="add" />
            ボードを作る
          </button>
        }
      />

      {error ? (
        <p className="form-status error board-status" role="alert">
          {error}
        </p>
      ) : null}
      <p className="sr-only" role="status">
        {announcement}
      </p>

      {creating ? (
        <BoardEditor
          heading="新しいボード"
          initialValue={EMPTY_EDITOR}
          pending={pendingId === "new"}
          onCancel={() => {
            setCreating(false);
            setError(null);
          }}
          onSubmit={async (value) => {
            setPendingId("new");
            setError(null);
            setAnnouncement("");
            try {
              const response = await fetch("/api/boards", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(value),
              });
              const body = (await response.json()) as {
                board?: Board;
                error?: string;
              };
              if (!response.ok || !body.board) {
                setError(boardError(body.error));
                return;
              }
              setBoards((current) => [body.board!, ...current]);
              setAnnouncement(`${body.board.name}を作成しました`);
              setCreating(false);
            } catch {
              setError(boardError());
            } finally {
              setPendingId(null);
            }
          }}
        />
      ) : null}

      {boards.length ? (
        <div className="board-list">
          {boards.map((board) => (
            <article className="board-item" key={board.id}>
              {editingId === board.id ? (
                <BoardEditor
                  heading={`${board.name}を編集`}
                  initialValue={{
                    name: board.name,
                    sortMode: board.sortMode,
                  }}
                  pending={pendingId === board.id}
                  compact
                  onCancel={() => {
                    setEditingId(null);
                    setError(null);
                  }}
                  onSubmit={async (value) => {
                    setPendingId(board.id);
                    setError(null);
                    setAnnouncement("");
                    try {
                      const response = await fetch(`/api/boards/${board.id}`, {
                        method: "PUT",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({
                          ...value,
                          version: board.version,
                        }),
                      });
                      const body = (await response.json()) as {
                        board?: Partial<Board>;
                        error?: string;
                      };
                      if (!response.ok || !body.board) {
                        setError(boardError(body.error));
                        return;
                      }
                      setBoards((current) =>
                        current.map((item) =>
                          item.id === board.id
                            ? { ...item, ...body.board }
                            : item,
                        ),
                      );
                      setAnnouncement(`${value.name}を更新しました`);
                      setEditingId(null);
                    } catch {
                      setError(boardError());
                    } finally {
                      setPendingId(null);
                    }
                  }}
                />
              ) : (
                <>
                  <div className="board-item-mark">
                    <Icon name="collections_bookmark" />
                  </div>
                  <div className="board-item-copy">
                    <h2>{board.name}</h2>
                    <p>
                      {board.itemCount}件の記録・{SORT_LABELS[board.sortMode]}
                    </p>
                  </div>
                  <div className="board-item-actions">
                    <Link
                      className="button button-secondary"
                      href={`/boards/${board.id}`}
                    >
                      ボードをひらく
                      <Icon name="chevron_right" />
                    </Link>
                    {board.canManage ? (
                      <button
                        className="button button-quiet"
                        type="button"
                        onClick={() => {
                          setCreating(false);
                          setDeletingId(null);
                          setEditingId(board.id);
                          setError(null);
                        }}
                        disabled={pendingId !== null}
                      >
                        <Icon name="edit" />
                        編集
                      </button>
                    ) : null}
                  </div>
                </>
              )}

              {board.canManage && editingId !== board.id ? (
                deletingId === board.id ? (
                  <div
                    className="board-delete-confirm"
                    role="group"
                    aria-label={`${board.name}の削除確認`}
                  >
                    <p>
                      「{board.name}
                      」を削除します。記録そのものは削除されません。
                    </p>
                    <div className="button-row">
                      <button
                        className="button button-quiet"
                        type="button"
                        autoFocus
                        onClick={() => cancelDelete(board.id)}
                        disabled={pendingId !== null}
                      >
                        キャンセル
                      </button>
                      <button
                        className="button button-danger"
                        type="button"
                        onClick={() => void deleteBoard(board)}
                        disabled={pendingId !== null}
                      >
                        {pendingId === board.id ? "削除中…" : "削除する"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    id={`board-delete-${board.id}`}
                    className="board-delete-link"
                    type="button"
                    onClick={() => {
                      setDeletingId(board.id);
                      setError(null);
                    }}
                    disabled={pendingId !== null}
                  >
                    ボードを削除
                  </button>
                )
              ) : null}
            </article>
          ))}
        </div>
      ) : creating ? null : (
        <section className="board-empty" aria-labelledby="board-empty-title">
          <Icon name="collections_bookmark" />
          <div>
            <h2 id="board-empty-title">ボードはまだありません</h2>
            <p>
              まとめたい記録ができたときだけ使えます。作らなくても、すべての記録は日付やタグから探せます。
            </p>
          </div>
        </section>
      )}

      {boards.length ? (
        <p className="small muted board-help">
          ボードを削除しても、元の記録は残ります。
        </p>
      ) : null}
    </>
  );

  async function deleteBoard(board: Board) {
    setPendingId(board.id);
    setError(null);
    setAnnouncement("");
    try {
      const response = await fetch(`/api/boards/${board.id}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ version: board.version }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(boardError(body.error));
        return;
      }
      setBoards((current) => current.filter((item) => item.id !== board.id));
      setAnnouncement(`${board.name}を削除しました`);
      setDeletingId(null);
    } catch {
      setError(boardError());
    } finally {
      setPendingId(null);
    }
  }

  function cancelDelete(boardId: string) {
    setDeletingId(null);
    requestAnimationFrame(() => {
      document.getElementById(`board-delete-${boardId}`)?.focus();
    });
  }
}

function BoardEditor({
  heading,
  initialValue,
  pending,
  compact = false,
  onCancel,
  onSubmit,
}: {
  heading: string;
  initialValue: EditorValue;
  pending: boolean;
  compact?: boolean;
  onCancel: () => void;
  onSubmit: (value: EditorValue) => Promise<void>;
}) {
  const [value, setValue] = useState(initialValue);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSubmit(value);
  }

  return (
    <form
      className={`board-editor${compact ? " board-editor-compact" : ""}`}
      onSubmit={submit}
    >
      <div className="board-editor-head">
        <h2>{heading}</h2>
        <button
          className="icon-button"
          type="button"
          onClick={onCancel}
          aria-label="閉じる"
          disabled={pending}
        >
          <Icon name="close" />
        </button>
      </div>
      <div className="board-editor-fields">
        <label className="field">
          <span>ボード名</span>
          <input
            name="name"
            value={value.name}
            maxLength={MAX_BOARD_NAME_LENGTH}
            onChange={(event) =>
              setValue((current) => ({ ...current, name: event.target.value }))
            }
            autoFocus
            required
          />
        </label>
        <label className="field">
          <span>記録の並び順</span>
          <select
            name="sortMode"
            value={value.sortMode}
            onChange={(event) =>
              setValue((current) => ({
                ...current,
                sortMode: event.target.value as BoardSortMode,
              }))
            }
          >
            {Object.entries(SORT_LABELS).map(([sortMode, label]) => (
              <option value={sortMode} key={sortMode}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="button-row board-editor-actions">
        <button
          className="button button-quiet"
          type="button"
          onClick={onCancel}
          disabled={pending}
        >
          キャンセル
        </button>
        <button className="button" type="submit" disabled={pending}>
          {pending ? "保存中…" : "保存する"}
        </button>
      </div>
    </form>
  );
}

function boardError(code?: string) {
  switch (code) {
    case "invalid_board":
      return "ボード名を確認してください。";
    case "board_name_exists":
      return "同じ名前のボードがすでにあります。";
    case "board_limit_reached":
      return "ボードは50個まで作れます。";
    case "version_conflict":
      return "別の場所で内容が更新されました。画面を再読み込みしてください。";
    case "forbidden":
      return "このボードを変更する権限がありません。";
    default:
      return "保存できませんでした。通信を確認して、もう一度お試しください。";
  }
}
