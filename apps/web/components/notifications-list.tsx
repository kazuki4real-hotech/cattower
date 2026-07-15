"use client";

import { useCallback, useEffect, useState } from "react";

type Notice = {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  readAt: string | null;
};

export function NotificationsList() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [pending, setPending] = useState(false);
  const load = useCallback(async () => {
    setState("loading");
    const response = await fetch("/api/notifications", { cache: "no-store" });
    if (!response.ok) {
      setState("error");
      return;
    }
    const body = (await response.json()) as { notifications: Notice[] };
    setNotices(body.notifications);
    setState("ready");
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/notifications", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("load_failed");
        return response.json() as Promise<{ notifications: Notice[] }>;
      })
      .then((body) => {
        setNotices(body.notifications);
        setState("ready");
      })
      .catch((error) => {
        if (error instanceof Error && error.name !== "AbortError")
          setState("error");
      });
    return () => controller.abort();
  }, []);

  async function markRead(ids?: string[]) {
    setPending(true);
    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(ids ? { ids } : { all: true }),
    });
    if (!response.ok) {
      setState("error");
      setPending(false);
      return;
    }
    const readAt = new Date().toISOString();
    setNotices((current) =>
      current.map((notice) =>
        !notice.readAt && (!ids || ids.includes(notice.id))
          ? { ...notice, readAt }
          : notice,
      ),
    );
    setPending(false);
    window.dispatchEvent(new Event("cattower:notifications-changed"));
  }

  const unread = notices.filter((notice) => !notice.readAt).length;
  if (state === "loading")
    return (
      <div className="notice-list" aria-busy="true" aria-label="読み込み中">
        {[0, 1, 2].map((item) => (
          <div className="notice notice-skeleton" aria-hidden="true" key={item}>
            <span className="notice-dot" />
            <div>
              <span />
              <span />
            </div>
          </div>
        ))}
      </div>
    );
  if (state === "error")
    return (
      <div className="notice-empty" role="alert">
        <h2>お知らせを読み込めませんでした</h2>
        <p>通信を確認して、もう一度お試しください。</p>
        <button className="button button-secondary" onClick={() => void load()}>
          再読み込み
        </button>
      </div>
    );
  if (!notices.length)
    return (
      <div className="notice-empty">
        <h2>新しいお知らせはありません</h2>
        <p>家族の参加や処理の完了など、必要なことだけここに届きます。</p>
      </div>
    );
  return (
    <>
      <div className="notice-toolbar">
        <p>{unread ? `未読 ${unread}件` : "すべて確認済みです"}</p>
        <button
          className="button button-secondary"
          type="button"
          onClick={() => void markRead()}
          disabled={!unread || pending}
        >
          すべて既読にする
        </button>
      </div>
      <div className="notice-list">
        {notices.map((notice) => (
          <article
            className={`notice${notice.readAt ? "" : " notice-unread"}`}
            key={notice.id}
          >
            <span
              className="notice-dot"
              aria-label={notice.readAt ? "既読" : "未読"}
            />
            <div>
              <h3>{notice.title}</h3>
              <p>{notice.message}</p>
            </div>
            <div className="notice-meta">
              <time dateTime={notice.createdAt}>
                {formatDate(notice.createdAt)}
              </time>
              {!notice.readAt ? (
                <button
                  className="button-quiet"
                  type="button"
                  onClick={() => void markRead([notice.id])}
                  disabled={pending}
                >
                  既読にする
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return "今日";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "昨日";
  return date.toLocaleDateString("ja-JP", { month: "long", day: "numeric" });
}
