import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { BoardDetailManager } from "@/components/board-detail-manager";
import { Icon } from "@/components/icon";
import { ShareManager } from "@/components/share-manager";
import { getBoardDetail } from "@/lib/boards";
import { getViewer } from "@/lib/viewer";
import { PageHeading } from "@cattower/ui";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function BoardDetailPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const viewer = await getViewer();
  if (!viewer) redirect("/");
  const { boardId } = await params;
  const detail = await getBoardDetail(viewer, boardId);
  if (!detail) notFound();

  return (
    <AppShell>
      <PageHeading
        eyebrow="ボード"
        title={detail.board.name}
        description={`${detail.items.length}件の記録・${sortLabel(detail.board.sortMode)}`}
        actions={
          <Link className="button button-secondary" href="/boards">
            <Icon name="arrow_back" />
            ボード一覧
          </Link>
        }
      />
      <BoardDetailManager initialDetail={detail} />
      {detail.board.canManage ? (
        <ShareManager resourceType="board" resourceId={detail.board.id} />
      ) : null}
    </AppShell>
  );
}

function sortLabel(sortMode: "manual" | "newest" | "oldest") {
  if (sortMode === "manual") return "自分で並べる";
  return sortMode === "newest" ? "新しい記録から" : "古い記録から";
}
