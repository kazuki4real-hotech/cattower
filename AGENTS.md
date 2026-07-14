# AGENTS.md

Cattower のコード／ドキュメントを扱うエージェント向けの入口。人間の入口は [README.md](README.md)。

## What this is

Cattower は、猫との写真・動画・言葉・ご飯・おもちゃを自分のために収蔵するプライベートな Web サービス。SNS ではなく「私設ミュージアム」を目指し、交流は任意の疑似散歩空間「猫町」に限定する。主要画面の Next.js 基盤は Cloudflare Workers へデプロイ済みで、現在はサンプルデータから永続化へ移行する段階にある。

## Document map（正本の場所）

作業前に関連文書を読む。仕様変更はコードより先に該当文書へ反映する。

| 文書 | 正本とする内容 |
| --- | --- |
| [docs/product-research.md](docs/product-research.md) | 市場前提、競合、ポジショニング |
| [docs/product-spec.md](docs/product-spec.md) | プロダクト挙動、機能、MVP、非機能要件 |
| [docs/technical-architecture.md](docs/technical-architecture.md) | 構成、技術選定、境界、セキュリティ、運用 |
| [docs/data-model.md](docs/data-model.md) | テーブル、関係、公開範囲、データライフサイクル |
| [docs/design-guidelines.md](docs/design-guidelines.md) | 色トークン、タイポ、コンポーネント、UI 実装プロセス |
| [docs/frontend-implementation-spec.md](docs/frontend-implementation-spec.md) | 画面 route、共通 UI、フロントエンド実装境界 |
| [docs/deployment-runbook.md](docs/deployment-runbook.md) | Cloudflare Workers の build、deploy、確認、rollback |
| [docs/task-plan.md](docs/task-plan.md) | 実装フェーズ、依存、完了条件 |

判断の状態語（**決定** / **候補** / **将来** / **未決定**）の意味は [docs/README.md](docs/README.md) を参照。

## Working rules

- コード、設定、デザイン、デプロイ、文書を変更する作業では、必ず [cattower-main-workflow](.agents/skills/cattower-main-workflow/SKILL.md) を読み、PR を作らず `main` への適切な粒度の直接コミット、文書更新、push、同期確認まで完了する
- 仕様に迷ったら該当正本を優先し、矛盾を見つけたら報告してから直す
- 挙動の変更は「product-spec → technical-architecture / data-model → task-plan → コード」の順で整合させる
- 判断を変えるときは該当文書の決定状態語も更新する
- secret はコミットしない。structured log に本文・token・cookie・署名 URL を含めない（[technical-architecture.md](docs/technical-architecture.md) §11, §14）

## UI implementation rule（必須）

UI コンポーネントの新規作成・大きなレイアウト変更・リデザインを行う前に、必ず **[taste-skill](https://github.com/Leonxlnx/taste-skill)**（`design-taste-frontend`, Anti-Slop Frontend Framework）を読み込んで適用する。凡庸で反復的な AI 生成 UI（slop）を避けるため。

- 導入: `npx skills add https://github.com/Leonxlnx/taste-skill`、または SKILL.md を会話に読み込む
- 推奨ダイヤル: `DESIGN_VARIANCE 2–3` / `MOTION_INTENSITY 4`（オンボーディングは 6 まで）/ `VISUAL_DENSITY 2–3`
- taste-skill は配置・階層・余白の質を上げるために使う。**色・制約・アクセシビリティは [docs/design-guidelines.md](docs/design-guidelines.md) と WCAG 2.2 AA が優先**し、taste-skill がこれを上書きしない
- 生の hex を直書きせず、design-guidelines のトークン（CSS 変数）を参照する

## Planned stack / conventions

技術選定は [technical-architecture.md](docs/technical-architecture.md)、開発方針は [README.md](README.md) を参照。要点のみ:

- パッケージ管理は `pnpm` workspaces
- Next.js (App Router) を OpenNext で Cloudflare Workers へ、猫町は別 Worker + Durable Objects
- D1 + Drizzle、R2（画像）、Stream（動画）、Better Auth
- `main` へ入る変更は lint / typecheck / unit / E2E smoke を通す
