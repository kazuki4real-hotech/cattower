import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icon";
import { getCatOverview } from "@/lib/cats";
import { getRecentEntries } from "@/lib/entries";
import { getLastYearMemory } from "@/lib/rediscovery";
import { getViewer } from "@/lib/viewer";
import { PageHeading } from "@cattower/ui";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/");
  const overview = await getCatOverview(viewer);
  const activeCat = overview?.cats.find(
    (cat) => cat.id === overview.activeCatId,
  );
  const [records, lastYearMemory] = await Promise.all([
    getRecentEntries(viewer, 12, overview?.activeCatId),
    getLastYearMemory(viewer, overview?.activeCatId),
  ]);
  const latest = records[0];

  return (
    <AppShell>
      <PageHeading
        eyebrow={activeCat ? `${activeCat.name}のおうち` : "あなたのおうち"}
        title="おかえりなさい"
        description="今日も、いつもの場所から。"
        actions={
          <>
            <Link className="button button-secondary" href="/search">
              <Icon name="search" />
              記録を探す
            </Link>
            <Link className="button" href="/record">
              <Icon name="add" />
              記録する
            </Link>
          </>
        }
      />
      {latest ? (
        <>
          <article className="today-card">
            {latest.media ? (
              <Image
                src={`/api/media/${latest.media.assetId}?variant=entry`}
                width={latest.media.width ?? 1200}
                height={latest.media.height ?? 900}
                priority
                unoptimized
                alt={
                  latest.title ||
                  `${latest.cats.map((cat) => cat.name).join("、")}の記録`
                }
              />
            ) : (
              <div className="today-card-placeholder">
                <Icon name="menu_book" />
                <span>ことばの記録</span>
              </div>
            )}
            <div className="today-copy">
              <p className="date">
                {formatDate(latest.occurredDate)}・最近の記録
              </p>
              {latest.tags[0] ? (
                <span className="pill">{latest.tags[0]}</span>
              ) : null}
              <h2>{latest.title || "今日の記録"}</h2>
              {latest.body ? <p>{latest.body}</p> : null}
              <Link className="text-link" href={`/entries/${latest.id}`}>
                この記録をひらく
              </Link>
            </div>
          </article>
          {records.length > 1 ? (
            <section className="section" aria-labelledby="recent-records">
              <div className="section-head">
                <h2 id="recent-records">最近の記録</h2>
              </div>
              <div className="recent-entry-list">
                {records.slice(1).map((entry) => (
                  <Link href={`/entries/${entry.id}`} key={entry.id}>
                    <span>
                      <strong>
                        {entry.title || entry.body || "写真の記録"}
                      </strong>
                      <small>
                        {entry.cats.map((cat) => cat.name).join("、")}
                      </small>
                    </span>
                    <time dateTime={entry.occurredDate}>
                      {formatDate(entry.occurredDate)}
                    </time>
                    <Icon name="chevron_right" />
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
          <section className="section" aria-labelledby="last-year-memory">
            <div className="section-head rediscovery-heading">
              <div>
                <p className="eyebrow">思い出をひらく</p>
                <h2 id="last-year-memory">去年の今ごろ</h2>
              </div>
              <span>前後3日から</span>
            </div>
            {lastYearMemory ? (
              <Link
                className="last-year-memory"
                href={`/entries/${lastYearMemory.id}`}
              >
                {lastYearMemory.media?.kind === "image" ? (
                  <Image
                    src={`/api/media/${lastYearMemory.media.assetId}?variant=entry`}
                    width={lastYearMemory.media.width ?? 480}
                    height={lastYearMemory.media.height ?? 360}
                    unoptimized
                    alt={
                      lastYearMemory.title ||
                      `${lastYearMemory.cats.map((cat) => cat.name).join("、")}の記録`
                    }
                  />
                ) : (
                  <span className="last-year-placeholder">
                    <Icon
                      name={
                        lastYearMemory.media?.kind === "video"
                          ? "movie"
                          : "menu_book"
                      }
                    />
                  </span>
                )}
                <span className="last-year-copy">
                  <time dateTime={lastYearMemory.occurredDate}>
                    {formatDate(lastYearMemory.occurredDate)}
                  </time>
                  <strong>
                    {lastYearMemory.title ||
                      lastYearMemory.body ||
                      "写真の記録"}
                  </strong>
                  <small>
                    {lastYearMemory.cats.map((cat) => cat.name).join("、")}
                  </small>
                </span>
                <Icon name="chevron_right" />
              </Link>
            ) : (
              <div className="last-year-empty">
                <Icon name="calendar_today" />
                <p>去年のこの時期の記録はありません</p>
              </div>
            )}
          </section>
        </>
      ) : (
        <section className="home-empty" aria-labelledby="home-empty-title">
          <Icon name="menu_book" />
          <div>
            <p className="eyebrow">最初の一ページ</p>
            <h2 id="home-empty-title">まだ記録はありません</h2>
            <p>写真一枚でも、ひとことだけでも。残したいときに始められます。</p>
          </div>
          <Link className="button" href="/record">
            <Icon name="add" />
            最初の記録を残す
          </Link>
        </section>
      )}
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
