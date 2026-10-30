import { test } from "node:test";
import assert from "node:assert/strict";
import { inlineToPlainText, parseInline, renderInline, serializeInline } from "../src/content/inline.ts";
import { blocksToPlainText, normalizeBlock, parseArticleBody } from "../src/content/blocks.ts";
import type { ContentBlock } from "../src/content/blocks.ts";
import { blocksToDoc, docToBlocks, externalImageCount, isHostedImage } from "../src/admin/editor/convert.ts";
import { normalizePastedHtml } from "../src/admin/editor/paste.ts";
import { blockingErrors, emptyArticleForm, formToInput, readinessChecklist, withTitle } from "../src/admin/articleForm.ts";
import { isAllowedImageUrl } from "../server/image-import.ts";

const HOSTED = "https://x.supabase.co/storage/v1/object/public/site-images/articles/a.webp";

test("inline marks render as safe HTML and round-trip through the serializer", () => {
  const source = "**đậm** *nghiêng* __gạch__ [link](/san-pham) và [**đậm link**](https://asintaybac.com)";
  assert.equal(
    renderInline(source),
    '<strong>đậm</strong> <em>nghiêng</em> <u>gạch</u> <a href="/san-pham">link</a> và <a href="https://asintaybac.com" rel="noopener noreferrer" target="_blank"><strong>đậm link</strong></a>',
  );
  assert.deepEqual(parseInline(serializeInline(parseInline(source))), parseInline(source));
});

test("adjacent marks are not confused (italic then bold)", () => {
  const text = serializeInline([{ text: "a", italic: true }, { text: "b", bold: true }]);
  assert.equal(renderInline(text), "<em>a</em><strong>b</strong>");
});

test("legacy text with lone markers and special characters stays literal", () => {
  assert.equal(renderInline("Khách sạn 5* và file_name"), "Khách sạn 5* và file_name");
  assert.equal(renderInline("**mở không đóng"), "**mở không đóng");
  assert.equal(inlineToPlainText(serializeInline([{ text: "giá 5* [nháp] __x__" }])), "giá 5* [nháp] __x__");
  assert.equal(renderInline("<img src=x onerror=alert(1)>"), "&lt;img src=x onerror=alert(1)&gt;");
  assert.doesNotMatch(renderInline("[x](javascript:alert(1))"), /<a/);
});

test("new block types are normalized and contribute plain text", () => {
  const body = parseArticleBody([
    { type: "callout", variant: "evil", text: "**Mẹo:** ủ ấm" },
    { type: "gallery", images: [{ url: HOSTED, alt: "1" }, { url: HOSTED, alt: "2" }, { url: HOSTED, alt: "3" }] },
    { type: "gallery", images: [{ url: HOSTED }] },
    { type: "image", url: HOSTED, alt: "a", size: "small" },
    { type: "image", url: HOSTED, alt: "a", size: "huge" },
  ]);
  assert.equal(body.length, 4);
  assert.deepEqual(body[0], { type: "callout", variant: "tip", text: "**Mẹo:** ủ ấm" });
  assert.equal((body[2] as Extract<ContentBlock, { type: "image" }>).size, "small");
  assert.equal("size" in (body[3] as object), false);
  assert.match(blocksToPlainText(body), /^Mẹo: ủ ấm/);
  assert.equal(normalizeBlock({ type: "gallery", images: [{ url: "javascript:x" }, { url: HOSTED }, { url: HOSTED }] }), null);
});

test("every block type survives blocks → editor document → blocks", () => {
  const blocks: ContentBlock[] = [
    { type: "paragraph", text: "Mở đầu *nghiêng*", style: "lead" },
    { type: "heading", level: 2, text: "Mục lớn" },
    { type: "paragraph", text: "Có **đậm**, __gạch__ và [link](/san-pham/tra)." },
    { type: "list", ordered: true, items: ["một", "**hai**"] },
    { type: "quote", text: "Trích dẫn" },
    { type: "callout", variant: "note", text: "Dòng 1\n**Dòng 2**" },
    { type: "image", url: HOSTED, alt: "ảnh", caption: "chú thích", size: "small" },
    { type: "image-pair", images: [{ url: HOSTED, alt: "a", caption: "" }, { url: HOSTED, alt: "b", caption: "c" }] },
    { type: "gallery", images: [1, 2, 3].map((n) => ({ url: HOSTED, alt: `g${n}`, caption: "" })) },
    { type: "cta", label: "Xem trà", href: "/san-pham/tra", productId: "tra" },
    { type: "divider" },
  ];
  assert.deepEqual(docToBlocks(blocksToDoc(blocks)), blocks);
});

test("legacy string paragraphs open in the editor", () => {
  assert.deepEqual(docToBlocks(blocksToDoc(["Đoạn cũ", "Đoạn hai"])), [
    { type: "paragraph", text: "Đoạn cũ" },
    { type: "paragraph", text: "Đoạn hai" },
  ]);
  assert.deepEqual(blocksToDoc([]).content, [{ type: "paragraph" }]);
});

test("pasted structures are cleaned when converted to blocks", () => {
  const blocks = docToBlocks({
    type: "doc",
    content: [
      { type: "paragraph" },
      { type: "paragraph", content: [{ type: "text", text: "Dòng một" }, { type: "hardBreak" }, { type: "text", text: "Dòng hai" }] },
      { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Tiêu đề *đậm*", marks: [{ type: "bold" }] }] },
      { type: "paragraph", content: [{ type: "text", text: "sản phẩm", marks: [{ type: "underline" }, { type: "link", attrs: { href: "https://asintaybac.com" } }] }] },
      { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "cha" }] }, { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "con" }] }] }] }] }] },
      { type: "table", content: [{ type: "tableRow", content: [{ type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "ô bảng" }] }] }] }] },
      { type: "imageRow", attrs: { images: [{ url: HOSTED, alt: "", caption: "" }, { url: "", alt: "", caption: "" }] } },
      { type: "figure", attrs: { src: "" } },
    ],
  });
  assert.deepEqual(blocks, [
    { type: "paragraph", text: "Dòng một" },
    { type: "paragraph", text: "Dòng hai" },
    { type: "heading", level: 3, text: "Tiêu đề \\*đậm\\*" },
    { type: "paragraph", text: "[sản phẩm](https://asintaybac.com)" },
    { type: "list", ordered: false, items: ["cha", "con"] },
    { type: "paragraph", text: "ô bảng" },
    { type: "image", url: HOSTED, alt: "", caption: "" },
  ]);
});

test("images outside the A Sỉn library are flagged", () => {
  assert.equal(isHostedImage(HOSTED), true);
  assert.equal(isHostedImage("/media/a.webp"), true);
  assert.equal(isHostedImage("https://lh7-rt.googleusercontent.com/docsz/abc"), false);
  assert.equal(externalImageCount([
    { type: "image", url: "https://lh7-rt.googleusercontent.com/x", alt: "", caption: "" },
    { type: "gallery", images: [{ url: HOSTED, alt: "", caption: "" }, { url: "blob:http://x/1", alt: "", caption: "" }, { url: HOSTED, alt: "", caption: "" }] },
  ]), 2);
});

test("Google Docs HTML is normalized before parsing", () => {
  const html = '<meta charset="utf-8"><b id="docs-internal-guid-1"><h1 dir="ltr">A</h1><p>B</p><br><h5>C</h5></b><br class="Apple-interchange-newline">';
  assert.equal(normalizePastedHtml(html), '<meta charset="utf-8"><b id="docs-internal-guid-1"><h2 dir="ltr">A</h2><p>B</p><h3>C</h3></b>');
});

test("article form: drafts need only a title, publishing needs the essentials", () => {
  const draft = withTitle(emptyArticleForm(), "Trà Shan tuyết Suối Giàng");
  assert.equal(draft.slug, "tra-shan-tuyet-suoi-giang");
  assert.deepEqual(blockingErrors(draft), []);
  const publishing = { ...draft, mode: "now" as const };
  const errors = blockingErrors(publishing);
  assert.ok(errors.some((error) => error.includes("chuyên mục")));
  assert.ok(errors.some((error) => error.includes("ảnh bìa")));
  assert.ok(errors.some((error) => error.includes("30 từ")));
  const withExternal = { ...draft, body: [{ type: "image" as const, url: "https://lh7-rt.googleusercontent.com/x", alt: "", caption: "" }] };
  assert.ok(blockingErrors(withExternal).some((error) => error.includes("kho ảnh")));
  const touched = withTitle({ ...draft, slug: "rieng", slugTouched: true }, "Tiêu đề khác");
  assert.equal(touched.slug, "rieng");
});

test("article form maps publish modes and computes read time", () => {
  const form = { ...withTitle(emptyArticleForm(), "Bài"), body: [{ type: "paragraph" as const, text: "từ ".repeat(600) }] };
  assert.equal(formToInput(form).published, false);
  assert.equal(formToInput({ ...form, mode: "now" }).published, true);
  assert.equal(formToInput({ ...form, mode: "now", scheduledAt: "2030-01-01T00:00:00Z" }).scheduledAt, null);
  assert.equal(formToInput({ ...form, mode: "schedule", scheduledAt: "2030-01-01T00:00:00Z" }).scheduledAt, "2030-01-01T00:00:00Z");
  assert.equal(formToInput(form).readTimeMinutes, 3);
  const checklist = readinessChecklist(form);
  assert.equal(checklist.find((item) => item.id === "words")?.done, true);
  assert.equal(checklist.find((item) => item.id === "cover")?.done, false);
});

test("image import only accepts Google image hosts over https", () => {
  assert.equal(isAllowedImageUrl("https://lh7-rt.googleusercontent.com/docsz/AD_4nX?key=1"), true);
  assert.equal(isAllowedImageUrl("https://lh3.ggpht.com/x"), true);
  assert.equal(isAllowedImageUrl("http://lh7-rt.googleusercontent.com/x"), false);
  assert.equal(isAllowedImageUrl("https://googleusercontent.com.evil.example/x"), false);
  assert.equal(isAllowedImageUrl("https://169.254.169.254/latest"), false);
  assert.equal(isAllowedImageUrl("https://user:pass@lh7-rt.googleusercontent.com/x"), false);
  assert.equal(isAllowedImageUrl("not a url"), false);
});
