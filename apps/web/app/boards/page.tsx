import Image from "next/image";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icon";
import { PageHeading } from "@cattower/ui";
import { boards } from "@/lib/demo-data";

export default function BoardsPage() {
  return <AppShell><PageHeading eyebrow="任意の整理" title="ボード" description="一緒に眺めたい記録だけを、好きなまとまりにできます。" actions={<button className="button button-secondary" type="button"><Icon name="add" />ボードを作る</button>} /><div className="board-grid">{boards.map(([title, count, image]) => <Link className="board-card" href="/entries/window-evening" key={title}><Image src={image} width={520} height={320} alt="" /><div><h2>{title}</h2><p>{count}</p></div></Link>)}</div><p className="small muted board-help">ボードを作らなくても、すべての記録は日付やタグから探せます。</p></AppShell>;
}
