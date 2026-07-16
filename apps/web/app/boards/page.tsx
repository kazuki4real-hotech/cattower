import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { BoardManager } from "@/components/board-manager";
import { getBoards } from "@/lib/boards";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function BoardsPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/");

  return (
    <AppShell>
      <BoardManager initialBoards={await getBoards(viewer)} />
    </AppShell>
  );
}
