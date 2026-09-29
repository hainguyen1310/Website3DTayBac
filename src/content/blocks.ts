/**
 * Model nội dung bài viết có cấu trúc (B08).
 *
 * - Bài cũ dạng `string[]` (mỗi phần tử là một đoạn văn) vẫn đọc được.
 * - Block mới: heading, paragraph, list, quote, image, cta, divider.
 * - Parser được kiểm soát; renderer escape mọi text và chỉ chấp nhận link an toàn.
 */

export type ContentBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "quote"; text: string }
  | { type: "image"; url: string; alt: string; caption: string }
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

/** Chỉ cho phép link nội bộ, https hoặc mailto/tel; chặn javascript/data. */
export function isSafeHref(value: string): boolean {
  const href = value.trim();
  if (!href) return false;
  if (href.startsWith("//")) return false;
  if (href.startsWith("/")) return !href.includes("\\") && !/^\/\s*\//.test(href);
  if (/^https:\/\//i.test(href)) return true;
  if (/^mailto:[^\s]+@[^\s]+$/i.test(href)) return true;
  if (/^tel:\+?[0-9\s().-]{6,20}$/i.test(href)) return true;
  return false;
}

function normalizeImageUrl(value: unknown): string {
  const url = cleanText(value, 500);
  if (!url) return "";
  if (/^https:\/\//i.test(url)) return url;
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  return "";
}

export function normalizeBlock(value: unknown): ContentBlock | null {
  if (!value || typeof value !== "object") return null;
  const block = value as Record<string, unknown>;
  switch (block.type) {
    case "paragraph": {
      const text = cleanText(block.text);
      return text ? { type: "paragraph", text } : null;
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
    case "image": {
      const url = normalizeImageUrl(block.url);
      if (!url) return null;
      return {
        type: "image",
        url,
        alt: cleanText(block.alt, 300),
        caption: cleanText(block.caption, 300),
      };
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
          return block.text;
        case "list":
          return block.items.join(" ");
        case "image":
          return block.caption || block.alt;
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

  if (options.publishing && words < 30) errors.push("Bài xuất bản cần tối thiểu khoảng 30 từ nội dung thật.");
  if (blocks.some((block) => block.type === "heading" && block.level === 2) === false && words > 400)
    warnings.push("Bài dài nhưng chưa có tiêu đề H2 nào; cân nhắc chia mục cho dễ đọc.");
  if (words > 1200 && !blocks.some((block) => block.type === "list"))
    warnings.push("Bài dài chưa có danh sách nào; danh sách giúp người đọc nhanh hơn.");
  if (/<\/?[a-z][^>]*>/i.test(text)) errors.push("Nội dung chứa thẻ HTML thô. Hãy dùng trình soạn block thay vì dán HTML.");
  if (/javascript:/i.test(text)) errors.push("Nội dung chứa liên kết không an toàn (javascript:).");
  return { errors, warnings };
}

/* ------------------------------------------------------------------ */
/* Inline: **đậm** và [nhãn](href) an toàn                              */
/* ------------------------------------------------------------------ */

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Render inline an toàn: input luôn được escape trước, sau đó chỉ áp dụng
 * cặp `**đậm**` và link có href hợp lệ. Không nhận HTML thô.
 */
export function renderInline(text: string): string {
  let output = escapeHtml(text);
  output = output.replace(/\[([^\]]{1,200})\]\(([^()\s]{1,500})\)/g, (match, label: string, href: string) => {
    const decodedHref = href.replace(/&amp;/g, "&");
    if (!isSafeHref(decodedHref)) return match;
    const rel = /^https:\/\//i.test(decodedHref) ? ' rel="noopener noreferrer" target="_blank"' : "";
    return `<a href="${escapeHtml(decodedHref)}"${rel}>${label}</a>`;
  });
  output = output.replace(/\*\*([^*]{1,300})\*\*/g, "<strong>$1</strong>");
  return output;
}
