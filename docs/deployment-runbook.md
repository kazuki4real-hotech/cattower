# Cattower デプロイ運用手順

- Status: Active v0.1
- Updated: 2026-07-14
- Scope: `cattower-web` の Cloudflare Workers build、deploy、確認、rollback

## 1. Current production setup

| Item              | Value                                              |
| ----------------- | -------------------------------------------------- |
| Platform          | Cloudflare Workers                                 |
| Worker            | `cattower-web`                                     |
| Production URL    | `https://cattower-web.kazuki-kitada.workers.dev/`  |
| Repository        | `kazuki4real-hotech/cattower`                      |
| Production branch | `main`                                             |
| Root directory    | `/`                                                |
| Build command     | `pnpm cf:build`                                    |
| Deploy command    | `pnpm --filter @cattower/web exec wrangler deploy` |
| Trigger           | push to `main`                                     |

初回 production deploy は 2026-07-14 に完了した。D1/R2/Images binding、runtime secrets、オンボーディングの永続化コードは接続済み。未ログイン状態のrouteとGoogle OAuth開始は本番smoke test済み。Googleログイン完了後のD1 sessionとR2 presigned uploadは認証済みブラウザでE2E確認する。独自ドメインを追加する場合も、このWorkers URLは運用確認用の既定URLとして維持する。

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
CI と production build は remote D1/R2 へ接続しないため、GitHub Actions に Cloudflare API token を登録しない。binding はデプロイ後の Worker runtime で解決する。

## 4. Post-deploy smoke test

最低限、次を確認する。

- `/` が `/onboarding/welcome` へ redirect する
- Google login 後に owner household が一つ作られる
- onboarding 3画面で表示名、猫、checkpointが再読み込み後も保持される
- JPEG/PNG/WebP のプロフィール画像を R2 へ直接 upload し、private media endpoint だけで表示できる
- `/home`、`/boards`、`/record`、`/walk` が表示される
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

## 7. D1, R2 and authentication operations

初期運用は environment を分離せず、本番とローカルで次を共用する。

| Resource | Name                                  |
| -------- | ------------------------------------- |
| D1       | `cattower-db-production`              |
| R2       | `cattower-media-production` (private) |

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
```

6つのruntime secretは2026-07-14に暗号化して登録済み。`BETTER_AUTH_URL` は末尾スラッシュなしの `https://cattower-web.kazuki-kitada.workers.dev` とする。Google Cloud Console の redirect URI は `http://localhost:3000/api/auth/callback/google` と `https://cattower-web.kazuki-kitada.workers.dev/api/auth/callback/google`。R2 API token は Object Read & Write を `cattower-media-production` だけに限定する。secretを画面、ログ、文書へ表示した場合は直ちに失効・再発行する。

`infra/r2-cors.production.json` に production origin を追加してから適用する。

```bash
pnpm --filter @cattower/web exec wrangler r2 bucket cors set cattower-media-production --file ../../infra/r2-cors.production.json --force
```

CORS は localhost 2 origin と `https://cattower-web.kazuki-kitada.workers.dev`、`PUT`、`Content-Type`、`x-amz-meta-asset-id` だけを許可する。独自ドメインを追加した場合は、その origin も明示的に追加する。

Stream と Durable Objects の resource は未作成。追加時に本節を更新する。

## 8. References

- [Cloudflare Workers Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
- [Cloudflare build branches](https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/)
- [OpenNext Cloudflare get started](https://opennext.js.org/cloudflare/get-started)
- [Wrangler versions and deployments](https://developers.cloudflare.com/workers/configuration/versions-and-deployments/)
