import Image from "next/image";

import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icon";
import { PageHeading } from "@/components/page-heading";
import { images } from "@/lib/demo-data";

export default function EntryPage() { return <AppShell><PageHeading eyebrow="何気ない瞬間" title="夕方の窓辺" description="2026年7月14日" actions={<><button className="button button-secondary" type="button"><Icon name="edit" />編集</button><button className="button" type="button"><Icon name="visibility" />展示する</button></>} /><div className="entry-layout"><figure style={{ margin: 0 }}><Image className="entry-photo" src={images.window} width={1000} height={1100} priority alt="窓辺から外を眺めるこむぎ" /><figcaption className="small muted" style={{ marginTop: 10 }}>風が入るたび、カーテンの影を目で追っていた。</figcaption></figure><aside className="entry-aside"><span className="pill">非公開</span><h2 style={{ marginTop: 18 }}>この記録について</h2><dl className="entry-meta"><div><dt>猫</dt><dd>こむぎ</dd></div><div><dt>記録した日</dt><dd>2026年7月14日</dd></div><div><dt>作成者</dt><dd>あなた</dd></div><div><dt>棚</dt><dd>写真と動画<br />窓辺の時間</dd></div></dl><p className="label">タグ</p><div className="button-row"><span className="pill">窓辺</span><span className="pill">夕方</span></div></aside></div></AppShell>; }
