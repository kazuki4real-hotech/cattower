# Cattower デザインガイドライン

- Status: Draft v0.2
- Updated: 2026-07-15
- Scope: 色、タイポグラフィ、間隔、コンポーネント、UI 実装プロセス

## 1. Position of this document

この文書は具体的なデザイントークンとコンポーネント方針の正本である。

- プロダクト仕様書 [product-spec.md](product-spec.md) セクション 9 は「静かなデザイン」という**原則**を定める
- 本書はその原則を実装可能な**トークンとルール**に落とす
- 原則と具体値が矛盾した場合は、原則側を先に更新してから本書を直す

判断の状態は他の文書と同じ語で示す（**決定** / **候補** / **将来** / **未決定**）。

## 2. Design principles

[product-spec.md](product-spec.md) セクション 9 を前提に、実装判断の指針を要約する。

- 静かなミュージアム。写真と記録が主役で、UI は額縁に徹する
- 余白を最優先の設計要素とする。詰め込まない
- 角丸と影は控えめにし、モーションは操作の理解と体験の物語に使う
- 習慣化を煽る紙吹雪、連続利用バッジ、順位は作らない。オンボーディングは入力の進行方向と完了だけを静かに伝える
- 色だけで状態を伝えない。必ずテキストまたはアイコンを添える
- WCAG 2.2 AA を全画面の目標とする

## 3. Color system

### 3.1 Palette overview（決定）

パステルを基調に、プライマリー 1 色・セカンダリー 4 色・ニュートラル階調で構成する。

| Role | Token | Hex | 用途 |
| --- | --- | --- | --- |
| Primary | `--color-primary` | `#80beaf` | ブランド面、選択状態、猫のテーマ既定色 |
| Accent / mint | `--color-accent-mint` | `#b3ddd1` | 面のティント、猫テーマ色 |
| Accent / sky | `--color-accent-sky` | `#d1dce2` | 面のティント、猫テーマ色 |
| Accent / peach | `--color-accent-peach` | `#f5b994` | 面のティント、猫テーマ色 |
| Accent / apricot | `--color-accent-apricot` | `#ee9c6a` | 面のティント、注意喚起、猫テーマ色 |

セカンダリー 4 色とプライマリーは、猫ごとの `theme_color`（[data-model.md](data-model.md) `cats.theme_color` の「approved palette token」）が選べる**確定パレット**でもある。任意 CSS 色は許可しない。

### 3.2 Neutral scale（決定）

添付パレット（Eel〜Snow）を階調トークンにマップする。愛称は残しつつ、実装は数値トークンで参照する。

| 愛称 | Token | Hex | 主な用途 |
| --- | --- | --- | --- |
| Snow | `--color-neutral-0` | `#ffffff` | カード・サーフェス |
| Polar | `--color-neutral-50` | `#f7f7f7` | アプリ背景、沈んだ面 |
| Swan | `--color-neutral-100` | `#e5e5e5` | 罫線、区切り |
| Hare | `--color-neutral-300` | `#afafaf` | 弱い罫線、disabled、装飾のみ |
| Wolf | `--color-neutral-500` | `#777777` | 補助テキスト（大サイズ/非本文のみ） |
| Eel | `--color-neutral-700` | `#4b4b4b` | 本文テキスト |
| Charcoal | `--color-neutral-900` | `#2a2a2a` | 見出し、最大コントラスト |

Charcoal（`#2a2a2a`）は仕様の「濃いチャコール」に対応する追加値。**候補**として置き、実装時に確定する。

### 3.3 Derived brand shades（候補）

`#80beaf` は明度が高く、**白背景の文字・白抜き文字としては AA を満たさない**（対白コントラスト約 2.1:1）。テキスト／アイコン用途には濃い派生色が必要。

| Token | Hex（候補） | 用途 |
| --- | --- | --- |
| `--color-primary-strong` | `#2f6b5c` | リンク、白背景上のブランド文字・アイコン |
| `--color-primary-soft` | `#d3ece5` | hover 背景、選択行の淡い面 |

派生値は実装前にコントラスト計測で確定する。`--color-primary-strong` は対白 4.5:1 以上を必須とする。

### 3.4 Semantic tokens（候補）

コンポーネントは生の色ではなく意味トークンを参照する。

| Semantic token | 参照 | 備考 |
| --- | --- | --- |
| `--bg-base` | `--color-neutral-50` | アプリ背景 |
| `--bg-surface` | `--color-neutral-0` | カード・パネル |
| `--bg-sunken` | `--color-neutral-50` | 入力欄、溝 |
| `--border` | `--color-neutral-100` | 標準罫線 |
| `--border-strong` | `--color-neutral-300` | 強調罫線 |
| `--text-primary` | `--color-neutral-900` | 本文・見出し |
| `--text-secondary` | `--color-neutral-700` | 補助 |
| `--text-muted` | `--color-neutral-500` | 大サイズ限定の弱いテキスト |
| `--text-on-primary` | `--color-neutral-900` | プライマリー面の上の文字（濃色） |
| `--focus-ring` | `--color-primary-strong` | フォーカス表示 |

> 仕様 §9 は「温かいオフホワイト」を基調とするが、提供パレットのニュートラルは中間グレーである。**未決定**: `--bg-base` を素の `#f7f7f7` にするか、わずかに暖色寄りへ調整するか。決めたら仕様 §9 の表現と揃える。

### 3.5 Feedback colors

落ち着いたトーンを保ち、フィードバックは最小限にする。

- 成功: プライマリー系（`--color-primary-strong`）＋チェックアイコン（候補）
- 注意: `--color-accent-apricot`（候補）
- **未決定**: 破壊的操作／エラー用の赤。パレットに赤系がないため要追加。調和する低彩度の赤（例 `#c25b4e`）を候補とし、コントラストを計測する。色に依存せず必ずアイコンと文言を併記する（[product-spec.md](product-spec.md) §9）。

### 3.6 ランディングページの背景比較（候補）

公開ランディングでは、透明背景のブランドビジュアルと白系ニュートラルの相性を実機で比較するため、Snow `--color-neutral-0` と Polar `--color-neutral-50` の切り替えを提供する。既定はアプリ背景と同じ Polar とし、選択状態は背景色だけでなくボタンの枠、面、`aria-pressed` で示す。

この切り替えは `--bg-base` の最終決定に向けた比較用であり、新しいパレット色を追加しない。比較結果を踏まえて背景を確定した後、切り替えを残すかは別途判断する。

## 4. Accessibility and contrast（決定）

`#ffffff` 背景に対するおおよそのコントラストと許可用途。実装時に自動チェックで再検証する。

| 前景 | 対白の目安 | 許可される用途 |
| --- | --- | --- |
| `#2a2a2a` Charcoal | 約 14:1 | すべてのテキスト |
| `#4b4b4b` Eel | 約 8.6:1 | 本文テキスト |
| `#777777` Wolf | 約 4.5:1 | 大サイズ文字・非本文のみ（境界値） |
| `#afafaf` Hare | 約 2.0:1 | 罫線・装飾のみ。**テキスト不可** |
| `#80beaf` Primary | 約 2.1:1 | **面の塗りのみ**。文字色に使わない |

ルール:

- プライマリー／アクセント面の上のテキストは濃色（`--text-on-primary`）にする。白抜き文字は使わない
- 状態・選択・エラーを色のみで表さない
- フォーカスリングは常に可視。太さと色でキーボード操作を明示する
- `prefers-reduced-motion` でお散歩も含めモーションを静止させる（[product-spec.md](product-spec.md) §9）

## 5. Typography（決定）

- UI フォントは **M PLUS Rounded 1c** を採用する。丸みのある字形で親しみを作りつつ、日本語の本文可読性を保つ
- 本文を含むUIの既定ウェイトは `700` とし、丸みと存在感を全画面で統一する。ブランドやオンボーディングの要所は `800`、Material Symbols Roundedは視認性を保つため `400` を使う
- フォールバックは `"Hiragino Maru Gothic ProN"`, `"Hiragino Sans"`, `"Yu Gothic UI"`, `Meiryo`, `sans-serif` の順とする
- プロトタイプでは Google Fonts を利用できる。本実装では `next/font` または self-host により必要な weight と日本語 subset を配信し、`font-display: swap` を設定する
- スケール: 12 / 14 / 16（本文既定）/ 20 / 24 / 32
- 行間: 本文 1.7、見出し 1.3 を目安に、日本語の読みやすさを優先する
- 数値的な人気指標は表示しないため、巨大数字を強調するタイポは用意しない

## 5.1 Iconography（決定）

- アイコンは Google Material Icons の現行系である **Material Symbols Rounded** に統一する
- 基本スタイルは `FILL 0`、`wght 400`、`GRAD 0`、`opsz 24`。選択中のナビゲーションと完了状態のみ `FILL 1` を許可する
- 標準サイズは本文内 `20px`、ナビゲーションとボタン `22-24px`、オンボーディングの説明用 `32-40px`
- アイコンだけの操作には必ず `aria-label` または視覚的に隠したラベルを付ける。意味を色だけに依存させない
- アイコンとテキストを併記するボタンでは、アイコンを装飾扱いにして読み上げの重複を避ける
- 実装では利用 glyph を subset し、Google Fonts の `display=block` または self-host を使って ligature 文字の一瞬の露出を防ぐ
- Material Symbols はアイコンセットとしてのみ使い、Radix UI primitives と Cattower の配色・形状トークンを置き換えない

## 6. Spacing, radius, elevation, motion（候補）

- 間隔スケール（4 の倍数）: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64
- 角丸: `sm 8px` / `md 12px` / `lg 18px`。丸い書体と調和させつつ、すべてを pill 化しない
- 影: 1 段（`0 1px 3px rgba(0,0,0,.08)`）を基本とし、多層の影を重ねない
- 通常操作: `160-280ms`、`cubic-bezier(.16, 1, .3, 1)` を中心に、押下、選択、展開、画面入場を伝える
- 通常画面の入場: 見出しと主要コンテンツを `opacity` と `transform` だけで順番に表示する。全要素を常時動かさない
- お散歩: 呼吸、まばたき、尻尾、気配の浮遊だけを低頻度で繰り返す
- オンボーディング: フォーム領域だけを `240ms`、`24px` の横移動と opacity で切り替え、前進と後退を伝える
- オンボーディング背景は単色とし、大きな色の円、三角屋根、塔、部屋カードを使わない
- 完了演出は紙吹雪、巨大なチェック、スコア、ランキング、streak を使わない。猫の写真またはアイコンと短い文で達成を示す
- `prefers-reduced-motion: reduce` では自動アニメーションを停止し、状態変化を即時表示する

## 7. Component and layout process

### 7.1 taste-skill を必須にする（決定）

UI コンポーネントの新規作成・大きなレイアウト変更・リデザインの前に、必ず [taste-skill](https://github.com/Leonxlnx/taste-skill)（`design-taste-frontend` / "Anti-Slop Frontend Framework"）を読み込んで適用する。目的は AI 生成にありがちな凡庸で反復的な UI（slop）を避けること。

- 導入例: `npx skills add https://github.com/Leonxlnx/taste-skill`、または SKILL.md を会話に読み込む
- 対象: `apps/web` の画面、共有 UI（`packages/ui`）、お散歩シーンの UI
- 適用しても、本書のトークンと WCAG 2.2 AA を上書きしない。taste-skill は「配置・階層・余白の質」を上げるために使い、色や制約は本書が優先する

### 7.2 推奨ダイヤル（決定）

Cattower の静かな性格に合わせ、既定を低めにする。

| Dial | 既定 | 理由 |
| --- | --- | --- |
| `DESIGN_VARIANCE` | 2–3 | 落ち着いた図録的レイアウト。奇抜な非対称は避ける |
| `MOTION_INTENSITY` | 4 | 通常画面は階層、操作フィードバック、状態遷移に動きを使う |
| `VISUAL_DENSITY` | 2–3 | 余白重視。無限スクロール・ダッシュボード密度にしない |

お散歩の2Dシーンのみ、演出上わずかに `DESIGN_VARIANCE` を上げてよいが、静けさとアクセシビリティは保つ。オンボーディングは `MOTION_INTENSITY 6` まで許可し、物語の進行と入力完了の理解に限定する。

### 7.3 コンポーネント基盤

- Radix UI primitives + Tailwind CSS（[technical-architecture.md](technical-architecture.md)）
- Google Material Symbols Rounded を共通アイコンとして使用する
- Tailwind テーマに本書のトークンを CSS 変数として定義し、生の hex を JSX に直書きしない
- 猫のテーマ色は実行時に `--color-primary` を猫ごとの承認済みトークンへ差し替える形で反映する
- `packages/ui` は意味構造と共有 props を持つ framework 非依存の React component を管理する。route、data fetch、Next.js 固有 component、design token の値は `apps/web` に残す
- 最初の共有 component は `PageHeading` とし、eyebrow、`h1`、説明、任意 action の順序と既存の余白を全主要画面で統一する

## 8. お散歩 visual note

お散歩のビジュアル方式（写真切り抜き / 抽象アイコン / 選択式アバター）は **未決定**（[product-spec.md](product-spec.md) §15、[task-plan.md](task-plan.md) P0-08）。本書ではどの方式でも次を満たすこととする。

- 余白のある 2D シーン。3D ゲーム化しない
- 呼吸・まばたき・尻尾程度の低頻度モーション
- 色以外でも猫と状態を識別できる

## 9. Implementation token stub（参考）

実装時の起点となる CSS 変数（値は本書の確定・候補に従う）。

```css
:root {
  /* brand */
  --color-primary: #80beaf;
  --color-primary-strong: #2f6b5c; /* 候補: 対白 4.5:1 を確認 */
  --color-primary-soft: #d3ece5;   /* 候補 */

  /* accents / cat theme tokens */
  --color-accent-mint: #b3ddd1;
  --color-accent-sky: #d1dce2;
  --color-accent-peach: #f5b994;
  --color-accent-apricot: #ee9c6a;

  /* neutrals */
  --color-neutral-0: #ffffff;
  --color-neutral-50: #f7f7f7;
  --color-neutral-100: #e5e5e5;
  --color-neutral-300: #afafaf;
  --color-neutral-500: #777777;
  --color-neutral-700: #4b4b4b;
  --color-neutral-900: #2a2a2a; /* 候補 */

  /* semantic */
  --bg-base: var(--color-neutral-50);
  --bg-surface: var(--color-neutral-0);
  --border: var(--color-neutral-100);
  --text-primary: var(--color-neutral-900);
  --text-secondary: var(--color-neutral-700);
  --text-on-primary: var(--color-neutral-900);
  --focus-ring: var(--color-primary-strong);
}
```

## 10. Open decisions

- **未決定**: `--bg-base` を暖色寄りに調整するか（仕様 §9 の「温かいオフホワイト」との整合）
- **未決定**: エラー／破壊的操作の赤の確定値
- **候補**: Charcoal `#2a2a2a` と派生ブランド色の最終確定
- **候補**: タイポグラフィスケールの最終調整
- **将来**: ダークテーマ対応（MVP 対象外）
