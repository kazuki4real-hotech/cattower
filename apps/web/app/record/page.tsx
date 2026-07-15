import { AppShell } from "@/components/app-shell";
import { EntryEditor } from "@/components/entry-editor";
import { getCatOverview } from "@/lib/cats";
import { getCurrentDraft } from "@/lib/entries";
import { getViewer } from "@/lib/viewer";
import { PageHeading } from "@cattower/ui";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function RecordPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/");
  const [overview, draft] = await Promise.all([
    getCatOverview(viewer),
    getCurrentDraft(viewer),
  ]);
  return (
    <AppShell narrow>
      <PageHeading
        eyebrow="新しい記録"
        title="今日のことを記録する"
        description="文章か写真を残して、必要ならタグを付けます。"
      />
      <EntryEditor
        cats={overview?.cats ?? []}
        activeCatId={overview?.activeCatId ?? null}
        initialEntry={draft}
      />
    </AppShell>
  );
}
