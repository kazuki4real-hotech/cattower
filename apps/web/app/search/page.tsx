import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { SearchExperience } from "@/components/search-experience";

export default function SearchPage() { return <AppShell narrow><PageHeading eyebrow="私室の中だけ" title="記録を探す" description="文章、商品名、タグから見つけられます。" /><SearchExperience /></AppShell>; }
