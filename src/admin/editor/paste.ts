/** Làm sạch HTML dán vào trình soạn thảo (Google Docs, Word). */

/**
 * Google Docs/Word: H1 của tài liệu thành tiêu đề mục (trang đã có H1 là tiêu
 * đề bài), H4–H6 gộp về tiêu đề phụ. Phần định dạng khác do schema tự lọc.
 */
export function normalizePastedHtml(html: string): string {
  return html
    .replace(/<h1(\s|>)/gi, "<h2$1")
    .replace(/<\/h1>/gi, "</h2>")
    .replace(/<h[4-6](\s|>)/gi, "<h3$1")
    .replace(/<\/h[4-6]>/gi, "</h3>")
    // Docs chèn <br> giữa các khối, tạo dòng trống thừa khi dán.
    .replace(/(<\/(?:p|ul|ol|h\d|blockquote|table)>)\s*<br[^>]*>/gi, "$1")
    .replace(/<br[^>]*Apple-interchange-newline[^>]*>/gi, "");
}
