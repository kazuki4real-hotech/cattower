# Cattower デプロイ運用手順

- Status: Active v0.1
- Updated: 2026-07-14
- Scope: `cattower-web` の Cloudflare Workers build、deploy、確認、rollback

## 1. Current production setup

| Item | Value |
| --- | --- |
| Platform | Cloudflare Workers |
| Worker | `cattower-web` |
| Repository | `kazuki4real-hotech/cattower` |
| Production branch | `main` |
| Root directory | `/` |
| Build command | `pnpm cf:build` |
| Deploy command | `pnpm --filter @cattower/web exec wrangler deploy` |
| Trigger | push to `main` |

初回 production deploy は 2026-07-14 に完了した。現在の production は UI と画面遷移を確認する段階で、認証と永続データは接続していない。公開 hostname は Cloudflare 管理画面を正本とし、独自ドメイン決定前に文書へ推測値を記載しない。

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

通常のフロントエンド変更ではリポジトリルートから次を実行する。

```bash
pnpm typecheck
pnpm build
pnpm cf:build
pnpm --filter @cattower/web exec wrangler deploy --dry-run
```

`pnpm cf:build` は `.open-next/worker.js` と `.open-next/assets` を生成する。生成物は commit しない。

## 4. Post-deploy smoke test

最低限、次を確認する。

- `/` が `/onboarding/welcome` へ redirect する
- onboarding 4 画面を順に移動できる
- `/home`、`/collections`、`/add`、`/town` が表示される
- 写真、M PLUS Rounded 1c、Material Symbols Rounded が読み込まれる
- mobile navigation と desktop navigation が操作できる
- Worker の error rate と logs に新規例外がない
- secret、cookie、本文、署名 URL が logs に出ていない

## 5. Logs and versions

ログを一時的に確認する。

```bash
pnpm --filter @cattower/web exec wrangler tail cattower-web
```

versions と deployments を確認する。

```bash
pnpm --filter @cattower/web exec wrangler versions list
pnpm --filter @cattower/web exec wrangler deployments list
```

ログ本文を issue や文書へコピーする前に、token、cookie、利用者本文、署名 URL が含まれないことを確認する。

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

## 7. Future resource deployment

D1、R2、Stream、Durable Objects を追加した後は、environment ごとの resource と migration 手順を本書へ追記する。特に production D1 migration は deploy 前に staging で適用・検証し、rollback できない schema change を単独で自動実行しない。

## 8. References

- [Cloudflare Workers Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
- [Cloudflare build branches](https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/)
- [OpenNext Cloudflare get started](https://opennext.js.org/cloudflare/get-started)
- [Wrangler versions and deployments](https://developers.cloudflare.com/workers/configuration/versions-and-deployments/)
