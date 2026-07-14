# Cattower 技術設計書

- Status: Implementing v0.2
- Updated: 2026-07-14
- Target: Cloudflare production deployment

## 1. Architecture goals

- モバイル Web で軽快に動く
- 私的なメディアを初期状態で公開しない
- 低頻度のリアルタイム接続を過剰な常時稼働コストなく扱う
- 初期運用はローカルと本番 Worker で同じ Cloudflare resource を使い、環境差を作らない
- Cloudflare の binding を優先し、Worker 内から Cloudflare REST API を不要に呼ばない
- データと機能の境界を明確にし、将来ネイティブアプリからも利用できるようにする

## 2. Selected stack

| Area               | Choice                                                                            | Reason                                                                                    |
| ------------------ | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Monorepo           | pnpm workspaces                                                                   | Web と realtime Worker、共有 package を小さな構成で管理できる                             |
| Frontend           | Next.js App Router + React + TypeScript                                           | 要件指定。SSR、Route Handler、Server Component を使い分けられる                           |
| Cloudflare adapter | `@opennextjs/cloudflare`                                                          | Next.js を Cloudflare Workers へ正式なガイドに沿って配置できる                            |
| Styling            | Tailwind CSS + Radix UI primitives                                                | 独自の静かなデザインを保ちつつ、アクセシブルな基本操作を使える                            |
| Forms/validation   | React Hook Form + Zod                                                             | クライアントとサーバーで同じ入力契約を共有できる                                          |
| Authentication     | Better Auth + Google OAuth                                                        | Workers/D1 と組み合わせやすく、認証データを自分たちの DB で管理できる                     |
| Database           | Cloudflare D1                                                                     | 関係データ、検索条件、共有権限を SQL で扱える                                             |
| ORM                | Drizzle ORM                                                                       | D1 を公式にサポートし、schema と migration を TypeScript 側で管理できる                   |
| Image storage      | Cloudflare R2 private bucket                                                      | 原本と派生画像を公開せず保存できる                                                        |
| Image inspection   | Cloudflare Images Binding                                                         | upload 後の decode 可否、寸法、派生画像生成を Worker 内の native library に依存せず扱える |
| Video              | Cloudflare Stream                                                                 | MOV を含む投稿動画をエンコードし、端末ごとの差を減らせる                                  |
| Realtime           | Cloudflare Durable Objects + Hibernatable WebSockets                              | お散歩の場所ごとの presence と低頻度イベントを調停できる                                  |
| Tests              | Vitest + Testing Library + Playwright                                             | domain、UI、Cloudflare binding、主要導線を層別に検証できる                                |
| Analytics          | Cloudflare Web Analytics + structured Workers logs + consented first-party events | 性能・障害と product success signal を目的別に分離する                                    |

バージョン番号は実装開始日に互換性を確認して固定する。README に `latest` のまま残さず、lockfile と Renovate/Dependabot で更新する。

## 3. Cloudflare deployment model

Cloudflare の公式ガイドは Next.js を OpenNext adapter で Workers にデプロイする構成を案内している。

- Next.js guide: https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/
- OpenNext deploy guide: https://developers.cloudflare.com/workers/framework-guides/automatic-configuration/

### Production deployment record

- Initial deployment: 2026-07-14
- Worker name: `cattower-web`
- Source repository: `kazuki4real-hotech/cattower`
- Production branch: `main`
- Root directory: `/`
- Build command: `pnpm cf:build`
- Deploy command: `pnpm --filter @cattower/web exec wrangler deploy`
- Trigger: Cloudflare Workers Builds receives a push to `main`
- Current boundary: Better Auth endpoint、Google/R2 runtime secrets、D1 schema、owner household 自動作成、オンボーディング永続化、R2 presigned PUT/検査/private delivery はproduction bindingへ接続済み。Google OAuth callback後のD1 session、オンボーディング完了状態のredirect、再読み込み後のsession継続、認証済みブラウザからのR2直接upload、Images Binding `.info()`とprofile derivative、認証あり/なしのprivate配信を本番確認済み。realtime Workerには`TOWN_ROOM` binding、`TownRoom` SQLite migration、短命signed ticket検証、origin制限、WebSocket upgradeを実装済み。Stream、hibernation復元検証、通常画面のsample data置換は未完了
- Public hostname: `https://cattower-web.kazuki-kitada.workers.dev/`。独自ドメインは P0-07 で決定後に追加し、Workers URL は運用確認用として維持する

build、確認、ログ、rollback の操作手順は [deployment-runbook.md](deployment-runbook.md) を正本とする。

`initOpenNextCloudflareForDev()` は `next dev` でだけ実行する。CI と production build は D1/R2 の remote binding へ接続せず、runtime で Worker binding を解決する。これにより build credential を GitHub Actions へ渡さない。

### Services

```text
Browser
  ├─ HTTPS ──> cattower-web (Next.js on Workers)
  │              ├─ D1: relational data and auth
  │              ├─ R2: private images and exports
  │              └─ Stream binding: private video upload/playback (準備中・未設定)
  │
  └─ WSS ───> cattower-realtime (Worker)
                 └─ Durable Object per town room shard
```

Web と realtime は別 Worker にする。

- Next.js の更新と WebSocket 実装を独立してデプロイできる
- Durable Object の migration と通常アプリのリリースを分離できる
- realtime Worker は短い責務に保ち、Next.js adapter の内部に依存しない

realtime Worker をブラウザへ直接公開するが、接続前に Web 側が発行した短命な接続 ticket を必須にする。

## 4. Repository structure

```text
apps/
├── web/
│   ├── app/
│   ├── components/
│   ├── features/
│   ├── lib/
│   ├── public/
│   ├── open-next.config.ts
│   └── wrangler.jsonc
└── realtime/
    ├── src/
    │   ├── index.ts
    │   └── town-room.ts
    └── wrangler.jsonc
packages/
├── db/
│   ├── src/schema.ts
│   └── migrations/
├── domain/
│   └── src/
├── observability/
│   └── src/
└── ui/
    └── src/
```

機能コードは `features/{feature}` に UI、server action、query adapter をまとめる。横断的なビジネスルールだけを `packages/domain` へ置き、巨大な shared package を作らない。

`packages/ui` は route や data access に依存しない意味的な React component だけを置く。最初の共有 component は主要画面の `PageHeading` とし、Next.js 固有 component と design token の実体は `apps/web` に残す。

`packages/observability` はWeb/realtime共通の非機密request logging境界とする。呼び出し側から完全なURL、request body、headers、例外を受け取らず、固定labelと数値だけを構造化する。

`apps/realtime` はproductionへデプロイ済みで、`GET /health`、`TownRoom` class、`TOWN_ROOM` binding、`v1` SQLite migrationを設定している。P1-19でWeb Workerの`POST /api/town/ticket`、5分固定のHMAC-SHA-256 signed ticket、realtime Workerの`GET /connect`、origin/署名/期限/room scope検証、WebSocket upgradeを追加した。検証済みclaimだけを内部headerでDOへ渡し、ticket自体はDOとapplication logへ渡さない。hibernation後のattachment復元検証はP1-20で行う。

## 5. Request boundaries

### Next.js Web Worker

責務:

- HTML レンダリングと navigation
- Better Auth endpoint と session 検証
- D1 に対する CRUD と認可
- R2/Stream upload authorization
- private media delivery authorization
- share link の検証
- export job の開始と状態表示
- realtime 接続 ticket の発行

Server Components は読み取りに使用する。変更操作は Server Actions または Route Handlers で実装し、どちらの場合も入力 validation と認可をサーバーで繰り返す。

### Realtime Worker

責務:

- 短命 ticket の検証
- WebSocket upgrade
- お散歩の room shard への routing
- presence、定型反応、短期のすれ違い判定
- block list/version の接続時反映

realtime Worker はおうちの本文やメディア原本へアクセスしない。お散歩用の最小スナップショットと opaque ID だけを受け取る。

## 6. Authentication and authorization

### Authentication

- Better Auth の Drizzle adapter と D1 を使用する
- 初期ログインは Google OAuth
- session cookie は `HttpOnly`、`Secure`、適切な `SameSite` を設定する
- auth secret と OAuth secret は Cloudflare secret として管理する
- 認証ライブラリは `better-auth/minimal` を含め bundle size を実測して選ぶ

将来、メール magic link または passkey を追加できるが、MVP の必須条件にはしない。

### Authorization model

すべての DB 操作は次の順で判定する。

1. session から user ID を取得
2. 対象リソースの household/cat を解決
3. membership と role を確認
4. 操作単位の policy を評価
5. query を実行

クライアントから送られた `userId`、`householdId`、`role` は認可根拠にしない。

MVP の household policy:

- 初回 onboarding で owner household を一つ作る
- 一人の利用者は一つを所有し、複数 household に editor として参加できる
- editor は全記録を閲覧できるが、作成・編集・soft delete・restore は自分の記録だけ
- owner は household 内のすべての記録、猫、家族、お散歩設定を管理できる

### Realtime ticket

- Web Worker がログイン済み利用者に 5 分以内の短命 ticket を発行
- payload は `userId`、`catId`、`townCardId`、`roomId`、`blockVersion`、`exp`、`jti`
- Web Crypto による署名を使う
- realtime Worker は署名、期限、room scope を検証してから upgrade する
- ticket を URL query に長く残さず、可能なら最初の認証メッセージまたは短命 cookie を使う
- ログへ ticket を出力しない

P1-19のbrowser WebSocket接続ではcustom headerを付けられないため、発行responseの`connectUrl`へ接続直前だけ`ticket` queryを追加する。realtime Workerは検証後にqueryを破棄し、DOにはticketを渡さない。P6-07では再利用防止と、subprotocol/短命cookieを含む搬送方法を再評価する。town card/block table導入前のspike claimは`townCardId = cat:{catId}`、`blockVersion = 0`とし、P6で実データへ置換する。

2026-07-15にproductionで、同一secretにより署名した5分ticketが`cattower-realtime`の`/connect`を`101`へupgradeし、DOから`{"v":1,"type":"connection.ready"}`を受信することを確認した。通常HTTPは`426`、不正ticketは`401`、許可外originは`403`、Web ticket endpointの未認証POSTは`401`だった。full user/cat/town policyとticket再利用防止はP6-01A/P6-07で追加する。

## 7. Database

D1 と Drizzle を使用する。詳細なテーブルは [データモデル](data-model.md) を参照。

### Rules

- ID は推測不能な UUID を使用する
- 時刻は UTC の integer timestamp で保存する
- 金額を導入する場合は浮動小数ではなく最小通貨単位の integer
- schema 変更は SQL migration として version control する
- 初期の単一環境運用では migration を production D1 へ直接適用する。適用前に SQL review と build を完了し、破壊的 migration は expand/contract で分割する
- foreign key と主要 query の index を明示する
- D1 binding から直接アクセスし、Worker 内から D1 REST API を呼ばない
- 本文検索は MVP では正規化した `LIKE` と household/cat/date 絞り込みから開始する
- 件数増加後は FTS5 の trigram tokenizer を第一候補として index size、write cost、日本語 query latency を検証する
- trigram で一致しない 1〜2 文字の検索は正規化 `LIKE` へ fallback する

参考:

- D1 migrations: https://developers.cloudflare.com/d1/reference/migrations/
- Drizzle D1: https://orm.drizzle.team/docs/sqlite/connect-cloudflare-d1
- Better Auth Drizzle adapter: https://better-auth.com/docs/adapters/drizzle

## 8. Media pipeline

### Images

1. クライアントで MIME、サイズ、枚数を事前検証
2. サーバーが ownership を確認し、object key と短命 upload authorization を発行
3. ブラウザから R2 へ直接 upload
4. サーバーへ完了を通知
5. metadata を検証後 `media_assets.status = ready`

object key は `households/{householdId}/cats/{catId}/{assetId}/original` 形式とし、ユーザー指定 filename を key に使用しない。

- R2 bucket は private
- browser direct upload は S3 互換 API 用の bucket 限定 access key を Cloudflare secret として保持し、Worker 内で AWS Signature V4 をローカル計算する
- access key は presigned PUT の発行以外に使用せず、通常の object 操作と upload 後の確認は R2 binding を使用する
- 単一 R2 bucket の CORS は localhost と production origin だけを許可し、method/header を最小化する
- upload URL は一意な単一 object、短い期限、PUT に限定
- URL は bearer token として扱いログへ残さない
- upload 完了後に R2 binding で object metadata、size、Content-Type を再確認する
- Cloudflare Images Binding の `.info()` で decode 可否、format、width、height を確認する
- thumbnail/表示用画像の生成成功後に `ready` とし、失敗 asset は隔離して削除対象にする
- 原画像はImages Bindingの20MB入力上限より小さい10MBをアプリ上限とし、JPEG/PNG/WebPだけを受け付ける
- profile derivative は512×512、`cover`、WebP quality 82、`anim: false`とする。EXIF orientationは変換時に画素へ適用し、位置情報を含むmetadataはWebP出力へ保持しない
- animated WebPは先頭frameの静止画をprofile derivativeに使う。巨大画像は100MP、非WebP/AVIFの一辺12,000pxというImages上限より先に10MBのアプリ上限とdecode検査を適用する
- 表示用サイズは原本と分離し、`{asset prefix}/profile-512.webp`の生成済み derivative を再利用する

2026-07-15のspikeでは、EXIF orientation 6のJPEGが480×640へ補正され、WebP derivativeのEXIFが0件になること、animated WebPが1 frameへ静止画化されること、幅12,001pxのPNGが422で拒否されることをremote Images Bindingで確認した。本番では5712×4284、7.4MBのPNGから512×512 WebPを生成し、認証済み配信と未認証401を確認した。

参考:

- R2 presigned URLs: https://developers.cloudflare.com/r2/api/s3/presigned-urls/
- R2 CORS: https://developers.cloudflare.com/r2/buckets/cors/
- Images Binding: https://developers.cloudflare.com/images/optimization/binding/

### Videos

動画は Cloudflare Stream の Direct Creator Upload を使う。

- ブラウザへ Cloudflare API token を渡さない
- 直接 upload 用の一回限り URL をサーバーで発行する
- 動画は private とし signed playback token を必須にする
- MVP は動画の長さとファイルサイズに上限を設ける
- upload/encoding 中は placeholder を表示する
- processing 失敗と削除を同期する
- 開発中を含む production Stream の支出上限を resource 作成前に決める
- 利用者ごとの最大動画時間、合計保存分数、月間 upload 上限を動画機能実装前に決める
- 動画機能を feature flag で停止できるようにする

Stream は MOV 等を受け付けて配信用に encode できるため、スマートフォン投稿の再生互換性を R2 原本配信だけで解決しない。

Pricing snapshot（2026-07-14）では、保存は 1,000 分あたり 5 USD の前払い、配信は 1,000 分あたり 1 USD の従量課金で、Stream の無料利用枠は案内されていない。価格は変更される可能性があるため、P1-10/P1-18 と P3-15 の開始前に公式 pricing を再確認する。

2026-07-14の初期方針として、課金を抑えるためStream resourceとbindingは作成せず、動画機能は「準備中」とする。この期間のStream費用は0 USDとし、写真・文章とお散歩の実装を先行する。P0-09で提供上限と予算を決定してからP1-10/P1-18を再開する。

- Direct Creator Uploads: https://developers.cloudflare.com/stream/uploading-videos/direct-creator-uploads/
- Secure Stream: https://developers.cloudflare.com/stream/viewing-videos/securing-your-stream/
- Pricing: https://developers.cloudflare.com/stream/pricing/

## 9. お散歩 realtime design

既存DB・protocolとの互換性のため、コードと永続化では当面 `town_*` を内部名として維持する。

### Participation policy

- `user_preferences.town_enabled` は利用者本人の opt-in
- `cats.town_access` は owner が設定する `disabled` / `owners_only` / `household_members`
- realtime ticket 発行時に両方と active membership を検証する
- town card の作成・変更・取消しは owner に限定する
- 猫単位の非表示は `cat_mutes`、安全上の block は user-to-user `blocks` で扱う
- block は対象 user の全猫へ適用し、room projection と event delivery の両方で除外する

### Coordination atom

一つの Durable Object を町全体の singleton にしない。coordination atom は `place + cohort shard` とする。

```text
room key = town:{placeId}:shard:{shardNumber}
```

- 初期は利用密度を保つため shard 数を小さくする
- 設定で shard 数を増やせるようにする
- user/cat ID の安定 hash で cohort を割り当てる
- 一部 room だけに負荷が偏った場合は次回接続時に再割当できる
- 一画面の表示は最大 8 匹、room 内の接続数とは分離する

### Durable Object state

永続化するもの:

- 短期間の encounter candidate
- 定型反応の idempotency key と cooldown
- room generation/config version

WebSocket attachment に持たせるもの:

- opaque connection ID
- cat ID
- town card ID
- joinedAt bucket
- block version

保存しないもの:

- 正確なカーソルやスクロール位置
- おうちの記録本文
- メディア原本 URL
- 正確な現実位置

### Connection behavior

- Hibernatable WebSockets (`ctx.acceptWebSocket`) を使用する
- 画面が visible の間だけ低頻度 activity heartbeat を送る
- 小さなイベントは可能な範囲で batch する
- `setInterval` に依存せず、activity timestamp と alarm/次回 event で expiry を評価する
- 切断時も最大 30 分 `resting`、最大 6 時間 `trace` として曖昧表示できる
- 重要な状態は memory だけに置かない
- P1-20のhibernation検証では`connection.ping`時にserialized attachmentからconnection IDを復元し、instance generation IDの変化で再起動を確認する
- room 内の presence は connection ではなく `cat_id` 単位にまとめる
- 同じ猫への複数の household member 接続は一匹へ統合し、すべて閉じた時点で resting へ遷移する
- reaction cooldown と idempotency は cat 単位で評価する

Cloudflare は WebSocket server 用に Hibernation API を推奨している。

- DO WebSocket guide: https://developers.cloudflare.com/durable-objects/best-practices/websockets/
- Hibernation example: https://developers.cloudflare.com/durable-objects/examples/websocket-hibernation-server/

### Protocol

メッセージは versioned JSON envelope から開始する。

```ts
type Envelope = {
  v: 1;
  type: string;
  requestId?: string;
  payload: unknown;
};
```

実装時は `unknown` を discriminated union と Zod schema に置き換える。未知 version/type は接続を落とさず明示 error を返す。サーバーは sequence number を付け、再接続後の重複反応を idempotency key で防ぐ。

## 10. Sharing model

- share link は 256 bit 相当の random token を発行する
- DB には token の hash のみ保存する
- `expiresAt`、`revokedAt`、`scope` を持つ
- response に `Cache-Control: private, no-store`
- `X-Robots-Tag: noindex, nofollow, noarchive`
- share page から account、お散歩、別記録へ辿れない
- card 削除、退会、share revoke を直ちに認可判定へ反映する

## 11. Privacy, abuse and security

### Baseline

- private by default
- server-side authorization on every resource operation
- CSRF、XSS、open redirect を認証 framework と入力処理で防ぐ
- upload filename、MIME、拡張子を信用しない
- CSP、HSTS、Referrer-Policy、Permissions-Policy を設定する
- rate limit を login、share creation、reaction、report、upload authorization に設ける
- suspicious/public forms には Turnstile を段階導入する
- structured log に本文、token、cookie、署名 URL を含めない

### Moderation

- block は表示時だけでなく room assignment/送信時にも適用する
- report は snapshot ID、reason、reporter、対象 owner、時刻を保存する
- 通報後は reporter の画面から即時非表示
- 運営用管理画面は通常利用者 UI と分け、強い認証を要求する
- 自由文交流を導入する前に moderation 方針を再設計する

## 12. Background work

MVP 前半では request 内で完了できる処理を優先する。次の処理は Cloudflare Queues または Workflows の導入を検討する。

- 大規模なデータ書き出し
- account deletion の段階処理
- orphaned R2/Stream asset cleanup
- 日次のお散歩まとめ
- media metadata の再検証

非同期化する場合、job は idempotent にし、状態を D1 に記録する。応答後の軽い処理だけ `ctx.waitUntil()` を使い、重要な永続処理を fire-and-forget にしない。

## 13. Caching

- 公開 marketing page: CDN cache 可
- 認証後 HTML/API: `private, no-store` を基本
- share page: token scope のため `private, no-store`
- private image response: 短命認可 URL または Worker 認可。共有 CDN cache key への cookie 混入を避ける
- static assets: content hash 付き長期 cache

## 14. Observability

`cattower-web` と `cattower-realtime` はWorkers Logsを有効化し、初期samplingを10%とする。ログ量と費用を抑え、OAuth codeや署名URLを含み得る完全なrequest URLを保存しないため、Cloudflareの自動invocation logは無効化する。tracesも初期段階では明示的に無効化し、必要性と予算を確認してから別タスクで導入する。

Route Handlerとrealtime Workerのrequest境界は`@cattower/observability`で包む。固定route名をコード側でallowlist validationし、`cf-ray`が安全な形式ならrequest IDとして使用し、それ以外は`crypto.randomUUID()`を使う。正常系は`console.log`、4xxは`console.warn`、5xxは`console.error`へJSON objectとして渡す。未処理例外はメッセージやstackを記録せず、`unhandled_exception`と非機密な500 responseへ変換する。

### Structured log fields

- `event` (`request.completed` / `request.failed`)
- `requestId`
- `service`
- `route`
- `status`
- `durationMs`
- `errorCode`
- hash/pseudonymous actor ID（必要な場合のみ）
- Durable Object room shard ID（生の user ID を含めない）

P1-13のbaselineでは`event`、`requestId`、`service`、`route`、`status`、`durationMs`、`errorCode`だけを実装する。actor IDとroom shard IDは必要になる機能の実装時にのみ追加し、同じallowlist境界とtestを必須にする。

### Metrics

- request error rate and latency
- D1 query error/latency
- media upload/processing success rate
- WebSocket connect/reconnect/error rate
- active room shard distribution
- export/delete job completion
- moderation response time

完全なURL、query、cookie、Authorization header、本文、キャプション、検索語、画像・動画URL、OAuth token、署名URL、例外メッセージ、stackは収集しない。

### Product analytics

Cloudflare Web Analytics は個人単位の retention や古い記録の再訪を計測しないため、同意済み利用者に限って D1 の `product_events` を使用する。

- event type は allowlist で管理する
- properties は coarse boolean/category に限定する
- 本文、検索語、resource ID、cat ID、メディア URL を保存しない
- raw event は候補 90 日で日次 rollup へ集約し削除する
- `analytics_consent` の撤回後は新規記録を停止し、保持データの削除方針を privacy policy と一致させる
- success signal は consented cohort の指標として表示する

## 15. Testing strategy

### Unit

- record and tag validation
- visibility transitions
- household policy
- share token hashing and expiry
- presence state derivation
- encounter eligibility and cooldown

### Integration

- D1 migration and repository queries
- Better Auth session with D1 adapter
- R2 upload authorization and ownership
- Stream upload state handling
- Durable Object WebSocket across hibernation
- block/report behavior across Web and realtime

### E2E

- login → cat creation → entry creation → revisit
- household invite and edit
- limited share and revoke
- two browser contexts meeting in お散歩
- block hides both active and resting presence
- export and account deletion request

### Accessibility and visual

- axe checks on primary pages
- keyboard navigation
- reduced motion
- mobile viewport visual regression for home、entry、board、お散歩

## 16. Environment and delivery

初期運用では environment を分けない。`cattower-db-production` と `cattower-media-production` を本番 Workerとローカル開発の両方から使用する。`wrangler.jsonc` の D1/R2 binding は `remote: true` とし、ローカル操作も production data を変更する。検証には専用 account を使い、fixture の一括投入や destructive test は実行しない。利用者データが増える前に isolation の必要性を再評価する。

`cattower-realtime` は同じproduction account上で運用し、`TOWN_ROOM` bindingを`TownRoom`へ接続する。最初のnamespace migrationは`v1`の`new_sqlite_classes`として管理し、roomは`town:{placeId}:shard:{shardNumber}`ごとに決定的に取得する。`GET /connect`は許可originからのWebSocket Upgradeと、Web Workerと共有する`TOWN_TICKET_SECRET`で検証済みの短命ticketだけを受け付ける。

- `wrangler.jsonc` を使い、binding 型は `wrangler types` で生成する
- compatibility date はプロジェクト作成日を設定し、定期的に更新する
- `nodejs_compat` の要否は OpenNext/依存 package の要件に従う
- secret は Cloudflare Worker とローカル `.dev.vars` に別々に登録し、値は repository へ入れない
- observability を有効化し、sampling はデータ量を見て調整する
- production migration と deploy の順序を release checklist に固定する
- Web は Workers Builds で `main` から自動デプロイする。schema 依存の変更では push 前に `pnpm db:migrate` を実行する

## 17. Cost controls

- Streamは初期段階では有効化せず、動画機能を準備中とする。提供上限と予算を決定するまでStream費用を発生させない
- Stream は保存分数と配信分数の両方に予算 alert を設ける
- 開発中を含む production Stream の支出上限を resource 作成前に決める
- 利用者ごとの動画時間、合計保存分数、月間 upload に上限を設ける
- 動画の自動再生を既定で行わず、不要な配信分数を増やさない
- 上限到達時は feature flag または upload gate で新規動画を停止する
- private media の派生サイズを無制限に作らない
- Hibernatable WebSockets を使用する
- Durable Object は room shard 単位にしつつ、利用者が少ない段階で過剰分割しない
- Web Analytics event を必要最小限にする
- export file に有効期限を設けて R2 から削除する
- product analytics は「滞在時間最大化」を目的に収集しない

## 18. Architecture decisions to validate in spike

実装フェーズ最初の技術検証で、次を production 相当の binding で確認する。

1. OpenNext 上の Better Auth + D1 session
2. Next.js から R2/Stream binding へのアクセス
3. private image delivery の latency と cache behavior
4. Web Worker 発行 ticket を別 realtime Worker で検証
5. Durable Object WebSocket の hibernation/reconnect
6. block 更新が既存接続へ反映されるまでの遅延
7. R2 presigned PUT の署名、secret rotation、localhost/production CORS、upload 後の binding 検証
8. Images Binding の `.info()` と derivative 生成、入力上限、EXIF orientation、animated/巨大画像
9. iPhone の写真・MOV upload と orientation
10. FTS5 trigram の日本語検索、1〜2 文字 LIKE fallback、index size と write/query cost
11. Stream の保存・配信分数を計測し、想定上限で月額を試算する

検証で成立しない選定は、プロダクト仕様を変えず adapter 層で差し替える。
