"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";

import { Icon } from "@/components/icon";

export function EntryForm() {
  const router = useRouter();
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); router.push("/entries/window-evening"); }
  return <form onSubmit={submit}><div className="form-card"><div className="field"><label htmlFor="media">写真または動画</label><label className="upload" htmlFor="media"><span><Icon name="upload" /><strong>ここに写真や動画を追加</strong><small>JPG、PNG、MOV、MP4</small></span></label><input id="media" type="file" accept="image/*,video/*" hidden /></div><div className="field"><label htmlFor="note">今日のこと</label><textarea id="note" defaultValue="風が入るたび、カーテンの影を目で追っていた。" /><small>文章か写真・動画のどちらかだけでも記録できます</small></div><div className="field"><label htmlFor="date">記録した日</label><input id="date" type="date" defaultValue="2026-07-14" /></div><div className="field"><label htmlFor="tags">タグ</label><input id="tags" type="text" defaultValue="窓辺, 夕方" /><small>カンマで区切って入力。あとから変更できます</small></div></div><div className="form-actions"><button className="button button-secondary" type="button" onClick={() => router.back()}><Icon name="arrow_back" />閉じる</button><button className="button" type="submit"><Icon name="lock" />記録する</button></div></form>;
}
