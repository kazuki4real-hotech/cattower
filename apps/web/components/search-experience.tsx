import Image from "next/image";
import Link from "next/link";

import { Icon } from "@/components/icon";
import { SearchBoardAddButton } from "@/components/search-board-add-button";
import {
  SEARCH_RESULT_LIMIT,
  type EntrySearchError,
  type EntrySearchInput,
} from "@cattower/domain";
import type { SearchFacets, SearchResults } from "@/lib/search";
import { searchUrl } from "@/lib/search-url";

export function SearchExperience({
  filters,
  errors,
  facets,
  results,
  boardContext,
}: {
  filters: EntrySearchInput;
  errors: EntrySearchError[];
  facets: SearchFacets;
  results: SearchResults;
  boardContext?: SearchBoardContext;
}) {
  const hasFilters = Boolean(
    filters.q ||
    filters.from ||
    filters.to ||
    filters.tagId ||
    filters.catId ||
    filters.media !== "all",
  );

  return (
    <>
      {boardContext ? (
        <div className="search-board-context">
          <Icon name="bookmarks" />
          <div>
            <strong>「{boardContext.name}」へ追加</strong>
            <p>条件で記録を探し、結果からボードへ追加できます。</p>
          </div>
          <Link href={`/boards/${boardContext.id}`}>ボードへ戻る</Link>
        </div>
      ) : null}
      <form className="search-panel" method="get" action="/search">
        {boardContext ? (
          <input type="hidden" name="boardId" value={boardContext.id} />
        ) : null}
        <label className="field search-keyword" htmlFor="search-query">
          <span className="label">キーワード</span>
          <input
            className="search-box"
            id="search-query"
            name="q"
            type="search"
            defaultValue={filters.q}
            maxLength={100}
            placeholder="タイトル、文章、タグ"
          />
        </label>
        <div className="search-filter-grid">
          <label className="field" htmlFor="search-from">
            <span className="label">この日から</span>
            <input
              id="search-from"
              name="from"
              type="date"
              defaultValue={filters.from}
            />
          </label>
          <label className="field" htmlFor="search-to">
            <span className="label">この日まで</span>
            <input
              id="search-to"
              name="to"
              type="date"
              defaultValue={filters.to}
            />
          </label>
          <label className="field" htmlFor="search-tag">
            <span className="label">タグ</span>
            <select id="search-tag" name="tagId" defaultValue={filters.tagId}>
              <option value="">すべて</option>
              {facets.tags.map((tag) => (
                <option value={tag.id} key={tag.id}>
                  #{tag.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field" htmlFor="search-cat">
            <span className="label">猫</span>
            <select id="search-cat" name="catId" defaultValue={filters.catId}>
              <option value="">すべて</option>
              {facets.cats.map((cat) => (
                <option value={cat.id} key={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field" htmlFor="search-media">
            <span className="label">メディア</span>
            <select id="search-media" name="media" defaultValue={filters.media}>
              <option value="all">すべて</option>
              <option value="image">写真あり</option>
              <option value="video">動画あり（提供予定）</option>
              <option value="none">写真・動画なし</option>
            </select>
          </label>
        </div>
        <div className="search-actions">
          {hasFilters ? (
            <Link
              className="button button-quiet"
              href={
                boardContext ? `/search?boardId=${boardContext.id}` : "/search"
              }
            >
              条件をクリア
            </Link>
          ) : null}
          <button className="button" type="submit">
            <Icon name="search" />
            探す
          </button>
        </div>
      </form>

      {errors.length ? (
        <p className="form-status error search-status" role="alert">
          {searchError(errors[0])}
        </p>
      ) : (
        <SearchResultList
          results={results}
          hasFilters={hasFilters}
          boardContext={boardContext}
          filters={filters}
        />
      )}
    </>
  );
}

function SearchResultList({
  results,
  hasFilters,
  boardContext,
  filters,
}: {
  results: SearchResults;
  hasFilters: boolean;
  boardContext?: SearchBoardContext;
  filters: EntrySearchInput;
}) {
  if (!results.items.length)
    return (
      <section className="search-empty" aria-labelledby="search-empty-title">
        <Icon name={hasFilters ? "search_off" : "menu_book"} />
        <div>
          <h2 id="search-empty-title">
            {hasFilters ? "条件に合う記録はありません" : "記録はまだありません"}
          </h2>
          <p>
            {hasFilters
              ? "条件を少し減らすか、日付の範囲を広げてみてください。"
              : "記録を残すと、文章や日付からここで探せます。"}
          </p>
        </div>
        <Link
          className="button button-secondary"
          href={
            hasFilters
              ? boardContext
                ? `/search?boardId=${boardContext.id}`
                : "/search"
              : "/record"
          }
        >
          {hasFilters ? "条件をクリア" : "最初の記録を残す"}
        </Link>
      </section>
    );

  return (
    <>
      <div className="section-head search-result-head">
        <h2>{resultCountLabel(results)}</h2>
        <span className="small muted">
          {results.pageCount > 1
            ? `${results.page} / ${results.pageCount}ページ`
            : "新しい順"}
        </span>
      </div>
      <div className="result-list">
        {results.items.map((entry) => (
          <article className="result" key={entry.id}>
            <Link className="result-main" href={`/entries/${entry.id}`}>
              {entry.media?.kind === "image" ? (
                <Image
                  src={`/api/media/${entry.media.assetId}?variant=entry`}
                  width={entry.media.width ?? 256}
                  height={entry.media.height ?? 180}
                  unoptimized
                  alt=""
                />
              ) : (
                <span className="result-placeholder">
                  <Icon name={entry.media ? "videocam" : "menu_book"} />
                </span>
              )}
              <span className="result-copy">
                <strong>{entryLabel(entry)}</strong>
                {entry.body && entry.body !== entry.title ? (
                  <span>{entry.body}</span>
                ) : null}
                <small>
                  {entry.cats.map((cat) => cat.name).join("、")}
                  {entry.tags.length
                    ? `${entry.cats.length ? "・" : ""}${entry.tags.map((tag) => `#${tag}`).join(" ")}`
                    : ""}
                </small>
              </span>
              <time dateTime={entry.occurredDate}>
                {formatDate(entry.occurredDate)}
              </time>
            </Link>
            {boardContext ? (
              <SearchBoardAddButton
                boardId={boardContext.id}
                entryId={entry.id}
                version={boardContext.version}
                initiallyAdded={boardContext.addedEntryIds.includes(entry.id)}
              />
            ) : null}
          </article>
        ))}
      </div>
      {results.pageCount > 1 ? (
        <nav className="search-pagination" aria-label="検索結果のページ送り">
          <span className="small muted">新しい順</span>
          <span className="search-pagination-actions">
            {results.hasPrevious ? (
              <Link
                className="button button-quiet"
                rel="prev"
                href={searchUrl(filters, {
                  page: results.page - 1,
                  boardId: boardContext?.id,
                })}
              >
                <Icon name="chevron_left" />
                前の50件
              </Link>
            ) : null}
            {results.hasNext ? (
              <Link
                className="button button-secondary"
                rel="next"
                href={searchUrl(filters, {
                  page: results.page + 1,
                  boardId: boardContext?.id,
                })}
              >
                次の50件
                <Icon name="chevron_right" />
              </Link>
            ) : null}
          </span>
        </nav>
      ) : null}
      {!results.hasNext ? (
        <p className="small muted search-limit-note">
          検索結果はここまでです。
        </p>
      ) : null}
    </>
  );
}

export type SearchBoardContext = {
  id: string;
  name: string;
  version: number;
  addedEntryIds: string[];
};

function entryLabel(entry: SearchResults["items"][number]) {
  const label = entry.title || entry.body || "写真の記録";
  return label.length > 100 ? `${label.slice(0, 100)}…` : label;
}

function resultCountLabel(results: SearchResults) {
  const first = (results.page - 1) * SEARCH_RESULT_LIMIT + 1;
  const last = first + results.items.length - 1;
  return results.total > SEARCH_RESULT_LIMIT
    ? `${first}〜${last}件目 / 全${results.total}件`
    : `${results.total}件の記録`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function searchError(error?: EntrySearchError) {
  if (error === "query_too_long")
    return "キーワードは100文字以内で入力してください。";
  if (error === "invalid_date_range")
    return "開始日は終了日より前の日付にしてください。";
  return "日付を正しく入力してください。";
}
