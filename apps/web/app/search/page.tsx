import { redirect } from "next/navigation";
import { boardItems } from "@cattower/db";
import { parseEntrySearchInput } from "@cattower/domain";
import { PageHeading } from "@cattower/ui";
import { eq } from "drizzle-orm";

import { AppShell } from "@/components/app-shell";
import { SearchExperience } from "@/components/search-experience";
import { getBoardAccess } from "@/lib/boards";
import { getSearchFacets, searchEntries } from "@/lib/search";
import { searchUrl } from "@/lib/search-url";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await getViewer();
  if (!viewer) redirect("/");
  const params = await searchParams;
  const { filters, errors } = parseEntrySearchInput(params);
  const [facets, results, boardContext] = await Promise.all([
    getSearchFacets(viewer),
    errors.length
      ? Promise.resolve({
          items: [],
          total: 0,
          page: 1,
          pageCount: 1,
          hasPrevious: false,
          hasNext: false,
        })
      : searchEntries(viewer, filters),
    getSearchBoardContext(viewer, first(params.boardId)),
  ]);

  if (!errors.length && filters.page > results.pageCount)
    redirect(
      searchUrl(filters, {
        page: results.pageCount,
        boardId: boardContext?.id,
      }),
    );

  return (
    <AppShell narrow>
      <PageHeading
        eyebrow="おうちの記録"
        title="記録を探す"
        description="文章、日付、タグ、猫から見つけられます。"
      />
      <SearchExperience
        filters={filters}
        errors={errors}
        facets={facets}
        results={results}
        boardContext={boardContext}
      />
    </AppShell>
  );
}

async function getSearchBoardContext(
  viewer: NonNullable<Awaited<ReturnType<typeof getViewer>>>,
  boardId: string,
) {
  if (!boardId || boardId.length > 128) return undefined;
  const access = await getBoardAccess(viewer, boardId);
  if (!access?.canManage) return undefined;
  const rows = await viewer.db
    .select({ entryId: boardItems.entryId })
    .from(boardItems)
    .where(eq(boardItems.boardId, boardId));
  return {
    id: access.board.id,
    name: access.board.name,
    version: access.board.version,
    addedEntryIds: rows.map(({ entryId }) => entryId),
  };
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}
