"use client";

import { useState } from "react";

const notices = [["家族への招待が承認されました", "さくらさんが、こむぎのおうちに参加しました。", "今日"], ["データの書き出しが完了しました", "設定から7日間ダウンロードできます。", "昨日"], ["共有URLの期限が近づいています", "「夕方の窓辺」の共有は、あと2日で終了します。", "7月10日"], ["昨日のお散歩まとめ", "こむぎは中庭で、見かけた猫と静かに過ごしました。", "7月9日"]] as const;

export function NotificationsList() {
  const [read, setRead] = useState(false);
  return <><div className="button-row" style={{ justifyContent: "flex-end", marginBottom: 20 }}><button className="button button-secondary" type="button" onClick={() => setRead(true)} disabled={read}>すべて既読にする</button></div><div className="notice-list">{notices.map(([title, copy, date], index) => { const unread = index < 2 && !read; return <article className={`notice${unread ? " notice-unread" : ""}`} key={title}><span className="notice-dot" aria-label={unread ? "未読" : "既読"} /><div><h3>{title}</h3><p>{copy}</p></div><time>{date}</time></article>; })}</div></>;
}
