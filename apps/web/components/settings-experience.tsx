"use client";

import * as Switch from "@radix-ui/react-switch";
import * as Tabs from "@radix-ui/react-tabs";

function SettingSwitch({ label, checked = false }: { label: string; checked?: boolean }) {
  return <Switch.Root className="radix-switch" defaultChecked={checked} aria-label={label}><Switch.Thumb className="radix-switch-thumb" /></Switch.Root>;
}

export function SettingsExperience() {
  return <Tabs.Root className="settings-grid" defaultValue="town"><Tabs.List className="settings-tabs" aria-label="設定の分類"><Tabs.Trigger className="settings-tab" value="town">お散歩</Tabs.Trigger><Tabs.Trigger className="settings-tab" value="family">家族</Tabs.Trigger><Tabs.Trigger className="settings-tab" value="data">データ</Tabs.Trigger></Tabs.List><div>
    <Tabs.Content className="settings-panel" value="town"><p className="eyebrow">お散歩への参加</p><h2>あなたとこむぎの設定</h2><div className="setting-row"><div><h3>あなたがお散歩に出る</h3><p>オフにしても私室とあしあとはすべて使えます。</p></div><SettingSwitch label="あなたがお散歩に出る" checked /></div><div className="setting-row"><div><h3>こむぎを家族が連れ出す</h3><p>おうちの家族が、こむぎとお散歩に出られます。</p></div><select aria-label="こむぎのお散歩公開設定" defaultValue="家族も可"><option>家族も可</option><option>所有者だけ</option><option>参加しない</option></select></div><div className="setting-row"><div><h3>一日一回のまとめ</h3><p>お散歩での気配を、Web内通知だけで受け取ります。</p></div><SettingSwitch label="一日一回のまとめ通知" /></div></Tabs.Content>
    <Tabs.Content className="settings-panel" value="family"><p className="eyebrow">同居家族</p><h2>こむぎのおうち</h2><p className="muted">さくらさんが編集者として参加しています。</p><div className="setting-row"><div><h3>家族を招待</h3><p>招待リンクから、一緒に記録を残せます。</p></div><button className="button button-secondary" type="button">招待する</button></div></Tabs.Content>
    <Tabs.Content className="settings-panel" value="data"><p className="eyebrow">所有する記録</p><h2>書き出しと退会</h2><p className="muted">写真、動画、文章をまとめて書き出せます。</p><div className="setting-row"><div><h3>データを書き出す</h3><p>準備ができたらWeb内でお知らせします。</p></div><button className="button button-secondary" type="button">書き出す</button></div></Tabs.Content>
  </div></Tabs.Root>;
}
