"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { Icon } from "@/components/icon";
import { images } from "@/lib/demo-data";

const filters = ["すべて", "#窓辺", "#夕方", "写真あり", "2026年"];
const results = [["夕方の窓辺", "カーテンの影を目で追っていた。", "7月14日", images.window], ["網戸にした日", "外の音に耳だけが忙しい。", "2025年7月", images.window], ["窓辺に運んだ毛糸玉", "お気に入りを日向へ持ってきた。", "2024年4月", images.toy]] as const;

export function SearchExperience() {
  const [active, setActive] = useState("すべて");
  return <><form className="search-panel" onSubmit={(event) => event.preventDefault()}><label className="field" style={{ margin: 0 }}><span className="label">キーワード</span><input className="search-box" type="search" defaultValue="窓辺" /></label><button className="button" type="submit" style={{ alignSelf: "end" }}><Icon name="search" />探す</button></form><div className="filters" aria-label="絞り込み">{filters.map((filter) => <button className="filter" data-active={active === filter} aria-pressed={active === filter} onClick={() => setActive(filter)} type="button" key={filter}>{filter}</button>)}</div><div className="section-head"><h2>3件の記録</h2><span className="small muted">新しい順</span></div><div className="result-list">{results.map(([title, copy, date, image]) => <Link className="result" href="/entries/window-evening" key={title}><Image src={image} width={256} height={180} alt={`${title}の記録写真`} /><div><h3>{title}</h3><p>{copy}</p></div><time>{date}</time></Link>)}</div></>;
}
