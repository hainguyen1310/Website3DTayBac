import { test } from "node:test";
import assert from "node:assert/strict";
import {
  blocksToPlainText,
  estimateReadMinutes,
  normalizeBlock,
  parseArticleBody,
  renderInline,
  toBlocks,
  validateArticleBody,
} from "../src/content/blocks.ts";
import { articleFromRow, formatVietnameseDate } from "../src/content/article.ts";

test("legacy paragraph arrays keep working and new blocks are normalized", () => {
  const body = parseArticleBody([
    "Đoạn cũ",
    { type: "heading", level: 3, text: "Mục nhỏ" },
    { type: "list", ordered: true, items: ["một", "hai"] },
    { type: "unknown" },
    { type: "cta", label: "Xem", href: "javascript:alert(1)" },
    { type: "cta", label: "Xem sản vật", href: "/san-pham/tra" },
  ]);
  assert.equal(body.length, 4);
  assert.equal(toBlocks(body)[0].type, "paragraph");
  assert.equal(normalizeBlock({ type: "cta", label: "x", href: "data:text/html,x" }), null);
  assert.equal(normalizeBlock({ type: "image", url: "//evil.example/x.png" }), null);
  assert.match(blocksToPlainText(body), /một hai/);
});

test("inline rendering escapes HTML and rejects javascript links", () => {
  assert.equal(renderInline("<script>alert(1)</script>"), "&lt;script&gt;alert(1)&lt;/script&gt;");
  const link = renderInline("Xem [tại đây](/san-pham) và **đậm**");
  assert.match(link, /<a href="\/san-pham">tại đây<\/a>/);
  assert.match(link, /<strong>đậm<\/strong>/);
  assert.doesNotMatch(renderInline("[x](javascript:alert(1))"), /<a/);
});

test("publishing validator separates blocking errors from editorial warnings", () => {
  const empty = validateArticleBody([], { publishing: true });
  assert.equal(empty.errors.length, 1);

  const longProse = validateArticleBody([{ type: "paragraph", text: Array(500).fill("chữ").join(" ") }]);
  assert.equal(longProse.errors.length, 0);
  assert.ok(longProse.warnings.some((warning) => warning.includes("H2")));

  const rawHtml = validateArticleBody([{ type: "paragraph", text: "<div>dán html</div>" }], { publishing: true });
  assert.ok(rawHtml.errors.some((error) => error.includes("HTML")));
});

test("read time estimate stays within API bounds", () => {
  assert.equal(estimateReadMinutes([]), 1);
  assert.ok(estimateReadMinutes([{ type: "paragraph", text: "từ ".repeat(2000) }]) <= 120);
});

test("article mapper reads SEO/date fields and legacy rows", () => {
  const published = articleFromRow({
    id: "1",
    slug: "a",
    tag: "Từ bản làng",
    tag_slug: "tu-ban-lang",
    title: "T",
    excerpt: "E",
    image_url: "/i.webp",
    read_time_minutes: 5,
    body: ["đoạn"],
    published: true,
    published_at: "2026-09-18T00:00:00Z",
    first_published_at: "2026-09-10T00:00:00Z",
    content_modified_at: "2026-09-20T00:00:00Z",
    seo_title: "SEO",
    related_product_slugs: ["tra-shan"],
    related_article_slugs: null,
  });
  assert.equal(published.publishedAt, "2026-09-10T00:00:00Z");
  assert.equal(published.modifiedAt, "2026-09-20T00:00:00Z");
  assert.equal(published.seoTitle, "SEO");
  assert.deepEqual(published.relatedProductSlugs, ["tra-shan"]);
  assert.deepEqual(published.relatedArticleSlugs, []);
  assert.equal(published.tagSlug, "tu-ban-lang");

  const legacy = articleFromRow({
    id: "2", slug: "b", tag: "Vị Tây Bắc", title: "L", excerpt: "E", image_url: "/i.webp",
    read_time_minutes: 3, body: ["đoạn"], published: true, published_at: "2026-09-01T00:00:00Z",
  });
  assert.equal(legacy.publishedAt, "2026-09-01T00:00:00Z");
  assert.equal(legacy.tagSlug, "vi-tay-bac");
});

test("Vietnamese date formatting uses dd.mm.yyyy", () => {
  assert.equal(formatVietnameseDate("2026-09-29T00:00:00Z"), "29.09.2026");
  assert.equal(formatVietnameseDate(null), "");
});
