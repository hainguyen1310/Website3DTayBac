/**
 * Định dạng inline cho text trong block bài viết.
 *
 * Text lưu dạng chuỗi có dấu đánh dấu tối giản, không bao giờ là HTML:
 *   **đậm**   *nghiêng*   __gạch chân__   [nhãn](href)
 * Ký tự đặc biệt trong chữ thường được escape bằng `\` (vd `\*`).
 * Bài cũ chỉ dùng `**` và link nên vẫn đọc đúng; dấu lẻ không có cặp đóng
 * được giữ nguyên như chữ thường.
 */

export type InlineMarks = { bold?: boolean; italic?: boolean; underline?: boolean; href?: string };
export type InlineSegment = InlineMarks & { text: string };

const MAX_LINK_LABEL = 300;
const MAX_HREF = 500;
const LINK_PATTERN = new RegExp(`^\\[((?:\\\\.|[^\\]\\\\]){1,${MAX_LINK_LABEL}})\\]\\(([^()\\s]{1,${MAX_HREF}})\\)`);
const ESCAPABLE = new Set(["\\", "*", "_", "[", "]"]);

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

/** Vị trí xuất hiện tiếp theo của `marker` chưa bị escape, tính từ `from`. */
function hasUnescaped(text: string, marker: string, from: number): boolean {
  for (let i = from; i <= text.length - marker.length; i++) {
    if (text[i] === "\\") { i++; continue; }
    if (text.startsWith(marker, i)) return true;
  }
  return false;
}

function runLength(text: string, index: number, char: string): number {
  let end = index;
  while (text[end] === char) end++;
  return end - index;
}

function pushText(segments: InlineSegment[], text: string, marks: InlineMarks) {
  if (!text) return;
  const last = segments[segments.length - 1];
  if (last && sameMarks(last, marks)) last.text += text;
  else segments.push({ text, ...activeMarks(marks) });
}

function activeMarks(marks: InlineMarks): InlineMarks {
  const result: InlineMarks = {};
  if (marks.bold) result.bold = true;
  if (marks.italic) result.italic = true;
  if (marks.underline) result.underline = true;
  if (marks.href) result.href = marks.href;
  return result;
}

function sameMarks(a: InlineMarks, b: InlineMarks): boolean {
  return Boolean(a.bold) === Boolean(b.bold)
    && Boolean(a.italic) === Boolean(b.italic)
    && Boolean(a.underline) === Boolean(b.underline)
    && (a.href ?? "") === (b.href ?? "");
}

/**
 * Một dãy `*` liên tiếp: ưu tiên đóng các dấu đang mở, phần còn lại mới mở dấu
 * mới (chỉ khi phía sau có dấu đóng). Nhờ vậy `*a***b**` hiểu đúng là
 * nghiêng "a" rồi đậm "b".
 */
function applyAsterisks(text: string, index: number, count: number, marks: InlineMarks, out: { literal: string }) {
  let left = count;
  if (marks.italic && marks.bold && left >= 3) { marks.italic = false; marks.bold = false; left -= 3; }
  if (marks.bold && left >= 2) { marks.bold = false; left -= 2; }
  if (marks.italic && left >= 1) { marks.italic = false; left -= 1; }
  const after = index + count;
  if (left >= 2 && !marks.bold && hasUnescaped(text, "**", after)) { marks.bold = true; left -= 2; }
  if (left >= 1 && !marks.italic && hasUnescaped(text, "*", after)) { marks.italic = true; left -= 1; }
  out.literal = "*".repeat(left);
}

function applyUnderscores(text: string, index: number, count: number, marks: InlineMarks, out: { literal: string }) {
  let left = count;
  if (marks.underline && left >= 2) { marks.underline = false; left -= 2; }
  else if (!marks.underline && left >= 2 && hasUnescaped(text, "__", index + count)) { marks.underline = true; left -= 2; }
  out.literal = "_".repeat(left);
}

/** Tách text đã đánh dấu thành các đoạn có định dạng. Không bao giờ ném lỗi. */
export function parseInline(text: string, base: InlineMarks = {}): InlineSegment[] {
  const segments: InlineSegment[] = [];
  const marks: InlineMarks = { ...base };
  let buffer = "";
  const flush = () => { pushText(segments, buffer, marks); buffer = ""; };
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    if (char === "\\" && ESCAPABLE.has(text[i + 1] ?? "")) {
      buffer += text[i + 1];
      i += 2;
      continue;
    }
    if (char === "[" && !marks.href) {
      const match = LINK_PATTERN.exec(text.slice(i));
      if (match && isSafeHref(match[2])) {
        flush();
        for (const segment of parseInline(match[1], { ...marks, href: match[2] })) pushText(segments, segment.text, segment);
        i += match[0].length;
        continue;
      }
    }
    if (char === "*" || char === "_") {
      const count = runLength(text, i, char);
      const out = { literal: "" };
      flush();
      if (char === "*") applyAsterisks(text, i, count, marks, out);
      else applyUnderscores(text, i, count, marks, out);
      buffer += out.literal;
      i += count;
      continue;
    }
    buffer += char;
    i++;
  }
  flush();
  return segments;
}

function escapeMarkup(text: string): string {
  return text.replace(/[\\*[\]]/g, (char) => `\\${char}`).replace(/_(?=_)|(?<=_)_/g, "\\_");
}

/** Ngược lại của parseInline: dùng khi lưu nội dung từ trình soạn thảo. */
export function serializeInline(segments: InlineSegment[]): string {
  let output = "";
  let index = 0;
  while (index < segments.length) {
    const href = segments[index].href;
    if (href && isSafeHref(href)) {
      let label = "";
      while (index < segments.length && segments[index].href === href) label += wrapMarks(segments[index++]);
      output += label ? `[${label}](${href})` : "";
      continue;
    }
    output += wrapMarks(segments[index++]);
  }
  return output;
}

function wrapMarks(segment: InlineSegment): string {
  const text = escapeMarkup(segment.text);
  if (!text.trim()) return text;
  // Khoảng trắng đầu/cuối nằm ngoài dấu để `** đậm**` không xảy ra.
  const [, lead, core, trail] = /^(\s*)([\s\S]*?)(\s*)$/.exec(text) ?? ["", "", text, ""];
  const open = `${segment.bold ? "**" : ""}${segment.underline ? "__" : ""}${segment.italic ? "*" : ""}`;
  const close = `${segment.italic ? "*" : ""}${segment.underline ? "__" : ""}${segment.bold ? "**" : ""}`;
  return `${lead}${open}${core}${close}${trail}`;
}

/** Chữ thuần, bỏ hết dấu định dạng: dùng cho đếm từ, mô tả SEO, tìm kiếm. */
export function inlineToPlainText(text: string): string {
  return parseInline(text).map((segment) => segment.text).join("");
}

function segmentHtml(segment: InlineSegment): string {
  let html = escapeHtml(segment.text);
  if (segment.italic) html = `<em>${html}</em>`;
  if (segment.underline) html = `<u>${html}</u>`;
  if (segment.bold) html = `<strong>${html}</strong>`;
  return html;
}

/**
 * Render inline an toàn: chữ luôn được escape, chỉ sinh <strong>/<em>/<u>/<a>
 * với href đã qua isSafeHref. Không nhận HTML thô.
 */
export function renderInline(text: string): string {
  const segments = parseInline(text);
  let output = "";
  let index = 0;
  while (index < segments.length) {
    const href = segments[index].href;
    if (!href) { output += segmentHtml(segments[index++]); continue; }
    let label = "";
    while (index < segments.length && segments[index].href === href) label += segmentHtml(segments[index++]);
    const rel = /^https:\/\//i.test(href) ? ' rel="noopener noreferrer" target="_blank"' : "";
    output += `<a href="${escapeHtml(href)}"${rel}>${label}</a>`;
  }
  return output;
}
