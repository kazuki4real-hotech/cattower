"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Icon } from "@/components/icon";
const colors = ["var(--mint)", "var(--sky)", "var(--peach)", "var(--apricot)", "var(--mint-soft)"];
const colorNames = ["mint", "sky", "peach", "apricot", "mint-soft"] as const;

export function OnboardingCatForm({ initialName = "", initialTheme = "mint" }: { initialName?: string; initialTheme?: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState(Math.max(0, colorNames.indexOf(initialTheme as (typeof colorNames)[number])));
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/onboarding", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: "cat", name: form.get("name"), themeColor: colorNames[selected] }),
    });
    const saved = (await response.json().catch(() => null)) as { catId?: string } | null;
    if (!response.ok || !saved?.catId) {
      setError("猫の情報を保存できませんでした。もう一度お試しください。");
      setPending(false);
      return;
    }

    const file = fileRef.current?.files?.[0];
    if (file) {
      try {
        const presign = await fetch("/api/uploads/images/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ catId: saved.catId, fileName: file.name, contentType: file.type, byteSize: file.size }),
        });
        const upload = (await presign.json()) as { assetId?: string; uploadUrl?: string; headers?: Record<string, string> };
        if (!presign.ok || !upload.assetId || !upload.uploadUrl || !upload.headers) throw new Error("presign_failed");
        const put = await fetch(upload.uploadUrl, { method: "PUT", headers: upload.headers, body: file });
        if (!put.ok) throw new Error("upload_failed");
        const complete = await fetch(`/api/uploads/images/${upload.assetId}/complete`, { method: "POST" });
        if (!complete.ok) throw new Error("complete_failed");
      } catch {
        setError("猫の情報は保存しました。写真はあとで設定できます。");
        setPending(false);
        return;
      }
    }
    router.push("/onboarding/preferences");
  }

  return <form className="onboarding-form" onSubmit={submit}><div className="cat-photo-picker cat-photo-empty"><Icon name="photo_camera" /><div><strong>{fileName || "写真を選ぶ"}</strong><p className="small muted">JPEG、PNG、WebP、10MBまで。写真は任意です。</p><input ref={fileRef} className="visually-hidden" id="cat-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")} /><label className="button button-secondary" htmlFor="cat-photo"><Icon name="photo_library" />写真を選択</label></div></div><div className="field"><label htmlFor="cat-name">猫の名前</label><input id="cat-name" name="name" required maxLength={50} defaultValue={initialName} /></div><fieldset style={{ border: 0, padding: 0 }}><legend className="label" style={{ marginBottom: 8 }}>この子のテーマ色</legend><div className="theme-options">{colors.map((color, index) => <button type="button" className="theme-chip" data-selected={selected === index} aria-pressed={selected === index} onClick={() => setSelected(index)} aria-label={`テーマ色${index + 1}`} style={{ background: color }} key={color} />)}</div></fieldset>{error && <p className="form-status" role="status">{error}</p>}<div className="onboarding-actions">{error && <button className="button button-secondary" type="button" onClick={() => router.push("/onboarding/preferences")}>写真なしで次へ</button>}<button className="button" type="submit" disabled={pending}>{pending ? "保存しています" : "この子の部屋を作る"}<Icon name="arrow_forward" /></button></div></form>;
}
