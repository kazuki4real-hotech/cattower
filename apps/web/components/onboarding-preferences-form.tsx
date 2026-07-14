"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Icon } from "@/components/icon";

const choices = [["photo_camera", "写真と動画"], ["menu_book", "ことば"], ["toys", "おもちゃ"], ["restaurant", "ご飯"]] as const;

export function OnboardingPreferencesForm() {
  const router = useRouter();
  const [selected, setSelected] = useState(["写真と動画", "ことば"]);
  function toggle(label: string) { setSelected((items) => items.includes(label) ? items.filter((item) => item !== label) : [...items, label]); }
  return <form className="onboarding-form" onSubmit={(event) => { event.preventDefault(); router.push("/onboarding/complete"); }}><div className="memory-options">{choices.map(([icon, label]) => <button className="memory-option" data-selected={selected.includes(label)} aria-pressed={selected.includes(label)} type="button" onClick={() => toggle(label)} key={label}><Icon name={icon} /><span>{label}</span></button>)}</div><div className="form-card" style={{ padding: 18 }}><p className="eyebrow">あとから変更できます</p><h3>猫町は、見るだけから</h3><p className="small muted" style={{ margin: 0 }}>こむぎを連れ出す設定は、完了後にいつでも選べます。</p></div><div className="onboarding-actions"><button className="button" type="submit">居場所を完成させる<Icon name="auto_awesome" /></button></div></form>;
}
