import { AppShell } from "@/components/app-shell";
import { WalkScene } from "@/components/walk-scene";

export default function WalkPage() { return <AppShell wide><div className="walk-intro"><div><p className="eyebrow">お散歩</p><h1>中庭</h1><p className="lede">こむぎはいま、窓辺にいるみたいです。</p></div><button className="button button-secondary" type="button">持ってきた記録を見る</button></div><WalkScene /></AppShell>; }
