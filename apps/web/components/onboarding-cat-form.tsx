"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { IMAGE_MIME_TYPES, MAX_IMAGE_BYTES } from "@cattower/domain";

import { Icon } from "@/components/icon";
const colors = [
  "var(--mint)",
  "var(--sky)",
  "var(--peach)",
  "var(--apricot)",
  "var(--mint-soft)",
];
const colorNames = ["mint", "sky", "peach", "apricot", "mint-soft"] as const;

const uploadErrorMessages = {
  invalid_file_name:
    "写真のファイル名が長すぎます。名前を短くして、もう一度お試しください。",
  unsupported_image_type: "JPEG、PNG、WebPの写真を選んでください。",
  invalid_image_size: "10MB未満の写真を選んでください。",
  upload_signing_not_configured:
    "写真のアップロード設定を確認しています。時間をおいて、もう一度お試しください。",
  cat_not_found:
    "猫の情報を確認できませんでした。画面を再読み込みして、もう一度お試しください。",
  forbidden: "この猫の写真を変更する権限を確認できませんでした。",
  uploaded_object_mismatch:
    "送信した写真を確認できませんでした。もう一度お試しください。",
  uploaded_object_missing:
    "送信した写真が見つかりませんでした。もう一度お試しください。",
  image_decode_failed:
    "写真を読み取れませんでした。別のJPEG、PNG、WebPをお試しください。",
  image_processing_failed:
    "表示用の写真を作れませんでした。別のJPEG、PNG、WebPをお試しください。",
  image_processing_not_configured:
    "表示用の写真を準備できませんでした。時間をおいて、もう一度お試しください。",
} as const;

function getUploadErrorMessage(code: string) {
  return Object.hasOwn(uploadErrorMessages, code)
    ? uploadErrorMessages[code as keyof typeof uploadErrorMessages]
    : undefined;
}

async function readErrorCode(response: Response) {
  const body = (await response.json().catch(() => null)) as {
    error?: unknown;
  } | null;
  return typeof body?.error === "string" ? body.error : "";
}

export function OnboardingCatForm({
  initialName = "",
  initialTheme = "mint",
}: {
  initialName?: string;
  initialTheme?: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState(
    Math.max(
      0,
      colorNames.indexOf(initialTheme as (typeof colorNames)[number]),
    ),
  );
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const file = fileRef.current?.files?.[0];
    if (
      file &&
      !IMAGE_MIME_TYPES.includes(file.type as (typeof IMAGE_MIME_TYPES)[number])
    ) {
      setError(uploadErrorMessages.unsupported_image_type);
      setPending(false);
      return;
    }
    if (file && (file.size < 1 || file.size > MAX_IMAGE_BYTES)) {
      setError(uploadErrorMessages.invalid_image_size);
      setPending(false);
      return;
    }
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/onboarding", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        step: "cat",
        name: form.get("name"),
        themeColor: colorNames[selected],
      }),
    });
    const saved = (await response.json().catch(() => null)) as {
      catId?: string;
    } | null;
    if (!response.ok || !saved?.catId) {
      setError("猫の情報を保存できませんでした。もう一度お試しください。");
      setPending(false);
      return;
    }

    if (file) {
      try {
        const presign = await fetch("/api/uploads/images/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            catId: saved.catId,
            fileName: file.name,
            contentType: file.type,
            byteSize: file.size,
          }),
        });
        const upload = (await presign.json()) as {
          assetId?: string;
          uploadUrl?: string;
          headers?: Record<string, string>;
        };
        if (
          !presign.ok ||
          !upload.assetId ||
          !upload.uploadUrl ||
          !upload.headers
        ) {
          const code =
            typeof (upload as { error?: unknown }).error === "string"
              ? (upload as { error: string }).error
              : "presign_failed";
          throw new Error(code);
        }
        const put = await fetch(upload.uploadUrl, {
          method: "PUT",
          headers: upload.headers,
          body: file,
        });
        if (!put.ok) throw new Error("upload_failed");
        const complete = await fetch(
          `/api/uploads/images/${upload.assetId}/complete`,
          { method: "POST" },
        );
        if (!complete.ok)
          throw new Error((await readErrorCode(complete)) || "complete_failed");
      } catch (cause) {
        const code = cause instanceof Error ? cause.message : "";
        const detail =
          getUploadErrorMessage(code) ??
          (code === "upload_failed"
            ? "写真を保存先へ送信できませんでした。通信を確認して、もう一度お試しください。"
            : "写真を保存できませんでした。もう一度お試しください。");
        setError(`猫の情報は保存しました。${detail}`);
        setPending(false);
        return;
      }
    }
    router.push("/onboarding/complete");
  }

  return (
    <form className="onboarding-form" onSubmit={submit}>
      <div className="cat-photo-picker cat-photo-empty">
        <Icon name="photo_camera" />
        <div>
          <strong>{fileName || "写真を選ぶ"}</strong>
          <p className="small muted">
            JPEG、PNG、WebP、10MBまで。写真は任意です。
          </p>
          <input
            ref={fileRef}
            className="visually-hidden"
            id="cat-photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) =>
              setFileName(event.target.files?.[0]?.name ?? "")
            }
          />
          <label className="button button-secondary" htmlFor="cat-photo">
            <Icon name="photo_library" />
            写真を選択
          </label>
        </div>
      </div>
      <div className="field">
        <label htmlFor="cat-name">猫の名前</label>
        <input
          id="cat-name"
          name="name"
          required
          maxLength={50}
          defaultValue={initialName}
        />
      </div>
      <fieldset style={{ border: 0, padding: 0 }}>
        <legend className="label" style={{ marginBottom: 8 }}>
          この子のテーマ色
        </legend>
        <div className="theme-options">
          {colors.map((color, index) => (
            <button
              type="button"
              className="theme-chip"
              data-selected={selected === index}
              aria-pressed={selected === index}
              onClick={() => setSelected(index)}
              aria-label={`テーマ色${index + 1}`}
              style={{ background: color }}
              key={color}
            />
          ))}
        </div>
      </fieldset>
      {error && (
        <p className="form-status" role="status">
          {error}
        </p>
      )}
      <div className="onboarding-actions">
        {error && (
          <button
            className="button button-secondary"
            type="button"
            onClick={() => router.push("/onboarding/complete")}
          >
            写真なしで完了へ
          </button>
        )}
        <button className="button" type="submit" disabled={pending}>
          {pending ? "保存しています" : "この子を登録する"}
          <Icon name="arrow_forward" />
        </button>
      </div>
    </form>
  );
}
