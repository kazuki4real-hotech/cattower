import Image from "next/image";

import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icon";
import { PageHeading } from "@cattower/ui";
import { images } from "@/lib/demo-data";

export default function EntryPage() { return <AppShell><PageHeading eyebrow="記録" title="夕方の窓辺" description="2026年7月14日" actions={<><button className="button button-secondary" type="button"><Icon name="edit" />編集</button><button className="button" type="button"><Icon name="explore" />お散歩に持っていく</button></>} /><div className="entry-layout"><figure style={{ margin: 0 }}><Image className="entry-photo" src={images.window} width={1000} height={1100} priority alt="窓辺から外を眺めるこむぎ" /><figcaption className="small muted" style={{ marginTop: 10 }}>風が入るたび、カーテンの影を目で追っていた。</figcaption></figure><aside className="entry-aside"><span className="pill">おうちだけ</span><h2 style={{ marginTop: 18 }}>この記録について</h2><dl className="entry-meta"><div><dt>猫</dt><dd>こむぎ</dd></div><div><dt>記録した日</dt><dd>2026年7月14日</dd></div><div><dt>作成者</dt><dd>あなた</dd></div><div><dt>ボード</dt><dd>窓辺の時間</dd></div></dl><p className="label">タグ</p><div className="button-row"><span className="pill">窓辺</span><span className="pill">夕方</span></div><div className="button-row" style={{ marginTop: 24 }}><button className="button button-secondary" type="button">共有URLを作る</button></div></aside></div></AppShell>; }
