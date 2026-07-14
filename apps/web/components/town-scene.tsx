"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import { useState } from "react";

import { Icon } from "@/components/icon";
import { images } from "@/lib/demo-data";

const cats = [["こむぎ", "あなた", images.window, "cat-a you"], ["ミケ", "さっきいたようです", images.food, "cat-b"], ["ルナ", "休んでいるみたい", images.toy, "cat-c"], ["ソラ", "足あと", images.window, "cat-d"]] as const;
const reactions = ["そっと近づく", "となりに座る", "においを嗅ぐ", "おもちゃを見る", "またね"];

export function TownScene() {
  const [selected, setSelected] = useState<string | null>(null);
  return <Dialog.Root open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null); }}><section className="town-scene" aria-label="お散歩の中庭。こむぎと三匹の猫の気配があります"><span className="scene-label">夕方・気配はゆっくり更新</span><span className="town-sun" /><span className="town-wall" /><span className="town-bench" /><span className="town-tree" />{cats.map(([name, status, image, position], index) => <button className={`town-cat ${position}`} type="button" onClick={() => index > 0 && setSelected(name)} key={name}><Image src={image} width={148} height={148} alt={name} /><span>{name}・{status}</span></button>)}<div className="town-note"><p><strong>今日のすれ違い</strong><br /><span className="muted">こむぎとミケが中庭ですれ違いました。</span></p><button className="button button-quiet" type="button">そっとしまう</button></div></section><Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="dialog-content"><Dialog.Close className="icon-button dialog-close" aria-label="閉じる"><Icon name="close" /></Dialog.Close><p className="eyebrow">静かなあいさつ</p><Dialog.Title>{selected}へ</Dialog.Title><Dialog.Description className="small muted">自由文や回数は表示されません。</Dialog.Description><div className="reaction-list">{reactions.map((reaction) => <Dialog.Close type="button" key={reaction}>{reaction}</Dialog.Close>)}</div></Dialog.Content></Dialog.Portal></Dialog.Root>;
}
