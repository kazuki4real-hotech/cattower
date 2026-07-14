import { AppShell } from "@/components/app-shell";
import { TownScene } from "@/components/town-scene";

export default function TownPage() { return <AppShell wide><div className="town-intro"><div><p className="eyebrow">疑似お散歩</p><h1>中庭</h1><p className="lede">こむぎはいま、窓辺にいるみたいです。</p></div><button className="button button-secondary" type="button">持ってきた一枚を見る</button></div><TownScene /></AppShell>; }
