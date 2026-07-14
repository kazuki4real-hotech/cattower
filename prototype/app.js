const images = {
  window: "https://images.unsplash.com/photo-1686615508052-843d45a94e22?auto=format&fit=crop&w=1400&q=84",
  toy: "https://images.unsplash.com/photo-1729008764855-9b5257318beb?auto=format&fit=crop&w=1200&q=84",
  food: "https://images.unsplash.com/photo-1652410817793-e9c5644fe436?auto=format&fit=crop&w=1200&q=84"
};

function icon(name, className = "") {
  return `<span class="material-symbols-rounded ${className}" aria-hidden="true">${name}</span>`;
}

const routes = {
  home: { label: "おうち", path: "home.html", icon: "home" },
  collections: { label: "コレクション", path: "collections.html", icon: "collections_bookmark" },
  add: { label: "追加", path: "add.html", icon: "add" },
  town: { label: "猫町", path: "town.html", icon: "explore" }
};

function nav(current, mobile = false) {
  const items = Object.entries(routes).map(([key, item]) =>
    `<a href="${item.path}" ${current === key ? 'aria-current="page"' : ""}>${icon(item.icon)}<span>${item.label}</span></a>`
  ).join("");
  return `<nav class="${mobile ? "mobile-nav" : "nav"}" aria-label="主要ナビゲーション">${items}</nav>`;
}

function shell(page, content, options = {}) {
  const mainClass = options.wide ? "page town-wrap" : options.narrow ? "page page-narrow" : "page";
  return `
    <a class="skip-link" href="#main">本文へ移動</a>
    <div class="app-shell">
      <aside class="sidebar">
        <a class="brand" href="index.html" aria-label="cattower プロトタイプ一覧へ"><span class="brand-mark">T</span>cattower</a>
        <button class="cat-switcher" type="button" data-toast="猫の切り替えはプロトタイプでは固定です">
          <img src="${images.window}" alt="こむぎのプロフィール写真"><span><strong>こむぎ</strong><small>3歳 · おうち</small></span>${icon("chevron_right")}
        </button>
        ${nav(page)}
        <div class="sidebar-foot">
          <a href="search.html">${icon("search")}<span>記録を探す</span></a>
          <a href="notifications.html">${icon("notifications")}<span>お知らせ</span><span class="pill">2件</span></a>
          <a href="settings.html">${icon("settings")}<span>家族と設定</span></a>
        </div>
      </aside>
      <header class="mobile-top">
        <a class="brand" href="index.html"><span class="brand-mark">T</span>cattower</a>
        <a class="icon-button micro" href="notifications.html" aria-label="未読のお知らせ2件">${icon("notifications", "filled")}</a>
      </header>
      <main class="main" id="main"><div class="${mainClass}">${content}</div></main>
      ${nav(page, true)}
    </div>
    <div class="toast" role="status" aria-live="polite" hidden></div>`;
}

const onboardingLabels = ["はじめまして", "猫を迎える", "残したいこと", "できあがり"];

function onboardingSteps(current) {
  return `<nav class="onboarding-steps" aria-label="オンボーディングの進行">${onboardingLabels.map((label, index) => {
    const state = index < current ? "done" : index === current ? "current" : "";
    const marker = index < current ? icon("check_circle", "filled") : icon(index === current ? "pets" : "lock");
    return `<span class="onboarding-step ${state}" ${index === current ? 'aria-current="step"' : ""}>${marker}<span>${label}</span></span>`;
  }).join("")}</nav>`;
}

function tower(current, complete = false) {
  const rooms = [
    { icon: "home", title: "あなたの私室", text: "猫との時間をしまう場所" },
    { icon: "pets", title: "猫の居場所", text: "名前と好きな色を覚えます" },
    { icon: "menu_book", title: "最初の収蔵棚", text: "残したいものから始めます" }
  ];
  return `<div class="tower" aria-label="猫の居場所が少しずつ完成していく様子"><div class="tower-roof"></div>${rooms.map((room, index) => {
    const state = complete || index < current ? "done" : index === current ? "current" : "locked";
    return `<section class="tower-room ${state}">${icon(state === "locked" ? "lock" : room.icon, state === "done" ? "filled" : "")}<div><h2>${room.title}</h2><p>${state === "locked" ? "この先でひらきます" : room.text}</p></div></section>`;
  }).join("")}<div class="tower-base"></div></div>`;
}

function onboardingShell(current, content, complete = false) {
  return `<a class="skip-link" href="#onboarding-main">本文へ移動</a><main class="onboarding" id="onboarding-main"><section class="onboarding-copy"><a class="brand" href="index.html"><span class="brand-mark">T</span>cattower</a><div class="onboarding-content">${onboardingSteps(current)}${content}</div></section><aside class="onboarding-stage" aria-label="オンボーディングの進行イメージ">${tower(current, complete)}</aside></main><div class="toast" role="status" aria-live="polite" hidden></div>`;
}

const pages = {
  home: () => shell("home", `
    <header class="page-head">
      <div><p class="eyebrow">こむぎの私室</p><h1>おかえりなさい</h1><p class="lede">今日も、いつもの場所から。</p></div>
      <div class="button-row"><a class="button button-secondary" href="search.html">${icon("search")}記録を探す</a><a class="button" href="add.html">${icon("add")}記録する</a></div>
    </header>
    <article class="today-card">
      <img src="${images.window}" alt="窓辺から外を眺めるこむぎ">
      <div class="today-copy"><p class="date">7月14日 · 今日の一枚</p><span class="pill">何気ない瞬間</span><h2>夕方の窓辺</h2><p>風が入るたび、カーテンの影を目で追っていた。</p><a class="text-link" href="entry.html">この記録をひらく</a></div>
    </article>
    <section class="section" aria-labelledby="rediscover"><div class="section-head"><h2 id="rediscover">ふと、思い出す</h2><a class="text-link" href="search.html">ほかの記録も探す</a></div>
      <div class="rediscover"><a class="memory-card" href="entry.html"><span class="pill">去年の今ごろ</span><p class="year">2025</p><h3>はじめて網戸にした日</h3><p class="small muted">同じ窓辺で、耳だけが忙しく動いていた。</p></a><a class="memory-card" href="entry.html"><span class="pill">ランダムな一枚</span><h3>毛糸玉を隠した場所</h3><p class="small muted">探していたら、本棚の一番下から出てきた。</p></a></div>
    </section>
    <section class="section" aria-labelledby="shelves"><div class="section-head"><h2 id="shelves">こむぎの収蔵棚</h2><a class="text-link" href="collections.html">すべての棚</a></div>
      <div class="shelf-grid"><a class="shelf" href="collections.html"><span class="shelf-swatch"></span><h3>写真と動画</h3><span class="shelf-count">48の記録</span></a><a class="shelf" href="collections.html"><span class="shelf-swatch"></span><h3>ことば</h3><span class="shelf-count">21の記録</span></a><a class="shelf" href="collections.html"><span class="shelf-swatch"></span><h3>おもちゃ</h3><span class="shelf-count">8の記録</span></a><a class="shelf" href="collections.html"><span class="shelf-swatch"></span><h3>ご飯</h3><span class="shelf-count">12の記録</span></a><a class="shelf" href="collections.html"><span class="shelf-swatch"></span><h3>記念日</h3><span class="shelf-count">6の記録</span></a></div>
    </section>`),

  collections: () => shell("collections", `
    <header class="page-head"><div><p class="eyebrow">収蔵棚</p><h1>コレクション</h1><p class="lede">時間順ではなく、意味ごとにしまう場所。</p></div><button class="button button-secondary" type="button" data-toast="新しい棚の作成画面は次の試作で追加します">${icon("add")}新しい棚</button></header>
    <section class="collection-feature" aria-labelledby="favorite"><div class="copy"><p class="eyebrow">今月の棚</p><h2 id="favorite">窓辺の時間</h2><p class="muted">季節が変わっても、いつも同じ場所から外を見ている。</p><a class="text-link" href="entry.html">12の記録を見る</a></div><div class="photo-stack"><img src="${images.window}" alt="窓辺にいるこむぎ"><img src="${images.toy}" alt="家で遊ぶ猫"><img src="${images.food}" alt="器から食べる猫"></div></section>
    <section class="section" aria-labelledby="standard"><div class="section-head"><h2 id="standard">標準の棚</h2><button class="button button-quiet small" type="button" data-toast="並べ替えを新しい順にしました">並べ替え: 手動</button></div>
      <div class="collection-list"><a class="collection-row" href="entry.html"><img src="${images.window}" alt="写真と動画の表紙"><div><h3>写真と動画</h3><p>48の記録 · 7月14日更新</p></div></a><a class="collection-row" href="entry.html"><img src="${images.toy}" alt="おもちゃ棚の表紙"><div><h3>おもちゃ</h3><p>8の記録 · 7月9日更新</p></div></a><a class="collection-row" href="entry.html"><img src="${images.food}" alt="ご飯棚の表紙"><div><h3>ご飯</h3><p>12の記録 · 7月10日更新</p></div></a><a class="collection-row" href="entry.html"><div style="width:96px;height:80px;background:var(--color-accent-sky);display:grid;place-items:center;font-weight:800">ことば</div><div><h3>ことば</h3><p>21の記録 · 7月12日更新</p></div></a></div>
    </section>`),

  add: () => shell("add", `
    <header class="page-head"><div><p class="eyebrow">新しい記録</p><h1>今日は、何を残しますか</h1><p class="lede">テンプレートを選んでから、必要なところだけ書けます。</p></div></header>
    <div class="template-grid">
      <a class="template-card" href="compose.html">${icon("photo_camera")}<h2>何気ない瞬間</h2><p>写真、動画、または短い文章で、いつもの一場面を。</p><span class="meta">本文またはメディア</span></a>
      <a class="template-card" href="compose.html">${icon("menu_book")}<h2>今日のひとこと</h2><p>呼び名、寝言、ふと思ったことを言葉だけで。</p><span class="meta">本文</span></a>
      <a class="template-card" href="compose.html">${icon("toys")}<h2>好きなもの図鑑</h2><p>おもちゃや箱、毛布。遊び方も一緒に収蔵。</p><span class="meta">名前と種類</span></a>
      <a class="template-card" href="compose.html">${icon("restaurant")}<h2>ご飯メモ</h2><p>味、食いつき、また買いたいかを忘れないために。</p><span class="meta">商品名または自由名</span></a>
      <a class="template-card" href="compose.html">${icon("auto_awesome")}<h2>はじめて・記念日</h2><p>迎えた日や初めてできたことを、日付と一緒に。</p><span class="meta">タイトルと日付</span></a>
      <a class="template-card" href="compose.html">${icon("photo_library")}<h2>くらべる</h2><p>似た二枚を並べて、変わったことと変わらないことを。</p><span class="meta">2件のメディア</span></a>
    </div>`, { narrow: true }),

  compose: () => shell("add", `
    <header class="page-head"><div><p class="eyebrow">何気ない瞬間</p><h1>新しい記録</h1><p class="lede">文章と写真は、どちらか一つでも保存できます。</p></div><a class="text-link" href="add.html">テンプレートを変える</a></header>
    <form class="form-card" id="entry-form">
      <div class="field"><label for="media">写真または動画</label><label class="upload" for="media"><span>${icon("upload")}<strong>ここに写真や動画を追加</strong><small>JPG、PNG、MOV、MP4</small></span></label><input id="media" type="file" accept="image/*,video/*" hidden></div>
      <div class="field"><label for="note">今日のこと</label><textarea id="note" placeholder="風が入るたび、カーテンの影を目で追っていた。">風が入るたび、カーテンの影を目で追っていた。</textarea><small>あとから書き足せます</small></div>
      <div class="field"><label for="date">記録した日</label><input id="date" type="date" value="2026-07-14"></div>
      <div class="field"><label for="tags">タグ</label><input id="tags" type="text" value="窓辺, 夕方" aria-describedby="tag-help"><small id="tag-help">カンマで区切って入力</small></div>
    </form>
    <div class="form-actions"><a class="button button-secondary" href="add.html">${icon("arrow_back")}下書きを閉じる</a><button class="button" type="submit" form="entry-form">${icon("lock")}非公開で保存</button></div>`, { narrow: true }),

  entry: () => shell("collections", `
    <header class="page-head"><div><p class="eyebrow">何気ない瞬間</p><h1>夕方の窓辺</h1><p class="lede">2026年7月14日</p></div><div class="button-row"><button class="button button-secondary" type="button" data-toast="編集画面は作成画面と同じ構成です">${icon("edit")}編集</button><button class="button" type="button" data-toast="この記録は私室だけに保存されています">${icon("visibility")}展示する</button></div></header>
    <div class="entry-layout"><figure style="margin:0"><img class="entry-photo" src="${images.window}" alt="窓辺から外を眺めるこむぎ"><figcaption class="small muted" style="margin-top:10px">風が入るたび、カーテンの影を目で追っていた。</figcaption></figure>
      <aside class="entry-aside"><span class="pill">非公開</span><h2 style="margin-top:18px">この記録について</h2><dl class="entry-meta"><div><dt>猫</dt><dd>こむぎ</dd></div><div><dt>記録した日</dt><dd>2026年7月14日</dd></div><div><dt>作成者</dt><dd>あなた</dd></div><div><dt>棚</dt><dd>写真と動画<br>窓辺の時間</dd></div></dl><p class="label">タグ</p><div class="button-row"><span class="pill">窓辺</span><span class="pill">夕方</span></div><div class="button-row" style="margin-top:28px"><button class="button button-secondary" type="button" data-toast="共有URLの有効期限は7日間です">限定URLを作る</button></div></aside>
    </div>`),

  search: () => shell("", `
    <header class="page-head"><div><p class="eyebrow">私室の中だけ</p><h1>記録を探す</h1><p class="lede">文章、商品名、タグから見つけられます。</p></div></header>
    <form class="search-panel"><label class="field" style="margin:0"><span class="label">キーワード</span><input class="search-box" id="search-input" type="search" value="窓辺" placeholder="例: 窓辺、おもちゃ、ご飯"></label><button class="button" type="submit" style="align-self:end">${icon("search")}探す</button></form>
    <div class="filters" aria-label="絞り込み"><button class="filter" aria-pressed="true">すべて</button><button class="filter" aria-pressed="false">写真</button><button class="filter" aria-pressed="false">ことば</button><button class="filter" aria-pressed="false">おもちゃ</button><button class="filter" aria-pressed="false">2026年</button></div>
    <div class="section-head"><h2>3件の記録</h2><span class="small muted">新しい順</span></div><div class="result-list"><a class="result" href="entry.html"><img src="${images.window}" alt="窓辺のこむぎ"><div><h3>夕方の窓辺</h3><p>カーテンの影を目で追っていた。</p></div><time datetime="2026-07-14">7月14日</time></a><a class="result" href="entry.html"><img src="${images.window}" alt="窓辺で座る猫"><div><h3>網戸にした日</h3><p>外の音に耳だけが忙しい。</p></div><time datetime="2025-07-18">2025年7月</time></a><a class="result" href="entry.html"><img src="${images.toy}" alt="おもちゃで遊ぶ猫"><div><h3>窓辺に運んだ毛糸玉</h3><p>お気に入りを日向へ持ってきた。</p></div><time datetime="2024-04-03">2024年4月</time></a></div>`, { narrow: true }),

  town: () => shell("town", `
    <div class="town-intro"><div><p class="eyebrow">疑似お散歩</p><h1>中庭</h1><p class="lede">こむぎはいま、窓辺にいるみたいです。</p></div><button class="button button-secondary" type="button" data-toast="今日は夕方の窓辺を持って出ています">持ってきた一枚を見る</button></div>
    <section class="town-scene" aria-label="猫町の中庭。こむぎと三匹の猫の気配があります"><span class="scene-label">夕方 · 気配はゆっくり更新 · 写真表現は仮案</span><span class="town-sun" aria-hidden="true"></span><span class="town-wall" aria-hidden="true"></span><span class="town-bench" aria-hidden="true"></span><span class="town-tree" aria-hidden="true"></span>
      <button class="town-cat cat-a you" data-cat="こむぎ" type="button"><img src="${images.window}" alt="こむぎ"><span>こむぎ · あなた</span></button>
      <button class="town-cat cat-b" data-cat="ミケ" type="button"><img src="${images.food}" alt="ミケ"><span>ミケ · さっきいたようです</span></button>
      <button class="town-cat cat-c" data-cat="ルナ" type="button"><img src="${images.toy}" alt="ルナ"><span>ルナ · 休んでいるみたい</span></button>
      <button class="town-cat cat-d" data-cat="ソラ" type="button"><img src="${images.window}" alt="ソラ"><span>ソラ · 足あと</span></button>
      <div class="town-note"><p><strong>今日のすれ違い</strong><br><span class="muted">こむぎとミケが中庭ですれ違いました。</span></p><button class="button button-quiet" type="button" data-toast="すれ違いは回数や正確な時刻を表示しません">そっとしまう</button></div>
    </section>
    <aside class="reaction-panel" id="reaction-panel" hidden><button class="icon-button" type="button" data-close-panel aria-label="閉じる" style="float:right">${icon("close")}</button><p class="eyebrow">静かなあいさつ</p><h2 id="reaction-title">ミケへ</h2><p class="small muted">自由文や回数は表示されません。</p><div class="reaction-list"><button type="button" data-reaction>そっと近づく</button><button type="button" data-reaction>となりに座る</button><button type="button" data-reaction>においを嗅ぐ</button><button type="button" data-reaction>おもちゃを見る</button><button type="button" data-reaction>またね</button></div></aside>`, { wide: true }),

  notifications: () => shell("", `
    <header class="page-head"><div><p class="eyebrow">Web内通知</p><h1>お知らせ</h1><p class="lede">必要なことだけ、静かにまとめます。</p></div><button class="button button-secondary" id="mark-read" type="button">すべて既読にする</button></header>
    <div class="notice-list"><article class="notice unread"><span class="notice-dot" aria-label="未読"></span><div><h3>家族への招待が承認されました</h3><p>さくらさんが、こむぎのおうちに参加しました。</p></div><time datetime="2026-07-14">今日</time></article><article class="notice unread"><span class="notice-dot" aria-label="未読"></span><div><h3>データの書き出しが完了しました</h3><p>設定から7日間ダウンロードできます。</p></div><time datetime="2026-07-13">昨日</time></article><article class="notice"><span class="notice-dot" aria-label="既読"></span><div><h3>共有URLの期限が近づいています</h3><p>「夕方の窓辺」の共有は、あと2日で終了します。</p></div><time datetime="2026-07-10">7月10日</time></article><article class="notice"><span class="notice-dot" aria-label="既読"></span><div><h3>猫町の昨日のまとめ</h3><p>こむぎは中庭で、見かけた猫と静かに過ごしました。</p></div><time datetime="2026-07-09">7月9日</time></article></div>`, { narrow: true }),

  onboardingWelcome: () => onboardingShell(0, `
    <p class="eyebrow">ようこそ</p><h1>猫との時間のための、小さな居場所を作ります。</h1><p class="lede">まずは、あなたの呼び名を教えてください。あとからいつでも変更できます。</p>
    <form class="onboarding-form" action="onboarding-cat.html"><div class="field"><label for="display-name">あなたの表示名</label><input id="display-name" name="display-name" autocomplete="name" value="かずき" required></div><div class="onboarding-actions"><a class="text-link" href="home.html">あとで設定する</a><button class="button" type="submit">私室を作りはじめる${icon("arrow_forward")}</button></div></form>`, false),

  onboardingCat: () => onboardingShell(1, `
    <p class="eyebrow">最初の猫</p><h1>一緒に暮らす猫を迎えましょう。</h1><p class="lede">写真、名前、テーマ色だけで始められます。詳しいプロフィールはあとから追加できます。</p>
    <form class="onboarding-form" action="onboarding-style.html"><label class="cat-photo-picker" for="cat-photo"><img src="${images.window}" alt="猫の写真プレビュー"><span>${icon("photo_camera")}<strong>猫の写真を選ぶ</strong><small class="muted">写真なしでも進めます</small></span></label><input id="cat-photo" type="file" accept="image/*" hidden><div class="field"><label for="cat-name">猫の名前</label><input id="cat-name" name="cat-name" value="こむぎ" required></div><fieldset style="border:0;padding:0;margin:0"><legend class="label" style="margin-bottom:10px">こむぎのテーマ色</legend><div class="theme-options"><button class="theme-chip" type="button" aria-pressed="true" aria-label="ミント" style="background:var(--color-primary)"></button><button class="theme-chip" type="button" aria-pressed="false" aria-label="淡いミント" style="background:var(--color-accent-mint)"></button><button class="theme-chip" type="button" aria-pressed="false" aria-label="空色" style="background:var(--color-accent-sky)"></button><button class="theme-chip" type="button" aria-pressed="false" aria-label="桃色" style="background:var(--color-accent-peach)"></button><button class="theme-chip" type="button" aria-pressed="false" aria-label="杏色" style="background:var(--color-accent-apricot)"></button></div></fieldset><div class="onboarding-actions"><a class="button button-secondary" href="onboarding-welcome.html">${icon("arrow_back")}戻る</a><button class="button" type="submit">こむぎの部屋を作る${icon("arrow_forward")}</button></div></form>`, false),

  onboardingStyle: () => onboardingShell(2, `
    <p class="eyebrow">最初の収蔵棚</p><h1>残したい時間を選んでください。</h1><p class="lede">選んだものを最初の棚として用意します。すべて後から追加できます。</p>
    <form class="onboarding-form" action="onboarding-complete.html"><div class="memory-options" aria-label="残したい記録"><button class="memory-option" type="button" aria-pressed="true">${icon("photo_camera", "filled")}<span><strong>何気ない写真</strong><small class="muted">いつもの一場面</small></span></button><button class="memory-option" type="button" aria-pressed="true">${icon("menu_book", "filled")}<span><strong>ことば</strong><small class="muted">呼び名や寝言</small></span></button><button class="memory-option" type="button" aria-pressed="false">${icon("toys")}<span><strong>おもちゃ</strong><small class="muted">好きなもの図鑑</small></span></button><button class="memory-option" type="button" aria-pressed="false">${icon("restaurant")}<span><strong>ご飯</strong><small class="muted">食いつきのメモ</small></span></button></div><div class="setting-row" style="padding:16px 0 0"><div><h3>${icon("explore")}猫町をあとで試す</h3><p>猫町は任意です。私室だけでもすべて使えます。</p></div><button class="switch" type="button" aria-pressed="false" aria-label="猫町をあとで試す"></button></div><div class="onboarding-actions"><a class="button button-secondary" href="onboarding-cat.html">${icon("arrow_back")}戻る</a><button class="button" type="submit">居場所を完成させる${icon("arrow_forward")}</button></div></form>`, false),

  onboardingComplete: () => onboardingShell(3, `
    <div class="completion-mark">${icon("check_circle", "filled")}</div><p class="eyebrow">できあがりました</p><h1>こむぎとの居場所ができました。</h1><p class="lede">最初の記録は、今日の一枚からでも、ひとことだけでも大丈夫です。</p><div class="onboarding-actions"><a class="button" href="home.html">おうちへ入る${icon("arrow_forward")}</a><a class="button button-secondary" href="add.html">${icon("add")}最初の記録を作る</a></div>`, true),

  settings: () => shell("", `
    <header class="page-head"><div><p class="eyebrow">管理</p><h1>家族と設定</h1><p class="lede">公開範囲と参加の同意は、別々に管理します。</p></div></header>
    <div class="settings-grid"><div class="settings-nav" role="tablist" aria-label="設定の分類"><button type="button" role="tab" aria-selected="true" data-tab="town">猫町</button><button type="button" role="tab" aria-selected="false" data-tab="family">家族</button><button type="button" role="tab" aria-selected="false" data-tab="data">データ</button></div>
      <section class="settings-panel" id="settings-content"><p class="eyebrow">猫町への参加</p><h2>あなたとこむぎの設定</h2><div class="setting-row"><div><h3>あなたが猫町へ入る</h3><p>オフにしても私室と収蔵棚はすべて使えます。</p></div><button class="switch" type="button" aria-pressed="true" aria-label="あなたが猫町へ入る設定"></button></div><div class="setting-row"><div><h3>こむぎを家族が連れ出す</h3><p>おうちの家族が、こむぎと猫町へ入れます。</p></div><select aria-label="こむぎの猫町公開設定"><option>家族も可</option><option>所有者だけ</option><option>参加しない</option></select></div><div class="setting-row"><div><h3>一日一回のまとめ</h3><p>猫町での気配を、Web内通知だけで受け取ります。</p></div><button class="switch" type="button" aria-pressed="false" aria-label="一日一回のまとめ通知"></button></div></section>
    </div>`, { narrow: true })
};

const page = document.body.dataset.page;
if (pages[page]) document.getElementById("app").innerHTML = pages[page]();

document.addEventListener("click", (event) => {
  const toastTarget = event.target.closest("[data-toast]");
  if (toastTarget) showToast(toastTarget.dataset.toast);

  const filter = event.target.closest(".filter");
  if (filter) {
    document.querySelectorAll(".filter").forEach((item) => item.setAttribute("aria-pressed", "false"));
    filter.setAttribute("aria-pressed", "true");
  }

  const switchButton = event.target.closest(".switch");
  if (switchButton) switchButton.setAttribute("aria-pressed", switchButton.getAttribute("aria-pressed") !== "true");

  const themeChip = event.target.closest(".theme-chip");
  if (themeChip) {
    document.querySelectorAll(".theme-chip").forEach((item) => item.setAttribute("aria-pressed", "false"));
    themeChip.setAttribute("aria-pressed", "true");
  }

  const memoryOption = event.target.closest(".memory-option");
  if (memoryOption) memoryOption.setAttribute("aria-pressed", memoryOption.getAttribute("aria-pressed") !== "true");

  const cat = event.target.closest(".town-cat:not(.you)");
  if (cat) {
    document.getElementById("reaction-title").textContent = `${cat.dataset.cat}へ`;
    document.getElementById("reaction-panel").hidden = false;
  }
  if (event.target.closest("[data-close-panel]")) document.getElementById("reaction-panel").hidden = true;
  if (event.target.closest("[data-reaction]")) {
    document.getElementById("reaction-panel").hidden = true;
    showToast("静かなあいさつを届けました");
  }
});

document.addEventListener("submit", (event) => {
  event.preventDefault();
  if (event.target.id === "entry-form") {
    showToast("非公開で保存しました");
    window.setTimeout(() => { window.location.href = "entry.html"; }, 700);
  } else if (event.target.classList.contains("onboarding-form")) {
    const destination = event.target.getAttribute("action");
    event.target.querySelector("button[type='submit']")?.setAttribute("aria-busy", "true");
    window.setTimeout(() => { window.location.href = destination; }, 420);
  } else {
    showToast("3件の記録が見つかりました");
  }
});

document.getElementById("mark-read")?.addEventListener("click", () => {
  document.querySelectorAll(".notice.unread").forEach((item) => {
    item.classList.remove("unread");
    item.querySelector(".notice-dot").setAttribute("aria-label", "既読");
  });
  showToast("すべて既読にしました");
});

document.querySelectorAll("[data-tab]").forEach((tab) => tab.addEventListener("click", () => {
  document.querySelectorAll("[data-tab]").forEach((item) => item.setAttribute("aria-selected", "false"));
  tab.setAttribute("aria-selected", "true");
  const content = document.getElementById("settings-content");
  const copies = {
    town: ["猫町への参加", "あなたとこむぎの設定", "参加の同意と猫ごとの公開範囲を管理します。"],
    family: ["同居家族", "こむぎのおうち", "さくらさんが編集者として参加しています。"],
    data: ["所有する記録", "書き出しと退会", "写真、動画、文章をまとめて書き出せます。"]
  };
  const copy = copies[tab.dataset.tab];
  content.innerHTML = `<p class="eyebrow">${copy[0]}</p><h2>${copy[1]}</h2><p class="muted">${copy[2]}</p><div class="setting-row"><div><h3>${tab.dataset.tab === "family" ? "家族を招待" : tab.dataset.tab === "data" ? "データを書き出す" : "あなたが猫町へ入る"}</h3><p>この操作はプロトタイプでは保存されません。</p></div><button class="button button-secondary" type="button" data-toast="操作の流れを確認しました">確認する</button></div>`;
}));

function showToast(message) {
  const toast = document.querySelector(".toast");
  if (!toast) return;
  toast.textContent = message;
  toast.hidden = false;
  window.clearTimeout(window.toastTimer);
  window.toastTimer = window.setTimeout(() => { toast.hidden = true; }, 2200);
}

document.querySelectorAll(".template-card, .shelf, .collection-row, .path-card").forEach((item, index) => item.style.setProperty("--i", Math.min(index, 8)));
