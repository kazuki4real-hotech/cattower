# Cattower documentation

このディレクトリは、Cattower のプロダクト判断と実装判断を残すための正本です。README は入口に留め、変更理由や受け入れ条件はここで管理します。

## Documents

| 文書 | 内容 | 主な読者 |
| --- | --- | --- |
| [既存サービス調査](product-research.md) | 競合、Instagram との棲み分け、狙う空白 | 全員 |
| [プロダクト仕様書](product-spec.md) | 目的、体験、機能、MVP、非機能要件 | 全員 |
| [技術設計書](technical-architecture.md) | 構成、技術選定、境界、セキュリティ、運用 | 開発者 |
| [データモデル](data-model.md) | エンティティ、関係、公開範囲、保持方針 | 開発者 |
| [デザインガイドライン](design-guidelines.md) | 色トークン、タイポ、コンポーネント、UI 実装プロセス | 開発者・デザイン |
| [フロントエンド実装仕様](frontend-implementation-spec.md) | 画面 route、共通 UI、オンボーディング、プロトタイプ移行 | 開発者・デザイン |
| [デプロイ運用手順](deployment-runbook.md) | Cloudflare Workers Builds、手動確認、ログ、rollback | 開発者・運用 |
| [実装タスク](task-plan.md) | フェーズ、依存関係、完了条件 | 開発者・進行管理 |

## Source of truth

- プロダクト挙動は `product-spec.md` を優先する
- 市場前提とポジショニングは `product-research.md` に残す
- 技術的な実現方法は `technical-architecture.md` を優先する
- テーブルとデータライフサイクルは `data-model.md` を優先する
- 色・UI トークンとコンポーネント方針は `design-guidelines.md` を優先する
- 画面 route と初期 UI の実装境界は `frontend-implementation-spec.md` を参照する
- build、deploy、確認、rollback の手順は `deployment-runbook.md` を正本とする
- 実装順と進捗は `task-plan.md` を更新する
- 仕様変更時は、コードより先に該当文書を更新する

## Decision status

文書内の判断は次の語で区別します。

- **決定**: MVP で採用する
- **候補**: 実装前の検証で変更できる
- **将来**: MVP の対象外
- **未決定**: プロダクト判断が必要

## Current decisions

- **決定**: サービス名は当面 `Cattower`
- **決定**: 個人アーカイブを中心にし、交流は任意の副次体験にする
- **決定**: デフォルト非公開、数値的な人気指標なし
- **決定**: Web first、モバイル優先のレスポンシブ UI
- **決定**: Next.js を Cloudflare Workers にデプロイする
- **決定**: Web Worker 名は `cattower-web` とし、`main` への push を Workers Builds で本番へ自動デプロイする
- **将来**: お散歩は初期リリースから外し、Phase 6 全体をリリース後に再検討する。初期リリースでは画面、設定、接続券発行 API を公開しない
- **決定**: 将来お散歩を実装する場合は別 Worker と Durable Objects を使う（内部名 `town_*`）
- **決定**: 猫単位の mute と飼い主単位の block を分離する
- **決定**: お散歩は利用者の opt-in と owner 管理の猫ごとの参加設定を両方必要とする
- **決定**: Web 内通知と consented product event を D1 に最小限永続化する
- **決定**: 画像は R2 に保存し、Images Binding で検査・派生生成する
- **決定**: 初期運用では environment を分離せず、ローカルと本番 Worker で同じ production D1/R2 を使用する
- **決定**: 両Workerのログは10% samplingの非機密structured logとし、完全なrequest URLを含むinvocation logとtracesは無効化する
- **決定**: パステル基調のパレット（primary `#80beaf`、secondary `#b3ddd1` / `#d1dce2` / `#f5b994` / `#ee9c6a`）とニュートラル階調を採用する
- **決定**: UI 実装前に taste-skill を適用し、slop を避ける
- **未決定**: 正式ロゴ、独自ドメイン、料金プラン
