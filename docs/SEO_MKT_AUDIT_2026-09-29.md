# Đánh giá SEO và vận hành Marketing — A Sỉn Tây Bắc

Ngày kiểm tra: **29/09/2026**. Tài liệu được đối chiếu: `docs/SEO_MASTER_CHECKLIST.md`, phiên bản 1.0.

## 1. Kết luận để ra quyết định

**Checklist hiện tại chưa đầy đủ để làm chuẩn nghiệm thu SEO toàn website hoặc vận hành MKT. Hệ thống hiện tại cũng chưa đạt mức sẵn sàng ra mắt SEO.** Tài liệu 1.0 là một backlog hữu ích cho metadata và trình bày bài viết; cần bổ sung kiến trúc render, SEO thương mại điện tử, vòng đời nội dung, đo lường và người chịu trách nhiệm.

Làm hết checkbox của bản 1.0 vẫn chưa giải quyết được: HTML ban đầu thiếu nội dung riêng theo URL; trang lỗi trả 200; sản phẩm chưa có trang SEO riêng; sitemap không theo kịp CMS; đổi slug mất liên kết cũ; ngày xuất bản bị thay đổi; chưa đo được bài nào tạo nhu cầu mua hàng.

Thông tin chủ dự án đã xác nhận:

- Tên miền dự kiến là **asintaybac.com**, chưa mua và chưa thiết lập tên miền.
- Đang phát triển local, có bản công khai tại **https://website3dtaybac.vercel.app/**.
- Không sử dụng `asintaybac.vn` trong checklist làm tên miền triển khai. Đây là sai khác cần sửa trước khi áp dụng ví dụ.
- Báo cáo không xác nhận quyền sở hữu, khả năng đăng ký hay cấu hình DNS của tên miền dự kiến. Chưa có phiên Search Console/GA4 để kiểm tra.

| Phạm vi | Đánh giá hiện tại | Ý nghĩa thực tế |
| --- | --- | --- |
| Giao diện tin tức | Có nền tảng sử dụng được | Danh sách, tìm kiếm, chủ đề, chi tiết, bài liên quan, newsletter |
| Metadata và chia sẻ | Thiếu phần lớn | Có title/description sau khi JS chạy; chưa có canonical, OG, Twitter Card, JSON-LD |
| Thu thập và lập chỉ mục | Chưa đạt nghiệm thu | HTML chung, sitemap/robots sai kiểu tài nguyên, 404 chưa đúng |
| SEO sản phẩm/danh mục | Chưa đạt | Link mở modal có ích cho người mua nhưng chưa phải landing page SEO đầy đủ |
| CMS biên tập | Có CRUD cơ bản, thiếu vận hành SEO | Có bản nháp/lên lịch; thiếu preview nháp, revision, SEO fields, redirect |
| Nội dung và độ tin cậy | Cần chuẩn bị lại trước mở index | Bài mẫu vẫn chứa nội dung minh họa; các tuyên bố thương hiệu cần bằng chứng |
| Đo lường MKT | Chưa thấy tích hợp trong mã nguồn/HTML kiểm tra | Chưa có cơ sở gắn traffic với lead, đơn và doanh thu |
| Hiệu năng thực tế và hiệu quả SEO | Chưa xác minh | Chưa có kết quả Lighthouse/CrUX, GSC, thứ hạng, backlink hoặc chuyển đổi được kiểm chứng |

Không quy đổi bảng này thành “điểm SEO Google” hoặc phần trăm hoàn thành: các nhóm có trọng số khác nhau, và dữ liệu vận hành chưa có.

## 2. Phạm vi bằng chứng

Đã đọc mã frontend, CMS, API đọc/ghi bài, upload ảnh, migration/RLS, cấu hình Vite/Vercel và tài liệu checklist. Đã GET **16 URL** trên local/Vercel; đã kiểm tra DOM sau render của bài thật, danh sách bài, URL không tồn tại, sản phẩm và trang đăng nhập admin.

Kết quả thô lưu tại [HTTP audit](D:/CloneGithub/Website3DTayBac/test-results/seo-http-audit.json) và [DOM audit](D:/CloneGithub/Website3DTayBac/test-results/seo-dom-audit.json). Đây là artifact local trong thư mục bị Git ignore. Các kết luận chính được ghi lại bên dưới để báo cáo không phụ thuộc vào các file đó.

### Kết quả HTTP và DOM quan trọng

| URL/kiểm tra | Kết quả quan sát | Kết luận |
| --- | --- | --- |
| `/`, `/tin-tuc`, `/tin-tuc/hanh-trinh-tra` trên cả hai môi trường | HTTP 200; HTML cùng title mặc định, `div#root` rỗng; không canonical/OG/schema | Metadata và nội dung riêng của trang chưa nằm trong phản hồi HTML ban đầu |
| `/robots.txt`, `/sitemap.xml` trên cả hai môi trường | HTTP 200 nhưng `Content-Type: text/html`, trả app shell | Không phải robots/sitemap hợp lệ; chỉ kiểm tra “URL trả 200” sẽ bỏ sót lỗi |
| `/tin-tuc/seo-audit-not-found` trên cả hai môi trường | HTTP 200 | Có nguy cơ soft 404 |
| URL bài thiếu trên local sau render | H1 báo bài chưa có; title “Đọc câu chuyện”; không robots noindex | UI đã báo lỗi nhưng SEO chưa phân biệt đúng trạng thái |
| Bài `hanh-trinh-tra` sau render, local và Vercel | Title/description đúng bài; canonical/OG/schema vẫn không có | Thiếu metadata không chỉ do công cụ đọc HTML chưa chạy JS |
| Nội dung bài mẫu trên local | 3 đoạn; không H2/H3 trong thân bài, không `<time datetime>`; có 3 bài liên quan | Có điều hướng liên quan, nhưng nội dung bài chưa có cấu trúc biên tập SEO |
| Ảnh bìa bài mẫu | Ảnh thực 800×800; khai báo hiển thị 1280×700; không srcset | Cần rendition phù hợp; thuộc tính width không làm ảnh nguồn thành 1280px |
| `/san-pham?product=honey` trên local | Mở modal; title vẫn là title danh mục; 12 card không có anchor tới chi tiết | Deep link đang phục vụ UX, chưa có metadata riêng và đường khám phá từ card |
| `/tin-tuc` trên local | 4 bài công khai, đều có link chi tiết | Chưa có lỗi thất lạc bài trong 4 bài đang quan sát; rủi ro phân trang xuất hiện khi tăng số bài |
| `/admin/dang-nhap` trên local | Sau render có `noindex, nofollow`; HTTP ban đầu chưa có meta/header tương ứng | Đã có một lớp noindex admin; cần kiểm soát từ response và môi trường |

Google có thể render JavaScript; vì vậy không kết luận “SPA không thể làm SEO”. Tuy nhiên, HTML có sẵn nội dung và metadata giúp giảm phụ thuộc vào bước render và phục vụ các bot không chạy JS. Đây là lý do nên quyết định SSR hoặc prerender trước khi viết hook SEO. [Google: JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics).

## 3. Phát hiện và mức ưu tiên

**P0:** cần xử lý trước khi mở index bản chính thức. **P1:** cần hoàn thiện để biên tập và kinh doanh bằng SEO. **P2:** mở rộng sau khi nền tảng đã ổn định. Đây là ưu tiên triển khai, không phải thang điểm xếp hạng.

| ID | Mức | Phát hiện, bằng chứng và tác động | Yêu cầu xử lý |
| --- | --- | --- | --- |
| F01 | P0 | App render ở client: [main.tsx](D:/CloneGithub/Website3DTayBac/src/main.tsx:29), [index.html](D:/CloneGithub/Website3DTayBac/index.html:23). HTTP xác nhận HTML chung | Render bài, danh mục, sản phẩm và trang thương hiệu ra HTML theo URL; giữ trải nghiệm tương tác sau hydration |
| F02 | P0 | Tên miền mẫu `.vn` khác tên dự kiến `.com`; chưa có cấu hình canonical site-wide | Một cấu hình origin tin cậy theo môi trường; chỉ dùng domain chính thức khi đã sở hữu và hoạt động; test host/HTTPS/www/slash |
| F03 | P0 | [vercel.json](D:/CloneGithub/Website3DTayBac/vercel.json:8) fallback mọi route ngoài API; robots/sitemap đang là HTML | Route robot/XML trước fallback, content-type đúng; sitemap tự cập nhật từ dữ liệu được phép công khai |
| F04 | P0 | [Journal.tsx](D:/CloneGithub/Website3DTayBac/src/Journal.tsx:82) chỉ hiển thị trang bài thiếu; HTTP vẫn 200, không noindex | 404/410 cho bài không tồn tại/đã gỡ theo chính sách; không biến lỗi DB tạm thời thành bài bị xóa; lỗi tạm thời dùng 5xx phù hợp |
| F05 | P0 | [Journal.tsx](D:/CloneGithub/Website3DTayBac/src/Journal.tsx:73), [App.tsx](D:/CloneGithub/Website3DTayBac/src/App.tsx:910) chỉ thay title/description | Bộ SEO chung cho các loại trang, phản hồi HTML và client thống nhất; canonical, OG, Twitter Card, robots và schema đúng ngữ cảnh |
| F06 | P0 | Bản Vercel công khai kiểm tra chưa có noindex cho nội dung thử; bài trà có chữ “câu chuyện minh họa” | Kiểm soát index theo host/môi trường. Duyệt lại nội dung trước khi mở index; chưa có bằng chứng Vercel đã được Google index |
| F07 | P1 | [StorefrontPages.tsx](D:/CloneGithub/Website3DTayBac/src/StorefrontPages.tsx:32) mở sản phẩm bằng button; route query chỉ mở modal, không metadata sản phẩm | Trang sản phẩm/danh mục có URL và nội dung riêng; card dùng anchor; query cũ vẫn hoạt động hoặc chuyển hướng tới URL mới |
| F08 | P1 | [Journal.tsx](D:/CloneGithub/Website3DTayBac/src/Journal.tsx:87) thân bài là `<p>`; link sang sản phẩm mới chỉ tới danh mục chung | Editor có heading/list/link/ảnh/alt/caption; quan hệ bài–sản phẩm và CTA tới đúng sản phẩm đang bán |
| F09 | P1 | [storeApi.ts](D:/CloneGithub/Website3DTayBac/src/services/storeApi.ts:64) lấy toàn bộ feed kể cả body; detail tìm trong feed; [Journal.tsx](D:/CloneGithub/Website3DTayBac/src/Journal.tsx:61) load-more bằng button | API lấy detail trực tiếp theo slug; feed phân trang; link URL trang kế tiếp; không phụ thuộc giới hạn số hàng API khi danh mục bài lớn |
| F10 | P1 | Schema DB có `published_at`, `updated_at`; frontend làm mất ISO và không lấy `updated_at`: [storeApi.ts](D:/CloneGithub/Website3DTayBac/src/services/storeApi.ts:32) | Giữ timestamp nguồn, render time có timezone phù hợp, phân biệt ngày đầu xuất bản và lần chỉnh nội dung |
| F11 | P1 | [adminApi.ts](D:/CloneGithub/Website3DTayBac/src/services/adminApi.ts:692): khi `published=false`, payload đặt `published_at=null`; đăng lại có thể đặt thời gian mới | Giữ ngày xuất bản gốc khi ẩn, tách lịch đăng/trạng thái khỏi timestamp nguồn; đây là kết luận từ code, chưa thực hiện ghi DB để tái hiện |
| F12 | P1 | Nút mắt trong [ContentSection.tsx](D:/CloneGithub/Website3DTayBac/src/admin/ContentSection.tsx:301) mở URL công khai, trong khi API chỉ lấy published và đến hạn | Preview nháp/lên lịch có kiểm soát quyền, dùng đúng renderer; không đưa nội dung nháp vào HTML public, sitemap hoặc cache public |
| F13 | P1 | Slug có thể sửa; delete là xóa bản ghi; không thấy bảng/route redirect và revisions trong source đã rà | Lưu lịch sử slug, 301/308 một bước tới đích đúng; xác nhận ảnh hưởng khi gỡ; snapshot phiên bản và khôi phục |
| F14 | P1 | Không có SEO title/description riêng, OG override, author, image alt, related products trong form/model bài | Mở rộng dữ liệu và CMS; fallback từ title/excerpt; cảnh báo chất lượng có ích thay vì chỉ đếm ký tự |
| F15 | P1 | [uploadApi.ts](D:/CloneGithub/Website3DTayBac/src/services/uploadApi.ts:5) mặc định cho ảnh tới 10MB; không resize/rendition; ảnh bìa không srcset | Kiểm tra kích thước thực, nén và tạo kích thước phù hợp; crop preview social; không ép một ảnh cho mọi tỷ lệ |
| F16 | P1 | Không tìm thấy GA/GTM/dataLayer/fbq trong phạm vi source rà; raw HTML cũng chưa gắn analytics | Tracking plan, GA4/GSC khi có miền, xác nhận bằng DebugView; phân biệt click, lead hợp lệ, đơn COD và doanh thu đã thu |
| F17 | P1 | Newsletter đang ghi liên hệ với consent: [Newsletter.tsx](D:/CloneGithub/Website3DTayBac/src/Newsletter.tsx:17); chưa thấy hệ thống chiến dịch/hủy đăng ký/suppression trong source rà | Xác định người chăm sóc và trạng thái consent; vận hành hủy nhận tin trước chiến dịch; đo form gửi thành công và lead được xử lý |
| F18 | P1 | Có phân quyền marketing và audit sự kiện trong migration, nhưng chưa có duyệt nội dung/revision; marketing không được đọc PII khách hàng | Phân vai soạn/duyệt/xuất bản phù hợp quy mô; dashboard MKT dùng số tổng hợp, không mở rộng quyền dữ liệu khách để làm SEO |

F09 là vấn đề thiết kế khi mở rộng, không phải khẳng định 4 bài hiện tại bị bỏ sót. Bot thường không bấm nút “Xem thêm”; các trang nối tiếp cần đường liên kết có thể crawl. [Google: pagination](https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading).

## 4. Những phần đúng và những chỗ cần sửa trong checklist 1.0

### Có thể giữ

- Title/description riêng; canonical; Open Graph; Twitter Card; Article/BlogPosting và breadcrumb schema.
- ISO dates, ngữ nghĩa time, heading, liên kết trong bài, ảnh có mô tả, nội dung liên quan và CTA.
- Sitemap, robots, preview trước xuất bản và hướng dẫn cho biên tập viên.
- Dùng công cụ kiểm tra schema và preview chia sẻ sau triển khai.

### Cần sửa trước khi đưa thành yêu cầu triển khai

| Nội dung trong bản 1.0 | Điều chỉnh cần thiết |
| --- | --- |
| “Đạt điểm tối đa” | Đổi thành các cổng nghiệm thu và kết quả kinh doanh đo được; không có một điểm chung bảo đảm thứ hạng |
| Tạo hook chèn meta là bước chính | Chốt chiến lược HTML trước. Hook chỉ bổ sung đồng bộ điều hướng client, không thay thế HTML riêng theo URL |
| Ghi cứng `https://asintaybac.vn` | Thay bằng origin cấu hình; hiện dự kiến `.com`, chưa được coi là domain đang hoạt động |
| `canonicalPath` mặc định chuỗi rỗng | Có thể vô tình canonical nhiều trang về home nếu quên truyền prop; bắt buộc resolver theo route và kiểm thử |
| “Bỏ query parameters” | Chỉ bỏ tracking như UTM/fbclid. Không xóa mù `product`, `page`, biến thể có ý nghĩa; quyết định chính sách cho từng loại URL |
| Sitemap động chỉ là “tùy chọn nâng cao” | Với CMS có đăng/ẩn/lên lịch, cập nhật sitemap là yêu cầu vận hành. Chỉ build lại khi deploy sẽ bỏ lỡ nội dung xuất bản sau đó |
| `priority`/`changefreq` trong sitemap | Không dùng để đánh giá SEO Google; tập trung canonical URL và `lastmod` đúng thay đổi nội dung |
| Robots Disallow dùng để “chặn index” | Robots điều khiển crawl; noindex điều khiển index. Không chặn crawl rồi kỳ vọng Google đọc noindex ở cùng URL; bảo mật bằng auth/RLS |
| 404 chỉ thêm meta | Là giải pháp giảm rủi ro cho SPA, chưa thay được chiến lược HTTP 404/410/5xx và vòng đời URL |
| `datePublished = new Date()` khi thiếu ngày | Không bịa ngày. Thiếu dữ liệu thì sửa dữ liệu hoặc bỏ thuộc tính tùy trường hợp |
| `dateModified = publishedTime` | Không phản ánh bài đã chỉnh; dùng timestamp chỉnh nội dung thực tế, không ngày render |
| Cleanup hook để trống | Có thể để lại `article:*` hoặc noindex/schema từ trang trước. Cần quản lý toàn bộ head theo route và test đi qua bài–404–danh mục–admin |
| Đếm 45–65 ký tự title, 130–160 excerpt | Có thể là gợi ý biên tập, không phải luật Google hoặc điều kiện khóa xuất bản; meta description có thể khác excerpt |
| Kiểm tra toàn bộ tiêu đề xuất hiện trong excerpt | Bỏ tiêu chí máy móc này; kiểm tra đúng chủ đề, khác biệt, lợi ích và ý định tìm kiếm |
| Bắt buộc 2–3 H2, ảnh WebP <200KB | Dùng làm hướng dẫn nội bộ có ngoại lệ. Chọn cấu trúc theo nội dung; đo chất lượng/tốc độ thực; không coi số heading hay đuôi file là bảo đảm xếp hạng |
| Ảnh 1200×630 dùng chung | Hợp lý để thiết kế một rendition chia sẻ; không phải mọi nền tảng đều hiển thị giống nhau. Bìa bài, ảnh sản phẩm và ảnh social cần preview riêng |
| Markdown parser chỉ kiểm tra đầu dòng | Cần parser/editor có schema và validation, an toàn link/HTML, render nhất quán; một block có thể chứa nhiều đoạn/heading/list |
| JSON-LD mẫu chỉ Organization và bài | Bổ sung WebSite/Organization có dữ liệu thật; Product/Offer ở trang sản phẩm, không rải schema bán hàng vào mọi bài |
| Breadcrumb schema bảo đảm Google hiển thị | Schema chỉ hỗ trợ khả năng hiểu và đủ điều kiện; không bảo đảm rich result hay giao diện SERP cố định |
| Thiếu next/previous nghĩa là bài mồ côi | Hiện đã có bài liên quan và link danh sách; phải kiểm tra khả năng truy cập toàn bộ đồ thị link, không chỉ đếm nút trước/sau |

Các điều chỉnh trên đối chiếu với [title links](https://developers.google.com/search/docs/appearance/title-link), [meta descriptions](https://developers.google.com/search/docs/appearance/snippet), [sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing), [URL thương mại điện tử](https://developers.google.com/search/docs/specialty/ecommerce/designing-a-url-structure-for-ecommerce-sites), [Article dates](https://developers.google.com/search/docs/appearance/structured-data/article) và [quy tắc structured data](https://developers.google.com/search/docs/appearance/structured-data/sd-policies).

Mẫu `SeoHead` trong bản 1.0 **chưa nên sao chép nguyên vào production**. Khi chuyển JSON-LD sang SSR, cần serializer an toàn cho HTML, đặc biệt nội dung CMS có chuỗi đóng script; không ghép raw HTML của người viết vào head.

## 5. Checklist nghiệm thu bổ sung cho toàn hệ thống

Các ô dưới đây là **việc cần nghiệm thu**, chưa được đánh dấu đạt chỉ vì đã có một phần code. Dev phụ trách cơ chế; SEO/MKT phụ trách nội dung và quyết định URL; QA kiểm chứng; chủ dự án chốt thông tin kinh doanh và tài khoản.

### A. Domain, môi trường và khả năng lập chỉ mục — P0

- [ ] **Chủ dự án:** sở hữu miền; chọn `https://asintaybac.com` hoặc www làm bản chính; DNS/TLS, tự gia hạn và quyền quản lý rõ ràng.
- [ ] **Dev:** origin tập trung, phân biệt local/preview/live; không phát canonical `.vn`, localhost hoặc host preview lên bản chính.
- [ ] **Dev + QA:** Vercel thử nghiệm có cơ chế noindex/protection phù hợp; khi chuyển miền, xử lý alias Vercel công khai bằng redirect hoặc chính sách được kiểm chứng; không gắn noindex toàn site theo nhầm môi trường Vercel.
- [ ] **Dev:** HTML riêng cho URL công khai chứa title, description, canonical, nội dung chính và link nội bộ mà không cần thao tác người dùng.
- [ ] **QA:** thử cả HTTP thô và DOM; CSS/JS/API cần cho render không bị robots/CDN chặn; người mua và bot thấy nội dung công khai tương đương.
- [ ] **Dev:** 200 cho trang có thật, 301/308 cho URL thay thế tương đương, 404/410 cho URL mất; 5xx phù hợp khi nguồn nội dung lỗi tạm thời; không redirect mọi trang lỗi về home.
- [ ] **SEO + Dev:** chính sách cho slash, chữ hoa, UTM, tham số tìm kiếm/lọc, `page` và `product`; canonical tự tham chiếu của trang được index.
- [ ] **Dev:** robots trả text đúng; sitemap trả XML đúng, URL tuyệt đối cùng miền, không draft/scheduled-future/noindex/redirect/404; ngày lastmod có nguồn thật.
- [ ] **Dev + QA:** đăng mới, sửa slug, ẩn, gỡ và đến giờ hẹn làm HTML/cache/sitemap đổi trong thời gian cam kết; có xử lý lỗi và retry.
- [ ] **SEO:** xác minh Search Console của miền chính, gửi sitemap và lưu bằng chứng URL Inspection của từng loại trang sau launch.

### B. Trang sản phẩm, danh mục và metadata — P0/P1

- [ ] **Dev + SEO:** bộ SEO dùng chung cho home, danh mục, sản phẩm, quà, bài, chủ đề, giới thiệu, liên hệ và chính sách; không chỉ tích hợp ở Journal.
- [ ] **SEO + Dev:** trang sản phẩm có URL riêng. Đề xuất `/san-pham/<slug>` để quản lý thuận tiện; query URL vẫn có thể làm SEO nếu triển khai đầy đủ, không phải dấu `?` tự gây lỗi.
- [ ] **Dev:** giữ đường dẫn chat `/san-pham?product=<slug>` tương thích khi bổ sung trang sản phẩm; chuyển đổi không làm hỏng link đang dùng.
- [ ] **MKT:** mô tả danh mục giải đáp nhu cầu chọn hàng; landing quà cá nhân/doanh nghiệp chỉ tạo khi có nội dung/dịch vụ thật, tránh nhân bản trang đổi tên.
- [ ] **Dev:** các card sản phẩm và phân trang dùng anchor có href; trạng thái “xem nhanh” có thể giữ như tính năng bổ sung.
- [ ] **MKT + Dev:** Product/Offer phản ánh giá ưu đãi, tiền VND, tình trạng bán và dữ liệu SKU thực; kiểm tra chính sách giao/đổi trả trước cấu hình Merchant Center.
- [ ] **MKT:** thông tin đơn vị, địa chỉ/liên hệ, nguồn hàng, chính sách giao/đổi trả/bảo mật nhất quán và có trang liên kết được.
- [ ] **Dev + QA:** OG/Twitter URL tuyệt đối, ảnh truy cập công khai, đúng nội dung từng trang; thử chia sẻ thực tế Facebook/Zalo và cơ chế làm mới cache preview khi đổi bìa.
- [ ] **MKT + Dev:** Organization/WebSite/Breadcrumb/BlogPosting/Product dùng đúng nơi, chỉ khai báo facts hiển thị và có chứng cứ; không dùng review minh họa để tạo AggregateRating.

Nền tảng dữ liệu sản phẩm có thể được dùng thêm cho Merchant Center khi sẵn sàng; structured data và feed cần đồng bộ dữ liệu bán hàng. [Google: Product data](https://developers.google.com/search/docs/appearance/structured-data/product). Các trường Open Graph cần nhất quán với trang được chia sẻ. [Open Graph protocol](https://ogp.me/).

### C. CMS phục vụ người biên tập — P1

- [ ] SEO title và meta description riêng, có fallback từ title/excerpt; preview SERP ghi rõ chỉ là mô phỏng.
- [ ] OG image/title/description override khi cần; xem crop social trên mobile/desktop; lỗi ảnh và thiếu alt dễ nhận biết.
- [ ] Editor hỗ trợ H2/H3, list, emphasis, link, quote, ảnh/alt/caption; giữ tương thích bài cũ; không cho chèn H1 gây lẫn tiêu đề chính.
- [ ] Tác giả/byline, người duyệt, nguồn dẫn, chuyên mục có slug; tên tác giả/tổ chức phải đúng người chịu trách nhiệm nội dung.
- [ ] Chọn sản phẩm/bài liên quan bằng picker từ dữ liệu thật; cảnh báo link bị gỡ; không bắt người viết tự nhớ URL/SKU.
- [ ] Lưu nháp, cảnh báo thay đổi chưa lưu, preview có quyền truy cập và không index; bài lên lịch có preview trước hạn.
- [ ] Ngày xuất bản đầu tiên được giữ; `scheduled_at`/trạng thái và ngày sửa nội dung rõ ràng; múi giờ Asia/Ho_Chi_Minh thống nhất khi hiển thị.
- [ ] Quy trình soạn → duyệt → hẹn giờ/đăng → cập nhật → lưu trữ. Nếu đội nhỏ, duyệt có thể là SOP thủ công được ghi nhận; nếu cần ngăn tự xuất bản, phải chặn ở API/DB.
- [ ] Revision lưu được nội dung, người sửa và thời điểm; phục hồi phiên bản. Audit “ai UPDATE bản ghi” hiện có chưa thay được revision.
- [ ] Đổi slug có redirect, phát hiện vòng lặp/trùng slug; gỡ bài có lựa chọn 301 tới bài thay thế tương đương hoặc 404/410, cập nhật link liên quan.
- [ ] SEO validator phân loại lỗi chặn đăng và gợi ý: lỗi cấu trúc/URL/ảnh/thiếu nội dung khác với khuyến nghị độ dài; không ép lặp từ khóa để tăng điểm.
- [ ] RLS/API được thử bằng admin, marketing và người ẩn danh; preview/draft không rò vào feed, HTML cache, sitemap hoặc schema công khai.

### D. Nội dung và uy tín — P1

- [ ] Có danh sách đối tượng khách, nhu cầu, sản phẩm ưu tiên, vùng phục vụ, biên lợi nhuận và mục tiêu chuyển đổi.
- [ ] Nghiên cứu cụm từ khóa/ý định và SERP thực tế; bản đồ mỗi cụm → URL đích; ghi nguồn và ngày lấy số liệu, không tự đặt search volume.
- [ ] Bài có câu trả lời cụ thể, ví dụ/ảnh/trải nghiệm riêng và nguồn tin; không dùng bài minh họa làm tài sản SEO đã hoàn thành.
- [ ] Kiểm chứng nguồn gốc, quy cách, giá, hướng dẫn dùng/bảo quản và các tuyên bố về sản phẩm với người vận hành; tránh suy diễn công dụng.
- [ ] Mỗi bài có CTA phù hợp ý định, sản phẩm liên quan và link về trang chủ đề; cập nhật bài cũ trỏ đến bài mới khi có liên quan.
- [ ] Có lịch nội dung, người viết/duyệt, deadline, ngày kiểm tra lại; xử lý bài trùng ý định, thông tin cũ và link hỏng.
- [ ] Xác minh các con số thương hiệu như “200+ hộ”, “100% truy xuất”; review minh họa phải được thay/ẩn trước dùng làm bằng chứng thương mại.
- [ ] Nội dung và ảnh có quyền sử dụng; ảnh minh họa không được trình bày như bằng chứng đi thực địa hoặc chân dung khách hàng thật.

Tối ưu cho người đang tìm hiểu/chọn mua, không dùng số từ, mật độ từ khóa hay số H2 làm mục tiêu cuối cùng. [Google: nội dung hữu ích](https://developers.google.com/search/docs/fundamentals/creating-helpful-content).

### E. Hiệu năng, mobile và ảnh — P1

- [ ] Đo riêng home, danh mục, detail sản phẩm, bài viết và trang quà trên mobile/desktop; lưu report, URL, thời điểm và cấu hình đo.
- [ ] Theo dõi mục tiêu field p75: **LCP ≤2,5s, INP ≤200ms, CLS ≤0,1**; nếu site mới chưa đủ mẫu, báo chưa đủ dữ liệu thay vì coi là đạt. [Web.dev: ngưỡng CWV](https://web.dev/articles/defining-core-web-vitals-thresholds).
- [ ] Tạo ảnh theo kích thước hiển thị, srcset/sizes, nén và cache; khai báo tỷ lệ ảnh đúng; ảnh LCP được ưu tiên, ảnh dưới màn hình lazy-load.
- [ ] Rà bộ font đang tải từ cả Google Fonts và Fontsource; bỏ family/weight không dùng, đo tác động tới render và layout shift.
- [ ] Đo JS/CSS theo route và chia tải nếu cần. Artifact build hiện có: JS chính khoảng 652KB, CSS 276KB trước nén; đây là dấu hiệu cần đo, chưa chứng minh CWV fail.
- [ ] Giữ cơ chế lazy-load 3D đã có trong ProductViewer; không giả định file GLB 5,4MB được tải ở mọi trang. Kiểm tra thực tế network theo route.
- [ ] QA 320/390/768/desktop, bàn phím và kích thước chữ; chatbox/CTA/ảnh không che nội dung, không gây dịch chuyển hoặc cản tương tác.

### F. Đo lường, phân phối và vận hành — P1/P2

- [ ] GSC/GA4 thuộc tài khoản doanh nghiệp, có người dự phòng; lọc nội bộ, tách môi trường thử, thiết lập timezone/currency và quyền phù hợp.
- [ ] Chốt tracking plan ở mục 7; DebugView chứng minh mỗi sự kiện chỉ gửi đúng một lần và đúng thời điểm.
- [ ] Theo dõi organic landing → bài → sản phẩm/quà → lead/đơn; báo riêng branded/non-branded trong dữ liệu GSC khi đủ dữ liệu.
- [ ] UTM có quy ước source/medium/campaign/content; chỉ dùng cho liên kết chiến dịch bên ngoài, không gắn UTM vào link nội bộ.
- [ ] Newsletter/contact có quy trình consent, phản hồi, hủy nhận tin và suppression trước gửi chiến dịch; không coi lưu địa chỉ email là hoàn thiện email marketing.
- [ ] Có kế hoạch phân phối bài qua các kênh doanh nghiệp thật; cập nhật profile/link nhất quán. Local SEO chỉ triển khai theo mô hình và địa điểm kinh doanh thực.
- [ ] PR/liên kết từ đối tác liên quan dựa trên nội dung đáng tham khảo; không đặt KPI mua số lượng backlink hoặc rải bài tự động.
- [ ] Có dashboard kết quả, lịch review, người xử lý sự cố index và người chịu trách nhiệm cập nhật bài sau thay đổi hàng hóa.

## 6. Thiết kế triển khai phù hợp với hệ thống hiện tại

### Kiến trúc đề xuất

Ưu tiên **render HTML phía server cho các trang cần SEO, có cache và cập nhật lại khi nội dung đổi**. Các phần chọn quà, 3D, giỏ hàng và admin tiếp tục dùng tương tác React. Chưa cần quyết định viết lại toàn bộ hệ thống hoặc thay Supabase chỉ để thêm SEO.

Luồng cần thống nhất: dữ liệu được phép xuất bản → renderer trang công khai → nội dung + head + schema → cache/HTML → sitemap. Renderer chỉ đọc bài đã được phép công khai và đến hạn; không để HTML server lấy nháp bằng quyền cao rồi trông chờ frontend che đi.

| Lựa chọn | Phù hợp khi | Điều kiện bắt buộc |
| --- | --- | --- |
| SSR với cache và revalidation | CMS được cập nhật thường xuyên, cần phản ánh ẩn/đăng/giá nhanh | Cache key đúng URL, invalidation khi publish/unpublish/slug đổi, xử lý lịch đăng, trạng thái lỗi và quan sát lỗi |
| Prerender/SSG + build/revalidation tự động | Website nhỏ, tần suất cập nhật thấp, chấp nhận thời gian chờ xác định | Không chỉ chụp HTML một lần; có trigger từ CMS và đến giờ đăng, theo dõi build lỗi, gỡ HTML cũ khi ẩn |
| Chỉ gắn hook meta client | Có thể làm bước tạm thời | Chưa đủ để nghiệm thu toàn bộ các yêu cầu HTML/social/HTTP của báo cáo |

Đề xuất SLO nội bộ ban đầu: nội dung được xuất bản hoặc gỡ phải phản ánh lên HTML công khai và sitemap trong **không quá 5 phút**. Đây là mục tiêu vận hành đề xuất, không phải quy định Google; cần chốt theo giải pháp hạ tầng và người trực xử lý.

### Dữ liệu bài viết cần có

| Nhóm | Đang có | Bổ sung/điều chỉnh đề xuất |
| --- | --- | --- |
| Nhận diện | UUID, slug, title, tag | Quan hệ chuyên mục với slug riêng; lịch sử slug và redirect |
| Nội dung | excerpt, body dạng chuỗi[], cover image, phút đọc | Body có cấu trúc/Markdown chuẩn; alt/caption; liên kết bài và sản phẩm; tính thời lượng đọc nếu cần |
| SEO | Title/excerpt đang dùng chung | seo_title, meta_description, og_image/alt và override tùy chọn; indexability theo workflow; canonical mặc định do hệ thống giải quyết |
| Biên tập | published, published_at, updated_at | Tác giả/byline; người duyệt; trạng thái review; first_published_at không mất khi ẩn; scheduled_at; content_modified_at |
| Quản trị | Audit actor/entity/action | Revisions có nội dung; kiểm soát ghi đè khi hai người sửa; khả năng khôi phục |
| Vận hành | Lấy dữ liệu khi mở trang | Public detail theo slug; feed phân trang; cache invalidation/revalidation và thông báo lỗi |

Không cần cho mọi biên tập viên nhập canonical tự do: mặc định nên được sinh đúng từ route; ngoại lệ do người có trách nhiệm SEO quản lý. Khi migrate, giữ nguyên URL bài đang dùng và dữ liệu cũ; không tái tạo ngày đầu xuất bản từ ngày chạy migration.

## 7. Vận hành MKT và đo lường kết quả

### Bản đồ nội dung ban đầu

Đây là **giả thuyết biên tập để nghiên cứu**, chưa phải bộ từ khóa đã đo volume/độ khó hay được chứng minh tạo doanh thu. Chọn ưu tiên sau khi đối chiếu sản phẩm thực có thể bán, lợi nhuận và nhu cầu khách.

| Cụm nhu cầu | URL đích cần phục vụ | Bài hỗ trợ có thể viết | CTA có ích |
| --- | --- | --- | --- |
| Mua trâu gác bếp | Trang sản phẩm/danh mục gác bếp | Cách chọn, quy cách, cách dùng và bảo quản dựa trên hướng dẫn được xác nhận | Xem đúng sản phẩm và giá |
| Tìm hiểu trà Shan Tuyết | Trang trà, bài chủ đề trà | Nguồn gốc có bằng chứng, cách pha theo sản phẩm của cửa hàng | Chọn loại trà hoặc thêm vào quà |
| Chọn mật ong | Danh mục mật ong và các loại đang bán | Khác biệt giữa các dòng hàng dựa trên hồ sơ nguồn cung | So sánh và xem loại phù hợp |
| Dùng mắc khén | Trang mắc khén và bài hướng dẫn | Cách dùng, ví dụ món ăn do đội nội dung thử/xác nhận | Xem gia vị trong công thức |
| Quà theo người nhận/ngân sách | Landing quà và trang thiết kế | Cách chọn quà, phối hộp bằng sản phẩm thật | Thiết kế hộp quà |
| Quà doanh nghiệp | Landing dịch vụ nếu cửa hàng cung cấp thật | Quy cách, khả năng cá nhân hóa, thời gian chuẩn bị được xác nhận | Gửi nhu cầu tư vấn/báo giá |
| Quà mùa vụ | Landing ổn định hoặc trang chiến dịch có vòng đời rõ | Gợi ý theo dịp, cập nhật hàng có sẵn | Chọn mẫu đang nhận đặt |
| Câu chuyện nguồn gốc | Trang thương hiệu/bài phỏng vấn có chứng cứ | Nhà cung cấp, vùng nguyên liệu, quy trình bằng tư liệu thật | Xem sản vật gắn với câu chuyện |

Một bài tốt không chỉ kể chuyện: cần giải quyết câu hỏi, có bằng chứng riêng và giúp người đọc quyết định bước tiếp theo. Trang bán hàng và bài kiến thức có vai trò khác nhau; tránh viết nhiều bài cùng cạnh tranh một nhu cầu mà không có URL đích rõ ràng.

Brief mỗi bài nên có: đối tượng, ý định, cụm truy vấn, URL đích, điểm khác biệt, nguồn xác minh, dàn ý, ảnh cần chụp, link nội bộ, CTA, người duyệt, ngày xuất bản và ngày xem lại. Sau khi nền tảng ổn định, có thể khởi đầu với 1–2 bài được kiểm chứng mỗi tuần; số lượng phải theo năng lực thu thập tư liệu và kiểm soát chất lượng.

### Tracking plan tối thiểu

| Sự kiện | Khi nào ghi nhận | Tiêu chí kiểm tra |
| --- | --- | --- |
| `page_view` | Trang công khai thực sự đổi | Đúng URL/title/referrer, một lần; không cộng đôi auto-history và manual tracking; không coi mỗi ký tự gõ tìm kiếm là một trang nội dung mới |
| `article_view` (custom, nếu cần) | Bài tải thành công | article_id/slug/topic; không gửi ở loading, 404 hoặc preview nội bộ |
| `article_cta_click` (custom) | Bấm CTA trong bài | article_id, vị trí CTA, target_type, product_id nếu có |
| `view_item_list`, `select_item`, `view_item` | Xem danh sách/chọn/xem sản phẩm | item_id nhất quán với catalog, giá/currency đúng |
| `add_to_cart`, `remove_from_cart`, `begin_checkout` | Thay đổi giỏ hợp lệ/bắt đầu checkout | Không ghi add thành công khi sản phẩm không hợp lệ; quà custom có quy ước items/value rõ ràng |
| `generate_lead` | Backend nhận yêu cầu liên hệ hợp lệ | Không bắn khi chỉ bấm submit, bị validation hoặc request lỗi; không gửi tên/email/điện thoại/nội dung chat vào analytics |
| `newsletter_signup` (custom) | Lưu đăng ký nhận tin thành công | Không tính lỗi/gửi trùng như lead mới; consent và trạng thái hủy nhận tin có nguồn quản lý |
| `zalo_click`, `phone_click` (custom) | Bấm kênh liên hệ | Chỉ là micro-conversion; không tự coi là cuộc trò chuyện, khách tiềm năng hợp lệ hoặc đơn |
| `purchase` | Mốc đơn hàng được doanh nghiệp định nghĩa và backend xác nhận | transaction_id ổn định; value/currency/items; refresh/retry không đếm hai lần |
| `refund` | Hoàn tiền được hệ thống xác nhận | Liên kết transaction_id gốc; tránh báo sai doanh thu sau hủy/hoàn |

Đối với COD, phải ghi rõ báo cáo “đơn đặt thành công” và “tiền đã thu/đơn giao thành công”. Có thể dùng `purchase` tại mốc đặt hàng được xác nhận theo định nghĩa kinh doanh, nhưng không gọi số đó là doanh thu tiền mặt đã thu. Đối soát với hệ thống đơn hàng; báo cáo hủy/hoàn và lead có chất lượng riêng.

GA4 cần xử lý riêng điều hướng SPA và kiểm tra DebugView. [Google Analytics: SPA](https://developers.google.com/analytics/devguides/collection/ga4/single-page-applications). Các sự kiện thương mại phải mang dữ liệu items/currency/value phù hợp. [Google Analytics: ecommerce](https://developers.google.com/analytics/devguides/collection/ga4/ecommerce).

### KPI và nhịp làm việc

| Lịch | Người chịu trách nhiệm | Việc làm và dữ liệu cần xem |
| --- | --- | --- |
| Mỗi lần xuất bản | Biên tập + người duyệt | Nội dung/nguồn/ảnh/CTA, preview; sau đăng kiểm HTML, URL, sitemap, link và event |
| Hằng ngày khi có phát hành | Dev/QA được giao trực | Lỗi render/5xx, sitemap hỏng, canonical sai miền, noindex nhầm, build/revalidation thất bại |
| Hằng tuần | SEO/MKT | GSC clicks/impressions/query/page, trang chưa index và lý do; bài tạo product click/lead; tồn đọng cập nhật; phân phối có UTM |
| Hằng tháng | Chủ dự án + MKT + vận hành | Organic lead hợp lệ, đơn đặt, đơn giao/thu tiền, hoàn/hủy, doanh thu/lợi nhuận; hiệu quả theo landing/cụm nội dung; chi phí sản xuất nội dung |
| Theo lịch nội dung | Biên tập + vận hành hàng hóa | Giá/nguồn hàng/chính sách lỗi thời; link gãy, cannibalization; gộp, sửa, giữ hoặc gỡ bài với redirect phù hợp |

CTR = click/impression, tỷ lệ chuyển đổi phải ghi rõ mẫu số và loại chuyển đổi. Không lấy organic traffic tăng, thời gian ở lại lâu hoặc điểm plugin cao làm bằng chứng duy nhất cho hiệu quả kinh doanh. Chưa nên đặt cam kết “top 1”, số traffic hay doanh thu khi chưa có baseline.

MKT hiện bị giới hạn quyền xem thông tin khách hàng trong mô hình phân quyền. Nếu cần báo cáo chuyển đổi, cung cấp báo cáo tổng hợp có quyền phù hợp; không cấp quyền đọc toàn bộ PII chỉ để nối dữ liệu SEO.

## 8. Thứ tự triển khai trước và sau khi có tên miền

| Chặng | Công việc | Đầu ra để chuyển chặng |
| --- | --- | --- |
| 0 — Bây giờ, trên local | Chốt URL/origin policy, cách render, mô hình CMS và tracking plan; sửa tài liệu domain; xác định nội dung thật | Thiết kế được Dev–MKT thống nhất; backlog có người phụ trách và tiêu chí test |
| 1 — Nền tảng crawl | Render HTML, metadata tập trung, HTTP status, robots/sitemap tự cập nhật, chính sách môi trường | Test HTTP/DOM đạt; không đưa nháp/mẫu ra index; publish/schedule/unpublish đồng bộ |
| 2 — Sản phẩm và CMS | Trang SEO sản phẩm/danh mục; editor/preview/revision; ngày và redirect; schema/ảnh/link sản phẩm | MKT tự soạn–duyệt–đăng–sửa–ẩn được; QA xác minh toàn bộ vòng đời |
| 3 — Chuẩn bị kinh doanh | Hoàn thiện trang thương hiệu/chính sách, nội dung có nguồn, CTA, sự kiện analytics | Đối chiếu dữ liệu hàng hóa; các event kiểm thử đúng; không dùng nội dung mẫu làm bằng chứng thương mại |
| 4 — Khi đã sở hữu miền | DNS/TLS/domain chính, redirect alias, GSC/GA4, kiểm crawl/rich result/share preview, gỡ noindex chỉ ở bản live | Một miền chính thống nhất; sitemap submit thành công; các URL đại diện qua cổng nghiệm thu |
| 5 — Sau launch | Đo index/hiệu năng/traffic/chuyển đổi; mở rộng content và phân phối theo kết quả | Có dữ liệu và người ra quyết định cập nhật; không xem việc thêm meta là điểm kết thúc SEO |

Việc sở hữu tên miền và thiết lập tài khoản doanh nghiệp có thể làm song song với phát triển local. Không cần chờ có miền mới bắt đầu sửa code; cũng không nên để việc chưa có miền làm bỏ qua thiết kế chuyển domain sau này.

### Ma trận URL cần đạt ở bản chính thức

| Loại URL | HTTP/khả năng index mong muốn | Kiểm tra thêm |
| --- | --- | --- |
| Trang chủ | 200, được index | Title/description/Organization/WebSite phù hợp, canonical miền chính |
| Danh mục sản phẩm và trang chủ đề có giá trị | 200, được index | Nội dung riêng, link crawl được tới từng item, không chỉ bộ lọc JS |
| Sản phẩm | 200 khi còn trang hữu ích | Nội dung/giá/Offer nhất quán; hàng tạm hết có trạng thái thật, không tự 404 chỉ vì hết tồn |
| Bài đã đăng | 200, được index | HTML có bài, date/byline, canonical, OG và Article/Breadcrumb đúng |
| Bài nháp/hẹn giờ trước hạn | Không lộ công khai; preview có quyền và noindex | Không nằm trong sitemap, schema hay cache public; public có thể trả 404 |
| Bài/slug chuyển sang URL mới | 301/308 tới nội dung tương đương | Đích trả 200, không chain/loop; sitemap/link nội bộ đã đổi |
| Bài không có hoặc gỡ vĩnh viễn | 404/410 theo chính sách | Không Article schema cho bài lỗi; UI có điều hướng có ích |
| Lỗi nguồn dữ liệu tạm thời | 5xx phù hợp hoặc nội dung cache hợp lệ theo thiết kế | Không đưa 200 rỗng hoặc 404 giả làm trạng thái chính thức |
| `?utm_*`, `?fbclid` | Trang đúng nội dung, canonical về URL sạch tương ứng | Vẫn giữ attribution theo thiết kế tracking |
| `?q=`, bộ lọc, sort | Theo chính sách đã chốt; thường không là landing để index | Không sinh vô hạn URL rác; không chặn tài nguyên cần render |
| Trang phân trang có nội dung riêng | URL ổn định, chính sách index/canonical đúng | Không canonical tất cả về trang 1; có anchor trang tiếp theo |
| `/admin`, đăng nhập, preview, cart/checkout nếu có URL | Không index; auth theo đúng vai trò | Response/header hoặc head ban đầu phản ánh chính sách, không chỉ che menu |
| `/robots.txt`, `/sitemap.xml` | 200 đúng text/XML | Không SPA fallback, không domain sai, không draft/404 trong sitemap |

### Bộ kiểm thử trước khi ghi “đã hoàn thành”

1. Fetch HTML trực tiếp các loại URL trong bảng; kiểm title, H1/nội dung chính, canonical, OG, schema, robots, status và MIME.
2. Điều hướng SPA: bài A → bài B → danh mục → bài lỗi → trang hợp lệ → admin → storefront; không lưu sót metadata/schema/noindex của trang trước.
3. Tạo nháp và preview bằng tài khoản được phép; kiểm bằng phiên ẩn danh không đọc được nháp. Không thử bằng bài kinh doanh thật nếu có thể dùng dữ liệu QA.
4. Đăng ngay/hẹn giờ với múi giờ Việt Nam, kiểm trước và sau giờ đăng; không cần thao tác deploy thủ công ngoài quy trình đã chốt để bài xuất hiện.
5. Sửa nội dung, ẩn rồi đăng lại: giữ ngày đầu xuất bản; ngày sửa có ý nghĩa; HTML/sitemap/cache đồng bộ đúng SLO.
6. Đổi slug A → B: A redirect một bước, B đầy đủ SEO; các internal link và canonical đã đổi. Thử chống loop/collision.
7. Gỡ bài: không còn sitemap/link lỗi; phân biệt với lỗi Supabase tạm thời. Khôi phục revision hoạt động.
8. Feed lớn hơn trang đầu và lớn hơn giới hạn trả hàng của API cấu hình: crawler vẫn tìm đủ URL, detail không tìm trong feed bị cắt.
9. Đổi giá/ưu đãi/trạng thái sản phẩm: trang hiển thị, Product/Offer và feed (nếu có) khớp; link trong bài không dẫn sai món.
10. Rich Results Test và validator tương ứng không có lỗi quan trọng; kiểm nội dung thật ngoài khả năng validator kiểm cú pháp.
11. Chia sẻ URL trên Facebook/Zalo thật: bìa/title/description đúng bài và HTTPS công khai; thử cập nhật ảnh rồi làm mới cache.
12. QA mobile/keyboard, ảnh và CWV theo route; báo riêng lab và field, chưa đủ mẫu field thì ghi rõ.
13. GA4 DebugView: click qua các trang, CTA, giỏ/lead và mốc đơn; không duplicate; validation/request lỗi không sinh success event.
14. Đối soát một bộ đơn QA giữa event và backend, gồm refresh, retry, COD, hủy/hoàn theo phạm vi hệ thống đã hỗ trợ.
15. Xác minh Search Console trên miền sở hữu, submit sitemap; kiểm render/indexability các URL đại diện. Index thực tế và hiệu quả cần theo dõi sau đó, không nghiệm thu bằng một lần request index.
16. Chủ nội dung duyệt bỏ/thay dữ liệu mẫu, chứng thực thông tin nguồn hàng/đơn vị/chính sách/ảnh trước mở index.

## 9. Các việc có thể để sau và những gì chưa được xác minh

- **Discover:** có thể chuẩn bị ảnh lớn phù hợp và `max-image-preview:large`, nhưng không dùng việc có schema/ảnh để cam kết sẽ xuất hiện. [Google: Discover](https://developers.google.com/search/docs/appearance/google-discover).
- **Google News/NewsArticle:** trang mang tên “Tin tức” không tự trở thành báo điện tử. Với bài thương hiệu/kiến thức, chọn Article/BlogPosting đúng nội dung; sitemap tin tức không phải yêu cầu mặc định của cửa hàng.
- **Hreflang:** chỉ ưu tiên khi có phiên bản ngôn ngữ/vùng thật, không tạo thẻ cho URL chưa tồn tại.
- **Merchant Center/Local SEO:** bổ sung theo nhu cầu bán hàng và thông tin doanh nghiệp thực; cần kiểm tài khoản/feed/địa điểm riêng, chưa kiểm trong lần này.
- **SEO cho AI:** không cần thêm một bộ thủ thuật riêng trước khi giải quyết crawl, nội dung đáng tin và đo lường. Không đưa `llms.txt` thành cổng ra mắt cho Google Search. [Google: tối ưu cho tính năng AI](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide).

Giới hạn của lần đánh giá này:

- Không mua miền, sửa DNS, deploy, gắn analytics, chỉnh robots của bản live hoặc thay đổi dữ liệu nội dung kinh doanh.
- Không đăng nhập admin/GSC/GA4/Merchant Center; không xác nhận migration/RLS remote chỉ từ file SQL. Có thể kiểm chứng giao diện login và code, chưa nghiệm thu các thao tác lưu/duyệt/đăng bằng tài khoản thật.
- Chưa chạy Lighthouse/PSI/CrUX, Rich Results Test hoặc Facebook/Zalo debugger; vì vậy không có điểm hiệu năng hoặc preview social thực được xác nhận. Mã hiện thiếu schema/OG đã được kiểm bằng HTTP và DOM.
- Chưa đo demand, đối thủ, thứ hạng, backlink hoặc conversion; không khẳng định bản Vercel đã index hay đang có traffic.
- Không dùng build/test chức năng xanh ở các lần làm trước để đánh dấu SEO đạt. Cần bộ kiểm tra chuyên biệt ở mục 8 và theo dõi vận hành sau launch.

**Quyết định đề xuất:** coi checklist 1.0 là tài liệu tham khảo cho một phần triển khai. Dùng báo cáo này để bổ sung phạm vi và tiêu chí nghiệm thu; bắt đầu bằng domain/environment policy, rendering và URL/data lifecycle, rồi hoàn thiện CMS, nội dung và đo lường. Chỉ mở index `asintaybac.com` khi các cổng P0 đã đạt và nội dung kinh doanh đã được duyệt.

