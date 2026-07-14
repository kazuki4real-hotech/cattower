# Cattower 実装タスク

- Status: In progress v0.2
- Updated: 2026-07-15
- Progress rule: 実装と同じ commit series で checkbox と判断を更新し、文書を含めて `main` へ push する

## 0. Definition of done

各機能は次を満たしたときだけ完了とする。

- プロダクト仕様の acceptance criteria を満たす
- server-side validation と authorization がある
- loading、empty、error、retry 状態がある
- mobile と desktop で確認済み
- keyboard と reduced motion を確認済み
- unit/integration test が適切な層にある
- structured log に secret や本文を出さない
- 仕様・データモデル・README に差分があれば同時更新する

## Phase 0 — Design baseline

- [x] P0-01 プロダクト目的、対象、non-goal を定義する
- [x] P0-02 おうち・任意ボード・お散歩の簡潔な体験モデルを定義する
- [x] P0-03 お散歩の presence と anti-SNS 制約を定義する
- [x] P0-04 Cloudflare を前提に技術構成を決定する
- [x] P0-05 論理データモデルを作成する
- [x] P0-06 MVP acceptance と実装フェーズを作成する
- [ ] P0-07 正式名称と独自ドメインを決定する
- [ ] P0-08 お散歩のビジュアル方式を決定する
- [ ] P0-09 提供プランの画像容量・動画分数と Stream の開発・運用予算を決定する（初期は動画を準備中としてStreamを有効化せず、費用0 USDで進行）

Exit criteria: P0-07〜08 は実装開始を妨げないが public beta 前に決定する。P0-09 のうち開発中を含む production Stream 支出上限は P1-10/P1-18 より前、利用者向け動画上限は P3-15 より前に決定する。

## Phase 1 — Foundation and technical spikes

### Repository

- [x] P1-01 pnpm workspace を初期化する
- [x] P1-02 `apps/web` に Next.js App Router + TypeScript strict を構築する
- [x] P1-03 OpenNext Cloudflare adapter と `wrangler.jsonc` を設定する
- [x] P1-03A `cattower-web` を Cloudflare Workers へ初回デプロイする
- [x] P1-03B Workers Builds を production branch `main`、root `/`、OpenNext build で設定する
- [x] P1-04 `apps/realtime` に Worker + Durable Object skeleton を作る
- [x] P1-05 `packages/db`、`packages/domain`、`packages/ui` を作る
- [x] P1-06 ESLint、formatter、typecheck、test scripts を統一する
- [x] P1-07 GitHub Actions で lint/typecheck/unit/build を実行する
- [x] P1-07A PR を使わず、実装・文書更新・適切な粒度の main 直接 commit/push を行う repository skill を追加する

### Cloudflare resources

- [x] P1-08 local/production 共用 D1 `cattower-db-production` を作成し、remote binding と migration を設定する
- [x] P1-09 local/production 共用 private R2 `cattower-media-production` と localhost/production CORS を設定する
- [ ] P1-10 production Stream binding と private playback を設定する（提供上限と予算の決定まで保留）
- [x] P1-11 realtime Durable Object binding と migration を設定する
- [x] P1-12 `wrangler types` により binding 型を生成する
- [x] P1-13 observability と非機密 structured logging を設定する

### Spikes

- [x] P1-14 OpenNext + D1 の read/write smoke test
- [x] P1-15 Better Auth + Google OAuth + D1 session の smoke test
- [x] P1-16 bucket 限定 R2 access key、Worker 内 SigV4 署名、localhost/production CORS を含む browser direct upload の smoke test
- [x] P1-17 R2 binding で upload 後 metadata を確認し、Images Binding `.info()` と derivative 生成、入力上限、EXIF、animated/巨大画像を検証する
- [ ] P1-18 支出上限を設定後、Stream Direct Creator Upload で MOV を upload/playback し保存・配信分数を計測する（動画準備中のため保留）
- [x] P1-19 別 Worker 発行の短命 ticket で WebSocket 接続する
- [x] P1-20 Durable Object hibernation 後に接続・状態が復元することを検証する
- [x] P1-21 FTS5 trigram の日本語検索、1〜2 文字 LIKE fallback、index size、write/query cost を検証する

Exit criteria: 単一の production URL 上で検証 account を使い、auth、D1、image、video、WebSocket の縦切りデモが動き、選定上の blocker がない。

## Phase 2 — Identity, household and cat profile

- [x] P2-01 Better Auth schema と migration を確定する
- [x] P2-02 Google login/logout/session refresh を実装する
- [x] P2-03 登録直後 onboarding（利用者名、最初の猫、完了）と user preferences を実装する（既存loginと通常URL流入は自動表示しない）
- [x] P2-03UI onboarding 4 step の一列UI、前後移動、進捗、完了画面を実装する
- [x] P2-03A onboarding の途中保存、再開、任意写真・テーマ色の「あとで」、reduced-motion を実装する
- [x] P2-03B desktop補助ナビとmobile headerから`/settings`へ移動できる導線を実装する
- [x] P2-04 初回 household 自動作成、owner 一つ・editor 複数所属、active household 切り替えを実装する（招待フローは P2-07 で実装）
- [ ] P2-04A owner/editor の閲覧・編集・soft delete・restore policy を domain package に実装する
- [ ] P2-05 猫の作成・編集・archive を実装する
- [ ] P2-06 複数猫切り替え UI を実装する
- [ ] P2-07 owner/editor の家族招待を実装する
- [ ] P2-08 invite expiry/revoke と abuse rate limit を実装する
- [x] P2-09 profile image upload と private delivery を実装する
- [ ] P2-10 authorization integration tests を作成する
- [ ] P2-11 notifications schema、dedupe、未読/既読、expiry cleanup を実装する
- [ ] P2-12 家族招待・承認と upload 完了・失敗の Web 内通知を実装する

Exit criteria: 二つの account で同じ household を共有でき、権限外の猫・メディアへアクセスできない。

## Phase 3 — Entries and media

### Record foundation

- [ ] P3-01 entry、entry_cats、tag schema/migration を作る
- [ ] P3-02 共通 entry editor と autosaved draft を実装する
- [ ] P3-03 本文またはメディアを保存できる共通記録フォーム
- [ ] P3-04 記録作成時の複数タグ入力・正規化
- [ ] P3-09 複数猫への紐付けを実装する
- [ ] P3-10 edit、soft delete、restore を実装する

### Media

- [ ] P3-11 image upload authorization と ownership check
- [ ] P3-12 client-side preview、progress、retry
- [ ] P3-13 server metadata verification と ready transition
- [ ] P3-14 private image delivery と access test
- [ ] P3-15 Stream direct upload、processing status、signed playback
- [ ] P3-15A 利用者ごとの最大時間、合計保存分数、月間 upload gate、動画 feature flag を実装する
- [ ] P3-16 orphaned/failed media cleanup job
- [ ] P3-17 upload limit と user-facing error を実装する

Exit criteria: 共通フォームが写真・動画・文章・タグを失わず保存でき、再読込後も正しく表示・編集できる。

## Phase 4 — Home and rediscovery

- [ ] P4-01 おうち画面の最近の記録と任意ボード
- [x] P4-02 標準棚・system collectionを作らない方針へ簡略化する
- [ ] P4-03 board CRUD
- [ ] P4-04 board item の手動並び替え
- [ ] P4-05 entry detail レイアウト
- [ ] P4-06 検索と tag/date/media filters
- [ ] P4-07 去年の今ごろ
- [ ] P4-08 3 年前と今日
- [ ] P4-11 ランダムな一枚
- [ ] P4-12 pagination と明確な「見終わり」を実装する
- [ ] P4-13 empty state を投稿圧力のない文言で整える
- [ ] P4-14 reduced motion、keyboard、screen reader QA

Exit criteria: タイムラインを使わずに、新旧の記録をタグ・ボード・検索・再発見から辿れる。

## Phase 5 — Limited sharing

- [ ] P5-01 cryptographic share token と hash storage
- [ ] P5-02 entry share page
- [ ] P5-03 board share page
- [ ] P5-04 expiry/revoke UI
- [ ] P5-05 noindex/no-store/security headers
- [ ] P5-06 share page から scope 外 resource へ遷移できない test
- [ ] P5-07 deleted entry/account で即時失効する test
- [ ] P5-08 share endpoint rate limit
- [ ] P5-09 share expiry の Web 内通知を実装する

Exit criteria: 選択した範囲だけを期限付きで閲覧でき、取消しが即時反映される。

## Phase 6 — お散歩 MVP

### Safety and card preparation

- [ ] P6-01 お散歩 opt-in 設定
- [ ] P6-01A owner 管理の `cats.town_access` と接続時の user/cat/membership policy を実装する
- [ ] P6-02 town card schema と private entry からの snapshot 作成
- [ ] P6-03 card revoke/expiry/source delete propagation
- [ ] P6-04 猫単位の mute と飼い主単位の block schema、UI、policy
- [ ] P6-05 report schema、固定 reason、即時 hide

### Realtime core

- [ ] P6-06 versioned WebSocket protocol schema
- [ ] P6-07 5 分以内の signed connection ticket
- [ ] P6-08 place + cohort shard routing
- [ ] P6-09 Hibernatable WebSocket connection lifecycle
- [ ] P6-10 visible-tab activity heartbeat
- [ ] P6-11 active/resting/trace state derivation
- [ ] P6-12 最大 8 匹の safe presence projection
- [ ] P6-13 reconnect、duplicate、out-of-order handling
- [ ] P6-13A 同じ猫への複数 household member 接続を一匹の presence へ統合する

### Interaction

- [ ] P6-14 中庭の 2D scene
- [ ] P6-15 猫の低頻度 motion と reduced-motion fallback
- [ ] P6-16 定型反応 5 種
- [ ] P6-17 reaction cooldown と idempotency
- [ ] P6-18 となりに座る表示
- [ ] P6-19 encounter 判定と粗い時刻表現
- [ ] P6-20 見かけた猫 / 最近よく会う猫 / 顔なじみ
- [ ] P6-21 block 更新を既存 connection に反映
- [ ] P6-22 二つ以上の browser context による E2E
- [ ] P6-23 opt-in 時だけお散歩の日次まとめ通知を生成する

Exit criteria: 正確なオンライン時刻や人気数を出さず、二人の利用者が気配、すれ違い、定型反応を安全に体験できる。

## Phase 7 — Export, deletion and operations

- [ ] P7-01 JSON export format を versioning する
- [ ] P7-02 media を含む export job
- [ ] P7-03 private archive download と expiry
- [ ] P7-04 account deletion grace period
- [ ] P7-05 D1/R2/Stream/share/realtime の staged purge
- [ ] P7-06 retry/idempotency/orphan reconciliation
- [ ] P7-07 owner 向け audit event
- [ ] P7-08 moderation admin access と review flow
- [ ] P7-09 backup/recovery 手順を文書化する
- [ ] P7-10 production migration/deploy/rollback checklist
- [ ] P7-11 export job 完了・失敗の Web 内通知を実装する

Exit criteria: 利用者が自分のデータを取得でき、削除要求を追跡可能かつ再実行可能な形で完了できる。

## Phase 8 — Beta hardening

- [ ] P8-01 全主要画面の WCAG 2.2 AA audit
- [ ] P8-02 mobile network/slow upload testing
- [ ] P8-03 authorization matrix penetration review
- [ ] P8-04 CSP と security headers report-only 検証後 enforce
- [ ] P8-05 rate limit と Turnstile の閾値調整
- [ ] P8-06 load test: Web、D1、R2、Stream、room shard
- [ ] P8-07 Durable Object shard 数と再割当を検証する
- [ ] P8-08 privacy policy、terms、community rules
- [ ] P8-09 retention periods と無料枠を確定する
- [ ] P8-10 alert と incident response runbook
- [ ] P8-11 closed beta feedback 導線
- [ ] P8-12 MVP acceptance 全項目の sign-off
- [ ] P8-13 consented `product_events`、90 日 raw retention、`user_activity_days` rollup を実装する
- [ ] P8-14 success signal query を実装し、consented cohort として表示を検証する

Exit criteria: closed beta を招待でき、重大な privacy/security/accessibility blocker がない。

## Deferred backlog

- [ ] D-01 Instagram 用カード画像書き出し
- [ ] D-02 年次 PDF / フォトブック
- [ ] D-03 お散歩の追加場所
- [ ] D-04 虹の庭
- [ ] D-05 Web Push と日次まとめ
- [ ] D-06 passkey / magic link
- [ ] D-07 native app
- [ ] D-08 local-first/offline draft
- [ ] D-09 Cloudflare Images transformation の採用評価
- [ ] D-10 動物病院へ渡す限定レポート

## Product guardrails for task review

新しいタスクを追加する際、次のどれかに該当する場合は先にプロダクト仕様を更新する。

- 他人の反応数を表示する
- 正確な在席・既読・最終アクセスを表示する
- 投稿頻度を促す報酬や通知を導入する
- public discovery、ランキング、follow を導入する
- おうちの記録を default public にする
- 自由文交流を導入する
- 本文やメディアを AI 学習や広告 targeting に使う
