/**
 * Model nội dung bài viết có cấu trúc (B08).
 *
 * - Bài cũ dạng `string[]` (mỗi phần tử là một đoạn văn) vẫn đọc được.
 * - Block: heading, paragraph, list, quote, callout, image, image-pair, gallery, cta, divider.
 * - Parser được kiểm soát; renderer escape mọi text và chỉ chấp nhận link an toàn.
 * - Định dạng inline (đậm/nghiêng/gạch chân/link) nằm ở inline.ts.
 */

import { escapeHtml, inlineToPlainText, isSafeHref, renderInline } from "./inline.ts";

export { escapeHtml, inlineToPlainText, isSafeHref, renderInline };

export type ArticleImage = { url: string; alt: string; caption: string };
export type CalloutVariant = "tip" | "note" | "info";
export const CALLOUT_VARIANTS: CalloutVariant[] = ["tip", "note", "info"];

export type ContentBlock =
  | { type: "paragraph"; text: string; style?: "lead" }
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "quote"; text: string }
  /** Khung nổi bật có viền; mỗi dòng của text là một đoạn. */
  | { type: "callout"; variant: CalloutVariant; text: string }
  | { type: "image"; url: string; alt: string; caption: string; size?: "small" }
  | { type: "image-pair"; images: [ArticleImage, ArticleImage] }
  /** Bộ ảnh 3–4 ảnh xếp hàng ngang. */
  | { type: "gallery"; images: ArticleImage[] }
  | { type: "cta"; label: string; href: string; productId: string }
  | { type: "divider" };

export type ArticleBody = Array<string | ContentBlock>;

const MAX_BLOCKS = 200;
const MAX_TEXT = 4000;
const MAX_ITEMS = 30;

export function cleanText(value: unknown, max = MAX_TEXT): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .trim()
    .slice(0, max);
}

function normalizeImageUrl(value: unknown): string {
  const url = cleanText(value, 500);
  if (!url) return "";
  if (/^https:\/\//i.test(url)) return url;
  if (url.startsWith("/") && isSafeHref(url)) return url;
  return "";
}

export function normalizeBlock(value: unknown): ContentBlock | null {
  if (!value || typeof value !== "object") return null;
  const block = value as Record<string, unknown>;
  switch (block.type) {
    case "paragraph": {
      const text = cleanText(block.text);
      return text ? { type: "paragraph", text, ...(block.style === "lead" ? { style: "lead" as const } : {}) } : null;
    }
    case "heading": {
      const text = cleanText(block.text, 300);
      const level = block.level === 3 ? 3 : 2;
      return text ? { type: "heading", level, text } : null;
    }
    case "list": {
      const items = Array.isArray(block.items)
        ? block.items.map((item) => cleanText(item, 500)).filter(Boolean).slice(0, MAX_ITEMS)
        : [];
      if (!items.length) return null;
      return { type: "list", ordered: block.ordered === true, items };
    }
    case "quote": {
      const text = cleanText(block.text);
      return text ? { type: "quote", text } : null;
    }
    case "callout": {
      const text = cleanText(block.text);
      const variant = CALLOUT_VARIANTS.includes(block.variant as CalloutVariant) ? block.variant as CalloutVariant : "tip";
      return text ? { type: "callout", variant, text } : null;
    }
    case "image": {
      const url = normalizeImageUrl(block.url);
      if (!url) return null;
      return {
        type: "image",
        url,
        alt: cleanText(block.alt, 300),
        caption: cleanText(block.caption, 300),
        ...(block.size === "small" ? { size: "small" as const } : {}),
      };
    }
    case "image-pair": {
      if (!Array.isArray(block.images) || block.images.length !== 2) return null;
      const images = block.images.map((image) => normalizeBlock({ ...image, type: "image" }));
      const [left, right] = images;
      if (left?.type !== "image" || right?.type !== "image") return null;
      return { type: "image-pair", images: [
        { url: left.url, alt: left.alt, caption: left.caption },
        { url: right.url, alt: right.alt, caption: right.caption },
      ] };
    }
    case "gallery": {
      if (!Array.isArray(block.images) || block.images.length < 3 || block.images.length > 4) return null;
      const images = block.images.map((image) => normalizeBlock({ ...image, type: "image" }));
      if (images.some((image) => image?.type !== "image")) return null;
      return { type: "gallery", images: images.map((image) => {
        const { url, alt, caption } = image as Extract<ContentBlock, { type: "image" }>;
        return { url, alt, caption };
      }) };
    }
    case "cta": {
      const label = cleanText(block.label, 120);
      const href = cleanText(block.href, 500);
      if (!label || !isSafeHref(href)) return null;
      return { type: "cta", label, href, productId: cleanText(block.productId, 120) };
    }
    case "divider":
      return { type: "divider" };
    default:
      return null;
  }
}

/** Đọc body từ DB/API; giữ tương thích bài cũ dạng mảng đoạn văn. */
export function parseArticleBody(value: unknown): ArticleBody {
  if (!Array.isArray(value)) return [];
  const body: ArticleBody = [];
  for (const entry of value.slice(0, MAX_BLOCKS)) {
    if (typeof entry === "string") {
      const text = cleanText(entry);
      if (text) body.push(text);
      continue;
    }
    const block = normalizeBlock(entry);
    if (block) body.push(block);
  }
  return body;
}

export function toBlocks(body: ArticleBody): ContentBlock[] {
  return body.map((entry) =>
    typeof entry === "string" ? { type: "paragraph", text: entry } : entry,
  );
}

export function blocksToPlainText(body: ArticleBody): string {
  return toBlocks(body)
    .map((block) => {
      switch (block.type) {
        case "paragraph":
        case "heading":
        case "quote":
        case "callout":
          return inlineToPlainText(block.text);
        case "list":
          return block.items.map(inlineToPlainText).join(" ");
        case "image":
          return block.caption || block.alt;
        case "image-pair":
        case "gallery":
          return block.images.map((image) => image.caption || image.alt).join(" ");
        case "cta":
          return block.label;
        default:
          return "";
      }
    })
    .filter(Boolean)
    .join("\n\n");
}

export function estimateReadMinutes(body: ArticleBody): number {
  const words = blocksToPlainText(body).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.min(120, Math.round(words / 200)));
}

export type BodyValidation = {
  errors: string[];
  warnings: string[];
};

/** Lỗi chặn xuất bản khác với khuyến nghị biên tập (B08). */
export function validateArticleBody(body: ArticleBody, options: { publishing: boolean } = { publishing: false }): BodyValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const blocks = toBlocks(body);
  const text = blocksToPlainText(body);
  const words = text.split(/\s+/).filter(Boolean).length;

  for (const entry of body) {
    if (typeof entry === "object" && (entry.type === "image" || entry.type === "image-pair" || entry.type === "gallery") && !normalizeBlock(entry))
      errors.push("Hãy chọn đủ ảnh hợp lệ cho khối ảnh trước khi lưu.");
  }
  if (options.publishing && words < 30) errors.push("Bài xuất bản cần tối thiểu khoảng 30 từ nội dung thật.");
  if (blocks.some((block) => block.type === "heading" && block.level === 2) === false && words > 400)
    warnings.push("Bài dài nhưng chưa có tiêu đề H2 nào; cân nhắc chia mục cho dễ đọc.");
  if (words > 1200 && !blocks.some((block) => block.type === "list"))
    warnings.push("Bài dài chưa có danh sách nào; danh sách giúp người đọc nhanh hơn.");
  if (/<\/?[a-z][^>]*>/i.test(text)) errors.push("Nội dung chứa thẻ HTML thô. Hãy dùng trình soạn block thay vì dán HTML.");
  if (/javascript:/i.test(text)) errors.push("Nội dung chứa liên kết không an toàn (javascript:).");
  return { errors, warnings };
}

