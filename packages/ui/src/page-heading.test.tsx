import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PageHeading } from "./page-heading";

describe("PageHeading", () => {
  it("renders the page hierarchy and optional actions", () => {
    const markup = renderToStaticMarkup(
      <PageHeading
        eyebrow="収蔵棚"
        title="コレクション"
        description="意味ごとにしまう場所。"
        actions={<button type="button">新しい棚</button>}
      />,
    );

    expect(markup).toContain('<header class="page-head">');
    expect(markup).toContain('<p class="eyebrow">収蔵棚</p>');
    expect(markup).toContain("<h1>コレクション</h1>");
    expect(markup).toContain('<div class="button-row">');
  });

  it("does not render an empty action container", () => {
    const markup = renderToStaticMarkup(
      <PageHeading
        eyebrow="Web内通知"
        title="お知らせ"
        description="必要なことだけまとめます。"
      />,
    );

    expect(markup).not.toContain("button-row");
  });
});
