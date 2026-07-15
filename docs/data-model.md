# Cattower データモデル

- Status: Conceptual v0.2
- Updated: 2026-07-14

この文書は論理モデルを定義する。実際の Drizzle schema と migration は実装開始時に作成し、名称変更があれば本書も同時に更新する。

## 1. Conventions

- 主キーは UUID の `TEXT`
- timestamp は UTC の integer
- boolean は D1/SQLite の integer `0 | 1`
- enum は `TEXT` + application validation、必要に応じて CHECK constraint
- すべての user-owned table に `created_at`、`updated_at`
- 関係を隠すためだけの hard delete はせず、認可取消しは即時、物理削除は非同期でもよい
- user-facing sequence number を主キーにしない

## 2. Relationship overview

```text
users ──< household_members >── households ──< cats
                                              │
                                              ├──< entries ──< entry_media >── media_assets
                                              │       └──< entry_tags >── tags
                                              │
                                              ├──< boards ──< board_items
                                              └──< town_cards

entries/boards ──< share_links
cats ──< town_encounters
users/cats ──< town_reactions
users ──< cat_mutes
users ──< blocks
users ──< reports
users ──< notifications
users ──< product_events / user_activity_days
```

Better Auth が要求する `user`、`session`、`account`、`verification` table は auth schema として管理し、domain table からは `user.id` のみ参照する。実装 schema は `packages/db/src/schema.ts`、適用順は `packages/db/migrations/` の SQL migration を正本とする。

## 3. Core entities

### user

Better Auth の user を正本にする。domain 側で必要な追加設定は `user_preferences` に分離する。

### user_preferences

| Column                  | Notes                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------ |
| user_id                 | PK/FK user                                                                           |
| locale                  | default `ja`                                                                         |
| timezone                | 表示用。公開しない                                                                   |
| town_enabled            | 利用者本人の参加同意。default false                                                  |
| town_digest             | `off` / `daily`                                                                      |
| reduced_motion_override | nullable; normally system setting                                                    |
| analytics_consent       | regional requirement に応じる                                                        |
| onboarding_step         | `0` profile / `1` cat / `2` photo / `3` theme / `4` complete preparation             |
| active_household_id     | nullable。現在表示・保存先として選択中の active membership の household              |
| active_cat_id           | nullable。active household 内で現在表示対象として選択中の未保管 cat                  |
| onboarding_prompted_at  | nullable。新規登録 callback から自動案内した時刻。既存利用者は migration で backfill |
| onboarding_completed_at | nullable。完了時刻                                                                   |

### households

一匹以上の猫と家族メンバーをまとめる認可境界。

| Column                | Notes                 |
| --------------------- | --------------------- |
| id                    | PK                    |
| name                  | internal display name |
| owner_user_id         | ownership anchor      |
| deletion_requested_at | nullable              |

初回 onboarding で利用者が owner となる household を一つ自動作成する。一人の利用者が owner になれる household は MVP では一つとし、招待された複数の household には editor として参加できる。
選択中の household は `user_preferences.active_household_id` に保存し、利用時に active な `household_members` が存在することを再検証する。無効な選択値は owner household、または参加中の先頭 household に戻す。

### household_members

| Column       | Notes                            |
| ------------ | -------------------------------- |
| household_id | composite unique with user_id    |
| user_id      | FK users                         |
| role         | `owner` / `editor`               |
| status       | `invited` / `active` / `revoked` |
| invited_by   | FK users                         |
| joined_at    | nullable                         |

招待 token は平文保存せず、別 `household_invites` table に hash と期限を置く。

### household_invites

| Column                    | Notes                                        |
| ------------------------- | -------------------------------------------- |
| id                        | PK                                           |
| household_id              | invitation target                            |
| token_hash                | unique SHA-256 hash。平文 token は保存しない |
| created_by                | owner user                                   |
| role                      | MVP は `editor` 固定                         |
| expires_at                | 発行から7日                                  |
| accepted_at / accepted_by | nullable。一回限りの承認状態                 |
| revoked_at                | nullable。承認前の取消時刻                   |

期限切れ・承認済み・取消済みの token は即時拒否する。監査と乱用調査に必要な短期間を経て削除対象とする。

### cats

| Column           | Notes                                                           |
| ---------------- | --------------------------------------------------------------- |
| id               | PK                                                              |
| household_id     | authorization boundary                                          |
| name             | required                                                        |
| nickname         | nullable                                                        |
| birth_date       | nullable, exact date when known                                 |
| birth_precision  | `day` / `month` / `year` / `unknown`                            |
| adoption_date    | nullable                                                        |
| profile_asset_id | nullable FK media_assets                                        |
| theme_color      | approved palette token, not arbitrary CSS                       |
| life_status      | `living` / `memorial`                                           |
| town_access      | `disabled` / `owners_only` / `household_members`; owner-managed |
| archived_at      | nullable                                                        |

猫は必ず一つの household に所属する。お散歩への接続は、接続者の `town_enabled` と猫の `town_access` の両方を評価する。既存DB・protocolとの互換性のため、内部名は当面 `town_*` を維持する。
猫の保管は `archived_at` を設定する soft archive とし、記録との関係を残す。復元時は `archived_at` を `null` に戻す。

## 4. Entries

### entries

| Column             | Notes                                       |
| ------------------ | ------------------------------------------- |
| id                 | PK                                          |
| household_id       | denormalized authorization filter           |
| primary_cat_id     | main cat; additional cats via entry_cats    |
| author_user_id     | creator                                     |
| title              | nullable                                    |
| body               | nullable plain text/limited rich text       |
| occurred_at        | event time                                  |
| occurred_precision | `minute` / `day` / `month`                  |
| status             | `draft` / `ready` / `processing` / `failed` |
| version            | optimistic update integer                   |
| deleted_at         | nullable                                    |

初期公開範囲を entries の単純な `public` flag にしない。おうちの entry は常に private resource とし、家族 membership、share link、town card という別 resource が限定的な view を作る。

### entry_cats

複数猫が写る記録に対応する join table。

| Column     | Notes         |
| ---------- | ------------- |
| entry_id   | composite PK  |
| cat_id     | composite PK  |
| sort_order | display order |

### tags / entry_tags

tag は household 内で一意。case/Unicode を正規化した `normalized_name` を持つ。記録作成時に0件以上を指定できる。

## 5. Media

### media_assets

| Column            | Notes                                                                   |
| ----------------- | ----------------------------------------------------------------------- |
| id                | PK                                                                      |
| household_id      | authorization filter                                                    |
| owner_user_id     | uploader                                                                |
| kind              | `image` / `video`                                                       |
| provider          | `r2` / `stream`                                                         |
| provider_key      | R2 object key or Stream UID; never public URL                           |
| original_filename | sanitized display only                                                  |
| mime_type         | server verified                                                         |
| byte_size         | nullable for processed Stream asset                                     |
| width / height    | nullable                                                                |
| duration_ms       | nullable                                                                |
| status            | `pending` / `uploaded` / `processing` / `ready` / `failed` / `deleting` |
| checksum          | optional integrity/dedup signal                                         |
| alt_text          | nullable                                                                |
| deleted_at        | nullable                                                                |

### entry_media

| Column         | Notes                 |
| -------------- | --------------------- |
| entry_id       | composite PK          |
| media_asset_id | composite PK          |
| role           | `primary` / `gallery` |
| sort_order     | stable manual order   |

media row の削除と provider object の削除は状態遷移で管理し、DB row だけ先に消して orphan を追跡不能にしない。

R2画像の`provider_key`は原本の`{asset prefix}/original`を指す。プロフィール表示用derivativeは同じasset prefixの`profile-512.webp`へ保存し、別の`media_assets` rowは作らない。assetを削除するときは原本と既知のderivativeを同じ削除状態遷移で消す。

## 6. Boards

### boards

| Column         | Notes                          |
| -------------- | ------------------------------ |
| id             | PK                             |
| household_id   | authorization boundary         |
| name           | required                       |
| sort_mode      | `manual` / `newest` / `oldest` |
| cover_asset_id | nullable                       |

標準ボードと自動分類は作らない。利用者が必要な場合だけ作成する。

### board_items

| Column   | Notes              |
| -------- | ------------------ |
| board_id | composite PK       |
| entry_id | composite PK       |
| sort_key | manual order token |

## 7. Sharing

### share_links

| Column           | Notes                                |
| ---------------- | ------------------------------------ |
| id               | PK                                   |
| household_id     | owner boundary                       |
| created_by       | FK users                             |
| resource_type    | `entry` / `board`                    |
| resource_id      | validated application reference      |
| token_hash       | unique; raw token never stored       |
| expires_at       | required for MVP                     |
| revoked_at       | nullable                             |
| last_accessed_at | coarse operational value; not public |

閲覧者の IP や fingerprint を恒久保存しない。abuse rate limiting 用データは短期保持とする。

## 8. お散歩

### town_cards

おうちの entry から作る限定スナップショット。

| Column           | Notes                              |
| ---------------- | ---------------------------------- |
| id               | PK                                 |
| cat_id           | displayed cat                      |
| source_entry_id  | nullable; deleted/revoked handling |
| card_type        | `entry` / `empty`                  |
| title            | sanitized, limited length          |
| excerpt          | sanitized, limited length          |
| preview_asset_id | nullable, derivative only          |
| status           | `active` / `revoked` / `expired`   |
| expires_at       | automatic expiry                   |

お散歩の realtime Worker にはこの table 全体を渡さず、接続 ticket に必要な opaque ID と safe preview payload だけを含める。

### town_encounters

| Column                      | Notes                                      |
| --------------------------- | ------------------------------------------ |
| id                          | PK                                         |
| cat_a_id / cat_b_id         | canonical sorted pair                      |
| place_id                    | abstract place, never real location        |
| occurred_bucket             | exact time ではなく day/time-of-day bucket |
| visibility_a / visibility_b | each owner can hide                        |

同じ pair、place、bucket の重複を unique constraint で防ぐ。公開件数やランキングには使わない。

### town_reactions

| Column          | Notes                  |
| --------------- | ---------------------- |
| id              | PK                     |
| from_cat_id     | actor cat              |
| to_cat_id       | target cat             |
| town_card_id    | nullable target card   |
| kind            | allowed fixed reaction |
| occurred_bucket | coarse time            |
| idempotency_key | unique                 |

保持期間は初期 90 日を候補とし、日次まとめ生成後の raw event 削除を検討する。

### cat_mutes

猫単位の非表示は安全上の block と分ける。mute は利用者本人の画面にだけ影響し、相手へ通知しない。

| Column        | Notes                              |
| ------------- | ---------------------------------- |
| muter_user_id | composite unique with muted_cat_id |
| muted_cat_id  | target cat                         |
| created_at    | timestamp                          |

### blocks

| Column          | Notes                                 |
| --------------- | ------------------------------------- |
| blocker_user_id | composite unique with blocked_user_id |
| blocked_user_id | target                                |
| version         | realtime invalidation                 |
| created_at      | timestamp                             |

block は非対称でも、画面上は双方を互いに表示しない。blocked user に block の存在を通知しない。

block は飼い主単位とし、対象利用者が所属するすべての猫を相互に非表示にする。特定の猫だけを隠す場合は `cat_mutes` を使用する。

### reports

| Column           | Notes                                           |
| ---------------- | ----------------------------------------------- |
| id               | PK                                              |
| reporter_user_id | actor                                           |
| target_user_id   | nullable                                        |
| target_card_id   | nullable                                        |
| reason           | fixed category                                  |
| note             | optional limited text                           |
| snapshot_json    | minimal reviewed content; sensitive access      |
| status           | `open` / `reviewing` / `resolved` / `dismissed` |
| resolved_at      | nullable                                        |

## 9. Operations

### export_jobs

| Column                 | Notes                                                 |
| ---------------------- | ----------------------------------------------------- |
| id                     | PK                                                    |
| user_id / household_id | scope                                                 |
| status                 | `queued` / `running` / `ready` / `failed` / `expired` |
| r2_key                 | private archive key                                   |
| expires_at             | automatic deletion                                    |
| error_code             | no sensitive error text                               |

### deletion_jobs

退会・household 削除について、D1、R2、Stream、share link の削除段階を追跡する。各段階は idempotent にする。

### audit_events

権限変更、share 作成/取消、export、delete、moderation 操作だけを記録する。通常の閲覧履歴を監査ログにしない。

### notifications

Web 内通知を利用者単位で永続化する。通知から参照する resource は表示時に再認可する。

| Column            | Notes                                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| id                | PK                                                                                                                             |
| recipient_user_id | FK users                                                                                                                       |
| type              | `household_invite` / `household_joined` / `upload_ready` / `upload_failed` / `export_ready` / `share_expiring` / `town_digest` |
| resource_type     | nullable `household` / `cat` / `media_asset`                                                                                   |
| resource_id       | nullable; no share token                                                                                                       |
| payload_json      | minimal display metadata; no post body or signed URL                                                                           |
| dedupe_key        | recipient 内で unique                                                                                                          |
| created_at        | timestamp                                                                                                                      |
| read_at           | nullable                                                                                                                       |
| expires_at        | nullable automatic cleanup                                                                                                     |

### product_events

success signal の算出に必要な最小限の first-party event。`analytics_consent` が有効な利用者だけ記録する。

| Column          | Notes                                                    |
| --------------- | -------------------------------------------------------- |
| id              | PK                                                       |
| user_id         | consented user; access restricted                        |
| event_type      | approved fixed event name                                |
| occurred_at     | timestamp                                                |
| properties_json | coarse booleans/categories only; no content/resource IDs |

初期 event は `entry_created`、`tagged_entry_created`、`old_entry_revisited`、`town_entered`、`town_encountered`、`export_completed` に限定する。

### user_activity_days

raw event 削除後も retention を集計するための日次 rollup。

| Column              | Notes                               |
| ------------------- | ----------------------------------- |
| user_id             | composite unique with activity_date |
| activity_date       | user timezone converted day         |
| created_entry       | boolean                             |
| revisited_old_entry | boolean                             |
| entered_town        | boolean                             |

本文、検索語、entry ID、cat ID、メディア URL は product event と rollup に保存しない。

## 10. Index plan

実装時に query plan で検証する前提で、少なくとも次を設ける。

- `household_members(user_id, status)`
- `cats(household_id, archived_at)`
- `entries(household_id, occurred_at, deleted_at)`
- `entry_cats(cat_id, entry_id)`
- 検索候補が増えた段階で`entries`の正規化本文をexternal-content FTS5 trigram indexへ同期し、1〜2文字は上記scope indexと`entry_cats`で絞って`LIKE`検索する
- `media_assets(household_id, status)`
- `board_items(board_id, sort_key)`
- `share_links(token_hash, revoked_at, expires_at)`
- `town_encounters(cat_a_id, occurred_bucket)` / cat_b counterpart
- `town_reactions(to_cat_id, occurred_bucket)`
- `cat_mutes(muter_user_id, muted_cat_id)`
- `blocks(blocker_user_id, blocked_user_id)`
- `reports(status, created_at)`
- `notifications(recipient_user_id, read_at, created_at)`
- `notifications(recipient_user_id, dedupe_key)` unique
- `product_events(user_id, occurred_at, event_type)`
- `user_activity_days(user_id, activity_date)` unique

## 11. Data lifecycle

| Data                  | Active retention                      | Deletion behavior                                      |
| --------------------- | ------------------------------------- | ------------------------------------------------------ |
| entries               | until user deletes                    | hidden immediately, physical purge after grace period  |
| images/videos         | while referenced                      | provider deletion job, orphan reconciliation           |
| share links           | until expiry/revoke                   | access denied immediately; metadata later purge        |
| presence active state | seconds/minutes                       | Durable Object expiry                                  |
| presence trace        | max 6 hours                           | automatic expiry                                       |
| raw reactions         | candidate 90 days                     | aggregate/coarse memory then purge                     |
| notifications         | unread max 90 days / read max 30 days | purge on expiry, retention window, or account deletion |
| raw product events    | candidate 90 days                     | aggregate to activity day, then purge                  |
| user activity days    | policy-defined                        | delete with account/analytics withdrawal policy        |
| reports               | policy-defined                        | restricted retention for safety/legal needs            |
| export archive        | short expiry, candidate 7 days        | automatic R2 deletion                                  |
| account data          | grace period after request            | staged irreversible purge                              |

notifications の保持期間は上記で確定する。その他の候補保持期間は launch 前に privacy policy と合わせて確定する。
