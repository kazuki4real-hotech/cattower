import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icon";
import { PageHeading } from "@/components/page-heading";
import { templates } from "@/lib/demo-data";

export default function AddPage() {
  return <AppShell narrow><PageHeading eyebrow="新しい記録" title="今日は、何を残しますか" description="テンプレートを選んでから、必要なところだけ書けます。" /><div className="template-grid">{templates.map(([icon, title, copy, meta]) => <Link className="template-card" href="/add/moment" key={title}><Icon name={icon} /><h2>{title}</h2><p>{copy}</p><span className="meta">{meta}</span></Link>)}</div></AppShell>;
}
