"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Icon } from "@/components/icon";
import { images } from "@/lib/demo-data";

const colors = ["var(--mint)", "var(--sky)", "var(--peach)", "var(--apricot)", "var(--mint-soft)"];

export function OnboardingCatForm() {
  const router = useRouter();
  const [selected, setSelected] = useState(0);
  return <form className="onboarding-form" onSubmit={(event) => { event.preventDefault(); router.push("/onboarding/preferences"); }}><div className="cat-photo-picker"><Image src={images.window} width={224} height={224} alt="こむぎの写真" /><div><strong>写真を選ぶ</strong><p className="small muted">顔が見える一枚がおすすめです。</p><button className="button button-secondary" type="button"><Icon name="photo_library" />写真を変更</button></div></div><div className="field"><label htmlFor="cat-name">猫の名前</label><input id="cat-name" required defaultValue="こむぎ" /></div><fieldset style={{ border: 0, padding: 0 }}><legend className="label" style={{ marginBottom: 8 }}>この子のテーマ色</legend><div className="theme-options">{colors.map((color, index) => <button type="button" className="theme-chip" data-selected={selected === index} onClick={() => setSelected(index)} aria-label={`テーマ色${index + 1}`} style={{ background: color }} key={color} />)}</div></fieldset><div className="onboarding-actions"><button className="button" type="submit">この子の部屋を作る<Icon name="arrow_forward" /></button></div></form>;
}
