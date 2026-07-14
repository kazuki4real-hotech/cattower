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
users ──< cat_mutes
users ──< blocks
users ──< reports
users ──< notifications
users ──< product_events / user_activity_days
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
| town_enabled | 利用者本人の参加同意。default false |
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

初回 onboarding で利用者が owner となる household を一つ自動作成する。一人の利用者が owner になれる household は MVP では一つとし、招待された複数の household には editor として参加できる。

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
| town_access | `disabled` / `owners_only` / `household_members`; owner-managed |
| archived_at | nullable |

猫は必ず一つの household に所属する。猫町への接続は、接続者の `town_enabled` と猫の `town_access` の両方を評価する。

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

### cat_mutes

猫単位の非表示は安全上の block と分ける。mute は利用者本人の画面にだけ影響し、相手へ通知しない。

| Column | Notes |
| --- | --- |
| muter_user_id | composite unique with muted_cat_id |
| muted_cat_id | target cat |
| created_at | timestamp |

### blocks

| Column | Notes |
| --- | --- |
| blocker_user_id | composite unique with blocked_user_id |
| blocked_user_id | target |
| version | realtime invalidation |
| created_at | timestamp |

block は非対称でも、画面上は双方を互いに表示しない。blocked user に block の存在を通知しない。

block は飼い主単位とし、対象利用者が所属するすべての猫を相互に非表示にする。特定の猫だけを隠す場合は `cat_mutes` を使用する。

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

### notifications

Web 内通知を利用者単位で永続化する。通知から参照する resource は表示時に再認可する。

| Column | Notes |
| --- | --- |
| id | PK |
| recipient_user_id | FK users |
| type | fixed notification type |
| resource_type | nullable typed reference |
| resource_id | nullable; no share token |
| payload_json | minimal display metadata; no post body or signed URL |
| dedupe_key | recipient 内で unique |
| created_at | timestamp |
| read_at | nullable |
| expires_at | nullable automatic cleanup |

### product_events

success signal の算出に必要な最小限の first-party event。`analytics_consent` が有効な利用者だけ記録する。

| Column | Notes |
| --- | --- |
| id | PK |
| user_id | consented user; access restricted |
| event_type | approved fixed event name |
| occurred_at | timestamp |
| properties_json | coarse booleans/categories only; no content/resource IDs |

初期 event は `entry_created`、`non_media_template_used`、`old_entry_revisited`、`town_entered`、`town_encountered`、`export_completed` に限定する。

### user_activity_days

raw event 削除後も retention を集計するための日次 rollup。

| Column | Notes |
| --- | --- |
| user_id | composite unique with activity_date |
| activity_date | user timezone converted day |
| created_entry | boolean |
| revisited_old_entry | boolean |
| entered_town | boolean |

本文、検索語、entry ID、cat ID、メディア URL は product event と rollup に保存しない。

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
- `cat_mutes(muter_user_id, muted_cat_id)`
- `blocks(blocker_user_id, blocked_user_id)`
- `reports(status, created_at)`
- `notifications(recipient_user_id, read_at, created_at)`
- `notifications(recipient_user_id, dedupe_key)` unique
- `product_events(user_id, occurred_at, event_type)`
- `user_activity_days(user_id, activity_date)` unique

## 11. Data lifecycle

| Data | Active retention | Deletion behavior |
| --- | --- | --- |
| entries | until user deletes | hidden immediately, physical purge after grace period |
| images/videos | while referenced | provider deletion job, orphan reconciliation |
| share links | until expiry/revoke | access denied immediately; metadata later purge |
| presence active state | seconds/minutes | Durable Object expiry |
| presence trace | max 6 hours | automatic expiry |
| raw reactions | candidate 90 days | aggregate/coarse memory then purge |
| notifications | until expiry or account deletion | read notifications may be purged on a rolling window |
| raw product events | candidate 90 days | aggregate to activity day, then purge |
| user activity days | policy-defined | delete with account/analytics withdrawal policy |
| reports | policy-defined | restricted retention for safety/legal needs |
| export archive | short expiry, candidate 7 days | automatic R2 deletion |
| account data | grace period after request | staged irreversible purge |

保持期間は launch 前に privacy policy と合わせて確定する。
