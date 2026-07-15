# Cattower フロントエンド実装仕様

- Status: Implemented v0.4
- Updated: 2026-07-15
- Scope: Next.js 画面構成、共通 UI、オンボーディング、モーション、Web 流入設計

## 1. Purpose

HTML プロトタイプで確認した体験を、`apps/web` の Next.js App Router へ移すための実装仕様である。

- タイムラインではなく、タグ、任意のボード、再発見、検索から記録へ戻る
- すべての記録は非公開から始める
- お散歩は評価や会話ではなく、曖昧な気配と定型反応を扱う
- オンボーディングは利用者名と最初の猫の登録だけに絞る
- Web アプリとして、検索結果、共有 URL、ブックマークなど任意の URL からの流入を妨げない
- UI の見た目は [デザインガイドライン](design-guidelines.md) を正本とする

## 2. Implementation boundary

主要画面は UI とサンプルデータ、オンボーディングは認証・D1・R2 を含む縦切りを対象とする。

- Next.js App Router、React、TypeScript strict
- Cloudflare Workers 向け OpenNext 設定
- Server Component を既定とし、フォームや画面遷移など利用者操作が必要な箇所だけを Client Component に分離する
- Better Auth、D1、R2 画像 upload/private delivery をオンボーディングへ接続する
- 旧 HTML プロトタイプは意味モデルが異なるため削除し、Next.js 実装だけを正本とする

## 3. Entry and route map

### 3.1 Entry policy

`/` はオンボーディング専用入口にしない。

| Viewer       | `/` の遷移先     |
| ------------ | ---------------- |
| 未ログイン   | 公開ランディング |
| ログイン済み | `/home`          |

検索結果、共有 URL、ブックマークから開いた URL は、認証や登録の前後で保持する。未ログインで認証が必要になった場合は、元の path、query、hash を same-origin の `returnTo` としてサーバー側に保存する。外部 URL、`//` から始まる URL、認証・オンボーディング URL 自体は `returnTo` に採用しない。

### 3.2 Route map

| Route                  | Screen         | Primary job                                          |
| ---------------------- | -------------- | ---------------------------------------------------- |
| `/`                    | entry route    | 未ログインは公開ランディング、ログイン済みは `/home` |
| `/home`                | おうち         | 今日の一枚、再発見、任意のボード                     |
| `/boards`              | ボード         | 利用者が作成したボード。標準ボードは作らない         |
| `/record`              | 記録作成       | 共通フォームで本文・メディア・日付・タグを入力       |
| `/entries/:slug`       | 記録詳細       | 閲覧、編集、共有 URL、お散歩への持ち出し             |
| `/search`              | 記録検索       | おうちの記録を日付・タグ等で検索                     |
| `/walk`                | お散歩         | 中庭の気配、すれ違い、定型反応                       |
| `/notifications`       | お知らせ       | Web 内通知と既読状態                                 |
| `/settings`            | 家族と設定     | お散歩同意、猫の参加範囲、家族、データ               |
| `/onboarding/profile`  | あなたについて | 表示名を保存                                         |
| `/onboarding/cat`      | 猫の名前       | 最初の猫を作成                                       |
| `/onboarding/photo`    | 猫の写真       | 任意のプロフィール写真を設定                         |
| `/onboarding/theme`    | テーマ         | 任意のテーマ色を設定                                 |
| `/onboarding/complete` | 準備完了       | 完了を保存し、元の目的地または `/home` へ接続        |

旧 `/onboarding/welcome` は `/onboarding/profile` へ一時 redirect する。旧 `/collections`、`/add`、`/town`、`/onboarding/preferences` は対応する現行 route へ恒久 redirect する。

オンボーディング route は検索対象にせず、全ページで `robots: { index: false, follow: false }` を設定する。

### 3.3 公開ランディング

未ログインの `/` は、説明とログイン操作を左、透明背景のブランドビジュアルを右に置く二列のヒーローとする。620px 以下ではビジュアル、説明、ログイン操作の一列へ切り替え、横スクロールを発生させない。

- ビジュアルは `apps/web/public/images/cattower-hero.webp` を正本とする
- 背景は Snow に固定し、比較用の切り替えを表示しない
- 説明は「写真も、ひとことも、好きなものを。」と「誰かの反応を気にせず、愛猫の何気ない日常をあなたと家族の思い出に。」の二行とする
- ブランド表示は `apps/web/public/images/cattower-wordmark.webp` を使い、アプリ左上、mobile header、オンボーディングと共有する
- 公開入口の役割、Google login、非公開既定の説明は変更しない

## 4. Shared components

framework 非依存で画面間共有する React component は `packages/ui` に置く。route、認証、data fetch、`next/link`、`next/image` へ依存する component は `apps/web` に残す。

`PageHeading` は `packages/ui` に置き、eyebrow、`h1`、説明、任意 action の意味構造を提供する。色、余白、responsive layout は `apps/web/app/globals.css` の design token と class で管理し、package 内へ生の色や route 固有 styling を持ち込まない。

### App shell

- デスクトップは左ナビゲーション
- 900px 未満は上部ブランドバーと下部 4 ナビゲーション
- 主要ナビゲーションは、おうち、ボード、記録する、お散歩
- 検索、お知らせ、家族と設定は補助導線
- 選択中の項目は背景、Material Symbols の fill、`aria-current` で示す
- デスクトップ sidebar と mobile 本文上部に active cat selector を置き、未保管の猫を一操作で切り替える
- `/settings` の「猫」タブで owner は猫の追加・プロフィール編集・保管・復元を行い、editor は閲覧だけ行う

### Typography and icons

- UI フォントは `M PLUS Rounded 1c`
- Next.js 実装では `next/font/google` で配信する
- 本文を含む UI の既定ウェイトは `700`、ブランドやオンボーディングの要所は `800` とする
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
- オンボーディング: 1 項目ずつ横方向に切り替わり、入力完了の因果を伝える
- 使用する CSS property は原則 `transform` と `opacity`
- `prefers-reduced-motion: reduce` では自動アニメーションを停止する
- 紙吹雪、streak、スコア、ランキング、連続利用報酬は使用しない

## 6. Onboarding experience

### 6.1 表示条件

フルスクリーンのオンボーディングを自動表示するのは、次の条件をすべて満たす場合だけとする。

1. 認証結果が「今回新規作成されたユーザー」である
2. `onboarding_completed_at` が `null` である
3. 新規登録の認証 callback 直後である

次の場面では自動表示しない。

- 既存ユーザーの通常ログイン後
- 検索結果、共有 URL、ブックマークからの通常アクセス
- 完了済みユーザーによるオンボーディング URL への直接アクセス
- 別端末での再ログイン

新規登録 callback 後の `/auth/continue` は、既存利用者を backfill 済みの `onboarding_prompted_at` で区別する。値が null の新規利用者だけ案内済み時刻を保存してオンボーディングへ進める。クライアントの localStorage や URL query を表示判定の正本にしない。

登録直後にブラウザを閉じたなど、オンボーディングが未完了のまま後日戻った場合は、通常画面を強制的に横取りしない。アプリ内に「プロフィール設定を続ける」バナーを表示し、利用者が明示的に再開できるようにする。猫が必要な機能を使おうとした場合だけ、その場で理由と再開リンクを表示する。

完了済みユーザーが `/onboarding/*` を直接開いた場合は `/home` へ redirect する。未完了ユーザーが自分で再開した場合は、保存済み checkpoint 以降の最初の未完了画面を開く。

### 6.2 情報構造

従来の右側にある「塔」「三角の屋根」「あなたのおうち」「猫のプロフィール」の部屋表示は廃止する。進捗の比喩を理解させるより、今入力する一項目と次の操作を明快にする。

オンボーディングは共通の `OnboardingShell` 内で 4 枚のスライドと完了画面を表示する。

| Step | Route                  | 必須     | 主見出し                           | 操作                     |
| ---- | ---------------------- | -------- | ---------------------------------- | ------------------------ |
| 1    | `/onboarding/profile`  | 表示名   | 「なんとお呼びしましょう？」       | 次へ                     |
| 2    | `/onboarding/cat`      | 猫の名前 | 「一緒に暮らす猫のお名前は？」     | 戻る、次へ               |
| 3    | `/onboarding/photo`    | なし     | 「お気に入りの一枚はありますか？」 | 戻る、写真を選ぶ、あとで |
| 4    | `/onboarding/theme`    | なし     | 「この子の色を選びましょう」       | 戻る、完了、あとで       |
| 完了 | `/onboarding/complete` | なし     | 「準備ができました」               | おうちへ／元の目的へ     |

表示名と猫の名前は空のまま進めない。写真とテーマ色は任意であり、「スキップ」ではなく内容が分かる「あとで」を使う。テーマ色を選ばない場合は既定の `mint` を保存する。

### 6.3 Visual design

画面全体は「静かな編集画面」として構成する。

- 背景は単色の温かいオフホワイト `--bg-base`。強いグラデーション、大きな色の円、三角形、塔のシルエットを使わない
- デスクトップは最大幅 720px の一列レイアウトを中央配置し、フォームの読み順を一本化する
- mobile は幅いっぱい、左右 20px、上 20px、下は `safe-area-inset-bottom` を含む
- 上部は左に小さな Cattower ロゴ、右に「1 / 4」。ラベル付きの大きなステップ一覧は置かない
- 進捗は高さ 3px の細い progress bar で示し、現在値をテキストでも読み上げる
- 本文領域は `h1`、1 行の補足、入力の順。デスクトップでも `h1` は 40px 以下に抑える
- 主ボタンは塗り、戻るは text button、「あとで」は secondary button とし、重要度を形でも区別する
- 猫の写真画面だけ、選択画像またはニュートラルな `pets` アイコンを 160px の円形 preview に表示する
- テーマ色は色見本に色名と選択アイコンを併記し、色だけで意味を伝えない
- 完了画面は小さな猫写真／アイコン、猫名、短い完了文だけで構成し、紙吹雪や巨大なチェックマークを使わない
- desktop でフォーム面をカードにする場合も、1px border と最小限の影だけを使う。画面の中にさらに複数カードを入れ子にしない

### 6.4 Slide transition

各 route は独立させ、ブラウザの戻る／進むと整合する。見た目は共通 shell 内のスライドとして切り替える。

- 前進: 新しい内容を `translateX(24px)`、`opacity: 0` から表示
- 後退: 新しい内容を `translateX(-24px)`、`opacity: 0` から表示
- duration: 240ms
- easing: `cubic-bezier(.16, 1, .3, 1)`
- logo、progress、背景は固定し、フォーム領域だけを切り替える
- 連打中は送信ボタンを disabled にし、同じ保存を重複実行しない
- `prefers-reduced-motion: reduce` では移動をなくし、内容を即時に切り替える

画面の自動送り、カルーセルの自動再生、スワイプ必須の操作は使用しない。

### 6.5 Back, skip, and exit

- Step 2 以降は画面内に「戻る」を表示する
- ブラウザ Back でも同じ前画面へ戻れる
- 戻って編集した値は再保存できる。checkpoint の最大到達位置は後退させない
- Step 3 と Step 4 は「あとで」で進める
- 必須項目がある Step 1 と Step 2 はスキップ不可
- 保存済みのため、途中離脱時に確認 dialog は出さない
- ロゴはブランド表示に限定し、意図しない離脱リンクにしない

### 6.6 Copy

説明は機能紹介ではなく、入力の理由と任意／必須を短く伝える。

| Element          | Copy                                                     |
| ---------------- | -------------------------------------------------------- |
| Step 1 補足      | 「記録や家族への表示に使います。あとから変更できます。」 |
| Step 2 補足      | 「まずは一匹。ほかの猫はあとから追加できます。」         |
| Step 3 補足      | 「写真はあとからでも設定できます。」                     |
| Step 3 secondary | 「写真はあとで」                                         |
| Step 4 補足      | 「記録の目印になる色です。あとから変更できます。」       |
| Step 4 secondary | 「おすすめの色で始める」                                 |
| 完了補足         | 「写真一枚でも、ひとことだけでも記録できます。」         |

## 7. Onboarding state and data

### 7.1 Persistence

D1 へ次の順で永続化する。

1. 新規ユーザー作成時に owner household と user preferences を作成
2. 表示名保存時に checkpoint `1`
3. 猫名保存時に既定テーマ `mint` で `cats` を作成し checkpoint `2`
4. 写真を保存または「あとで」で checkpoint `3`
5. テーマを保存または既定値を選択して checkpoint `4`
6. 完了画面の表示前に `onboarding_completed_at` を保存
7. 完了後に安全な `returnTo` があればそこへ、なければ `/home` へ移動

`onboarding_step` は最大到達位置を表し、戻る操作では減らさない。現在表示中の画面を DB に保存する必要はない。入力値は各 step の「次へ」または「あとで」で保存し、保存に失敗した場合は遷移しない。

完了処理は idempotent にし、再送しても `onboarding_completed_at` を不必要に更新しない。完了日時が保存される前に完了画面を表示しない。

### 7.2 Photo upload

プロフィール画像は選択時に JPEG/PNG/WebP と 10MB 上限を検査する。preview には `URL.createObjectURL` を使い、差し替え／unmount 時に revoke する。

presign、R2 送信、server-side metadata/decode/derivative 検査の失敗は同じ文言へまとめず、利用者が再選択・再試行できる理由を画面に表示する。猫名はすでに保存済みであることを伝え、写真だけを再試行または「写真はあとで」で進められるようにする。

表示には認証済みの `/api/media/:assetId?variant=profile` から 512×512 WebP を使い、原本 URL や R2 key をブラウザへ公開しない。

### 7.3 `returnTo`

- OAuth callback URL へ相対 path として渡し、`/auth/continue` で検証後に HttpOnly cookie へ保存する
- 相対 path のみ許可し、origin を固定する
- `/auth/*`、`/api/*`、`/onboarding/*` は除外する
- 完了または通常ログイン後に一度だけ使用して削除する
- 失効、欠損、不正値は `/home` へ fallback する
- onboarding URL の query で任意の遷移先を直接受け取らない

## 8. Accessibility acceptance

- すべての操作をキーボードで実行できる
- visible focus ring を保つ
- 各画面の `h1` に遷移後フォーカスを移し、変更をスクリーンリーダーへ伝える
- progress は視覚表示に加えて「ステップ 2 / 4」の accessible name を持つ
- 色だけで選択、エラー、完了を示さない
- 写真 input は label と結び、preview の代替テキストに猫名を使う
- エラーはフォーム内の `role="alert"` で入力欄の直後に表示する
- 主要ボタンの本文を一行に保ち、touch target は 44×44px 以上にする
- mobile で横スクロールを発生させない
- reduced motion で自動アニメーションと横移動が停止する
- browser zoom 200% でも入力と主要操作が欠けない

## 9. Failure and loading states

- 送信中は押したボタン内を「保存しています」に変え、フォーム入力は保持する
- 通信失敗時はページ上部の汎用 toast だけにせず、フォーム内に理由と再試行を表示する
- 完了 API が失敗した場合は完了演出を出さず、「もう一度試す」を表示する

## 10. Analytics and privacy（将来）

改善確認用に、個人情報や入力値を含まない次の event だけを送る。

- `onboarding_started` (`source`: `new_signup` / `resume`)
- `onboarding_step_viewed` (`step`)
- `onboarding_step_completed` (`step`)
- `onboarding_optional_skipped` (`step`: `photo` / `theme`)
- `onboarding_completed` (`destination`: `return_to` / `home`)

表示名、猫名、画像名、完全な URL、`returnTo` の値は analytics に送らない。離脱率は step 単位で集計し、利用者単位の行動評価には使わない。

## 11. Cloudflare implementation

- Next.js は Node.js runtime を使用し、Edge runtime 宣言を追加しない
- `@opennextjs/cloudflare` で Workers 形式へ変換する
- `wrangler.jsonc` は source of truth とし、`compatibility_date` は初期実装日を使用する
- `nodejs_compat` を有効にする
- OpenNext の生成物 `.open-next/` は commit しない
- D1、R2、Images binding は `wrangler.jsonc` で定義し、`cloudflare-env.d.ts` は `wrangler types` で生成する
- secret は設定ファイルとリポジトリへ保存しない
- Route Handler は `@cattower/observability` で包み、固定 route 名、status、所要時間、request ID、非機密 error code だけを structured log へ出す

## 12. Acceptance criteria

### Entry and authentication

- 未ログインで `/` を開くと公開ランディングを表示する
- ログイン済みで `/` を開くと `/home` へ移動する
- 新規登録 callback 直後だけオンボーディングを自動開始する
- 既存ユーザーのログイン後はオンボーディングを表示しない
- 完了済みユーザーが `/onboarding/*` を開くと `/home` へ移動する
- 未完了ユーザーの通常アクセスを強制 redirect せず、再開バナーを表示する
- 認証前の same-origin URL が完了後に復元される
- 外部 URL または除外 route の `returnTo` は拒否される

### Steps and controls

- Step 1 と Step 2 は必須値がないと進めない
- Step 3 と Step 4 は「あとで」で進める
- Step 2 以降から戻り、保存済み内容を編集できる
- ブラウザ Back／Forward と画面の内容、進行方向アニメーションが一致する
- 二重送信で重複する猫や画像を作成しない
- 中断後の再開で、最初の未完了 step と保存済み値を復元する
- 完了保存後に安全な元 URL または `/home` へ移動する

### Visual and accessibility

- 塔、三角の屋根、「あなたのおうち」「猫のプロフィール」の部屋 UI が表示されない
- 360px mobile から desktop まで横スクロールがない
- キーボードだけで選択、戻る、スキップ、完了ができる
- progress、テーマ色、エラーが色だけに依存しない
- `prefers-reduced-motion: reduce` で横スライドを行わない
- WCAG 2.2 AA の contrast、focus、target size を満たす
- 公開ランディングが Snow 背景で表示され、比較用の背景切り替えがない
- 透明背景のブランドビジュアルとワードマークが Snow 背景で欠けずに表示される
- アプリ左上、mobile header、公開ランディング、オンボーディングに同じワードマークが表示される

### Build

- `pnpm --filter @cattower/web dev` で起動できる
- `pnpm --filter @cattower/web build` が成功する
- `pnpm --filter @cattower/web cf:build` が成功する
- 上記 route が 404 にならず、旧 route が指定先へ redirect する
