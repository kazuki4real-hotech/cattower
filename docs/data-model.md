# Cattower データモデル

- Status: Conceptual v0.1
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
                                              ├──< collections ──< collection_items
                                              └──< town_cards

entries/collections ──< share_links
cats ──< town_encounters
users/cats ──< town_reactions
users ──< blocks
users ──< reports
```

Better Auth が要求する user、session、account、verification 系テーブルは auth schema として管理し、domain table からは `users.id` のみ参照する。

## 3. Core entities

### users

Better Auth の user を正本にする。domain 側で必要な追加設定は `user_preferences` に分離する。

### user_preferences

| Column | Notes |
| --- | --- |
| user_id | PK/FK users |
| locale | default `ja` |
| timezone | 表示用。公開しない |
| town_enabled | default false until onboarding consent |
| town_digest | `off` / `daily` |
| reduced_motion_override | nullable; normally system setting |
| analytics_consent | regional requirement に応じる |

### households

一匹以上の猫と家族メンバーをまとめる認可境界。

| Column | Notes |
| --- | --- |
| id | PK |
| name | internal display name |
| owner_user_id | ownership anchor |
| deletion_requested_at | nullable |

### household_members

| Column | Notes |
| --- | --- |
| household_id | composite unique with user_id |
| user_id | FK users |
| role | `owner` / `editor` |
| status | `invited` / `active` / `revoked` |
| invited_by | FK users |
| joined_at | nullable |

招待 token は平文保存せず、別 `household_invites` table に hash と期限を置く。

### cats

| Column | Notes |
| --- | --- |
| id | PK |
| household_id | authorization boundary |
| name | required |
| nickname | nullable |
| birth_date | nullable, exact date when known |
| birth_precision | `day` / `month` / `year` / `unknown` |
| adoption_date | nullable |
| profile_asset_id | nullable FK media_assets |
| theme_color | approved palette token, not arbitrary CSS |
| life_status | `living` / `memorial` |
| archived_at | nullable |

## 4. Entries

### entries

| Column | Notes |
| --- | --- |
| id | PK |
| household_id | denormalized authorization filter |
| primary_cat_id | main cat; additional cats via entry_cats |
| author_user_id | creator |
| template | `moment` / `note` / `favorite` / `food` / `milestone` / `compare` |
| title | nullable |
| body | nullable plain text/limited rich text |
| occurred_at | event time |
| occurred_precision | `minute` / `day` / `month` |
| status | `draft` / `ready` / `processing` / `failed` |
| version | optimistic update integer |
| deleted_at | nullable |

初期公開範囲を entries の単純な `public` flag にしない。私室の entry は常に private resource とし、家族 membership、share link、town card という別 resource が限定的な view を作る。

### entry_cats

複数猫が写る記録に対応する join table。

| Column | Notes |
| --- | --- |
| entry_id | composite PK |
| cat_id | composite PK |
| sort_order | display order |

### entry_details

テンプレート固有値は、初期段階では `entries.detail_json` に押し込まず型付き table にする。

- `favorite_details`: kind、rating、how_used、started_on、active_state
- `food_details`: product_name、flavor、appetite、buy_again
- `milestone_details`: milestone_type、anniversary recurrence
- `compare_details`: left_asset_id、right_asset_id

検索・集計しない装飾的設定だけを JSON として許可する。

### tags / entry_tags

tag は household 内で一意。case/Unicode を正規化した `normalized_name` を持つ。

## 5. Media

### media_assets

| Column | Notes |
| --- | --- |
| id | PK |
| household_id | authorization filter |
| owner_user_id | uploader |
| kind | `image` / `video` |
| provider | `r2` / `stream` |
| provider_key | R2 object key or Stream UID; never public URL |
| original_filename | sanitized display only |
| mime_type | server verified |
| byte_size | nullable for processed Stream asset |
| width / height | nullable |
| duration_ms | nullable |
| status | `pending` / `uploaded` / `processing` / `ready` / `failed` / `deleting` |
| checksum | optional integrity/dedup signal |
| alt_text | nullable |
| deleted_at | nullable |

### entry_media

| Column | Notes |
| --- | --- |
| entry_id | composite PK |
| media_asset_id | composite PK |
| role | `primary` / `gallery` / `compare_left` / `compare_right` |
| sort_order | stable manual order |

media row の削除と provider object の削除は状態遷移で管理し、DB row だけ先に消して orphan を追跡不能にしない。

## 6. Collections

### collections

| Column | Notes |
| --- | --- |
| id | PK |
| household_id | authorization boundary |
| cat_id | nullable for multi-cat collection |
| name | required |
| kind | `system` / `custom` |
| system_key | nullable `media` / `notes` / `toys` / `food` / `milestones` |
| sort_mode | `manual` / `newest` / `oldest` |
| cover_asset_id | nullable |

### collection_items

| Column | Notes |
| --- | --- |
| collection_id | composite PK |
| entry_id | composite PK |
| sort_key | manual order token |

## 7. Sharing

### share_links

| Column | Notes |
| --- | --- |
| id | PK |
| household_id | owner boundary |
| created_by | FK users |
| resource_type | `entry` / `collection` |
| resource_id | validated application reference |
| token_hash | unique; raw token never stored |
| expires_at | required for MVP |
| revoked_at | nullable |
| last_accessed_at | coarse operational value; not public |

閲覧者の IP や fingerprint を恒久保存しない。abuse rate limiting 用データは短期保持とする。

## 8. 猫町

### town_cards

私室 entry から作る限定スナップショット。

| Column | Notes |
| --- | --- |
| id | PK |
| cat_id | displayed cat |
| source_entry_id | nullable; deleted/revoked handling |
| card_type | `moment` / `toy` / `food` / `note` / `empty` |
| title | sanitized, limited length |
| excerpt | sanitized, limited length |
| preview_asset_id | nullable, derivative only |
| status | `active` / `revoked` / `expired` |
| expires_at | automatic expiry |

猫町 Worker にはこの table 全体を渡さず、接続 ticket に必要な opaque ID と safe preview payload だけを含める。

### town_encounters

| Column | Notes |
| --- | --- |
| id | PK |
| cat_a_id / cat_b_id | canonical sorted pair |
| place_id | abstract place, never real location |
| occurred_bucket | exact time ではなく day/time-of-day bucket |
| visibility_a / visibility_b | each owner can hide |

同じ pair、place、bucket の重複を unique constraint で防ぐ。公開件数やランキングには使わない。

### town_reactions

| Column | Notes |
| --- | --- |
| id | PK |
| from_cat_id | actor cat |
| to_cat_id | target cat |
| town_card_id | nullable target card |
| kind | allowed fixed reaction |
| occurred_bucket | coarse time |
| idempotency_key | unique |

保持期間は初期 90 日を候補とし、日次まとめ生成後の raw event 削除を検討する。

### blocks

| Column | Notes |
| --- | --- |
| blocker_user_id | composite unique with blocked_user_id |
| blocked_user_id | target |
| version | realtime invalidation |
| created_at | timestamp |

block は非対称でも、画面上は双方を互いに表示しない。blocked user に block の存在を通知しない。

### reports

| Column | Notes |
| --- | --- |
| id | PK |
| reporter_user_id | actor |
| target_user_id | nullable |
| target_card_id | nullable |
| reason | fixed category |
| note | optional limited text |
| snapshot_json | minimal reviewed content; sensitive access |
| status | `open` / `reviewing` / `resolved` / `dismissed` |
| resolved_at | nullable |

## 9. Operations

### export_jobs

| Column | Notes |
| --- | --- |
| id | PK |
| user_id / household_id | scope |
| status | `queued` / `running` / `ready` / `failed` / `expired` |
| r2_key | private archive key |
| expires_at | automatic deletion |
| error_code | no sensitive error text |

### deletion_jobs

退会・household 削除について、D1、R2、Stream、share link の削除段階を追跡する。各段階は idempotent にする。

### audit_events

権限変更、share 作成/取消、export、delete、moderation 操作だけを記録する。通常の閲覧履歴を監査ログにしない。

## 10. Index plan

実装時に query plan で検証する前提で、少なくとも次を設ける。

- `household_members(user_id, status)`
- `cats(household_id, archived_at)`
- `entries(household_id, occurred_at, deleted_at)`
- `entry_cats(cat_id, entry_id)`
- `media_assets(household_id, status)`
- `collection_items(collection_id, sort_key)`
- `share_links(token_hash, revoked_at, expires_at)`
- `town_encounters(cat_a_id, occurred_bucket)` / cat_b counterpart
- `town_reactions(to_cat_id, occurred_bucket)`
- `reports(status, created_at)`

## 11. Data lifecycle

| Data | Active retention | Deletion behavior |
| --- | --- | --- |
| entries | until user deletes | hidden immediately, physical purge after grace period |
| images/videos | while referenced | provider deletion job, orphan reconciliation |
| share links | until expiry/revoke | access denied immediately; metadata later purge |
| presence active state | seconds/minutes | Durable Object expiry |
| presence trace | max 6 hours | automatic expiry |
| raw reactions | candidate 90 days | aggregate/coarse memory then purge |
| reports | policy-defined | restricted retention for safety/legal needs |
| export archive | short expiry, candidate 7 days | automatic R2 deletion |
| account data | grace period after request | staged irreversible purge |

保持期間は launch 前に privacy policy と合わせて確定する。
