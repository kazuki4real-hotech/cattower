# Cattower デプロイ運用手順

- Status: Active v0.1
- Updated: 2026-07-18
- Scope: `cattower-web` と `cattower-realtime` の Cloudflare Workers build、deploy、確認、rollback

## 1. Current production setup

| Item              | Value                                             |
| ----------------- | ------------------------------------------------- |
| Platform          | Cloudflare Workers                                |
| Worker            | `cattower-web`                                    |
| Production URL    | `https://cattower-web.kazuki-kitada.workers.dev/` |
| Repository        | `kazuki4real-hotech/cattower`                     |
| Production branch | `main`                                            |
| Root directory    | `/`                                               |
| Build command     | `pnpm cf:build`                                   |
| Deploy command    | `pnpm --filter @cattower/web run deploy`          |
| Trigger           | push to `main`                                    |

初回 production deploy は 2026-07-14 に完了した。D1/R2/Images binding、runtime secrets、オンボーディングの永続化コードは接続済み。2026-07-15にGoogle login/logout、7日session、再読み込み後のsession継続、オンボーディング完了状態のredirect、認証済みブラウザからのR2 presigned upload、metadata/decode検査、512×512 WebP derivative、private画像配信を本番確認した。独自ドメインを追加する場合も、このWorkers URLは運用確認用の既定URLとして維持する。

2026-07-15 に `0003_remove_memory_preferences.sql` と `0004_onboarding_flow.sql` を production D1 へ適用済み。既存行の `onboarding_prompted_at` は backfill 済みで、新規利用者だけが登録直後の自動オンボーディング対象になる。

同日に `0009_remove_cat_theme_and_archive.sql` を production D1 へ適用済み。猫のテーマ色と保管日時を削除し、既存のオンボーディング到達値は最大 `3` へ正規化した。適用後に既存 user・cat・preferences の保持、外部キー整合性、削除列が存在しないことを確認した。

realtime Workerも2026-07-14に初回production deployを完了した。2026-07-15にWeb/Realtime両Workerへ同一の`TOWN_TICKET_SECRET`を登録し、5分signed ticketによるproduction WebSocket upgradeと`connection.ready`応答を確認した。同日、20秒idle後も接続IDが復元され、instance generationが変化するhibernation smoke testを完了した。

| Item            | Value                                                        |
| --------------- | ------------------------------------------------------------ |
| Worker          | `cattower-realtime`                                          |
| Health URL      | `https://cattower-realtime.kazuki-kitada.workers.dev/health` |
| Deploy command  | `pnpm --filter @cattower/realtime exec wrangler deploy`      |
| Durable binding | `TOWN_ROOM` → `TownRoom`                                     |
| Migration       | `v1` / SQLite-backed `TownRoom`                              |
| Public boundary | `GET /health`、signed ticket必須の`GET /connect`             |

## 2. Normal release flow

1. [cattower-main-workflow](../.agents/skills/cattower-main-workflow/SKILL.md) に従い、実装と関連文書を更新する
2. 変更に応じた検証を行う
3. 適切な粒度で `main` に直接コミットする
4. `git push origin main` を実行する
5. Cloudflare Workers Builds の build が成功したことを確認する
6. production URL で主要 route と静的 asset を smoke test する
7. `HEAD`、`main`、`origin/main` の同期と clean worktree を確認する

Cloudflare 管理画面で production branch を `main` 以外へ変更しない。非本番ブランチ build を有効にする場合は version upload に留め、production へ promote しない。

## 3. Required local validation

通常の変更ではリポジトリルートから次を実行する。`pnpm cf:build` も内部で `pnpm verify` を実行する。

```bash
pnpm verify
pnpm build
pnpm cf:build
pnpm --filter @cattower/web exec wrangler deploy --dry-run
```

`pnpm cf:build` は `.open-next/worker.js` と `.open-next/assets` を生成する。生成物は commit しない。
`cattower-web`は`wrangler.jsonc`の`minify: true`を使用する。dry-runのgzip sizeが契約中planのWorker上限を超えた場合はdeployせず、不要な依存・重複bundleを減らす。上限回避だけを理由にplanを変更しない。
CI と production build は remote D1/R2 へ接続しないため、GitHub Actions に Cloudflare API token を登録しない。binding はデプロイ後の Worker runtime で解決する。

realtime Workerを変更した場合は、production deploy前に追加で次を実行する。

```bash
pnpm --filter @cattower/realtime cf-typegen
pnpm --filter @cattower/realtime test
pnpm --filter @cattower/realtime typecheck
pnpm --filter @cattower/realtime build
```

## 4. Post-deploy smoke test

最低限、次を確認する。

- 未ログインの `/` が公開入口を表示し、ログイン済みの `/` が `/home` へ redirect する
- 公開入口が Snow `#ffffff` 背景で表示され、透明背景のブランドビジュアルと共通ワードマークが欠けずに表示される
- Google login 後に owner household が一つ作られる
- 設定からログアウトするとsessionが失効してログイン画面へ戻り、Googleで再ログインできる
- 再ログイン後の再読み込みでsessionが継続し、期限更新設定が有効である
- 新規登録 callback 直後だけ onboarding が始まり、既存利用者の login では `/home` へ進む
- onboarding 3 step で表示名、猫、写真、checkpoint が再読み込み後も保持される
- 未完了状態で通常画面へ戻ると再開バナーが表示される
- JPEG/PNG/WebP のプロフィール画像を R2 へ直接 upload し、private media endpoint だけで表示できる
- `/home`、`/boards`、`/record`、`/walk` が表示される
- 写真、M PLUS Rounded 1c、Material Symbols Rounded が読み込まれる
- mobile navigation と desktop navigation が操作できる
- Worker の error rate と logs に新規例外がない
- secret、cookie、本文、署名 URL が logs に出ていない
- realtimeの`/health`が`200`と`{"service":"cattower-realtime","status":"ok"}`を返す
- realtimeの未実装routeがstructured `404`を返す
- realtimeの`/connect`が通常HTTPを`426`、不正ticketを`401`、許可外originを`403`で拒否する
- Web Worker発行の5分以内ticketで`/connect`が`101`へupgradeし、`connection.ready`を返す
- WebSocketをidleにしてDOをhibernateさせた後、`connection.ping`へ同じconnection IDと新しいgeneration IDを返す

## 5. Logs and versions

両WorkerはWorkers Logsを有効化し、10% head sampling、invocation log無効、traces無効で運用する。アプリログは固定route名、status、所要時間、request ID、非機密error codeだけをJSON objectで出力する。

ログを一時的に確認する。real-time logの出力自体をissueや文書へ貼らず、必要な非機密fieldだけを転記する。

```bash
pnpm --filter @cattower/web exec wrangler tail cattower-web --format json
pnpm --filter @cattower/realtime exec wrangler tail cattower-realtime --format json
```

versions と deployments を確認する。

```bash
pnpm --filter @cattower/web exec wrangler versions list
pnpm --filter @cattower/web exec wrangler deployments list
```

`event`、`requestId`、`service`、`route`、`status`、`durationMs`、`errorCode`以外のcustom fieldが追加されていないことを確認する。完全なURL、query、token、cookie、Authorization header、利用者本文、検索語、メディアURL、署名URL、例外メッセージ、stackが見つかった場合はログの共有を止め、該当コードを修正してcredentialを必要に応じて失効する。

## 6. Rollback

production 障害時は、まず影響範囲を確認して新規 push を止める。直前の安定 version が明確なら rollback する。

```bash
pnpm --filter @cattower/web exec wrangler versions list
pnpm --filter @cattower/web exec wrangler rollback
```

特定 version を指定する場合だけ version ID を渡す。

```bash
pnpm --filter @cattower/web exec wrangler rollback <VERSION_ID>
```

rollback 後は production smoke test を行い、原因を修正した新しい commit を `main` へ push する。published history の書き換えや force push は行わない。

## 7. D1, R2 and authentication operations

初期運用は environment を分離せず、本番とローカルで次を共用する。

| Resource       | Name                                  |
| -------------- | ------------------------------------- |
| D1             | `cattower-db-production`              |
| R2             | `cattower-media-production` (private) |
| Durable Object | `TownRoom` via `TOWN_ROOM` binding    |

2026-07-15にempty state確認のため、production D1の認証・利用者設定・household・猫・招待・通知・media metadataを全件削除した。`user`、`session`、`account`、`verification`、`user_preferences`、`households`、`household_members`、`household_invites`、`cats`、`media_assets`、`notifications`が0件であることを確認し、`d1_migrations` 8件とschemaは保持した。Cloudflare管理の`_cf_KV`はD1 APIからの読み書きが許可されない内部表のため操作対象外とし、R2 objectもこのD1リセットには含めていない。

同日にmigration `0010_entries_and_media.sql`をproduction D1へ適用し、記録本体、対象猫、タグ、画像の関連テーブルと`media_assets.purpose`を追加した。foreign key checkが空であることを確認後、Worker version `ca02a220-33cd-4bdc-b090-033c4e80fe65`をdeployした。初期実装は1記録につき画像1枚までで、動画は未提供とする。

続けてmigration `0011_single_entry_draft.sql`を適用し、同じhousehold・作成者の未削除draftを1件に制限するpartial unique indexを追加した。重複draftが0件であることとforeign key checkを確認後、自動下書き、編集、soft delete、restoreを含むWorker version `94e5c39e-8143-4045-b651-c9249a8ab213`をdeployした。

2026-07-17に孤立・失敗R2メディアのcleanupを追加し、Worker version `fa93d7de-eb7a-488c-ac08-74e312c7950e`をdeployした。Cronは毎日`03:17 UTC`（`12:17 JST`）に1回最大50件を処理する。deploy前のproduction D1確認では削除候補は0件だった。初回実行後はWorkers Logsの`media_cleanup_completed`で件数だけを確認し、asset IDやobject keyをログへ追加しない。

同日にmigration `0012_boards.sql`を適用し、任意ボードとボード内の記録配置テーブルを追加した。ボード0件、foreign key checkが空であることを確認後、ボードの作成・名称変更・並び方変更・削除を含むWorker version `c5cc94a1-d944-4355-9960-a3d7ab6c4f90`をdeployした。記録の追加・削除・手動並び替えはP4-04で有効化する。

2026-07-18にボードへの記録追加・削除・手動並び替えを含むWorker version `3a63c788-4c42-4351-a13f-036a2cfd53b3`をdeployした。schema変更はない。通常bundleが3 MiB上限をわずかに超えたため`minify: true`を正本設定へ追加し、gzip size `2654.53 KiB`、startup `28 ms`を確認して反映した。

同日にキーワード・日付・tag・猫・mediaによる実データ検索と、検索結果からのボード追加を含むWorker version `3add05a5-7202-43f8-9b4e-f5ce70152108`をdeployした。schema変更はない。gzip size `2659.65 KiB`、startup `32 ms`を確認し、未認証の`/search`と`/boards`が`307`で公開入口へ戻ること、board item APIが`401`を返すことを確認した。

同日に選択中の猫と利用者タイムゾーンに連動する「去年の今ごろ」を実データ化し、Worker version `c273fc5a-8bfb-418e-8b83-c54f29369ca0`をdeployした。schema変更はない。gzip size `2661.28 KiB`、startup `34 ms`を確認し、公開入口が`200`、未認証の`/home`・`/search`・`/boards`が`307`で公開入口へ戻ること、board item APIが`401`を返すことを確認した。

同日に「3年前と今日」を実データ化し、1年・3年の再発見を共通queryと一つの表示領域へ統合したWorker version `e6ee6787-44a5-4246-8638-35e25669d6a4`をdeployした。schema変更はない。gzip size `2661.52 KiB`、startup `31 ms`を確認し、公開入口が`200`、未認証の`/home`・`/search`・`/boards`が`307`で公開入口へ戻ること、board item APIが`401`を返すことを確認した。

同日に日付・household・選択中の猫から日単位で安定選択する「今日の一枚」を実データ化し、Worker version `62a03c81-d007-4fa3-bbfb-e39899a9e0d3`をdeployした。schema変更はない。gzip size `2661.93 KiB`、startup `31 ms`を確認し、公開入口が`200`、未認証の`/home`・`/search`・`/boards`が`307`で公開入口へ戻ること、board item APIが`401`を返すことを確認した。

同日に検索結果の50件単位pagination、明確な見終わり、おうちの最近の記録から検索への「続きを見る」を追加し、Worker version `3708c78a-9fe3-4eae-bb25-05be984d8ee5`をdeployした。schema変更はない。gzip size `2662.58 KiB`、startup `34 ms`を確認し、公開入口が`200`、未認証の`/home`・`/search?page=2`・`/boards`が`307`で公開入口へ戻ること、board item APIが`401`を返すことを確認した。

同日におうち・検索・ボード・オンボーディング完了のempty stateを投稿を急かさない文言と補助導線へ統一し、Worker version `2fccfdfc-e2d3-4a0c-9d7f-b349562284ec`をdeployした。schema変更はない。gzip size `2662.69 KiB`、startup `29 ms`を確認し、公開入口が`200`、未認証の`/home`・`/search?page=2`・`/boards`が`307`で公開入口へ戻ること、board item APIが`401`を返すことを確認した。

同日にP4のアクセシビリティQAを行い、reduced motionの即時表示、mobile navigationと猫選択の状態属性、skip linkのfocus先、破壊操作のfocus管理、ボード操作のlive region、補助色contrastを改善したWorker version `037291b8-a11f-43f2-a49a-9d77f74d53ea`をdeployした。schema変更はない。gzip size `2663.95 KiB`、startup `24 ms`を確認した。公開入口はmain landmarkとh1が各1件、代替文なし画像と名前のないbuttonが0件で、公開入口が`200`、未認証の`/home`・`/search?page=2`・`/boards`が`307`、board item APIが`401`であることを確認した。

schema 変更を含む push の前に migration を適用する。

```bash
pnpm db:migrate
pnpm db:smoke
```

ローカルも `remote: true` で同じ D1/R2 に接続する。`.dev.vars` を作成して credentials を登録するが commit しない。

```bash
cp apps/web/.dev.vars.example apps/web/.dev.vars
```

Cloudflare Worker へ secret を対話入力する。値を shell history や文書へ残さない。

```bash
pnpm --filter @cattower/web exec wrangler secret put BETTER_AUTH_URL --name cattower-web
pnpm --filter @cattower/web exec wrangler secret put GOOGLE_CLIENT_ID --name cattower-web
pnpm --filter @cattower/web exec wrangler secret put GOOGLE_CLIENT_SECRET --name cattower-web
pnpm --filter @cattower/web exec wrangler secret put R2_ACCESS_KEY_ID --name cattower-web
pnpm --filter @cattower/web exec wrangler secret put R2_SECRET_ACCESS_KEY --name cattower-web
pnpm --filter @cattower/web exec wrangler secret put TOWN_TICKET_SECRET --name cattower-web
pnpm --filter @cattower/realtime exec wrangler secret put TOWN_TICKET_SECRET --name cattower-realtime
```

`TOWN_TICKET_SECRET`は32 byte以上の同一乱数値を両Workerへ登録し、repositoryやshell historyへ値を残さない。その他6つのruntime secretは2026-07-14に暗号化して登録済み。`BETTER_AUTH_URL` は末尾スラッシュなしの `https://cattower-web.kazuki-kitada.workers.dev` とする。Google Cloud Console の redirect URI は `http://localhost:3000/api/auth/callback/google` と `https://cattower-web.kazuki-kitada.workers.dev/api/auth/callback/google`。R2 API token は Object Read & Write を `cattower-media-production` だけに限定する。secretを画面、ログ、文書へ表示した場合は直ちに失効・再発行する。

`infra/r2-cors.production.json` に production origin を追加してから適用する。

```bash
pnpm --filter @cattower/web exec wrangler r2 bucket cors set cattower-media-production --file ../../infra/r2-cors.production.json --force
```

CORS は localhost 2 origin と `https://cattower-web.kazuki-kitada.workers.dev`、`PUT`、`Content-Type`、`x-amz-meta-asset-id` だけを許可する。独自ドメインを追加した場合は、その origin も明示的に追加する。

`TownRoom` namespaceはSQLite-backed migration `v1`で作成済み。realtime Workerの設定変更をデプロイする場合は、dry-run後にmigrationを含めて手動deployし、healthを確認する。

```bash
pnpm --filter @cattower/realtime build
pnpm --filter @cattower/realtime exec wrangler deploy
curl https://cattower-realtime.kazuki-kitada.workers.dev/health
```

Streamは未作成。動画はhousehold単位の有料機能として提供する方針だが、価格、保存・upload上限、支払手段、解約後の猶予期間と運用予算を決定するまでbindingを追加しない。

## 8. References

- [Cloudflare Workers Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
- [Cloudflare build branches](https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/)
- [OpenNext Cloudflare get started](https://opennext.js.org/cloudflare/get-started)
- [Wrangler versions and deployments](https://developers.cloudflare.com/workers/configuration/versions-and-deployments/)
- [Cloudflare Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
- [OpenNext custom Worker](https://opennext.js.org/cloudflare/howtos/custom-worker)
- [Durable Objects migrations](https://developers.cloudflare.com/durable-objects/reference/durable-objects-migrations/)
