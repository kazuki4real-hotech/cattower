"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

import {
  IMAGE_MIME_TYPES,
  MAX_ENTRY_BODY_LENGTH,
  MAX_ENTRY_TAGS,
  MAX_ENTRY_TITLE_LENGTH,
  MAX_IMAGE_BYTES,
} from "@cattower/domain";

import { Icon } from "@/components/icon";

type CatOption = { id: string; name: string };
type EditableEntry = {
  id: string;
  title: string | null;
  body: string | null;
  occurredDate: string;
  cats: CatOption[];
  tags: string[];
  media: { assetId: string } | null;
  version: number;
  status: "draft" | "ready" | "processing" | "failed";
};
type EditorValues = {
  title: string;
  body: string;
  occurredDate: string;
  catIds: string[];
  assetIds: string[];
  tags: string[];
};

export function EntryEditor({
  cats,
  activeCatId,
  initialEntry = null,
  mode = "create",
}: {
  cats: CatOption[];
  activeCatId: string | null;
  initialEntry?: EditableEntry | null;
  mode?: "create" | "edit";
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const entryIdRef = useRef(initialEntry?.id ?? null);
  const versionRef = useRef(initialEntry?.version ?? null);
  const revisionRef = useRef(0);
  const saveQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const [title, setTitle] = useState(initialEntry?.title ?? "");
  const [body, setBody] = useState(initialEntry?.body ?? "");
  const [occurredDate, setOccurredDate] = useState(
    initialEntry?.occurredDate ?? today(),
  );
  const [selectedCatIds, setSelectedCatIds] = useState<string[]>(
    initialEntry?.cats.map((cat) => cat.id) ??
      (activeCatId ? [activeCatId] : cats[0] ? [cats[0].id] : []),
  );
  const [tags, setTags] = useState(initialEntry?.tags.join(", ") ?? "");
  const [assetId, setAssetId] = useState(initialEntry?.media?.assetId ?? null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<
    "idle" | "uploading" | "error"
  >("idle");
  const [pending, setPending] = useState(false);
  const [draftState, setDraftState] = useState<
    "idle" | "saving" | "saved" | "error"
  >(initialEntry?.status === "draft" ? "saved" : "idle");
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const persist = useCallback(
    async (targetMode: "draft" | "ready", values: EditorValues) => {
      const entryId = entryIdRef.current;
      const response = await fetch(
        entryId ? `/api/entries/${entryId}` : "/api/entries",
        {
          method: entryId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...values,
            mode: targetMode,
            version: versionRef.current,
          }),
        },
      );
      const result = (await response.json().catch(() => null)) as {
        entryId?: string;
        version?: number;
        error?: string;
      } | null;
      if (!response.ok || !result?.entryId || !result.version) {
        if (response.status === 409)
          throw new Error(
            "別の画面で更新されています。再読み込みして確認してください。",
          );
        throw new Error(
          targetMode === "draft"
            ? "下書きを保存できませんでした。"
            : "記録を保存できませんでした。",
        );
      }
      entryIdRef.current = result.entryId;
      versionRef.current = result.version;
      return result.entryId;
    },
    [],
  );

  useEffect(() => {
    if (mode !== "create" || revision === 0 || uploadState === "uploading")
      return;
    const savedRevision = revisionRef.current;
    const timer = window.setTimeout(() => {
      setDraftState("saving");
      const values = currentValues();
      saveQueueRef.current = saveQueueRef.current
        .then(() => persist("draft", values))
        .then(() => {
          if (revisionRef.current === savedRevision) setDraftState("saved");
        })
        .catch((cause) => {
          setDraftState("error");
          setError(
            cause instanceof Error
              ? cause.message
              : "下書きを保存できませんでした。",
          );
        });
    }, 900);
    return () => window.clearTimeout(timer);
    // The primitive form values intentionally reschedule this debounce.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    assetId,
    body,
    mode,
    occurredDate,
    persist,
    revision,
    selectedCatIds,
    tags,
    title,
    uploadState,
  ]);

  function markChanged() {
    revisionRef.current += 1;
    setRevision(revisionRef.current);
    setDraftState("idle");
    setError("");
  }

  function currentValues(): EditorValues {
    return {
      title,
      body: body.trim(),
      occurredDate,
      catIds: selectedCatIds,
      assetIds: assetId ? [assetId] : [],
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    };
  }

  function toggleCat(catId: string, checked: boolean) {
    setSelectedCatIds((current) =>
      checked
        ? [...new Set([...current, catId])]
        : current.filter((id) => id !== catId),
    );
    markChanged();
  }

  async function selectFile(nextFile: File | null) {
    if (preview) URL.revokeObjectURL(preview);
    setFile(nextFile);
    setPreview(nextFile ? URL.createObjectURL(nextFile) : null);
    setError("");
    if (!nextFile) return;
    await uploadImage(nextFile);
  }

  async function uploadImage(nextFile: File) {
    if (!selectedCatIds[0]) {
      setUploadState("error");
      setError("写真を送る前に猫を選んでください。");
      return;
    }
    if (
      !IMAGE_MIME_TYPES.includes(
        nextFile.type as (typeof IMAGE_MIME_TYPES)[number],
      )
    ) {
      setUploadState("error");
      setError("JPEG、PNG、WebPの写真を選んでください。");
      return;
    }
    if (nextFile.size < 1 || nextFile.size > MAX_IMAGE_BYTES) {
      setUploadState("error");
      setError("10MB未満の写真を選んでください。");
      return;
    }

    setUploadState("uploading");
    try {
      const presign = await fetch("/api/uploads/images/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purpose: "entry",
          catId: selectedCatIds[0],
          fileName: nextFile.name,
          contentType: nextFile.type,
          byteSize: nextFile.size,
        }),
      });
      const upload = (await presign.json().catch(() => null)) as {
        assetId?: string;
        uploadUrl?: string;
        headers?: Record<string, string>;
      } | null;
      if (
        !presign.ok ||
        !upload?.assetId ||
        !upload.uploadUrl ||
        !upload.headers
      )
        throw new Error("写真の送信を準備できませんでした。");
      const put = await fetch(upload.uploadUrl, {
        method: "PUT",
        headers: upload.headers,
        body: nextFile,
      });
      if (!put.ok) throw new Error("写真を送信できませんでした。");
      const complete = await fetch(
        `/api/uploads/images/${upload.assetId}/complete`,
        { method: "POST" },
      );
      if (!complete.ok) throw new Error("写真を読み取れませんでした。");
      setAssetId(upload.assetId);
      setUploadState("idle");
      markChanged();
    } catch (cause) {
      setUploadState("error");
      setError(
        cause instanceof Error ? cause.message : "写真を送信できませんでした。",
      );
    }
  }

  function removePhoto() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setAssetId(null);
    setUploadState("idle");
    markChanged();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCatIds.length) {
      setError("この記録に写っている猫を選んでください。");
      return;
    }
    if (!body.trim() && !assetId) {
      setError("文章または写真のどちらかを追加してください。");
      return;
    }
    if (uploadState === "uploading") {
      setError("写真の送信が終わるまでお待ちください。");
      return;
    }
    if (uploadState === "error") {
      setError("写真を再送するか、写真を外してから保存してください。");
      return;
    }

    setPending(true);
    setError("");
    try {
      await saveQueueRef.current;
      const entryId = await persist("ready", currentValues());
      router.push(`/entries/${entryId}`);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "記録を保存できませんでした。",
      );
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

  const photoSource =
    preview ?? (assetId ? `/api/media/${assetId}?variant=entry` : null);

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
            onChange={(event) =>
              void selectFile(event.target.files?.[0] ?? null)
            }
          />
          <button
            className="upload entry-upload"
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploadState === "uploading"}
          >
            {photoSource ? (
              <Image
                src={photoSource}
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
          {photoSource ? (
            <div className="entry-file-row">
              <small>
                {uploadState === "uploading"
                  ? "写真を送信しています"
                  : uploadState === "error"
                    ? "写真の送信に失敗しました"
                    : file?.name || "保存済みの写真"}
              </small>
              <div className="button-row">
                {uploadState === "error" && file ? (
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={() => void uploadImage(file)}
                  >
                    再送する
                  </button>
                ) : null}
                <button
                  className="button button-quiet"
                  type="button"
                  onClick={removePhoto}
                >
                  写真を外す
                </button>
              </div>
            </div>
          ) : null}
        </div>
        <div className="video-plan-preview" aria-label="動画機能の提供予定">
          <Icon name="lock" className="video-plan-icon" />
          <span>
            <strong>動画</strong>
            <small>有料プランで提供予定です。現在は準備中です。</small>
          </span>
        </div>
        <div className="field">
          <label htmlFor="entry-title">タイトル（任意）</label>
          <input
            id="entry-title"
            maxLength={MAX_ENTRY_TITLE_LENGTH}
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              markChanged();
            }}
          />
        </div>
        <div className="field">
          <label htmlFor="entry-body">今日のこと</label>
          <textarea
            id="entry-body"
            maxLength={MAX_ENTRY_BODY_LENGTH}
            value={body}
            onChange={(event) => {
              setBody(event.target.value);
              markChanged();
            }}
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
                  value={cat.id}
                  checked={selectedCatIds.includes(cat.id)}
                  onChange={(event) => toggleCat(cat.id, event.target.checked)}
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
            type="date"
            required
            value={occurredDate}
            onChange={(event) => {
              setOccurredDate(event.target.value);
              markChanged();
            }}
          />
        </div>
        <div className="field">
          <label htmlFor="entry-tags">タグ（任意）</label>
          <input
            id="entry-tags"
            type="text"
            value={tags}
            onChange={(event) => {
              setTags(event.target.value);
              markChanged();
            }}
          />
          <small>
            カンマで区切って最大{MAX_ENTRY_TAGS}件まで入力できます。
          </small>
        </div>
        {mode === "create" && draftState !== "idle" ? (
          <div
            className={`form-status${draftState === "error" ? " error" : ""}`}
            role={draftState === "error" ? "alert" : "status"}
          >
            <span>
              {draftState === "saving"
                ? "下書きを保存しています"
                : draftState === "saved"
                  ? "下書きを保存しました"
                  : "下書きを保存できませんでした"}
            </span>
            {draftState === "error" ? (
              <button
                className="button button-secondary"
                type="button"
                onClick={markChanged}
              >
                下書きを再保存
              </button>
            ) : null}
          </div>
        ) : null}
        {error ? (
          <p className="form-status error" role="alert">
            {error}
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
        <button
          className="button"
          type="submit"
          disabled={pending || uploadState === "uploading"}
        >
          <Icon name="lock" />
          {pending
            ? "保存しています"
            : mode === "edit"
              ? "変更を保存"
              : "記録する"}
        </button>
      </div>
    </form>
  );
}

function today() {
  const date = new Date();
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(date);
}
