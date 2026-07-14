import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@cattower/ui";
import { SearchExperience } from "@/components/search-experience";

export default function SearchPage() { return <AppShell narrow><PageHeading eyebrow="おうちの記録" title="記録を探す" description="文章、日付、タグから見つけられます。" /><SearchExperience /></AppShell>; }
