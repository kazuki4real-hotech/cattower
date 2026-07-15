import { AppShell } from "@/components/app-shell";
import { EntryForm } from "@/components/entry-form";
import { getCurrentCatOverview } from "@/lib/cats";
import { PageHeading } from "@cattower/ui";

export default async function RecordPage() {
  const overview = await getCurrentCatOverview();
  return (
    <AppShell narrow>
      <PageHeading
        eyebrow="新しい記録"
        title="今日のことを記録する"
        description="文章か写真を残して、必要ならタグを付けます。"
      />
      <EntryForm
        cats={overview?.cats ?? []}
        activeCatId={overview?.activeCatId ?? null}
      />
    </AppShell>
  );
}
