import Image from "next/image";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icon";
import { PageHeading } from "@cattower/ui";
import { images, shelves } from "@/lib/demo-data";

export default function HomePage() {
  return (
    <AppShell>
      <PageHeading eyebrow="こむぎの私室" title="おかえりなさい" description="今日も、いつもの場所から。" actions={<><Link className="button button-secondary" href="/search"><Icon name="search" />記録を探す</Link><Link className="button" href="/add"><Icon name="add" />記録する</Link></>} />
      <article className="today-card">
        <Image src={images.window} width={920} height={760} priority alt="窓辺から外を眺めるこむぎ" />
        <div className="today-copy"><p className="date">7月14日・今日の一枚</p><span className="pill">何気ない瞬間</span><h2>夕方の窓辺</h2><p>風が入るたび、カーテンの影を目で追っていた。</p><Link className="text-link" href="/entries/window-evening">この記録をひらく</Link></div>
      </article>
      <section className="section" aria-labelledby="rediscover"><div className="section-head"><h2 id="rediscover">ふと、思い出す</h2><Link className="text-link" href="/search">ほかの記録も探す</Link></div><div className="rediscover"><Link className="memory-card" href="/entries/window-evening"><span className="pill">去年の今ごろ</span><p className="year">2025</p><h3>はじめて網戸にした日</h3><p className="small muted">同じ窓辺で、耳だけが忙しく動いていた。</p></Link><Link className="memory-card" href="/entries/window-evening"><span className="pill">ランダムな一枚</span><h3>毛糸玉を隠した場所</h3><p className="small muted">探していたら、本棚の一番下から出てきた。</p></Link></div></section>
      <section className="section" aria-labelledby="shelves"><div className="section-head"><h2 id="shelves">こむぎの収蔵棚</h2><Link className="text-link" href="/collections">すべての棚</Link></div><div className="shelf-grid">{shelves.map(([name, count]) => <Link className="shelf" href="/collections" key={name}><span className="shelf-swatch" /><h3>{name}</h3><span className="shelf-count">{count}</span></Link>)}</div></section>
    </AppShell>
  );
}
