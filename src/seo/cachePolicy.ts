// Nội dung sửa/ẩn không bị kéo dài bởi stale-while-revalidate.
// Browser phải revalidate; CDN giữ tối đa một phút, lỗi không được cache.
export const PUBLIC_CONTENT_CACHE = "public, max-age=0, s-maxage=60, must-revalidate";
