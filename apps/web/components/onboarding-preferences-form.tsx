"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Icon } from "@/components/icon";

const choices = [["photo_camera", "写真と動画"], ["menu_book", "ことば"], ["toys", "おもちゃ"], ["restaurant", "ご飯"]] as const;

export function OnboardingPreferencesForm({ initial = ["写真と動画", "ことば"] }: { initial?: string[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  function toggle(label: string) { setSelected((items) => items.includes(label) ? items.filter((item) => item !== label) : [...items, label]); }
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setPending(true); setError(""); const response = await fetch("/api/onboarding", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ step: "preferences", preferences: selected }) }); if (!response.ok) { setError("選択を保存できませんでした。もう一度お試しください。"); setPending(false); return; } router.push("/onboarding/complete"); }
  return <form className="onboarding-form" onSubmit={submit}><div className="memory-options">{choices.map(([icon, label]) => <button className="memory-option" data-selected={selected.includes(label)} aria-pressed={selected.includes(label)} type="button" onClick={() => toggle(label)} key={label}><Icon name={icon} /><span>{label}</span></button>)}</div><div className="form-card" style={{ padding: 18 }}><p className="eyebrow">あとから変更できます</p><h3>猫町は、見るだけから</h3><p className="small muted" style={{ margin: 0 }}>猫を連れ出す設定は、完了後にいつでも選べます。</p></div>{error && <p className="form-status error" role="alert">{error}</p>}<div className="onboarding-actions"><button className="button" type="submit" disabled={pending}>{pending ? "保存しています" : "居場所を完成させる"}<Icon name="auto_awesome" /></button></div></form>;
}
