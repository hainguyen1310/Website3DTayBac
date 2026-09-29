# Bàn giao Dev — triển khai phần B (SEO_KE_HOACH_TRIEN_KHAI_TONG_HOP.md)

Tài liệu này ghi code đã có, cách kiểm chứng và các bước thủ công còn lại; không phải xác nhận B01–B20 đã nghiệm thu đầy đủ.
Ngày cập nhật sau sửa local: **29/09/2026, khoảng 16:10**. Người thực hiện: Dev (AI pair). **Chưa deploy.** Trạng thái và hướng dẫn phát hành mới nhất nằm ở **mục 0.6** của [kế hoạch tổng hợp](./SEO_KE_HOACH_TRIEN_KHAI_TONG_HOP.md).

## 1. Kiến trúc render đã chọn

- **Một resolver SEO dùng chung** (`src/seo/*`) cho HTML ban đầu (server) và điều hướng client: title, description, canonical, robots, OG/Twitter, JSON-LD.
- **Renderer server** (`src/seo/renderSite.ts` + `server/seo/handler.ts`) trả HTML theo từng URL, có nội dung chính và link nội bộ không cần JavaScript. Chạy trong:
  - `api/render.ts` (Vercel Function, rewrite `/*` → `/api/render?asin_path=*`);
  - dev middleware `server/seo/dev.ts` (cùng logic, thêm client/HMR của Vite).
- **Build**: `vite build` đổi tên `dist/index.html` → `dist/seo-shell.html`; `/` cũng đi qua renderer nên không còn app shell chung. `vercel.json` khai báo `includeFiles: "dist/seo-shell.html"`.
- **Dữ liệu công khai** đọc qua REST bằng publishable key; RLS quyết định dữ liệu trả về. Schema SEO mới là bắt buộc: không tự bỏ cột/lọc chủ đề khi truy vấn lỗi. Sitemap phân trang đủ nguồn, không trả XML thiếu nếu nguồn lỗi.
- **Cache**: HTML/redirect/robots/sitemap công khai dùng `public, max-age=0, s-maxage=60, must-revalidate`, không SWR; 503 `no-store`. Điều kiện thời gian trong RLS + query quyết định bài đến lịch đăng. TTL này chưa thay cho phép đo cache/invalidation trên Vercel thật.
- **Index**: chỉ bật trên host cho phép khi `VITE_SEO_INDEX_ENABLED=true`; thiếu biến mặc định noindex. GA4 trên miền chính độc lập với công tắc index. Robots cho phép đọc trang noindex, chỉ chặn `/api/`; Auth/RLS mới là lớp bảo vệ dữ liệu riêng tư.
- **Head/GA4**: server và client dùng marker quản lý chung để thay metadata/schema khi điều hướng. Theo dõi page_view sau khi metadata sẵn sàng; ecommerce dùng `items`, lọc dữ liệu liên hệ và kiểm route tại mỗi lần gửi.

## 2. Việc đã làm theo từng mã

| Mã | Nội dung | File chính |
| --- | --- | --- |
| B01 | Render HTML theo URL, nội dung prerender, trạng thái HTTP thật | `src/seo/renderSite.ts`, `server/seo/handler.ts`, `api/render.ts`, `server/seo/dev.ts`, `vite.config.ts` |
| B02 | Resolver SEO + JSON-LD thống nhất server/client, gỡ head khi vào admin | `src/seo/meta.ts`, `src/seo/head.ts`, `src/hooks/useDocumentSeo.ts`, `src/admin/AdminArea.tsx` |
| B03 | Canonical bỏ tracking, giữ `page`/`chu-de`; 404/503/308; chuẩn hoá slash/chữ hoa; `?product=` → `/san-pham/:slug` | `src/seo/paths.ts`, `server/seo/handler.ts` |
| B04 | `robots.txt`/`sitemap.xml` động, đúng MIME, loại nháp/redirect/noindex/404, cập nhật theo CMS | `src/seo/robots.ts`, `src/seo/sitemap.ts`, `api/seo.ts` |
| B05 | Trang sản phẩm/danh mục riêng, card dùng anchor, Product/Offer schema, giữ modal xem nhanh | `src/StorefrontPages.tsx`, `src/App.tsx`, `src/seo/product.ts` |
| B06 | API chi tiết theo slug + phân trang nguồn dữ liệu, URL trang ổn định | `src/services/storeApi.ts`, `src/hooks/usePublishedArticles.ts`, `src/Journal.tsx` |
| B07 | Trường SEO/social/tác giả/nguồn/canonical, picker sản phẩm & bài liên quan, cảnh báo link đã gỡ | migration `20260929000000`, `src/admin/ContentSection.tsx`, `src/services/adminApi.ts` |
| B08 | Editor block (H2/H3, đoạn, danh sách, trích dẫn, ảnh/alt/caption, CTA, divider), renderer escape an toàn, validator tách lỗi chặn/khuyến nghị | `src/content/blocks.ts`, `src/admin/ContentSection.tsx`, `src/seo/renderSite.ts` |
| B09 | `first_published_at`, `scheduled_at`, `content_modified_at`; ẩn rồi đăng lại giữ ngày đầu; `<time datetime>` | migration, RPC `save_admin_article`, `src/content/article.ts`, `src/Journal.tsx` |
| B10 | Preview nội dung trong modal riêng (chưa phải toàn trang public), cảnh báo chưa lưu, chống ghi đè `updated_at`, revision + khôi phục; còn UAT | RPC/trigger trong migration, `src/admin/ContentSection.tsx` |
| B11 | `url_redirects` + `record_slug_redirect` (gộp chuỗi, chống vòng lặp), lưu trữ/khôi phục thay xóa cứng, sitemap loại URL cũ | migration, `save_admin_article`/`save_admin_product`, `src/admin/ContentSection.tsx` |
| B12 | Nén/crop ảnh trước upload (≤1920px, rendition 1200×630), width/height, lazy-load, `fetchpriority` cho ảnh LCP | `src/services/uploadApi.ts`, `src/admin/ImageInput.tsx`, `src/Journal.tsx`, `src/StorefrontPages.tsx` |
| B13 | GA4 ở host chính dù đang giữ noindex; page_view thủ công sau metadata; ecommerce items/value/shipping; giảm trùng purchase bằng mã đơn; lọc payload liên hệ | `src/analytics.ts`, `src/analyticsItems.ts`, `src/ShopContext.tsx`, `src/App.tsx`, các trang và form |
| B14 | Token hủy nhận tin, trang `/huy-nhan-tin`, trạng thái suppression; lead đã ghi sau khi backend nhận | migration, `src/Unsubscribe.tsx`, `src/Newsletter.tsx` |
| B15 | Origin canonical cấu hình, không tin Host; preview/localhost noindex qua meta + robots | `src/seo/config.ts`, `src/seo/robots.ts`, `.env.example` |
| B16 | Migration SEO/CMS/RLS, RPC kiểm quyền, ghi bài chỉ qua RPC | `supabase/migrations/20260929000000_seo_cms_foundation.sql` |
| B17 | Cache TTL 60 giây không SWR + RLS đến hạn + sitemap động; 404/503 phân biệt; private/error `no-store` | `src/seo/cachePolicy.ts`, renderer + handler |
| B18 | `vercel.json`: functions/includeFiles, redirect www/alias cũ → apex, rewrite renderer/robots/sitemap; chưa xác minh sau deploy | `vercel.json` |
| B19 | Tách chunk React/Supabase/icons, giữ lazy 3D, bỏ font Google không dùng, ảnh LCP có chỉ báo | `vite.config.ts`, `index.html` |
| B20 | Unit test SEO/block/renderer, script `seo:check`, workflow CI, tài liệu này | `tests/*`, `scripts/seo-check.mjs`, `.github/workflows/verify.yml` |

## 3. Bước thủ công bắt buộc trước khi mở index

1. **Đối chiếu migration** `supabase/migrations/20260929000000_seo_cms_foundation.sql` trên đúng Supabase project. Audit đã đọc được các cột/bảng SEO mới; không chạy lại SQL chỉ vì đọc tài liệu này. Lượt sửa local không tạo/chạy migration mới. Nếu project khác còn thiếu, kiểm lịch sử migration và sao lưu trước khi áp dụng.
   - Kiểm nhanh sau migrate: `select slug, tag_slug, first_published_at, content_modified_at from articles limit 5;`
   - Xác nhận RLS: đăng nhập `anon` không đọc được bài `published=false`, bài `scheduled_at` tương lai; staff đọc được nháp.
2. **Biến môi trường Vercel** (Production + Preview):
   - `VITE_SITE_URL=https://asintaybac.com`, `SITE_URL=https://asintaybac.com` (bắt buộc khi mở index; nếu bỏ trống, mặc định vẫn là miền này và mọi host khác bị noindex).
   - `VITE_GA4_ID=G-...` sau khi có GA4 (A05). Không đặt ở Preview để tách traffic.
   - `VITE_SEO_INDEX_ENABLED=false` trong lúc duyệt nội dung; đổi `true` khi sẵn sàng index rồi deploy lại. Thiếu biến mặc định tắt; cần đồng nhất build/runtime.
   - `ASIN_SEO_INDEX_HOSTS=` chỉ thêm khi có miền phụ được index.
3. **Miền**: thêm `asintaybac.com` và `www` vào Vercel project; DNS theo giá trị dashboard; `vercel.json` đã có redirect `www` → không `www`. Kiểm HTTPS và redirect một bước.
4. **Supabase Auth**: cập nhật Site URL/Redirect URL sang miền chính nếu dùng đăng nhập email.
5. **GSC/GA4**: xác minh Domain property, chỉ gửi `https://asintaybac.com/sitemap.xml` khi đã duyệt nội dung, bật index và kiểm XML thật. Tắt page_view theo browser history trong Enhanced measurement để tránh trùng với tracking SPA thủ công; kiểm Realtime/DebugView.
6. **Nguồn deploy**: đưa đủ file mới vào commit phát hành nếu dùng Git; giữ API/rewrites trong Vercel, không chỉ deploy thư mục `dist`. Xác nhận deployment có `api/render` và `api/seo`.

## 4. Cách kiểm chứng (bằng chứng D01–D16)

```bash
npm test                    # 74 test, có hồi quy SEO/GA4 và Vite env
npm run build               # tsc + vite + kiểm shell/Functions/rewrite/GA4 trong JS
npm run dev -- --host 127.0.0.1 --port 5199 --strictPort
node scripts/seo-check.mjs http://localhost:5199
node scripts/seo-check.mjs https://asintaybac.com --noindex # sau deploy khi chưa mở index
# Bỏ --noindex sau khi VITE_SEO_INDEX_ENABLED=true và đã deploy lại.
```

- `scripts/seo-check.mjs` kiểm: robots/sitemap MIME, title/canonical/prerender, redirect slash/UTM/deal, 404 trang tin ngoài phạm vi/chủ đề/bài không tồn tại, sitemap không trùng. Local đủ dữ liệu: **28/28**; production mở index thêm điều kiện sitemap không rỗng. Chạy `--offline` khi không có Supabase (CI).
- Kết quả đã chạy: **74/74 test, build đạt**, mô phỏng host chính với public Supabase có **30 URL**, tất cả 200/canonical khớp. DOM sản phẩm/bài sau điều hướng không trùng schema. Đây là bằng chứng local.
- Đối chiếu DOM: `curl -s http://localhost:5199/tin-tuc/<slug>` phải thấy tiêu đề, byline `<time datetime>`, nội dung bài và JSON-LD; `curl -sI` xem mã 200/308/404.
- Kiểm lịch đăng: tạo bài `scheduled_at` sau 2–3 phút, xác nhận 404 trước hạn và 200 sau hạn (không cần deploy).
- Kiểm slug: đổi slug trong CMS, mở URL cũ phải 308 một bước sang URL mới; URL cũ không còn trong `sitemap.xml`.
- Kiểm revision: sửa nội dung 2 lần, mở “Phiên bản” trong editor, khôi phục và đối chiếu; ngày xuất bản đầu không đổi.
- GA4: dùng miền chính và ID đã tạo, có thể giữ noindex trong lúc QA; kiểm `page_view`, `view_item`, `add_to_cart`, `begin_checkout`, `purchase`, `generate_lead`, `newsletter_signup` trong Realtime/DebugView. Local/preview không gửi từ module tracking. Chỉ tạo đơn kiểm thử theo quy trình vận hành; lượt sửa chưa tạo đơn thật.

## 5. Giới hạn đã biết

- Các bước ngoài code: domain/GA4 đã được chủ dự án thiết lập; quyền tài khoản (A02), GSC, dữ liệu GA4 thực nhận, Lighthouse/CrUX và preview Facebook/Zalo vẫn cần kiểm trên môi trường thật.
- Thiếu schema/nguồn dữ liệu là lỗi phải sửa, không còn fallback âm thầm tạo trang/sitemap thiếu. Sitemap trên host noindex rỗng theo chính sách; sitemap vượt 50.000 URL cần triển khai sitemap index (hiện có 30).
- `vercel build` local chưa hoàn thành do khóa esbuild khi npm ci, sau đó CLI báo `spawn cmd.exe ENOENT`. Đã khôi phục dependencies và chạy lại test/build thành công; chưa chứng minh đóng gói/thực thi Vercel Functions. Production cần kiểm sau khi chủ dự án deploy.
- `seo-check` trong CI chỉ chạy chế độ `--offline` (không có secret); kiểm đầy đủ chạy trên staging/production.
- Renderer hiện trả 503 khi nguồn dữ liệu tạm lỗi (đúng B03) — người trực theo dõi log Vercel Functions (`api/render`, `api/seo`) và Retry-After.
- Sự kiện `refund` (B13) cần GA4 Measurement Protocol phía server khi hoàn tiền được xác nhận; hiện `record_order_return` mới ghi nhận nghiệp vụ, chưa gửi event từ admin (analytics chủ động tắt trong `/admin`). Bổ sung khi A05 chốt cách đo hoàn tiền.
- Purchase chỉ gửi khi giỏ + phí khớp tổng backend; nếu lệch snapshot giá/phí thì bỏ sự kiện, log cảnh báo và vẫn giữ kết quả đặt hàng. Chống lặp bằng transaction ID/bộ nhớ trình duyệt không bảo đảm giao nhận event đúng một lần hoặc đối soát liên thiết bị. Muốn đo đầy đủ cần receipt/server tracking; đơn COD được tạo chưa đồng nghĩa đã thu tiền.
- CMS/RLS/revision/schedule/slug cần UAT; alt bìa riêng, preview toàn trang và `srcset/sizes` chưa đầy đủ. Nội dung mẫu/review minh họa cần được chủ dự án duyệt hoặc thay trước mở index.
- Báo cáo organic landing → bài → sản phẩm/quà → lead/đơn (B14) tiếp tục đối soát thủ công từ GSC/GA4/hệ thống đơn theo mục E.III; chưa có dashboard tự động trong repo.
- Baseline Core Web Vitals (B19) cần chạy Lighthouse/PageSpeed trên URL thật sau khi deploy; repo chỉ cung cấp các cải thiện code (tách chunk, font, lazy 3D, kích thước ảnh).
