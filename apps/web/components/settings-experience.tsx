"use client";

import * as Switch from "@radix-ui/react-switch";
import * as Tabs from "@radix-ui/react-tabs";

import { SignOutButton } from "@/components/sign-out-button";
import { HouseholdSwitcher } from "@/components/household-switcher";
import { CatManager } from "@/components/cat-manager";
import { InvitationManager } from "@/components/invitation-manager";
import type { CatOverview } from "@/lib/cats";

function SettingSwitch({
  label,
  checked = false,
}: {
  label: string;
  checked?: boolean;
}) {
  return (
    <Switch.Root
      className="radix-switch"
      defaultChecked={checked}
      aria-label={label}
    >
      <Switch.Thumb className="radix-switch-thumb" />
    </Switch.Root>
  );
}

export function SettingsExperience({
  catOverview,
}: {
  catOverview: NonNullable<CatOverview> | null;
}) {
  return (
    <Tabs.Root className="settings-grid" defaultValue="cats">
      <Tabs.List className="settings-tabs" aria-label="設定の分類">
        <Tabs.Trigger className="settings-tab" value="cats">
          猫
        </Tabs.Trigger>
        <Tabs.Trigger className="settings-tab" value="walk">
          お散歩
        </Tabs.Trigger>
        <Tabs.Trigger className="settings-tab" value="family">
          家族
        </Tabs.Trigger>
        <Tabs.Trigger className="settings-tab" value="data">
          データ
        </Tabs.Trigger>
      </Tabs.List>
      <div>
        <Tabs.Content className="settings-panel" value="cats">
          <p className="eyebrow">猫のプロフィール</p>
          <h2>一緒に暮らす猫</h2>
          <p className="muted">プロフィールの編集と追加ができます。</p>
          <CatManager
            initialCats={catOverview?.cats ?? []}
            initialActiveCatId={catOverview?.activeCatId ?? null}
            initialCanManage={catOverview?.canManage ?? false}
          />
        </Tabs.Content>
        <Tabs.Content className="settings-panel" value="walk">
          <p className="eyebrow">お散歩への参加</p>
          <h2>あなたとこむぎの設定</h2>
          <div className="setting-row">
            <div>
              <h3>あなたがお散歩へ行く</h3>
              <p>オフにしても、おうちの記録はすべて使えます。</p>
            </div>
            <SettingSwitch label="あなたがお散歩へ行く" checked />
          </div>
          <div className="setting-row">
            <div>
              <h3>こむぎを家族が連れ出す</h3>
              <p>おうちの家族も、こむぎとお散歩できます。</p>
            </div>
            <select aria-label="こむぎのお散歩設定" defaultValue="家族も可">
              <option>家族も可</option>
              <option>所有者だけ</option>
              <option>参加しない</option>
            </select>
          </div>
          <div className="setting-row">
            <div>
              <h3>一日一回のまとめ</h3>
              <p>お散歩での気配を、Web内通知だけで受け取ります。</p>
            </div>
            <SettingSwitch label="一日一回のまとめ通知" />
          </div>
        </Tabs.Content>
        <Tabs.Content className="settings-panel" value="family">
          <p className="eyebrow">同居家族</p>
          <h2>利用するおうち</h2>
          <p className="muted">
            参加しているおうちが複数ある場合、記録を表示・保存する先を選べます。
          </p>
          <div className="setting-row">
            <div>
              <h3>現在のおうち</h3>
              <p>所有者または編集者として参加中のおうちだけ選べます。</p>
            </div>
            <HouseholdSwitcher />
          </div>
          <InvitationManager />
        </Tabs.Content>
        <Tabs.Content className="settings-panel" value="data">
          <p className="eyebrow">所有する記録</p>
          <h2>書き出しとアカウント</h2>
          <p className="muted">写真、動画、文章をまとめて書き出せます。</p>
          <div className="setting-row">
            <div>
              <h3>データを書き出す</h3>
              <p>準備ができたらWeb内でお知らせします。</p>
            </div>
            <button className="button button-secondary" type="button">
              書き出す
            </button>
          </div>
          <div className="setting-row">
            <div>
              <h3>この端末からログアウト</h3>
              <p>記録は削除されず、Googleで再度ログインできます。</p>
            </div>
            <SignOutButton />
          </div>
        </Tabs.Content>
      </div>
    </Tabs.Root>
  );
}
