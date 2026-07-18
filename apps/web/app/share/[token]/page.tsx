import { createDatabase } from "@cattower/db";
import type { Metadata } from "next";
import Image from "next/image";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { BrandWordmark } from "@/components/brand-wordmark";
import { Icon } from "@/components/icon";
import { getRuntimeEnv } from "@/lib/cloudflare";
import {
  checkShareAccessRateLimit,
  getSharedResource,
  shareRequestAddress,
} from "@/lib/shares";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "共有された記録",
  robots: { index: false, follow: false, noarchive: true },
};

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const requestHeaders = await headers();
  const db = createDatabase(getRuntimeEnv().DB);
  const rate = await checkShareAccessRateLimit(
    db,
    token,
    shareRequestAddress(requestHeaders),
  );
  if (rate.invalid) notFound();
  if (!rate.allowed)
    return (
      <ShareUnavailable
        title="しばらく待ってから開いてください"
        message="短時間のアクセスが多かったため、このリンクを一時的に保護しています。"
      />
    );
  const found = await getSharedResource(db, token);
  if (!found) notFound();
  const expiresAt = found.share.expiresAt.toISOString();

  return (
    <main className="shared-page" id="main-content">
      <header className="shared-header">
        <BrandWordmark priority />
        <span>期限付き共有</span>
      </header>
      {found.resource.type === "entry" ? (
        <SharedEntry entry={found.resource.entry} token={token} />
      ) : (
        <section className="shared-board" aria-labelledby="shared-board-title">
          <div className="shared-title">
            <p>共有されたボード</p>
            <h1 id="shared-board-title">{found.resource.board.name}</h1>
            <span>{found.resource.entries.length}件の記録</span>
          </div>
          {found.resource.entries.length ? (
            <div className="shared-board-list">
              {found.resource.entries.map((entry) => (
                <article className="shared-board-entry" key={entry.id}>
                  <SharedEntryMedia entry={entry} token={token} />
                  <div>
                    <time dateTime={entry.occurredDate}>
                      {formatDate(entry.occurredDate)}
                    </time>
                    <h2>{entry.title || "猫との記録"}</h2>
                    {entry.body ? <p>{entry.body}</p> : null}
                    {entry.cats.length ? (
                      <small>{entry.cats.join("、")}</small>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="shared-empty">
              <Icon name="menu_book" />
              <h2>共有できる記録はありません</h2>
              <p>削除または整理された記録は、このページに表示されません。</p>
            </div>
          )}
        </section>
      )}
      <footer className="shared-footer">
        <p>このページから、ほかの記録やおうちへ移動することはできません。</p>
        <time dateTime={expiresAt}>有効期限 {formatDateTime(expiresAt)}</time>
      </footer>
    </main>
  );
}

function SharedEntry({
  entry,
  token,
}: {
  entry: SharedEntryView;
  token: string;
}) {
  return (
    <article className="shared-entry">
      <div className="shared-title">
        <time dateTime={entry.occurredDate}>
          {formatDate(entry.occurredDate)}
        </time>
        <h1>{entry.title || "猫との記録"}</h1>
        {entry.cats.length ? <span>{entry.cats.join("、")}</span> : null}
      </div>
      <SharedEntryMedia entry={entry} token={token} priority />
      {entry.body ? <p className="shared-entry-body">{entry.body}</p> : null}
      {entry.tags.length ? (
        <div className="shared-tags" aria-label="タグ">
          {entry.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function SharedEntryMedia({
  entry,
  token,
  priority = false,
}: {
  entry: SharedEntryView;
  token: string;
  priority?: boolean;
}) {
  return entry.media ? (
    <Image
      className="shared-photo"
      src={`/api/share/${token}/media/${entry.media.assetId}`}
      width={entry.media.width ?? 1200}
      height={entry.media.height ?? 900}
      priority={priority}
      unoptimized
      alt={entry.title || `${entry.cats.join("、")}の記録`}
    />
  ) : (
    <div className="shared-photo-placeholder" aria-hidden="true">
      <Icon name="menu_book" />
    </div>
  );
}

function ShareUnavailable({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <main className="shared-page shared-unavailable">
      <BrandWordmark priority />
      <Icon name="lock" />
      <h1>{title}</h1>
      <p>{message}</p>
    </main>
  );
}

type FoundShare = NonNullable<Awaited<ReturnType<typeof getSharedResource>>>;
type SharedEntryView =
  | Extract<FoundShare["resource"], { type: "entry" }>["entry"]
  | Extract<FoundShare["resource"], { type: "board" }>["entries"][number];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
