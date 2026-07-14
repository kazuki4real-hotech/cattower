# 既存サービス調査とポジショニング

- Status: Research snapshot v0.2
- Updated: 2026-07-14
- Note: 機能と料金は変わるため、重要判断の前に再調査する

## 1. Market map

既存サービスは、主に次の四つへ分類できる。

| Category | Examples | Strength | Gap relevant to Cattower |
| --- | --- | --- | --- |
| ペット SNS | ドコノコ | 動物ごとのブック、写真投稿、フォロー、ハート、コメント、迷子支援 | 公開交流が中心。文章や持ち物を自分だけのために残す体験ではない |
| 飼育・健康管理 | ペットノート＋、ペットDiary | ご飯、体重、排泄、通院、支出、家族共有 | 実用と管理が中心。生活の質感を作品として眺める体験が弱い |
| 写真日記 | UCHINOKO Diary、猫の日記 | 一日一枚、短文、AI 日記、フォトブック | 継続しやすい一方、文章だけの記憶やご飯・おもちゃの体系化が限定的 |
| 総合 pet journal | PawTimeline、Tamadoggo | 思い出、医療、支出、reminder を統合 | 機能追加により管理ツールまたは時系列 timeline へ寄りやすい |

## 2. Representative services

### ドコノコ

犬猫ごとに「どうぶつブック」を作り、写真とコメントを投稿できる。広場、フォロー、ハート、コメント、迷子通知、投稿写真からのグッズ作成を持つ、ペット特化 SNS である。

Source: https://www.dokonoko.jp/

Cattower との違い:

- ドコノコは犬猫を通じた公開コミュニケーションが中心
- Cattower はおうちの非公開記録を中心にし、交流はお散歩へ明示的に持ち出した一枚だけ
- Cattower は写真がない言葉、ご飯、おもちゃも、同じ記録形式とタグで扱う

### ペットノート＋ / ペットDiary

健康、体重、食事、排泄、通院、支出、家族共有などを扱う。日常のケアを漏れなく記録する用途に強い。

Sources:

- https://petnote-plus.com/lp/app/
- https://apps.apple.com/jp/app/id1612806049

Cattower との違い:

- ケアの完了確認や医学的な変化の追跡を主目的にしない
- 入力漏れを警告せず、投稿しない日を失敗にしない
- 数値グラフより、後から眺めたい生活の断片を優先する

### UCHINOKO Diary

一日一枚の写真と短いコメントに絞り、フォトブックへつなげる。制約によって継続しやすくしている。

Source: https://apps.apple.com/jp/app/id1492229059

Cattower との違い:

- 一日単位や一枚単位を強制しない
- 時系列だけでなく、タグと任意のボードで整理する
- テキストだけの記録も同じフォームから残せる

### PawTimeline / Tamadoggo

写真、milestone、健康、支出、reminder を一つの pet profile に統合する。Tamadoggo は部屋のオブジェクトから各機能へ入る表現を持つ。

Sources:

- https://www.pawtimeline.com/
- https://tamadoggo.com/

Cattower との違い:

- 全生活情報を万能管理するのではなく、記録と再発見へ焦点を絞る
- 比喩的な部屋や棚を増やさず、記録・タグ・ボードを直接操作する
- お散歩によって、猫の飼い主に不足しやすい偶然の接点を補う

## 3. Instagram separation

Instagram は Feed、Stories、Reels、Explore、recommendation、repost などを通じ、コンテンツの発見と人同士の接続を中心にしている。公式情報でも、Feed には follow 中の投稿に加えて推薦が入り、利用者の interaction によって内容が personalize される。

Sources:

- https://about.fb.com/news/2024/11/introducing-recommendations-reset-instagram/
- https://about.fb.com/news/2025/08/new-instagram-features-help-you-connect/

| Instagram | Cattower |
| --- | --- |
| 人に見せるために投稿する | 自分が忘れないために記録する |
| 写真・動画が主役 | 写真、動画、文章、物、出来事が同列 |
| 新しい投稿と推薦が強い | 古い記録を見つけ直す |
| likes、views、followers | popularity count を置かない |
| algorithm が次を選ぶ | タグ・ボード・検索で自分で探す |
| public profile が交流の入口 | 非公開のおうちが入口 |
| reach と反応が投稿の結果 | 保存し、後で見返せることが結果 |

Cattower から Instagram への card export は将来提供できる。ただし関係は競合ではなく、次の分担とする。

- Cattower: 記憶を育てる母艦
- Instagram: 選んだ一部を人へ見せる出口

## 4. Opportunity

狙う空白は次の交点にある。

> 健康管理ほど義務的ではなく、SNS ほど他人を意識せず、カメラロールより意味を持って残せる場所。

Cattower の差別化は単一機能ではなく、次の組み合わせで作る。

1. private by default の猫専用 personal archive
2. 写真・動画・文章を一つのフォームで記録し、任意のタグを付ける
3. timeline ではなく、タグ・ボード・検索による navigation
4. 古い記録を自然に再発見する仕組み
5. 記録を一枚だけ持ち出す、非同期的な「お散歩」
6. popularity count、streak、正確な online 表示を排した交流

## 5. Product risks

### 既存の日記との差が伝わらない

Mitigation: 写真も文章も同じ操作で残せ、タグとボードであとから整理できることを onboarding と home で示す。

### お散歩が通常 SNS になる

Mitigation: 自由文、follow count、ランキング、正確な presence を MVP に入れず、仕様上の guardrail とする。

### 利用者が少ないとお散歩が無人になる

Mitigation: active だけでなく resting と trace を使う。表示数を絞り、初期 shard 数を小さくする。bot や架空の利用者で水増ししない。

### 記録が義務になる

Mitigation: streak、未投稿通知、入力必須欄を最小化する。「何も持たずお散歩へ行く」ことも許可する。

### 長期保存への信頼を得られない

Mitigation: export、明確な削除、private media、障害時の recovery 手順を MVP の完了条件に含める。

## 6. Validation plan

closed beta では、機能要望の数より次を観察する。

- 単一の記録フォームとタグが説明なしで使えるか
- 30 日以上前の記録を見返す行動が生まれるか
- タグ・ボード・検索がtimelineより理解しやすいか
- お散歩で「反応しなければ」という圧力を感じないか
- resting/trace 表現を不正確または不気味だと感じないか
- private と town card の境界を誤解しないか
- 利用者がお散歩を使わなくてもサービス価値を感じるか
