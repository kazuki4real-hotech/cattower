import Image from "next/image";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { getEntry } from "@/lib/entries";
import { getViewer } from "@/lib/viewer";
import { PageHeading } from "@cattower/ui";

export const dynamic = "force-dynamic";

export default async function EntryPage({
  params,
}: {
  params: Promise<{ entryId: string }>;
}) {
  const viewer = await getViewer();
  if (!viewer) redirect("/");
  const { entryId } = await params;
  const entry = await getEntry(viewer, entryId);
  if (!entry) notFound();

  return (
    <AppShell>
      <PageHeading
        eyebrow="記録"
        title={entry.title || "今日の記録"}
        description={formatDate(entry.occurredDate)}
      />
      <div className="entry-layout">
        <div className="entry-main">
          {entry.media ? (
            <Image
              className="entry-photo"
              src={`/api/media/${entry.media.assetId}?variant=entry`}
              width={entry.media.width ?? 1200}
              height={entry.media.height ?? 900}
              priority
              unoptimized
              alt={
                entry.title ||
                `${entry.cats.map((cat) => cat.name).join("、")}の記録`
              }
            />
          ) : null}
          {entry.body ? <p className="entry-body">{entry.body}</p> : null}
        </div>
        <aside className="entry-aside">
          <span className="pill">おうちだけ</span>
          <h2>この記録について</h2>
          <dl className="entry-meta">
            <div>
              <dt>猫</dt>
              <dd>{entry.cats.map((cat) => cat.name).join("、")}</dd>
            </div>
            <div>
              <dt>記録した日</dt>
              <dd>{formatDate(entry.occurredDate)}</dd>
            </div>
            <div>
              <dt>作成者</dt>
              <dd>{entry.authorName}</dd>
            </div>
          </dl>
          {entry.tags.length ? (
            <>
              <p className="label">タグ</p>
              <div className="button-row">
                {entry.tags.map((tag) => (
                  <span className="pill" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </>
          ) : null}
        </aside>
      </div>
    </AppShell>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}
