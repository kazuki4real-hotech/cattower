import { canPerformEntryAction } from "@cattower/domain";
import { PageHeading } from "@cattower/ui";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { EntryEditor } from "@/components/entry-editor";
import { getCatOverview } from "@/lib/cats";
import { getEditableEntry } from "@/lib/entries";
import { requireActiveMembership } from "@/lib/foundation";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function EditEntryPage({
  params,
}: {
  params: Promise<{ entryId: string }>;
}) {
  const viewer = await getViewer();
  if (!viewer) redirect("/");
  const { entryId } = await params;
  const [entry, overview, membership] = await Promise.all([
    getEditableEntry(viewer, entryId),
    getCatOverview(viewer),
    requireActiveMembership(
      viewer.db,
      viewer.session.user.id,
      viewer.household.id,
    ),
  ]);
  if (
    !entry ||
    !membership ||
    !canPerformEntryAction({
      action: "edit",
      membership,
      actorUserId: viewer.session.user.id,
      authorUserId: entry.authorUserId,
    })
  )
    notFound();

  return (
    <AppShell narrow>
      <PageHeading
        eyebrow="記録の編集"
        title="残した内容を整える"
        description="文章、写真、猫、日付、タグを変更できます。"
      />
      <EntryEditor
        cats={overview?.cats ?? []}
        activeCatId={overview?.activeCatId ?? null}
        initialEntry={entry}
        mode="edit"
      />
    </AppShell>
  );
}
