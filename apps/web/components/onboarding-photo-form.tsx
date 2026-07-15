"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { IMAGE_MIME_TYPES, MAX_IMAGE_BYTES } from "@cattower/domain";

import { Icon } from "@/components/icon";

const uploadErrors: Record<string, string> = {
  invalid_file_name: "写真のファイル名を短くして、もう一度お試しください。",
  unsupported_image_type: "JPEG、PNG、WebPの写真を選んでください。",
  invalid_image_size: "10MB未満の写真を選んでください。",
  upload_signing_not_configured:
    "写真のアップロードを準備できませんでした。時間をおいてお試しください。",
  uploaded_object_mismatch:
    "送信した写真を確認できませんでした。もう一度お試しください。",
  uploaded_object_missing:
    "送信した写真が見つかりませんでした。もう一度お試しください。",
  image_decode_failed: "写真を読み取れませんでした。別の写真をお試しください。",
  image_processing_failed:
    "表示用の写真を作れませんでした。別の写真をお試しください。",
  image_processing_not_configured:
    "表示用の写真を準備できませんでした。時間をおいてお試しください。",
};

async function readError(response: Response) {
  const body = (await response.json().catch(() => null)) as {
    error?: unknown;
  } | null;
  return typeof body?.error === "string" ? body.error : "";
}

export function OnboardingPhotoForm({
  catId,
  catName,
  initialAssetId,
}: {
  catId: string;
  catName: string;
  initialAssetId?: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function selectFile(nextFile: File | null) {
    setFile(nextFile);
    setPreview(nextFile ? URL.createObjectURL(nextFile) : null);
  }

  async function advance() {
    const response = await fetch("/api/onboarding", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: "photo" }),
    });
    if (!response.ok) throw new Error("photo_checkpoint_failed");
    router.push("/onboarding/complete");
  }

  async function skip() {
    setPending(true);
    setError("");
    try {
      await advance();
    } catch {
      setError("進行状況を保存できませんでした。もう一度お試しください。");
      setPending(false);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      await skip();
      return;
    }
    setPending(true);
    setError("");
    if (
      !IMAGE_MIME_TYPES.includes(file.type as (typeof IMAGE_MIME_TYPES)[number])
    ) {
      setError(
        uploadErrors.unsupported_image_type ??
          "対応している写真を選んでください。",
      );
      setPending(false);
      return;
    }
    if (file.size < 1 || file.size > MAX_IMAGE_BYTES) {
      setError(
        uploadErrors.invalid_image_size ?? "10MB未満の写真を選んでください。",
      );
      setPending(false);
      return;
    }

    try {
      const presign = await fetch("/api/uploads/images/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        error?: string;
      } | null;
      if (
        !presign.ok ||
        !upload?.assetId ||
        !upload.uploadUrl ||
        !upload.headers
      )
        throw new Error(upload?.error || "presign_failed");
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
        throw new Error((await readError(complete)) || "complete_failed");
      await advance();
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : "";
      setError(
        uploadErrors[code] ??
          (code === "upload_failed"
            ? "写真を送信できませんでした。通信を確認して、もう一度お試しください。"
            : "写真を保存できませんでした。もう一度お試しください。"),
      );
      setPending(false);
    }
  }

  const imageSource =
    preview ??
    (initialAssetId ? `/api/media/${initialAssetId}?variant=profile` : null);

  return (
    <form className="onboarding-form" onSubmit={submit}>
      <div className="onboarding-photo-preview">
        {imageSource ? (
          <Image
            src={imageSource}
            width={160}
            height={160}
            unoptimized
            alt={`${catName}のプロフィール写真`}
          />
        ) : (
          <Icon name="pets" />
        )}
      </div>
      <input
        ref={inputRef}
        className="visually-hidden"
        id="cat-photo"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
      />
      <label
        className="button button-secondary onboarding-photo-button"
        htmlFor="cat-photo"
      >
        <Icon name="photo_library" />
        {file ? "写真を選び直す" : "写真を選ぶ"}
      </label>
      <p className="small muted onboarding-file-note">
        {file?.name ?? "JPEG、PNG、WebP、10MBまで"}
      </p>
      {error && (
        <p className="form-status error" role="alert">
          {error}
        </p>
      )}
      <div className="onboarding-actions">
        <Link className="button button-quiet" href="/onboarding/cat">
          <Icon name="arrow_back" />
          戻る
        </Link>
        <div className="onboarding-actions-primary">
          <button
            className="button button-secondary"
            type="button"
            onClick={skip}
            disabled={pending}
          >
            写真はあとで
          </button>
          {file && (
            <button className="button" type="submit" disabled={pending}>
              {pending ? "保存しています" : "この写真で進む"}
              <Icon name="arrow_forward" />
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
