"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

import { Icon } from "@/components/icon";

type ShareState = "active" | "expired" | "revoked";
type Share = {
  id: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  state: ShareState;
  shareUrl?: string;
};

export function ShareManager({
  resourceType,
  resourceId,
}: {
  resourceType: "entry" | "board";
  resourceId: string;
}) {
  const [shares, setShares] = useState<Share[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [expiresInDays, setExpiresInDays] = useState("7");
  const [pending, setPending] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setState("loading");
      try {
        const query = new URLSearchParams({ resourceType, resourceId });
        const response = await fetch(`/api/shares?${query}`, {
          cache: "no-store",
          signal,
        });
        if (!response.ok) throw new Error("load_failed");
        const body = (await response.json()) as { shares: Share[] };
        setShares(body.shares);
        setState("ready");
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        setState("error");
      }
    },
    [resourceId, resourceType],
  );

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ resourceType, resourceId });
    void fetch(`/api/shares?${query}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("load_failed");
        return response.json() as Promise<{ shares: Share[] }>;
      })
      .then((body) => {
        setShares(body.shares);
        setState("ready");
      })
      .catch((error) => {
        if (error instanceof Error && error.name !== "AbortError")
          setState("error");
      });
    return () => controller.abort();
  }, [resourceId, resourceType]);

  async function createShare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending("create");
    setAnnouncement("");
    try {
      const response = await fetch("/api/shares", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          resourceType,
          resourceId,
          expiresInDays: Number(expiresInDays),
        }),
      });
      const body = (await response.json().catch(() => null)) as {
        error?: string;
        share?: Share;
      } | null;
      if (!response.ok || !body?.share) {
        setAnnouncement(
          body?.error === "rate_limited"
            ? "短時間に作成できる上限に達しました。しばらく待ってからお試しください。"
            : "共有リンクを作成できませんでした。もう一度お試しください。",
        );
        return;
      }
      setShares((current) => [body.share as Share, ...current]);
      setAnnouncement(
        "共有リンクを作成しました。この画面を離れる前にコピーしてください。",
      );
    } catch {
      setAnnouncement(
        "共有リンクを作成できませんでした。もう一度お試しください。",
      );
    } finally {
      setPending(null);
    }
  }

  async function revokeShare(shareId: string) {
    setPending(shareId);
    setAnnouncement("");
    try {
      const response = await fetch(`/api/shares/${shareId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("revoke_failed");
      const revokedAt = new Date().toISOString();
      setShares((current) =>
        current.map((share) =>
          share.id === shareId
            ? { ...share, state: "revoked", revokedAt, shareUrl: undefined }
            : share,
        ),
      );
      setAnnouncement("共有を取り消しました。リンクはすぐに開けなくなります。");
    } catch {
      setAnnouncement("共有を取り消せませんでした。もう一度お試しください。");
    } finally {
      setPending(null);
    }
  }

  async function copyShare(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setAnnouncement("共有リンクをコピーしました。");
    } catch {
      setAnnouncement(
        "コピーできませんでした。リンクを選択してコピーしてください。",
      );
    }
  }

  return (
    <section className="share-manager" aria-labelledby={`share-${resourceId}`}>
      <div className="share-manager-heading">
        <div>
          <h2 id={`share-${resourceId}`}>期限付きで共有</h2>
          <p>選んだ範囲だけを、リンクを知っている人が見られます。</p>
        </div>
        <Icon name="link" />
      </div>

      <form className="share-create-form" onSubmit={createShare}>
        <label htmlFor={`share-expiry-${resourceId}`}>
          有効期限
          <select
            id={`share-expiry-${resourceId}`}
            value={expiresInDays}
            onChange={(event) => setExpiresInDays(event.target.value)}
            disabled={pending !== null}
          >
            <option value="1">1日</option>
            <option value="7">7日</option>
            <option value="30">30日</option>
          </select>
        </label>
        <button className="button" type="submit" disabled={pending !== null}>
          <Icon name="link" />
          {pending === "create" ? "作成中" : "リンクを作る"}
        </button>
      </form>
      <p className="small muted">
        URLは作成直後に一度だけ表示します。失くした場合は新しく作成してください。
      </p>

      {announcement ? (
        <p className="form-status" role="status">
          {announcement}
        </p>
      ) : null}

      {state === "loading" ? (
        <div className="share-list share-skeleton" aria-busy="true">
          <span />
          <span />
        </div>
      ) : state === "error" ? (
        <div className="share-load-error" role="alert">
          <p>共有リンクを読み込めませんでした。</p>
          <button
            className="button button-secondary"
            type="button"
            onClick={() => void load()}
          >
            再読み込み
          </button>
        </div>
      ) : shares.length ? (
        <div className="share-list">
          {shares.map((share) => (
            <article className="share-row" key={share.id}>
              <div>
                <strong>{shareStateLabel(share.state)}</strong>
                <small>期限 {formatDateTime(share.expiresAt)}</small>
              </div>
              {share.shareUrl && share.state === "active" ? (
                <div className="share-once">
                  <input
                    aria-label="作成した共有リンク"
                    readOnly
                    value={share.shareUrl}
                    onFocus={(event) => event.currentTarget.select()}
                  />
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={() => void copyShare(share.shareUrl as string)}
                  >
                    <Icon name="content_copy" />
                    コピー
                  </button>
                </div>
              ) : null}
              {share.state === "active" ? (
                <button
                  className="button button-quiet"
                  type="button"
                  disabled={pending !== null}
                  onClick={() => void revokeShare(share.id)}
                >
                  <Icon name="block" />
                  {pending === share.id ? "取消中" : "共有を取り消す"}
                </button>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <p className="share-empty">有効な共有リンクはまだありません。</p>
      )}
    </section>
  );
}

function shareStateLabel(state: ShareState) {
  if (state === "active") return "共有中";
  return state === "expired" ? "期限切れ" : "取り消し済み";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
