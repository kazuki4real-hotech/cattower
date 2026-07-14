# Cattower

Cattower は、猫との何気ない写真・動画・言葉・ご飯・おもちゃを、自分のために残して眺めるプライベートな Web サービスです。

投稿を他人に評価してもらう SNS ではなく、猫との暮らしを収蔵する「私設ミュージアム」を目指します。交流したいときだけ、記憶を一枚持たせて疑似散歩空間「猫町」へ出かけられます。

## Status

プロダクト設計と主要 14 画面のフロントエンド基盤を実装し、`cattower-web` として Cloudflare Workers へ初回デプロイ済みです。`main` への push で本番が自動更新されます。Better Auth、Google OAuth endpoint、本番 D1、非公開 R2、オンボーディング永続化、画像直接 upload API まで実装済みです。Google/R2 credentials の登録と本番 smoke test、通常画面のサンプルデータ置換、猫町 realtime は未完了です。

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
- Cloudflare Durable Objects + WebSocket Hibernation for 猫町
- Better Auth
- Tailwind CSS + Radix UI primitives
- Vitest / Testing Library / Playwright

技術選定の理由と運用方針は [技術設計書](docs/technical-architecture.md) に記載しています。

## Repository layout

```text
.
├── apps/
│   └── web/                 # Next.js application and Cloudflare config
├── packages/
│   ├── db/                  # Drizzle schema and D1 migrations
│   └── domain/              # Shared validation and domain constants
├── infra/                   # R2 CORS policy
├── docs/                    # Product and implementation documentation
├── prototype/               # HTML prototype kept for visual comparison
├── package.json
└── pnpm-workspace.yaml
```

`apps/realtime` と `packages/ui` は後続フェーズで追加します。

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
