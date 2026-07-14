import { AppShell } from "@/components/app-shell";
import { EntryForm } from "@/components/entry-form";
import { PageHeading } from "@cattower/ui";

export default function RecordPage() {
  return <AppShell narrow><PageHeading eyebrow="新しい記録" title="今日のことを記録する" description="文章か写真・動画を残して、必要ならタグを付けます。" /><EntryForm /></AppShell>;
}
