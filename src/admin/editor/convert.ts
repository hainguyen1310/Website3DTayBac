/**
 * Chuyển đổi hai chiều giữa tài liệu TipTap (JSON) và block bài viết đã lưu.
 *
 * Bài viết vẫn lưu dạng block an toàn (src/content/blocks.ts) nên website,
 * SEO server-render và database không phải đổi. Trình soạn thảo chỉ là một
 * cách nhìn "như Google Docs" lên cùng dữ liệu đó.
 */

import type { JSONContent } from "@tiptap/core";
import { CALLOUT_VARIANTS, toBlocks } from "../../content/blocks.ts";
import type { ArticleBody, ArticleImage, CalloutVariant, ContentBlock } from "../../content/blocks.ts";
import { parseInline, serializeInline } from "../../content/inline.ts";
import type { InlineSegment } from "../../content/inline.ts";

type Mark = NonNullable<JSONContent["marks"]>[number];

/* ------------------------------------------------------------------ */
/* Block → tài liệu                                                    */
/* ------------------------------------------------------------------ */

function segmentToNode(segment: InlineSegment): JSONContent {
  const marks: Mark[] = [];
  if (segment.bold) marks.push({ type: "bold" });
  if (segment.italic) marks.push({ type: "italic" });
  if (segment.underline) marks.push({ type: "underline" });
  if (segment.href) marks.push({ type: "link", attrs: { href: segment.href } });
  return marks.length ? { type: "text", text: segment.text, marks } : { type: "text", text: segment.text };
}

function inlineContent(text: string): JSONContent[] | undefined {
  const nodes = parseInline(text).filter((segment) => segment.text).map(segmentToNode);
  return nodes.length ? nodes : undefined;
}

function paragraph(text: string, attrs?: Record<string, unknown>): JSONContent {
  const content = inlineContent(text);
  return { type: "paragraph", ...(attrs ? { attrs } : {}), ...(content ? { content } : {}) };
}

function imageAttrs(image: ArticleImage) {
  return { src: image.url, alt: image.alt, caption: image.caption };
}

function blockToNodes(block: ContentBlock): JSONContent[] {
  switch (block.type) {
    case "paragraph":
      return [paragraph(block.text, block.style === "lead" ? { lead: true } : undefined)];
    case "heading": {
      const content = inlineContent(block.text);
      return [{ type: "heading", attrs: { level: block.level }, ...(content ? { content } : {}) }];
    }
    case "list":
      return [{
        type: block.ordered ? "orderedList" : "bulletList",
        content: block.items.map((item) => ({ type: "listItem", content: [paragraph(item)] })),
      }];
    case "quote":
      return [{ type: "blockquote", content: [paragraph(block.text)] }];
    case "callout":
      return [{ type: "callout", attrs: { variant: block.variant }, content: block.text.split("\n").map((line) => paragraph(line)) }];
    case "image":
      return [{ type: "figure", attrs: { ...imageAttrs(block), size: block.size ?? "full" } }];
    case "image-pair":
    case "gallery":
      return [{ type: "imageRow", attrs: { images: block.images.map((image) => ({ ...image })) } }];
    case "cta":
      return [{ type: "cta", attrs: { label: block.label, href: block.href, productId: block.productId } }];
    case "divider":
      return [{ type: "horizontalRule" }];
  }
}

export function blocksToDoc(body: ArticleBody): JSONContent {
  const content = toBlocks(body).flatMap(blockToNodes);
  return { type: "doc", content: content.length ? content : [{ type: "paragraph" }] };
}

/* ------------------------------------------------------------------ */
/* Tài liệu → block                                                    */
/* ------------------------------------------------------------------ */

function nodeSegment(node: JSONContent): InlineSegment {
  const segment: InlineSegment = { text: node.text ?? "" };
  for (const mark of node.marks ?? []) {
    if (mark.type === "bold") segment.bold = true;
    else if (mark.type === "italic") segment.italic = true;
    else if (mark.type === "underline") segment.underline = true;
    else if (mark.type === "link" && typeof mark.attrs?.href === "string") segment.href = mark.attrs.href;
  }
  // Google Docs gạch chân mọi link; giữ link, bỏ gạch chân thừa.
  if (segment.href) delete segment.underline;
  return segment;
}

/** Nội dung inline của một node, tách dòng ở mỗi lần xuống dòng (Shift+Enter). */
function inlineLines(node: JSONContent): string[] {
  const lines: InlineSegment[][] = [[]];
  for (const child of node.content ?? []) {
    if (child.type === "hardBreak") lines.push([]);
    else if (child.type === "text") lines[lines.length - 1].push(nodeSegment(child));
  }
  return lines.map((segments) => serializeInline(segments).trim()).filter(Boolean);
}

/** Chữ thuần (đã escape) cho tiêu đề: tiêu đề không mang định dạng inline. */
function plainLine(node: JSONContent): string {
  const text = (node.content ?? []).map((child) => child.type === "text" ? child.text ?? "" : " ").join("").replace(/\s+/g, " ").trim();
  return serializeInline([{ text }]);
}

function textBlocks(node: JSONContent): string[] {
  return (node.content ?? []).flatMap((child) => child.type === "paragraph" || child.type === "heading" ? inlineLines(child) : textBlocks(child));
}

function listItems(node: JSONContent): string[] {
  return (node.content ?? []).flatMap((item) => (item.content ?? []).flatMap((child) =>
    child.type === "bulletList" || child.type === "orderedList" ? listItems(child) : inlineLines(child).join(" ") || [],
  ));
}

function toImage(value: unknown): ArticleImage {
  const image = (value ?? {}) as Record<string, unknown>;
  const url = typeof image.url === "string" ? image.url : typeof image.src === "string" ? image.src : "";
  return { url, alt: typeof image.alt === "string" ? image.alt : "", caption: typeof image.caption === "string" ? image.caption : "" };
}

function nodeToBlocks(node: JSONContent): ContentBlock[] {
  const attrs = node.attrs ?? {};
  switch (node.type) {
    case "paragraph": {
      const lines = inlineLines(node);
      return lines.map((text, index) => (attrs.lead && index === 0 ? { type: "paragraph", text, style: "lead" } : { type: "paragraph", text }));
    }
    case "heading": {
      const text = plainLine(node);
      return text ? [{ type: "heading", level: Number(attrs.level) >= 3 ? 3 : 2, text }] : [];
    }
    case "bulletList":
    case "orderedList": {
      const items = listItems(node);
      return items.length ? [{ type: "list", ordered: node.type === "orderedList", items }] : [];
    }
    case "blockquote": {
      const text = textBlocks(node).join(" ");
      return text ? [{ type: "quote", text }] : [];
    }
    case "callout": {
      const text = textBlocks(node).join("\n");
      const variant = CALLOUT_VARIANTS.includes(attrs.variant as CalloutVariant) ? attrs.variant as CalloutVariant : "tip";
      return text ? [{ type: "callout", variant, text }] : [];
    }
    case "figure": {
      const image = toImage(attrs);
      return image.url ? [{ type: "image", ...image, ...(attrs.size === "small" ? { size: "small" as const } : {}) }] : [];
    }
    case "imageRow": {
      const images = (Array.isArray(attrs.images) ? attrs.images : []).map(toImage).filter((image) => image.url);
      if (images.length === 2) return [{ type: "image-pair", images: [images[0], images[1]] }];
      if (images.length >= 3) return [{ type: "gallery", images: images.slice(0, 4) }];
      return images.map((image) => ({ type: "image", ...image }));
    }
    case "cta": {
      const label = typeof attrs.label === "string" ? attrs.label.trim() : "";
      const href = typeof attrs.href === "string" ? attrs.href.trim() : "";
      return label ? [{ type: "cta", label, href, productId: typeof attrs.productId === "string" ? attrs.productId : "" }] : [];
    }
    case "horizontalRule":
      return [{ type: "divider" }];
    default:
      // Node lạ (bảng dán từ Docs…) được hạ thành đoạn văn để không mất chữ.
      return textBlocks(node).map((text) => ({ type: "paragraph", text }));
  }
}

export function docToBlocks(doc: JSONContent): ContentBlock[] {
  return (doc.content ?? []).flatMap(nodeToBlocks);
}

/** Ảnh chưa nằm trong kho ảnh của A Sỉn (vd link Google Docs) sẽ hỏng về sau. */
export function isHostedImage(url: string): boolean {
  return url.startsWith("/") || url.includes("/storage/v1/object/public/site-images/");
}

export function externalImageCount(blocks: ContentBlock[]): number {
  return blocks.reduce((count, block) => {
    if (block.type === "image") return count + (isHostedImage(block.url) ? 0 : 1);
    if (block.type === "image-pair" || block.type === "gallery") return count + block.images.filter((image) => !isHostedImage(image.url)).length;
    return count;
  }, 0);
}
