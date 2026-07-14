import { AppShell } from "@/components/app-shell";
import { EntryForm } from "@/components/entry-form";
import { PageHeading } from "@/components/page-heading";

export default function MomentPage() { return <AppShell narrow><PageHeading eyebrow="何気ない瞬間" title="新しい記録" description="文章と写真は、どちらか一つでも保存できます。" /><EntryForm /></AppShell>; }
