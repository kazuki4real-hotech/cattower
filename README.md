# Cattower

Cattower は、猫との何気ない写真・動画・言葉・ご飯・おもちゃを、自分のために残して眺めるプライベートな Web サービスです。

投稿を他人に評価してもらうSNSではなく、猫との暮らしを自分のために記録するサービスです。記録は一つの共通フォームから作り、タグと任意のボードで整理します。交流したいときだけ、記録を一枚持たせて「お散歩」へ出かけられます。

## Status

プロダクト設計と主要画面のフロントエンド基盤を実装し、`cattower-web` として Cloudflare Workers へデプロイ済みです。`main` への push で本番が自動更新されます。Better Auth、Google OAuth、本番 D1、非公開 R2、新規登録直後だけ表示する3 stepオンボーディング、途中再開、猫プロフィール、初期レスポンスから表示する複数猫切り替え、文章・写真・日付・タグ・複数猫を保存する共通記録エディター、自動下書き、編集・soft delete・restore、おうちの実データ表示、「去年の今ごろ」と「3年前と今日」の実データ再発見、記録詳細、任意ボードの作成・名称変更・並び方変更・削除・記録追加・記録削除・手動並び替え、キーワード・日付・タグ・猫・メディアによる実データ検索、検索結果からのボード追加、家族招待、未読・既読を管理するWeb内通知、画像直接 upload、private画像配信、表示用WebP derivative、孤立・失敗画像の自動整理、runtime secrets まで設定済みです。Google OAuth callback後のD1 session、オンボーディング完了状態のredirect、再読み込み後のsession継続、認証済みブラウザからのR2直接uploadを本番確認済みです。認可境界はローカルのWorkers runtimeとD1 migrationを使う結合テストで継続検証します。お散歩用の `cattower-realtime` も本番へデプロイし、短命ticketによるWebSocket接続、`TownRoom` Durable Object のbindingとSQLite migrationを設定済みです。両WorkerのWorkers Logsと非機密structured loggingも設定済みです。動画はhousehold単位の有料機能として提供する方針で、価格・上限・支払手段を決定するまでStreamは有効化していません。ランダム再発見・お散歩に残るサンプルデータの置換が残っています。

本番 URL: https://cattower-web.kazuki-kitada.workers.dev/

お散歩 realtime health URL: https://cattower-realtime.kazuki-kitada.workers.dev/health

## Product principles

- 非公開を初期値にする
- 写真、動画、文章、物、出来事を同じ重さで扱う
- タイムラインと無限スクロールを主画面にしない
- いいね数、フォロワー数、連続投稿日数を表示しない
- 投稿や交流を義務にしない
- 古い記録を偶然見つけ直せるようにする
- 利用者が自分のデータを書き出せるようにする

## Documentation

- [ドキュメント一覧](docs/README.md)
- [既存サービス調査とポジショニング](docs/product-research.md)
- [プロダクト仕様書](docs/product-spec.md)
- [技術設計書](docs/technical-architecture.md)
- [データモデル](docs/data-model.md)
- [デザインガイドライン](docs/design-guidelines.md)
- [フロントエンド実装仕様](docs/frontend-implementation-spec.md)
- [デプロイ運用手順](docs/deployment-runbook.md)
- [実装タスク](docs/task-plan.md)

## Planned stack

- Next.js / React / TypeScript
- Cloudflare Workers via OpenNext
- Cloudflare D1 + Drizzle ORM
- Cloudflare R2 for images
- Cloudflare Images Binding for image inspection and derivatives
- Cloudflare Stream for videos
- Cloudflare Durable Objects + WebSocket Hibernation for お散歩
- Better Auth
- Tailwind CSS + Radix UI primitives
- Vitest / Testing Library / Playwright

技術選定の理由と運用方針は [技術設計書](docs/technical-architecture.md) に記載しています。

## Repository layout

```text
.
├── apps/
│   ├── web/                 # Next.js application and Cloudflare config
│   └── realtime/            # お散歩 Worker and Durable Object skeleton
├── packages/
│   ├── db/                  # Drizzle schema and D1 migrations
│   ├── domain/              # Shared validation, access policies, and domain constants
│   ├── observability/       # Safe structured request logging
│   └── ui/                  # Shared semantic React UI components
├── infra/                   # R2 CORS policy
├── docs/                    # Product and implementation documentation
├── package.json
└── pnpm-workspace.yaml
```

`packages/ui` は画面間で再利用する意味構造を持つ React component を管理し、見た目は `apps/web` の design token と stylesheet を参照します。

`packages/observability` は固定route名、status、所要時間、request ID、非機密error codeだけを出力します。完全なURL、query、cookie、token、本文、検索語、メディアURL、例外メッセージは渡しません。

## Development

Node.js と pnpm を用意し、リポジトリのルートで実行します。

```bash
pnpm install
cp apps/web/.dev.vars.example apps/web/.dev.vars
pnpm db:migrate
pnpm dev
```

ローカル URL は `http://localhost:3000` です。主な確認コマンドは次の通りです。

```bash
pnpm verify
pnpm build
pnpm cf:build
pnpm db:smoke
```

お散歩のrealtime Worker（内部名 `TownRoom`）のローカル確認は別のterminalで実行します。`TOWN_ROOM` bindingとSQLite migrationは設定済みですが、現段階では公開経路として `GET /health` だけを提供し、WebSocket endpointは公開しません。

```bash
pnpm --filter @cattower/realtime dev
curl http://localhost:8787/health
```

Cloudflare Workers Builds は production branch を `main` とし、次のコマンドで自動デプロイします。

```text
Build:  pnpm cf:build
Deploy: pnpm --filter @cattower/web exec wrangler deploy
```

Worker 名は `cattower-web` です。運用、確認、rollback は [デプロイ運用手順](docs/deployment-runbook.md) を参照してください。

基本方針は次の通りです。

- パッケージ管理は `pnpm`
- 当面は環境を分離せず、ローカルと本番 Worker が同じ production D1/R2 を使用する。ローカル操作も本番データを変更するため、検証用 account を使う
- D1 の変更は追跡可能な SQL migration として管理
- secret はリポジトリへ保存しない
- PR は作成せず、適切な実装粒度で `main` へ直接コミットして push する
- 実装と同じ作業で正本ドキュメントを更新し、古くなった文書は有効な判断を移してから削除する
- GitHub Actions と Cloudflare build command で lint、型検査、unit test、build を通す。E2E smoke は認証 credentials 設定後に追加する

## License

未定です。公開範囲を決定するまでライセンスは付与しません。
