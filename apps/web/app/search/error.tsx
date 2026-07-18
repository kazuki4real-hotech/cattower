"use client";

import { PageHeading } from "@cattower/ui";

import { AppShellClient } from "@/components/app-shell-client";
import { Icon } from "@/components/icon";

export default function SearchError({ reset }: { reset: () => void }) {
  return (
    <AppShellClient cats={[]} activeCatId={null} narrow>
      <PageHeading
        eyebrow="おうちの記録"
        title="記録を探す"
        description="文章、日付、タグ、猫から見つけられます。"
      />
      <section className="search-empty" aria-labelledby="search-error-title">
        <Icon name="error" />
        <div>
          <h2 id="search-error-title">検索結果を読み込めませんでした</h2>
          <p>通信を確認して、もう一度お試しください。</p>
        </div>
        <button className="button button-secondary" onClick={reset}>
          もう一度試す
        </button>
      </section>
    </AppShellClient>
  );
}
