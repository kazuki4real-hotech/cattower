import Image from "next/image";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icon";
import { PageHeading } from "@/components/page-heading";
import { images } from "@/lib/demo-data";

const collections = [["写真と動画", "48の記録・7月14日更新", images.window], ["おもちゃ", "8の記録・7月9日更新", images.toy], ["ご飯", "12の記録・7月10日更新", images.food]] as const;

export default function CollectionsPage() {
  return <AppShell>
    <PageHeading eyebrow="収蔵棚" title="コレクション" description="時間順ではなく、意味ごとにしまう場所。" actions={<button className="button button-secondary" type="button"><Icon name="add" />新しい棚</button>} />
    <section className="collection-feature"><div className="copy"><p className="eyebrow">今月の棚</p><h2>窓辺の時間</h2><p className="muted">季節が変わっても、いつも同じ場所から外を見ている。</p><Link className="text-link" href="/entries/window-evening">12の記録を見る</Link></div><div className="photo-stack"><Image src={images.window} width={480} height={420} alt="窓辺にいるこむぎ" /><Image src={images.toy} width={320} height={210} alt="家で遊ぶ猫" /><Image src={images.food} width={320} height={210} alt="器から食べる猫" /></div></section>
    <section className="section"><div className="section-head"><h2>標準の棚</h2><button className="button button-quiet small" type="button">並べ替え: 手動</button></div><div className="collection-list">{collections.map(([title, meta, image]) => <Link className="collection-row" href="/entries/window-evening" key={title}><Image src={image} width={192} height={160} alt={`${title}の表紙`} /><div><h3>{title}</h3><p>{meta}</p></div></Link>)}<Link className="collection-row" href="/search"><div className="collection-placeholder">ことば</div><div><h3>ことば</h3><p>21の記録・7月12日更新</p></div></Link></div></section>
  </AppShell>;
}
