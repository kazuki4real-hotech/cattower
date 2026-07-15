"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import {
  IMAGE_MIME_TYPES,
  MAX_ENTRY_BODY_LENGTH,
  MAX_ENTRY_TAGS,
  MAX_ENTRY_TITLE_LENGTH,
  MAX_IMAGE_BYTES,
} from "@cattower/domain";

import { Icon } from "@/components/icon";

type CatOption = { id: string; name: string };

export function EntryForm({
  cats,
  activeCatId,
}: {
  cats: CatOption[];
  activeCatId: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function selectFile(nextFile: File | null) {
    setFile(nextFile);
    setPreview(nextFile ? URL.createObjectURL(nextFile) : null);
    setError("");
  }

  async function uploadImage(catId: string) {
    if (!file) return null;
    if (
      !IMAGE_MIME_TYPES.includes(file.type as (typeof IMAGE_MIME_TYPES)[number])
    )
      throw new Error("JPEG、PNG、WebPの写真を選んでください。");
    if (file.size < 1 || file.size > MAX_IMAGE_BYTES)
      throw new Error("10MB未満の写真を選んでください。");

    setStatus("写真を送信しています");
    const presign = await fetch("/api/uploads/images/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        purpose: "entry",
        catId,
        fileName: file.name,
        contentType: file.type,
        byteSize: file.size,
      }),
    });
    const upload = (await presign.json().catch(() => null)) as {
      assetId?: string;
      uploadUrl?: string;
      headers?: Record<string, string>;
    } | null;
    if (!presign.ok || !upload?.assetId || !upload.uploadUrl || !upload.headers)
      throw new Error("写真の送信を準備できませんでした。");
    const put = await fetch(upload.uploadUrl, {
      method: "PUT",
      headers: upload.headers,
      body: file,
    });
    if (!put.ok) throw new Error("写真を送信できませんでした。");
    setStatus("写真を確認しています");
    const complete = await fetch(
      `/api/uploads/images/${upload.assetId}/complete`,
      { method: "POST" },
    );
    if (!complete.ok) throw new Error("写真を読み取れませんでした。");
    return upload.assetId;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const catIds = form.getAll("catIds").map(String);
    const body = String(form.get("body") ?? "").trim();
    if (!catIds.length) {
      setError("この記録に写っている猫を選んでください。");
      return;
    }
    if (!body && !file) {
      setError("文章または写真のどちらかを追加してください。");
      return;
    }

    setPending(true);
    setError("");
    try {
      const assetId = await uploadImage(catIds[0]!);
      setStatus("記録を保存しています");
      const response = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: String(form.get("title") ?? ""),
          body,
          occurredDate: String(form.get("occurredDate") ?? ""),
          catIds,
          assetIds: assetId ? [assetId] : [],
          tags: String(form.get("tags") ?? "")
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        }),
      });
      const result = (await response.json().catch(() => null)) as {
        entryId?: string;
      } | null;
      if (!response.ok || !result?.entryId)
        throw new Error("記録を保存できませんでした。");
      router.push(`/entries/${result.entryId}`);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "記録を保存できませんでした。",
      );
      setStatus("");
      setPending(false);
    }
  }

  if (!cats.length)
    return (
      <div className="record-empty">
        <Icon name="pets" />
        <h2>先に猫を登録してください</h2>
        <p>記録を残す猫を設定すると、ここから写真や文章を保存できます。</p>
        <button
          className="button"
          type="button"
          onClick={() => router.push("/settings")}
        >
          猫を登録する
        </button>
      </div>
    );

  return (
    <form onSubmit={submit}>
      <div className="form-card">
        <div className="field">
          <label htmlFor="entry-media">写真</label>
          <input
            ref={inputRef}
            id="entry-media"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
          />
          <button
            className="upload entry-upload"
            type="button"
            onClick={() => inputRef.current?.click()}
          >
            {preview ? (
              <Image
                src={preview}
                width={720}
                height={480}
                unoptimized
                alt="選択した写真のプレビュー"
              />
            ) : (
              <span>
                <Icon name="photo_library" />
                <strong>写真を選ぶ</strong>
                <small>JPEG、PNG、WebP、10MBまで</small>
              </span>
            )}
          </button>
          {file ? (
            <div className="entry-file-row">
              <small>{file.name}</small>
              <button
                className="button button-quiet"
                type="button"
                onClick={() => selectFile(null)}
              >
                写真を外す
              </button>
            </div>
          ) : null}
        </div>
        <div className="field">
          <label htmlFor="entry-title">タイトル（任意）</label>
          <input
            id="entry-title"
            name="title"
            maxLength={MAX_ENTRY_TITLE_LENGTH}
          />
        </div>
        <div className="field">
          <label htmlFor="entry-body">今日のこと</label>
          <textarea
            id="entry-body"
            name="body"
            maxLength={MAX_ENTRY_BODY_LENGTH}
          />
          <small>文章か写真のどちらかだけでも記録できます。</small>
        </div>
        <fieldset className="entry-cat-fieldset">
          <legend>写っている猫</legend>
          <div className="entry-cat-options">
            {cats.map((cat) => (
              <label key={cat.id}>
                <input
                  type="checkbox"
                  name="catIds"
                  value={cat.id}
                  defaultChecked={cat.id === activeCatId || cats.length === 1}
                />
                <Icon name="pets" />
                {cat.name}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="field">
          <label htmlFor="entry-date">記録した日</label>
          <input
            id="entry-date"
            name="occurredDate"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </div>
        <div className="field">
          <label htmlFor="entry-tags">タグ（任意）</label>
          <input id="entry-tags" name="tags" type="text" />
          <small>
            カンマで区切って最大{MAX_ENTRY_TAGS}件まで入力できます。
          </small>
        </div>
        {error ? (
          <p className="form-status error" role="alert">
            {error}
          </p>
        ) : null}
        {status ? (
          <p className="form-status" role="status">
            {status}
          </p>
        ) : null}
      </div>
      <div className="form-actions">
        <button
          className="button button-secondary"
          type="button"
          onClick={() => router.back()}
          disabled={pending}
        >
          <Icon name="arrow_back" />
          閉じる
        </button>
        <button className="button" type="submit" disabled={pending}>
          <Icon name="lock" />
          {pending ? "保存しています" : "記録する"}
        </button>
      </div>
    </form>
  );
}
