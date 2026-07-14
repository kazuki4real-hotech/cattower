# Cattower フロントエンド実装仕様

- Status: Implemented v0.3
- Updated: 2026-07-14
- Scope: Next.js 画面構成、共通 UI、オンボーディング、モーション、プロトタイプ移行

## 1. Purpose

HTML プロトタイプで確認した体験を、`apps/web` の Next.js App Router へ移すための実装仕様である。

- タイムラインではなく、タグ、任意のボード、再発見、検索から記録へ戻る
- すべての記録は非公開から始める
- お散歩は評価や会話ではなく、曖昧な気配と定型反応を扱う
- オンボーディングは利用者名と猫の登録だけに絞る
- UI の見た目は [デザインガイドライン](design-guidelines.md) を正本とする

## 2. Implementation boundary

主要画面は UI とサンプルデータ、オンボーディングは認証・D1・R2 を含む縦切りを対象とする。

- Next.js App Router、React、TypeScript strict
- Cloudflare Workers 向け OpenNext 設定
- Server Component を既定とし、通知、設定、お散歩の反応だけを Client Component に分離
- サンプルデータで主要画面を表示
- Better Auth、D1、R2 画像 upload/private delivery はオンボーディングに接続済み。通常画面のサンプルデータは後続フェーズで置換する
- 旧HTMLプロトタイプは意味モデルが異なるため削除し、Next.js実装だけを正本とする

## 3. Route map

| Route | Screen | Primary job |
| --- | --- | --- |
| `/` | entry route | 初期実装では `/onboarding/welcome` へ案内 |
| `/home` | おうち | 今日の一枚、再発見、任意のボード |
| `/boards` | ボード | 利用者が作成したボード。標準ボードは作らない |
| `/record` | 記録作成 | 共通フォームで本文・メディア・日付・タグを入力 |
| `/entries/window-evening` | 記録詳細 | 閲覧、編集、共有URL、お散歩への持ち出し |
| `/search` | 記録検索 | おうちの記録を日付・タグ等で検索 |
| `/walk` | お散歩 | 中庭の気配、すれ違い、定型反応 |
| `/notifications` | お知らせ | Web 内通知と既読状態 |
| `/settings` | 家族と設定 | お散歩同意、猫の参加範囲、家族、データ |
| `/onboarding/welcome` | はじめまして | Google login、表示名保存、checkpoint 再開 |
| `/onboarding/cat` | 猫を迎える | 写真、名前、テーマ色を設定 |
| `/onboarding/complete` | できあがり | 居場所の完成とホームへの接続 |

旧 `/collections`、`/add`、`/town`、`/onboarding/preferences` は新routeへ恒久redirectする。

## 4. Shared components

framework 非依存で画面間共有する React component は `packages/ui` に置く。route、認証、data fetch、`next/link`、`next/image` へ依存する component は `apps/web` に残し、巨大な共通 package にしない。

`PageHeading` は `packages/ui` の最初の component とし、eyebrow、`h1`、説明、任意 action の意味構造を提供する。色、余白、responsive layout は `apps/web/app/globals.css` の design token と class で管理し、package 内へ生の色や route 固有 styling を持ち込まない。

### App shell

- デスクトップは左ナビゲーション
- 900px 未満は上部ブランドバーと下部 4 ナビゲーション
- 主要ナビゲーションは、おうち、ボード、記録する、お散歩
- 検索、お知らせ、家族と設定は補助導線
- 選択中の項目は背景、Material Symbols の fill、`aria-current` で示す

### Typography and icons

- UI フォントは `M PLUS Rounded 1c`
- Next.js 実装では `next/font/google` で配信する
- 本文を含むUIの既定ウェイトは `700`、ブランドやオンボーディングの要所は `800` とする
- アイコンは `Material Symbols Rounded` の一系統だけを使う
- アイコンだけの操作には `aria-label` を付ける
- アイコンとラベルの併記ではアイコンを読み上げ対象から外す

### Cards and surfaces

- カード radius は 18px、操作要素は 12px、入力は 8px を基準にする
- 影は一段だけを使い、情報階層が必要な面に限定する
- 写真カード、ボード、入力面の用途を混同しない

## 5. Motion model

モーションは hierarchy、feedback、state transition、onboarding story のいずれかを説明できる場合だけ使う。

- 通常画面: 見出しと主コンテンツの入場、hover、press、選択状態
- お散歩: 猫の低頻度な呼吸と太陽の緩い移動
- オンボーディング: おうちが順に組み上がり、完了時に全体が整う
- 使用する CSS property は原則 `transform` と `opacity`
- `prefers-reduced-motion: reduce` では自動アニメーションを停止する
- 紙吹雪、streak、スコア、ランキング、連続利用報酬は使用しない

## 6. Onboarding state

現在の実装は次の順で D1 に永続化する。

1. Google 登録完了時に owner household を作成
2. 表示名を Better Auth の `user` に保存
3. 猫の基本情報を `cats` に保存
4. 各画面の入力後に onboarding checkpoint を保存
5. 中断時は最後の checkpoint から再開
6. 完了時に `onboarding_completed_at` を保存して `/home` へ移動

skip は画面ごとに意味を分ける。必須の猫名を未入力のまま完了扱いにしない。

## 7. Accessibility acceptance

- すべての操作をキーボードで実行できる
- visible focus ring を保つ
- 色だけで選択・未読・完了を示さない
- 写真に代替テキストを付ける
- 主要ボタンの本文を一行に保つ
- mobile で横スクロールを発生させない
- reduced motion で自動アニメーションが停止する

## 8. Cloudflare implementation

- Next.js は Node.js runtime を使用し、Edge runtime 宣言を追加しない
- `@opennextjs/cloudflare` で Workers 形式へ変換する
- `wrangler.jsonc` は source of truth とし、`compatibility_date` は初期実装日を使用する
- `nodejs_compat` を有効にする
- OpenNext の生成物 `.open-next/` は commit しない
- D1、R2、Images binding は `wrangler.jsonc` で定義し、`cloudflare-env.d.ts` は `wrangler types` で生成する
- secret は設定ファイルとリポジトリへ保存しない

## 9. Initial implementation acceptance

- `pnpm --filter @cattower/web dev` で起動できる
- `pnpm --filter @cattower/web build` が成功する
- `pnpm --filter @cattower/web cf:build` が成功する
- 上記routeが404にならず、旧routeが新routeへredirectする
- PC と mobile で主要ナビゲーションを使用できる
- オンボーディング3画面を順番に進める
- お散歩の猫を選び、定型反応を選択して閉じられる
- 通知の既読化、検索 filter、設定 toggle がクライアント上で反応する
