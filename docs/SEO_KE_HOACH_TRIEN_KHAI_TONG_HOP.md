# Kế hoạch tổng hợp để bắt đầu vận hành SEO — A Sỉn Tây Bắc

Ngày tổng hợp: **29/09/2026**. Cập nhật sửa lỗi local: **29/09/2026, khoảng 16:10, giờ Việt Nam**. Mốc audit production gần nhất: **15:36–15:42 cùng ngày**. Phạm vi: toàn website, sản phẩm, hộp quà, tin tức, CMS, hạ tầng và vận hành Marketing.

**Đây là tài liệu làm việc chung: phần A là việc bạn/chủ dự án cần làm hoặc quyết định; phần B là việc Dev cần sửa code và cấu hình dự án.** Các phần sau quy định thứ tự, nghiệm thu và công việc định kỳ. Có thể dùng riêng file này để giao việc và theo dõi triển khai.

Tên miền chính **https://asintaybac.com/** đã kết nối Vercel và mở được qua HTTPS. `VITE_GA4_ID` đã có trong cấu hình local và Vercel Production; các thành phần schema SEO mới đã hiện diện trên Supabase. **Đã sửa các lỗi kỹ thuật local ở mục 0.3/0.5: 74/74 test, build và 28/28 smoke check đạt; chưa deploy.** Xem **mục 0.6** để biết phần đã sửa và cách phát hành. Bản production tại mốc audit trước sửa chỉ đạt **8/22**, chưa chứa code SEO/GA4 mới. Chưa xác minh tài khoản Search Console hoặc dữ liệu trong GA4 Realtime/DebugView.

## 0. Cách sử dụng và điểm xuất phát

- Ô chưa đánh dấu là **việc còn cần làm/kiểm chứng toàn bộ tiêu chí**, không đồng nghĩa chưa có code. Khi đánh dấu xong, ghi người thực hiện, ngày và bằng chứng nghiệm thu cạnh mã việc. Mục **0.1–0.5 lưu audit trước sửa; 0.6 là kết quả local mới nhất**.
- **P0:** nền tảng phải đạt trước khi mở index bản chính thức. **P1:** cần có để bắt đầu vận hành nội dung và kinh doanh bằng SEO. **P2/điều kiện:** chỉ triển khai khi có nhu cầu tương ứng hoặc sau khi nền tảng ổn định.
- P1 không có nghĩa là có thể bỏ qua: các khả năng sản phẩm, CMS, nội dung và đo lường trong phạm vi ra mắt vẫn cần nghiệm thu. Một số khâu duyệt/báo cáo có thể làm thủ công theo quy trình được ghi rõ.
- Không cần chờ mua tên miền mới bắt đầu sửa code. Không đánh dấu SEO hoàn thành chỉ vì build thành công, có thẻ meta hoặc đã gửi sitemap.
- Tài liệu hợp nhất checklist ban đầu, audit nền và lần kiểm tra tiến độ mới. Bảng ngay dưới là **mốc audit ban đầu**; dùng mục 0.6 để đọc trạng thái code hiện tại. Số kiểm tra đạt không phải điểm SEO hoặc tỷ lệ hoàn thành toàn kế hoạch.

| Nhóm | Hiện trạng đã ghi nhận trong audit | Khoảng thiếu cần xử lý |
| --- | --- | --- |
| HTML và metadata | HTML ban đầu là app shell chung; title/description riêng xuất hiện sau JS | HTML theo từng URL, canonical, social metadata, schema |
| Crawl/index | robots/sitemap trả HTML; URL bài không tồn tại trả 200 | Tài nguyên đúng định dạng, HTTP status và chính sách index |
| Sản phẩm | Card mở modal; link query chưa có metadata sản phẩm | Trang chi tiết/danh mục có nội dung riêng, link crawl được |
| Tin tức/CMS | Có CRUD, nháp/lịch đăng cơ bản; bài mẫu, body dạng đoạn văn | Biên tập có cấu trúc, preview nháp, ngày xuất bản, revision, redirect |
| MKT | Chưa thấy GA4/GTM trong mã nguồn được rà; newsletter lưu thông tin liên hệ | Đo chuyển đổi, chăm sóc lead, quy trình chiến dịch và dashboard |
| Nghiệm thu | Đã kiểm HTTP/DOM một số URL, chưa kiểm GSC/GA4 hoặc CMS bằng tài khoản thật | Kiểm production và quyền dữ liệu; đo hiệu năng, social preview, kết quả vận hành |

### 0.1. Kết quả kiểm tra lại: đã tới đâu?

**Domain đã hoạt động, cấu hình GA4 đã khai báo và schema SEO mới đã có; bản website công khai vẫn chưa sẵn sàng vận hành SEO theo kế hoạch.** Cần phát hành đúng mã nguồn, xử lý lỗi URL/đo lường, duyệt nội dung thật và nghiệm thu CMS. Không thể coi phần B đã hoàn thành 20/20 chỉ từ tài liệu bàn giao Dev.

| Nhóm | Bằng chứng kiểm tra lần này | Trạng thái |
| --- | --- | --- |
| Mua miền | Bạn xác nhận mua tại Nhân Hòa; DNS có NS `ns1`–`ns4.zonedns.vn` | Đã mua; quyền khôi phục/gia hạn chưa kiểm |
| Domain/HTTPS | Apex và www mở HTTPS được; HTTP apex trả 308 về HTTPS. www vẫn trả 200 riêng, chưa chuyển về apex | Kết nối xong; chuẩn hóa www còn thiếu |
| Vercel project | CLI xác nhận apex, www và alias Vercel cùng gắn vào production của `website3dtaybac` | Đã gắn miền |
| Bản production | Deployment `dpl_DE8exf9KxDWJRZFiRk8zDHMhexnL`, tạo 29/09/2026 15:30:27; chưa có Function `api/render`/`api/seo` | Deployment mới nhưng chưa chứa code SEO/GA4 mới |
| HTTP live | **8/22** smoke check đạt; 14 URL HTTPS được lấy đều trả cùng HTML app shell, kể cả robots/sitemap và URL lỗi; không canonical/schema trong HTML | Chưa đạt SEO production |
| Code/build local | `npm test`: **59/59**; `npm run build`: đạt, có `dist/seo-shell.html`; smoke SEO local: **22/22** | Nền tảng chạy được ở local; không thay nghiệm thu production |
| HTML local | Bài và sản phẩm có title/canonical/schema/nội dung; URL lỗi trả 404; robots text, sitemap XML | Các trường hợp cơ bản đã kiểm được |
| Supabase | Truy vấn bộ cột SEO, bảng redirect/revision đều HTTP 200; RPC `public_product_stock` trả 12 dòng. JS công khai tham chiếu cùng URL Supabase với local | Các thành phần schema đã có; chưa thay nghiệm thu quyền và thao tác CMS |
| Analytics | Local có ID đúng dạng `G-...`; Vercel Production có tên biến `VITE_GA4_ID`. JS live không có GA4 loader/ID local; DOM trang chủ/bài/sản phẩm không nạp gtag | Khai báo env xong; GA4 chưa được nạp trên các trang live đã kiểm |
| Nội dung | Bài `hanh-trinh-tra` vẫn chứa “câu chuyện minh họa”; trang chủ còn “Đánh giá minh họa”; 4 bài hiện tại đều có nội dung minh họa trong HTML local | Chưa duyệt nội dung thật để vận hành SEO/MKT |

Lưu ý: sitemap rỗng trên localhost là chính sách host hiện có, không chứng minh sitemap production đủ dữ liệu. Gọi trực tiếp handler với host chính trong kiểm thử local sinh **30 URL khác nhau**; cả 30 trả 200 và canonical khớp khi gọi handler. Đây là **mô phỏng local với dữ liệu Supabase hiện tại**, không phải phản hồi từ asintaybac.com đã triển khai.

Bằng chứng mới: [HTTP live, GA4 và schema](D:/CloneGithub/Website3DTayBac/test-results/seo-live-audit-2026-09-29.json), [mô phỏng 30 URL và các trường hợp lỗi local](D:/CloneGithub/Website3DTayBac/test-results/seo-local-audit-2026-09-29.json). Các file trong `test-results` là artifact local bị Git ignore; các kết luận cần thiết đã được ghi vào tài liệu này. Các file `seo-progress-*` lưu mốc 14:22–14:30, trước khi domain/GA4/schema được cập nhật.

### 0.2. Đối chiếu phần B theo từng mã

“Có code” không đồng nghĩa đã chạy migration, đã deploy hoặc đã nghiệm thu đủ tiêu chí trong mục B.

| Mã | Phần đã có/đã kiểm | Phần còn phải hoàn thành |
| --- | --- | --- |
| B01 | Renderer HTML theo URL, tích hợp Vite/Vercel Function; HTML local có nội dung | Deploy và kiểm Function thật; đồng bộ đủ route/nội dung giữa server và React |
| B02 | Resolver chung, canonical, OG/Twitter, JSON-LD; test cơ bản đạt | Kiểm điều hướng bằng trình duyệt, facts/giá/tồn, social preview và rich results trên bản phát hành |
| B03 | Local có 404 và redirect query sản phẩm 308 | Sửa mất UTM, `/deal-hoi`, chủ đề không tồn tại và phân trang ngoài phạm vi |
| B04 | Có robots text/sitemap XML động; mô phỏng host chính sinh 30 URL | Sửa giới hạn 500 bài, phản hồi khi nguồn dữ liệu lỗi, chính sách canonical override và cache; kiểm bản live |
| B05 | Trang `/san-pham/:slug`, `/danh-muc/:slug`, anchor và Product schema | Giá khuyến mại/tồn kho server–client phải thống nhất; nội dung sản phẩm/chính sách cần duyệt |
| B06 | Có detail theo slug, feed phân trang và link trang | Fallback client chưa đúng khi thiếu migration; lọc chủ đề có thể bị bỏ; hết trang trả sai; cần test dữ liệu lớn |
| B07 | Có form SEO/social/byline/nguồn, picker liên quan; các cột mới đã hiện diện trong API | Cần thử lưu/đọc bằng tài khoản biên tập; alt ảnh bìa riêng và quyền chỉnh canonical cần hoàn thiện |
| B08 | Editor block, xử lý inline an toàn, renderer và validator | Kiểm soạn/lưu/hiển thị bài thật; preview và public vẫn là hai phần render riêng |
| B09 | Có trường ngày và RPC/trigger giữ ngày trong migration; API đã có các cột mới | Cần xác minh RPC/trigger và UAT đăng–hẹn giờ–ẩn–đăng lại; kiểm ngày khi dời lịch trước lần đăng đầu |
| B10 | Có preview modal trong admin, revision UI, kiểm `updated_at` khi lưu; bảng revision đã có | Cần UAT quyền/khôi phục; chưa phải preview toàn trang dùng đúng renderer public |
| B11 | Có SQL lịch sử slug, archive, UI khôi phục; bảng redirect/revision đã có trong API | Cần nghiệm thu RPC, đổi slug, gộp redirect, collision và gỡ/khôi phục thật |
| B12 | Có nén/crop upload, social rendition, width/height và lazy-load | Chưa có pipeline `srcset/sizes` đầy đủ; alt bìa riêng, QA ảnh/crop/chia sẻ còn thiếu |
| B13 | Có code GA4 local; đã khai báo ID local/Vercel | JS production chưa chứa GA4; thiếu mảng ecommerce `items`, `begin_checkout` gửi số; cần kiểm admin, duplicate/refund, DebugView và đối soát |
| B14 | Có trang hủy nhận tin và SQL token/suppression | Migration, tích hợp luồng gửi/hủy nhận, chăm sóc lead và báo cáo MKT chưa nghiệm thu; dashboard tự động chưa có |
| B15 | Canonical origin theo config, host preview/local noindex | Chưa có công tắc chủ động giữ miền chính noindex; robots preview chặn crawl; cần kiểm live và alias |
| B16 | Có migration SEO/CMS/RLS; API hiện đã có bộ cột SEO, bảng redirect/revision và RPC tồn kho | Chưa xác minh toàn bộ lịch sử migration, RLS và thao tác bằng các vai trò; không chạy lại SQL chỉ vì bản audit 14:30 từng báo thiếu |
| B17 | Có cache header, query/RLS theo thời gian và sitemap động | Chưa có bằng chứng invalidation/retry/cảnh báo; cache hiện không bảo đảm mục tiêu ≤5 phút |
| B18 | Miền đã gắn Vercel, HTTPS hoạt động; local có www redirect, rewrite và đóng gói shell | www live chưa redirect, alias Vercel còn phục vụ bản trùng; chưa nghiệm thu Auth/callback trên miền mới |
| B19 | Tách chunk/font, giữ lazy 3D; build đạt | Chưa có Lighthouse/field CWV, browser QA 320/390/768/desktop và network theo route |
| B20 | 59 test và 22 smoke check local đạt; có workflow CI | Chưa xác nhận CI remote; smoke hiện bỏ sót các lỗi bên dưới; chưa có monitoring/rollback đã thử |

### 0.3. Những điểm cần sửa/kiểm trước khi dùng bản code mới để làm SEO

| Ưu tiên | Phát hiện có bằng chứng | Việc tiếp theo |
| --- | --- | --- |
| P0 phát hành | Vercel đã redeploy nhưng không có Function SEO hoặc GA4 trong JS; các file SEO/analytics/API mới còn untracked trong Git local | Đưa đầy đủ mã nguồn cần thiết vào bản phát hành, kiểm đúng branch/root directory/build và nghiệm thu deployment. Schema mới đã có; vẫn cần UAT CMS và kiểm fallback nếu schema lỗi |
| P0 mở index | Chỉ cần host là `asintaybac.com`, code hiện phát `index, follow`; bài mẫu cũng sẽ được indexable | Thêm công tắc index riêng cho server/client và tài nguyên SEO, hoặc chỉ nối bản chính sau khi nội dung/kiểm nghiệm đã đạt; đừng trỏ miền rồi mặc định cho index bài mẫu |
| P1 URL | `/san-pham?product=honey&utm_source=audit` trả 308 sang `/san-pham/honey`, mất UTM. `/deal-hoi` trả HTTP 404 dù React có chuyển về `/#deal-hoi` | Giữ tham số attribution khi redirect; đồng bộ redirect legacy ở server |
| P1 nội dung/phân trang | Sau cập nhật schema, chủ đề không tồn tại trả 200 với danh sách rỗng và `index, follow`; `/tin-tuc?page=2` khi chỉ có 4 bài vẫn trả 503 | Trả 404 cho chủ đề không tồn tại và xử lý hết trang đúng; không bỏ lọc chủ đề nếu fallback; phân biệt lỗi dữ liệu với hết trang |
| P1 sitemap | `loadAllPublishedArticles` mặc định limit 500; sitemap bắt lỗi từng nguồn rồi vẫn trả 200; URL được thêm theo slug chưa xét canonical override của bài | Đọc phân trang hết tập public; không coi XML thiếu do lỗi nguồn là sitemap khỏe; chỉ đưa URL canonical được index; thêm test lớn/nguồn lỗi |
| P1 cập nhật nội dung | Sitemap `s-maxage=600, stale-while-revalidate=3600`; bài 180+600; danh sách 300+600; chưa thấy cơ chế purge theo lần lưu | Chọn invalidation hoặc TTL/SWR phù hợp, có retry/cảnh báo. Cache hiện không đủ bằng chứng để cam kết 5 phút và gỡ nội dung ngay |
| P1 dữ liệu sản phẩm | Server đọc giá gốc, client áp ưu đãi qua `applyPromotions`; RPC tồn kho lỗi thì server mặc định còn hàng | Dùng cùng nguồn giá hiệu lực/tồn bán; khi chưa biết tồn kho không khẳng định còn hàng. Chưa quan sát giá sai ở 3 ưu đãi hiện tại, đây là khác biệt đường tính cần khắc phục |
| P1 GA4 | `AnalyticsParams` chỉ nhận scalar; `purchase` chưa có `items`, `begin_checkout.items` là số; chống trùng chỉ trong sessionStorage; hàm gửi chỉ kiểm `initialized` | Dùng mảng item đúng GA4, kiểm quyền gửi theo route tại thời điểm gửi, chống trùng theo hợp đồng đơn và QA lỗi/retry/COD; bổ sung refund khi nghiệp vụ xác nhận |
| P1 biên tập | Preview là component riêng trong admin; bìa vẫn fallback alt theo title, chưa có `srcset/sizes`; các trang chính sách riêng chưa thấy trong router | Hoàn thiện tiêu chí B07/B10/B12 theo nhu cầu vận hành, đưa chính sách được duyệt lên URL phù hợp; thử bằng người viết thật |
| P1 nội dung/MKT | Còn bài minh họa; chưa có bằng chứng brief, lịch nội dung, người nhận lead, GSC/GA4 hoạt động | Bạn/MKT thực hiện A06–A11; Dev kiểm cùng dữ liệu thật trước mở index |

File bằng chứng chính: [renderer](D:/CloneGithub/Website3DTayBac/src/seo/renderSite.ts), [nguồn dữ liệu server](D:/CloneGithub/Website3DTayBac/src/seo/content.ts), [sitemap](D:/CloneGithub/Website3DTayBac/src/seo/sitemap.ts), [handler/cache](D:/CloneGithub/Website3DTayBac/server/seo/handler.ts), [API bài client](D:/CloneGithub/Website3DTayBac/src/services/storeApi.ts), [analytics](D:/CloneGithub/Website3DTayBac/src/analytics.ts), [CMS](D:/CloneGithub/Website3DTayBac/src/admin/ContentSection.tsx).

Robots `Disallow` không bảo đảm URL biến mất khỏi chỉ mục và có thể ngăn bot đọc noindex; cần thống nhất chính sách preview/admin khi phát hành. [Google: robots.txt](https://developers.google.com/search/docs/crawling-indexing/robots/intro). GA4 ecommerce cần payload item đúng để có báo cáo theo sản phẩm. [Google: ecommerce](https://developers.google.com/analytics/devguides/collection/ga4/ecommerce).

### 0.4. Làm gì tiếp theo với Nhân Hòa và Vercel?

**Cập nhật 15:42: miền đã thêm và DNS/HTTPS đã hoạt động. Không cần làm lại DNS ở bước 1–2.** Giữ hướng dẫn dưới đây để quản lý cấu hình; phần còn thiếu của bước 3 là www/alias. Tiếp tục bước 4–8 và thứ tự cụ thể ở 0.5. Miền mở được website chưa có nghĩa SEO đã sẵn sàng.

1. **Bạn/Dev: thêm domain vào Vercel.** Mở project `website3dtaybac` → Settings → Domains; thêm `asintaybac.com` và `www.asintaybac.com`. Chọn bản không www làm chính, www chuyển về nó. Lấy đúng giá trị DNS Vercel hiển thị. [Vercel: thêm domain](https://vercel.com/docs/domains/working-with-domains/add-a-domain).
2. **Bạn: tạo DNS tại Nhân Hòa/ZoneDNS.** Miền hiện đã dùng nameserver ZoneDNS; đăng nhập quản trị DNS của miền, tạo A cho `@` và CNAME cho `www` theo bảng dưới. Có thể giữ nameserver hiện tại. [Nhân Hòa: quản trị DNS](https://wiki.nhanhoa.com/kb/huong-dan-tro-ten-mien-ve-hosting/).

   | Loại | Host | Giá trị |
   | --- | --- | --- |
   | A | `@` | IP Vercel hiển thị riêng cho miền/project |
   | CNAME | `www` | Đích Vercel hiển thị cho www |
   | TXT, nếu Vercel yêu cầu | Theo yêu cầu xác minh | Token do Vercel cung cấp |

   Không nhập localhost, không dùng IP hosting Nhân Hòa khi website chạy trên Vercel, không đoán CNAME từ project khác. Miền hiện đã kết nối thành công; chỉ sửa bản ghi khi có yêu cầu thực tế từ dashboard Vercel, giữ MX/TXT dịch vụ khác nếu đã có.

3. **Dev: kiểm kết nối thực.** Chờ DNS có hiệu lực, kiểm Vercel báo cấu hình hợp lệ, HTTPS, www chuyển về apex và route sâu. Nếu trỏ ngay vào production hiện tại, miền sẽ phục vụ **bản cũ chưa có SEO mới**; đây không phải hoàn tất triển khai. Vercel đang là nơi chạy website, không cần mua thêm hosting chỉ để trỏ domain.
4. **Dev: hoàn thiện các điểm ở 0.3 và nghiệm thu DB/CMS.** Các thành phần schema mới đã hiện diện. Đối chiếu lịch sử migration `20260929000000_seo_cms_foundation.sql` cùng tiền đề, kiểm quyền và vòng đời bài trước khi đánh dấu B16 hoàn tất; không chạy lại SQL tùy tiện hoặc coi truy vấn public thành công là đủ nghiệm thu CMS.
5. **Dev: cấu hình và phát hành bản mới.** Khai báo các biến bên dưới, kiểm bản phát hành, route static assets/Function và tạo `dist/seo-shell.html`; chỉ phát hành khi các lỗi chặn đã xử lý. Kiểm lại renderer, robots/sitemap, 404/redirect, admin, form/đặt hàng, Supabase Auth redirect/callback đang dùng.
6. **Bạn/MKT: xác minh GSC/GA4 và chuẩn bị nội dung.** GA4 đã có Measurement ID trong env; dùng property/web stream đã tạo, không cần tạo lại. Sau khi Dev phát hành đúng code, kiểm Realtime/DebugView và cách tính lead/đơn/COD. Với GSC, kiểm Domain property `asintaybac.com` đã xác minh bằng DNS TXT hay chưa. Duyệt/thay bài mẫu, ảnh, nguồn hàng, chính sách và nội dung sản phẩm. [GSC](https://support.google.com/webmasters/answer/34592?hl=en), [GA4](https://support.google.com/analytics/answer/14183469?hl=en).
7. **Dev + MKT: nghiệm thu và mở index.** Kiểm D01–D16, đặc biệt host/robots/canonical, UAT CMS, DebugView, rich results/social preview và mobile. Gửi `https://asintaybac.com/sitemap.xml` sau khi XML thật, miền đúng và nội dung đã duyệt. Không coi nút request indexing là bảo đảm đã index.
8. **MKT/vận hành: bắt đầu lịch bài và đo kết quả.** Thực hiện phần E, gán người nhận lead và người trực lỗi; xem Search Console hằng tuần, đối soát đơn/tiền thu hằng tháng.

| Cấu hình cần kiểm trên Vercel | Giá trị/mục đích | Trạng thái kiểm được |
| --- | --- | --- |
| `VITE_SITE_URL` | `https://asintaybac.com`, build phía trình duyệt | Production chưa khai báo; code có mặc định miền này |
| `SITE_URL` | `https://asintaybac.com`, renderer server | Production chưa khai báo; nên đặt rõ cùng origin |
| `VITE_GA4_ID` | Measurement ID `G-...` của bạn | Đã có local và tên biến trên Production; bản live vẫn thiếu code GA4. Cần build đúng source, không chỉ redeploy source cũ |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | Dữ liệu public, đúng project đã migrate | Production đã có tên biến; JS live tham chiếu cùng URL Supabase với local. Không đọc/ghi secret vào báo cáo |
| `ASIN_SEO_INDEX_HOSTS` | Mặc định để trống, tránh cho preview vào tập index | Không dùng biến này thay công tắc bật/tắt index miền chính |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_ORIGIN` | API quản trị phía server nếu dùng gửi mail/mời nhân sự | Chưa có trong danh sách Production; chỉ đặt secret phía server, `APP_ORIGIN` là miền chính |
| SMTP/IMAP theo tính năng dùng | Gửi/nhận email của hệ thống | Chưa có trong danh sách Production; mua miền chưa tự tạo hộp thư hoặc tài khoản SMTP |

Không cần gửi mật khẩu Nhân Hòa, Vercel hoặc Supabase vào tài liệu. Người giữ tài khoản thao tác DNS/tài khoản, Dev làm code/cấu hình và lưu bằng chứng sau triển khai.

**Giới hạn lần kiểm tiến độ:** đã đọc code, chạy 59 test/build/22 smoke local, 22 smoke live, kiểm HTTP 15 URL/biến thể, DOM trang chủ/bài/sản phẩm/admin, đọc deployment/tên biến Vercel và schema public Supabase. Chưa đăng nhập CMS/GSC/GA4, chạy Lighthouse hoặc đo Core Web Vitals, thử quyền RLS, tạo đơn hay sửa nội dung thật. Trong lượt audit này chỉ cập nhật tài liệu và artifact kiểm tra, không deploy/migrate hoặc thay DNS. Không suy diễn GA4 đã nhận dữ liệu chỉ vì env có ID.

### 0.5. Kết luận audit sau khi nối domain và cấu hình GA4 — 29/09, 15:36–15:42

**Điểm cần xử lý đầu tiên là bản phát hành:** deployment mới lúc 15:30 vẫn chạy bộ JS `index-DIWPloJh.js`, chưa chứa `googletagmanager.com/gtag`, chưa có Measurement ID local hoặc marker `send_page_view`. Trình duyệt không nạp script GA4 khi mở trang chủ, bài viết và danh sách sản phẩm. Danh sách Function production chỉ có contact/mail/staff, thiếu `api/render` và `api/seo`. Điều này giải thích vì sao thêm env chưa làm GA4/SEO mới hoạt động.

| Ưu tiên | Kết quả trên website thật | Hướng xử lý |
| --- | --- | --- |
| P0 | `/robots.txt` và `/sitemap.xml` cùng trả 200 `text/html`, giống HTML trang chủ | Phát hành renderer/rewrite đúng; robots phải là text và sitemap phải là XML trước khi gửi GSC |
| P0 | `/san-pham/honey` hiển thị “Hình như bạn đã lạc đường” nhưng HTTP 200; danh sách sản phẩm không có anchor đến trang chi tiết | Phát hành route sản phẩm mới và link thật; kiểm sản phẩm tồn tại 200, không tồn tại 404 |
| P0 | Trang chủ/bài/sản phẩm thiếu canonical và JSON-LD ngay cả sau khi JS chạy; HTML ban đầu dùng title chung | Phát hành head/renderer chung; kiểm HTML ban đầu và DOM sau điều hướng |
| P1 | www và `website3dtaybac.vercel.app` cùng trả 200 bản trùng, chưa có canonical | www 301/308 về apex; chốt redirect alias cũ hoặc noindex phù hợp với preview, không để nhiều bản indexable không chủ đích |
| P1 đo lường | Có env GA4 nhưng không có tag chạy trên các trang live đã kiểm | Phát hành code GA4, kiểm Realtime/DebugView; sửa payload ecommerce trước khi dùng báo cáo doanh thu theo sản phẩm |
| P1 nội dung | Bài trà ghi rõ “câu chuyện minh họa”, trang chủ có “Đánh giá minh họa” | Chủ dự án/MKT duyệt hoặc thay dữ liệu thật; không coi nội dung hiện có là bộ nội dung SEO đã nghiệm thu |

Trên admin login, DOM sau JS đã có `noindex, nofollow`; không báo lỗi thiếu noindex cho trang này. Title/description bài viết cũng đổi được sau JS, nhưng canonical/schema vẫn thiếu. Google có thể render JavaScript; lỗi ở đây không có nghĩa mọi website React đều không thể SEO. Các điểm HTTP status, canonical và link crawl được cần xử lý theo [hướng dẫn JavaScript SEO của Google](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics).

**Các lỗi vẫn còn trong bản code local, cần sửa cùng đợt phát hành:**

1. Redirect query sản phẩm làm mất UTM; `/deal-hoi` trả 404 ở server dù client có redirect.
2. `/tin-tuc?page=2` trả 503 khi hết dữ liệu; chủ đề không tồn tại trả trang rỗng 200 được phép index.
3. Sitemap mới sinh được 30 URL và cả 30 qua kiểm 200/canonical local, nhưng giới hạn 500 bài, canonical override, fallback khi lỗi nguồn và cache chưa được giải quyết.
4. `begin_checkout.items` đang là số lượng; `purchase` không gửi mảng sản phẩm. Cần mảng `items` đúng cấu trúc để đo ecommerce theo sản phẩm. [Google: ecommerce](https://developers.google.com/analytics/devguides/collection/ga4/ecommerce).
5. Chưa có cơ chế chủ động giữ nội dung chưa duyệt khỏi index trên miền chính; chính sách tồn kho khi nguồn lỗi và đường tính giá server/client cần thống nhất.

**Thứ tự làm tiếp:**

- **Dev:** sửa các lỗi local ở trên; đưa đủ file mới vào nguồn phát hành; kiểm đúng project/branch/root directory Vercel; build và phát hành bản đó. Các file SEO mới đang untracked nên nếu deploy từ Git, cần đưa chúng vào commit phát hành. Audit này không xác định thao tác Git/Dashboard nào gây lệch source.
- **Dev:** kiểm lại Function SEO, robots/XML, canonical/schema, URL sản phẩm, 404, www/alias và tag GA4 trên **domain thật**; các kiểm tra local không thay bước này. `SITE_URL`/`VITE_SITE_URL` nên khai báo rõ trên Production, dù code đang có mặc định đúng miền.
- **Bạn/MKT:** duyệt bài/ảnh/review/thông tin kinh doanh; dùng GA4 đã tạo để xác nhận Realtime sau phát hành; xác minh Search Console nếu chưa có và gửi sitemap khi XML đã đúng. Không cần mua lại domain hoặc tạo lại GA4 chỉ để sửa lỗi đang thấy.
- **Dev + vận hành:** UAT CMS bằng vai trò thật, kiểm đặt hàng/lead, GA4 không trùng page_view, rich results, Lighthouse/mobile và theo dõi GSC sau khi Google thu thập dữ liệu.

**Tiêu chí để chuyển sang vận hành nội dung:** domain có một bản chuẩn; robots/sitemap đúng định dạng; trang thật và URL lỗi trả trạng thái phù hợp; nội dung thật được duyệt; GA4 đo được sự kiện; CMS hoạt động với quyền đúng. Không chờ GA4 tự có dữ liệu trong khi tag chưa được nạp, và không dùng “8/22” như điểm xếp hạng SEO.

### 0.6. Đã sửa local, chờ bạn deploy — 29/09/2026

**Phạm vi lượt sửa:** xử lý lỗi kỹ thuật SEO/GA4 đã phát hiện, bổ sung kiểm thử hồi quy và hướng dẫn phát hành. Chưa deploy, chưa chạy migration từ lượt sửa này, chưa sửa nội dung kinh doanh thật. Các thiếu sót biên tập/vận hành trong mục B vẫn cần nghiệm thu theo tiêu chí riêng.

| Nhóm | Đã sửa trong code local | Cách kiểm |
| --- | --- | --- |
| Cấu hình client | Sửa cách đọc `import.meta.env` để Vite đưa cấu hình public/Supabase/GA4 vào trình duyệt đúng cách | Test build Vite thực trong bộ 74 test; JS build có GA4 ID và loader |
| URL/redirect | Link sản phẩm cũ giữ UTM/gclid; `/deal-hoi` về anchor đúng; tra redirect cả các URL bài/sản phẩm hợp lệ; nối query trước fragment; kiểm vòng lặp | Test handler + smoke; thêm redirect alias Vercel cũ và www trong cấu hình |
| Tin tức | Phân trang theo URL, không gom dồn/cắt ở 50 bài; hết trang và chủ đề không tồn tại trả 404/noindex; lỗi dữ liệu thật vẫn 503 | HTTP và trình duyệt: trang bài, bài chi tiết, `?page=2` khi chỉ có 4 bài |
| Sitemap | Đọc tất cả trang dữ liệu thay giới hạn 500; nguồn lỗi trả 503 thay XML thiếu; loại URL redirect/canonical khác; canonical bài nhất quán với schema | Test 1.107 bài; mô phỏng host chính với dữ liệu thật có 30 URL duy nhất, 30/30 trả 200 và canonical khớp |
| Head khi điều hướng | Server/client cùng quản lý meta/link/JSON-LD, không giữ schema trang trước hoặc chèn trùng; page_view chạy sau metadata đã sẵn sàng | DOM sản phẩm: 1 canonical, BreadcrumbList + Product; bài: BreadcrumbList + BlogPosting |
| Giá/tồn kho | Chung cách tính giá khuyến mại; client không ghi đè giá khi tải ưu đãi lỗi; không mặc định còn hàng khi nguồn tồn kho lỗi | Test promotion/stock; khi không rõ tồn kho, schema bỏ availability và UI yêu cầu xác nhận |
| Cache/index | Cache công khai dùng TTL 60 giây, không SWR; lỗi 503 no-store. Thêm công tắc `VITE_SEO_INDEX_ENABLED`, mặc định tắt; robots cho bot đọc noindex | Test host, robots, header; localhost/preview vẫn noindex. Chưa đo thời gian CDN thật |
| GA4 | Mảng `items`, value/currency/shipping đúng cấu trúc; thêm/xóa/đổi số lượng giỏ ở một nơi; giảm lặp page_view/view/purchase; chặn admin/local/preview; lọc query và trường liên hệ khỏi payload do ứng dụng gửi | Test payload, route, StrictMode, retry, bộ nhớ trình duyệt; chưa xác nhận Google nhận dữ liệu |
| Build | Thêm `seo-build-check.mjs`: kiểm shell, API, rewrite và GA4 trong JS khi có ID; chạy cùng `npm run build` | Build hiện tại đạt và báo `GA4 included`, `Index requested: off (noindex)` |

**Bằng chứng local:** `npm test` **74/74**; `npm run build` đạt; `node scripts/seo-check.mjs http://127.0.0.1:5199` **28/28**; [mô phỏng 30 URL sau sửa](D:/CloneGithub/Website3DTayBac/test-results/seo-local-after-fixes-2026-09-29.json). Sitemap trên localhost rỗng theo chính sách host; 30 URL là kiểm handler local với host production mô phỏng và nguồn public Supabase. Không dùng các số này để kết luận bản live đã tốt.

**Giới hạn đóng gói:** đã thử `vercel build` local nhưng chưa hoàn thành: lượt đầu `npm ci` bị khóa `esbuild.exe` bởi dev server đang có; lượt thử tiếp CLI báo `spawn cmd.exe ENOENT`. Đã khôi phục dependencies và xác nhận test/build dự án chạy được. Chưa xác minh gói Function do Vercel tạo hoặc Function đang chạy trên domain. Build còn cảnh báo chunk 3D lớn; chưa có đo Lighthouse/Core Web Vitals sau phát hành.

#### Bạn làm tiếp: cấu hình và deploy

1. **Đưa đủ mã nguồn mới vào bản phát hành.** Nếu deploy qua Git, kiểm `git status` và commit cả các file mới cần thiết, nhất là `api/render.ts`, `api/seo.ts`, `server/seo`, `src/seo`, analytics, scripts, tests và cấu hình build. Các file này đang có phần chưa được Git theo dõi; chỉ Redeploy commit cũ sẽ không lấy thay đổi local. Không đưa `.env`, `.vercel` hoặc `test-results` vào Git.
2. **Vercel → đúng project → Settings → Environment Variables → Production:** giữ Supabase public config và Measurement ID đã thiết lập; bổ sung/chốt bảng dưới. Sau khi đổi biến phải tạo deployment mới để cả JS build và Function dùng cùng cấu hình.

   | Biến | Giá trị/cách chọn |
   | --- | --- |
   | `VITE_SITE_URL` | `https://asintaybac.com` |
   | `SITE_URL` | `https://asintaybac.com` |
   | `VITE_GA4_ID` | Giữ Measurement ID `G-...` của web stream bạn đã tạo |
   | `VITE_SEO_INDEX_ENABLED` | **`false` khi còn nội dung mẫu/chưa duyệt; `true` khi sẵn sàng cho Google index. Thiếu biến cũng là tắt.** |
   | `ASIN_SEO_INDEX_HOSTS` | Để trống nếu chỉ dùng miền chính |

   GA4 trên miền chính **vẫn được phép chạy khi index đang tắt**. Localhost và host `.vercel.app` không gửi sự kiện từ module tracking. Trong bản build local hiện tại, index đang tắt; lượt sửa không thay giá trị trong `.env` thật của bạn.
3. **Deploy toàn dự án bằng Vercel**, giữ `npm ci`, `npm run build` và cấu hình Functions/rewrites trong `vercel.json`; không chỉ tải thư mục `dist` lên static hosting. Kiểm đúng branch/root directory. Sau deploy phải thấy Function `api/render` và `api/seo`. Schema SEO mới đã đọc được ở audit; lượt sửa này không tạo migration mới, không chạy lại SQL một cách máy móc. Vẫn phải UAT CMS/RLS.
4. **Kiểm ngay sau deploy:** chạy lệnh dưới khi còn giữ noindex; mở sản phẩm/bài thật, URL không tồn tại, robots/sitemap; kiểm www và alias cũ chuyển về apex. Xem log Function nếu có 503.

   ```bash
   node scripts/seo-check.mjs https://asintaybac.com --noindex
   ```

   Khi đã duyệt nội dung, đặt `VITE_SEO_INDEX_ENABLED=true`, deploy lại rồi chạy **không có `--noindex`**. Lượt kiểm production có thêm điều kiện sitemap không rỗng. Xác nhận robots/meta/header cho phép index trước khi gửi sitemap vào Search Console.
5. **GA4:** vào web stream → Enhanced measurement → Page views → phần nâng cao, tắt cơ chế page_view theo thay đổi browser history vì ứng dụng đã gửi thủ công; không gắn thêm cùng ID qua GTM. Kiểm Realtime/DebugView trên miền chính: mỗi lần chuyển trang một page_view, đúng title; view_item/add_to_cart/begin_checkout có items; lead và purchase chỉ sau backend thành công. `send_page_view: false` trong code đã tắt lượt tự gửi lúc config. Tham khảo [Google: page views](https://developers.google.com/analytics/devguides/collection/ga4/views) và [ecommerce](https://developers.google.com/analytics/devguides/collection/ga4/ecommerce).

#### Những việc vẫn cần làm sau lượt sửa

- **Bạn/MKT:** thay hoặc ẩn 4 bài mẫu/review minh họa, duyệt thông tin sản phẩm/chính sách; xác minh GSC, lịch nội dung, người nhận lead và quy trình đối soát đơn. Code không thể xác nhận tính thật của nội dung thay bạn.
- **Dev + vận hành:** nghiệm thu production, CMS theo vai trò, đăng/hẹn giờ/ẩn/khôi phục/đổi slug, đơn/lead, rich results/social preview và mobile/Lighthouse. Chưa đăng nhập GSC/GA4/CMS hoặc tạo đơn thật trong lượt sửa.
- **Đo doanh thu:** purchase là đơn COD đã được backend ghi nhận, chưa phải doanh thu đã thu tiền. Chỉ gửi items khi tổng giỏ + phí khớp tổng DB; nếu lệch do giá/phí thay đổi thì bỏ sự kiện và log cảnh báo để không báo sai doanh thu. Chống lặp bằng mã đơn + bộ nhớ trình duyệt không bảo đảm Google nhận đúng một lần khi mạng lỗi, nhiều thiết bị hoặc storage bị xóa. Cần receipt phía server/Measurement Protocol nếu muốn đối soát đầy đủ; refund vẫn là phần chưa triển khai.
- **Phạm vi kế hoạch còn lại:** preview CMS toàn trang, alt ảnh bìa riêng, `srcset/sizes`, chính sách và báo cáo vận hành theo B07/B10/B12/B14 chưa được hoàn thành chỉ bằng lượt sửa này. Sitemap hiện được bảo vệ ở giới hạn 50.000 URL; cần tách sitemap index trước khi vượt ngưỡng, hiện mới có 30 URL.

## A. Những việc bạn/chủ dự án cần làm

Bạn có thể giao MKT hoặc Dev thao tác, nhưng quyền sở hữu tài khoản, thông tin kinh doanh và các quyết định bên dưới cần thuộc về bạn/doanh nghiệp.

### A01 — Mua và quản lý tên miền · P0

- [x] Đã mua **asintaybac.com** tại **Nhân Hòa** — chủ dự án xác nhận ngày 29/09/2026. Quyền quản lý/khôi phục, gia hạn và người dự phòng bên dưới vẫn cần kiểm.
- Đăng ký bằng thông tin và email bạn kiểm soát; bật bảo vệ tài khoản, thông tin khôi phục, nhắc gia hạn/tự gia hạn phù hợp. Chốt người dự phòng quản lý miền.
- **Bàn giao:** tên miền đã sở hữu, đơn vị quản lý DNS và quyền thao tác cần thiết. Không gửi mật khẩu/token vào repo hoặc tài liệu công khai.
- **Xong khi:** bạn đăng nhập được, quản lý được DNS và biết ngày hết hạn. Không cần mua thêm nhiều tên miền để bắt đầu SEO.

### A02 — Nắm quyền sở hữu các tài khoản dự án · P0

- [ ] Kiểm tra chủ sở hữu Vercel, Supabase, kho mã nguồn và tài khoản Google dùng cho GSC/GA4; mời Dev/MKT bằng tài khoản riêng theo vai trò.
- Chốt người nhận cảnh báo lỗi, gia hạn, thanh toán dịch vụ và người dự phòng. Chỉ nâng gói hạ tầng khi tính năng/dung lượng thực tế yêu cầu; chưa có dự toán chi phí được xác minh trong tài liệu này.
- **Xong khi:** có danh sách dịch vụ, chủ tài khoản, người được cấp quyền, nơi quản lý thanh toán và quy trình thu hồi quyền.

### A03 — Chốt miền chính và phối hợp kết nối DNS · P0

- [ ] Chọn một địa chỉ chính; đề xuất **https://asintaybac.com**, với `www` chuyển về cùng bản này. Chỉ đưa vào sử dụng sau khi đã sở hữu và kết nối thành công.
- **Tiến độ 29/09, 15:42:** apex/www đã mở HTTPS trên Vercel, HTTP apex chuyển 308 về HTTPS. Chưa đánh dấu hoàn tất vì www chưa chuyển về apex.
- Dev thêm miền vào đúng Vercel project và cung cấp bản ghi cần tạo; bạn thêm DNS hoặc cấp quyền phù hợp. Dùng giá trị thực từ dashboard, không sao chép IP/CNAME mẫu trong tài liệu cũ.
- Dev kiểm HTTPS và redirect theo B18. Bản Vercel thử nghiệm cần chính sách riêng theo B15.
- **Xong khi:** miền chính mở đúng website qua HTTPS, các biến thể về cùng đích, bạn vẫn giữ quyền quản lý. [Hướng dẫn Vercel](https://vercel.com/docs/domains/working-with-domains/add-a-domain).

### A04 — Tạo Google Search Console · P0 khi ra mắt

- [ ] Sau khi có quyền DNS, tạo Domain property cho miền đã mua bằng tài khoản Google thuộc quyền quản lý của bạn; xác minh theo bản ghi DNS Google cung cấp.
- Mời SEO/Dev với quyền phù hợp; Dev hỗ trợ DNS và kiểm sitemap. Chỉ gửi sitemap chính thức sau khi kiểm nội dung và khả năng index ở phần D.
- **Xong khi:** property được xác minh, quyền truy cập đúng; có người phụ trách theo dõi Page indexing, Performance và URL Inspection. Xác minh quyền sở hữu không đồng nghĩa Google đã index các trang. [Google: thêm property](https://support.google.com/webmasters/answer/34592?hl=en).

### A05 — Tạo GA4 và chốt cách tính chuyển đổi · P1

- [ ] Tạo GA4 property/web data stream cho website chính thức; chọn múi giờ Việt Nam, tiền tệ VND và cấp quyền cho người triển khai.
- **Tiến độ 29/09, 15:42:** bạn đã kết nối và khai báo Measurement ID ở local/Vercel; không cần tạo lại. Cần kiểm cấu hình property và dữ liệu thực tế sau khi code GA4 được phát hành đúng lên website.
- Bàn giao Measurement ID dạng `G-...`; chốt dùng tag trực tiếp hay GTM cùng Dev. GTM là lựa chọn triển khai, không phải tài khoản bắt buộc phải tạo thêm.
- Chốt các kết quả cần đo: xem sản phẩm, tạo hộp quà, liên hệ hợp lệ, đặt đơn, giao/thu tiền, hủy/hoàn. Click Zalo chỉ là click kênh liên hệ, chưa phải cuộc hội thoại hoặc đơn hàng.
- **Xong khi:** tài khoản sẵn sàng và định nghĩa chuyển đổi được thống nhất; Dev còn phải gắn và kiểm sự kiện theo B13. [Google: thiết lập GA4](https://support.google.com/analytics/answer/14183469?hl=en).

### A06 — Cung cấp thông tin thương hiệu và bằng chứng thật · P1, trước mở index nội dung

- [ ] Chốt tên thương hiệu, đơn vị vận hành, logo, câu chuyện thương hiệu, địa chỉ/vùng phục vụ, hotline, Zalo, email, giờ hỗ trợ và các kênh chính thức.
- Cung cấp tư liệu nguồn hàng, vùng nguyên liệu, người sản xuất, ảnh có quyền sử dụng; xác minh các tuyên bố như “200+ hộ”, “100% truy xuất”. Thay hoặc ẩn review minh họa trước khi dùng làm bằng chứng thương mại.
- Thống nhất các thông tin này trên website, cấu hình liên hệ/chatbox và hồ sơ kênh bán hàng. Không trình bày ảnh minh họa như tư liệu thực địa hoặc khách hàng thật.
- **Xong khi:** có bộ thông tin được duyệt, người chịu trách nhiệm xác minh và tài liệu/ảnh nguồn để MKT dùng.

### A07 — Chuẩn hóa thông tin sản phẩm và chính sách bán hàng · P1

- [ ] Chuẩn bị dữ liệu từng sản phẩm: tên, SKU/slug hiện có, giá/ưu đãi, quy cách, tình trạng bán, xuất xứ đã xác minh, ảnh, cách dùng và bảo quản phù hợp hàng thực tế.
- Chốt phạm vi giao hàng, phí/thời gian dự kiến, thanh toán/COD, đổi trả, xử lý khiếu nại, bảo mật và việc sử dụng thông tin liên hệ; xác định dịch vụ quà doanh nghiệp/cá nhân hóa có thực sự cung cấp hay không.
- Đối chiếu mô tả, giá và lời hứa giao hàng với người vận hành; không để người viết tự suy diễn công dụng hoặc khả năng cung ứng.
- **Xong khi:** có dữ liệu được duyệt cho toàn bộ sản phẩm dự định index và nội dung chính sách có thể đưa lên website.

### A08 — Chọn mục tiêu kinh doanh, người phụ trách và nguồn lực · P1

- [ ] Chọn nhóm khách, khu vực phục vụ, nhóm hàng/quà ưu tiên theo khả năng bán và lợi nhuận; xác định SEO cần tạo đơn trực tiếp hay nhu cầu tư vấn.
- Giao rõ người viết, duyệt nội dung, cập nhật hàng hóa, chăm sóc lead, xem báo cáo và xử lý lỗi kỹ thuật. Một người có thể kiêm nhiều vai nhưng cần có lịch làm việc.
- Chốt ngân sách cho domain/hạ tầng, sản xuất nội dung/ảnh và công cụ nếu cần; không đặt cam kết top 1, traffic hoặc doanh thu khi chưa có baseline.
- **Xong khi:** có danh sách ưu tiên, người chịu trách nhiệm, thời gian phản hồi lead và lịch đánh giá kết quả.

### A09 — Nghiên cứu từ khóa và lập bản đồ nội dung · P1

- [ ] Giao SEO/MKT kiểm nhu cầu và SERP thực tế; nhóm theo ý định tìm hiểu, so sánh, mua hàng, chọn quà. Ghi nguồn/ngày của số liệu; không tự đặt volume/độ khó.
- Mỗi cụm cần một URL đích chính và các bài hỗ trợ; phân biệt trang bán hàng với bài kiến thức để tránh nhiều bài cùng cạnh tranh một nhu cầu.
- **Đầu ra:** bảng `cụm nhu cầu → ý định → URL đích → sản phẩm liên quan → CTA → người viết/duyệt → ngày đăng/xem lại`.
- Có thể bắt đầu nghiên cứu các cụm trà Shan Tuyết, mật ong, sản vật gác bếp, mắc khén, quà theo ngân sách và quà doanh nghiệp; đây là gợi ý nghiên cứu, chưa phải từ khóa đã được chứng minh hiệu quả.

### A10 — Chuẩn bị nội dung thật cho đợt ra mắt · P1

- [ ] Hoàn thiện trang chủ/thương hiệu, danh mục và sản phẩm ưu tiên, trang quà, liên hệ, chính sách và các bài hỗ trợ theo A09.
- Thay bài còn ghi “câu chuyện minh họa” bằng nội dung có giá trị thực; mỗi bài có người chịu trách nhiệm, nguồn/ảnh phù hợp, câu trả lời rõ, link nội bộ và CTA tới đúng sản phẩm/quà.
- Chuẩn bị brief gồm đối tượng, nhu cầu, điểm khác biệt, bằng chứng, dàn ý, ảnh, link, CTA, lịch đăng và ngày kiểm tra lại. Không ép số từ hoặc số H2 cho mọi bài.
- **Xong khi:** mọi trang đưa vào sitemap đợt đầu đã được duyệt. Những chủ đề chưa đủ dữ liệu để ở nháp, không đăng hàng loạt bài trống để đủ số lượng.

### A11 — Chuẩn bị kênh phân phối và chăm sóc khách · P1/P2 theo kênh sử dụng

- [ ] Chốt ai quản lý Zalo, điện thoại, form liên hệ và các kênh xã hội; cập nhật URL miền chính và thông tin liên hệ nhất quán.
- Nếu gửi newsletter: chọn đơn vị gửi, địa chỉ người gửi, người vận hành chiến dịch; phối hợp xác thực miền email theo hướng dẫn nhà cung cấp. Hoàn thiện consent, hủy đăng ký và danh sách ngừng gửi trước chiến dịch đầu tiên.
- Chốt cách ghi nhận nhu cầu từ chatbox/Zalo, giao cho người chăm sóc và đánh giá lead có chất lượng. Không đồng nhất lượt bấm với khách đã trao đổi.
- **Xong khi:** có người tiếp nhận, thời gian xử lý, cách phân phối bài có UTM và cách dừng gửi cho người đã hủy. Email theo miền và newsletter không phải điều kiện bắt buộc để website được index.

### A12 — Bàn giao đầu vào và duyệt ra mắt · P0/P1

- [ ] Điền bảng dưới, bàn giao quyền qua lời mời tài khoản; duyệt nội dung thật và cùng Dev/QA kiểm cổng ra mắt ở phần D.

| Đầu vào cần bàn giao | Giá trị/trạng thái hiện tại |
| --- | --- |
| Miền đã mua | asintaybac.com tại Nhân Hòa, chủ dự án xác nhận 29/09/2026 |
| Miền chính được chọn | Đề xuất https://asintaybac.com; chưa kết nối Vercel/DNS |
| Nhà quản lý DNS, chủ tài khoản, người dự phòng | Nhân Hòa/ZoneDNS; chủ tài khoản và người dự phòng cần kiểm |
| Vercel project/team; Supabase project; repo triển khai | Dev kiểm đúng dự án đang dùng, bạn xác nhận quyền sở hữu |
| Google account quản lý / GSC property | Chưa xác minh |
| GA4 property / stream / Measurement ID | Chưa xác minh |
| Logo, thông tin đơn vị, liên hệ/Zalo, kênh chính thức | Cần bộ dữ liệu đã duyệt |
| Catalog, chính sách, tư liệu nguồn hàng/ảnh | Cần phiên bản đã duyệt |
| Nhóm hàng ưu tiên, mục tiêu, cách tính lead/đơn/doanh thu | Chưa chốt trong phạm vi tài liệu này |
| Người viết / duyệt / chăm sóc lead / Dev trực | Chưa phân công |

## B. Những việc cần sửa code website và cấu hình dự án

### B.I. Sửa code và chức năng website

Các tên trường/route mới dưới đây là thiết kế đề xuất; Dev cần kiểm hợp đồng dữ liệu hiện có trước khi migration. Giữ nguyên dữ liệu, quyền và đường dẫn đang sử dụng nếu không có cơ chế chuyển đổi.

#### B01 — Render HTML theo từng URL · P0

- [ ] Chọn và triển khai SSR có cache/revalidation, hoặc prerender/SSG có cập nhật tự động cho trang chủ, bài, sản phẩm, danh mục, quà và trang thông tin cần SEO.
- HTML trả về phải có nội dung chính, title, description, canonical và link nội bộ mà không cần bấm nút/chạy thao tác người dùng. Người dùng và bot nhận cùng nội dung công khai; không dựa vào nhận diện bot để phục vụ nội dung khác.
- Giữ tương tác React của chọn quà, 3D, giỏ và admin; chưa cần quyết định viết lại toàn bộ hệ thống hay thay Supabase. Prerender chỉ đạt nếu xử lý được đăng/ẩn/hẹn giờ và lỗi cập nhật.
- **Nghiệm thu:** fetch HTML trực tiếp thấy nội dung riêng từng URL; nội dung mới/cũ đúng theo B17. Liên quan: `src/main.tsx`, `src/App.tsx`, `src/Journal.tsx`, `index.html`, `vercel.json`. [Google: JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics).

#### B02 — Bộ SEO dùng chung cho toàn website · P0

- [ ] Tạo resolver theo route cho title, meta description, canonical, robots, Open Graph, Twitter Card và JSON-LD; thống nhất giữa HTML ban đầu và điều hướng client.
- Canonical sinh từ origin tin cậy và đúng route, không mặc định về trang chủ khi thiếu tham số. Social image/URL dùng địa chỉ tuyệt đối, truy cập công khai.
- Organization/WebSite dùng thông tin A06; Article/BlogPosting và Breadcrumb theo bài; Product/Offer theo sản phẩm. Không tạo AggregateRating từ review minh họa, không bịa ngày/tác giả/giá. Serialize JSON-LD an toàn khi đưa vào HTML.
- **Nghiệm thu:** chuyển bài → danh mục → 404 → trang hợp lệ → admin → storefront không sót thẻ, schema hoặc noindex của trang trước. Schema khớp nội dung hiển thị; preview chia sẻ đúng từng URL. [Google: structured data](https://developers.google.com/search/docs/appearance/structured-data/sd-policies), [Open Graph](https://ogp.me/).

#### B03 — Chuẩn hóa URL và HTTP status · P0

- [ ] Chốt chính sách HTTPS/www, slash, chữ hoa, query tracking, tìm kiếm/lọc/sort và phân trang; triển khai redirect/canonical phù hợp từng trường hợp.
- Trang có nội dung trả 200; slug chuyển có đích tương đương dùng 301/308; không tồn tại/gỡ vĩnh viễn dùng 404/410 theo chính sách. Lỗi nguồn dữ liệu tạm thời dùng 5xx phù hợp hoặc cache hợp lệ, không biến thành 404 giả/200 rỗng.
- Bỏ UTM/fbclid khỏi canonical nhưng giữ attribution; không xóa mù `product`, `page` hoặc tham số có ý nghĩa. Không redirect mọi URL lỗi về home.
- **Nghiệm thu:** ma trận URL phần D đúng cả HTTP và DOM; redirect một bước tới đích cuối, không vòng lặp.

#### B04 — Robots và sitemap hoạt động thật · P0

- [ ] Tạo `/robots.txt` trả văn bản và `/sitemap.xml` trả XML đúng Content-Type, được xử lý trước SPA fallback.
- Sitemap chứa URL canonical được index: trang nội dung, danh mục/sản phẩm, bài đã đến hạn đăng. Loại nháp, preview, noindex, URL redirect/404; `lastmod` theo thay đổi nội dung thật.
- Tự cập nhật theo B17; không chỉ sinh sitemap lúc Dev deploy. Robots kiểm soát crawl; noindex kiểm soát index; auth/RLS bảo vệ nội dung riêng tư. Không Disallow rồi kỳ vọng bot đọc noindex trong trang bị chặn.
- **Nghiệm thu:** parse XML được, tất cả URL đúng miền/trạng thái, đăng/ẩn/hẹn giờ cập nhật đúng thời gian cam kết. Google không dùng `priority`/`changefreq` của sitemap để thay cho các yêu cầu này. [Sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [Noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing).

#### B05 — Trang SEO sản phẩm, danh mục và quà · P1

- [ ] Bổ sung trang sản phẩm có URL riêng, đề xuất `/san-pham/<slug>`; có mô tả, giá, quy cách, tình trạng bán, ảnh, hướng dẫn/chính sách liên quan và CTA. Danh mục/quà có nội dung riêng phù hợp ý định.
- Card và liên kết trong bài dùng anchor có `href`; có thể giữ xem nhanh bằng modal. Giữ link chatbox `/san-pham?product=<slug>` hoạt động hoặc redirect chính xác sang URL mới; link quà cũng phải tới đúng chức năng.
- Product/Offer dùng giá hiện hành, VND, SKU và availability thật. Hết hàng tạm thời không tự động xóa trang; đề xuất lựa chọn thay thế phù hợp. Không nhân bản landing chỉ đổi tên địa phương/người nhận.
- **Nghiệm thu:** mở trực tiếp/crawl được từng sản phẩm; HTML, schema, giá khuyến mại và dữ liệu bán hàng thống nhất. Liên quan: `src/StorefrontPages.tsx`, `src/App.tsx`, `src/catalog.ts`, `src/supportConversation.ts`. [Google: dữ liệu sản phẩm](https://developers.google.com/search/docs/appearance/structured-data/product).

#### B06 — API bài viết và phân trang có thể crawl · P1

- [ ] Lấy chi tiết trực tiếp theo slug; danh sách chỉ lấy trường cần thiết, phân trang ở nguồn dữ liệu. Không tìm bài chi tiết trong feed đã bị cắt theo giới hạn API.
- Trang tiếp theo có URL ổn định và anchor; nút “Xem thêm” có thể giữ để cải thiện UX. Không canonical mọi trang phân trang về trang 1 nếu nội dung khác nhau.
- **Nghiệm thu:** dữ liệu QA lớn hơn một trang và giới hạn hàng API vẫn tìm được toàn bộ bài công khai; loading/lỗi/empty được phân biệt. Liên quan: `src/services/storeApi.ts`, `src/hooks/usePublishedArticles.ts`, `src/Journal.tsx`.
- Hiện audit thấy 4 bài đều có link; đây là sửa thiết kế để mở rộng, không phải khẳng định đã mất bài. [Google: pagination](https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading).

#### B07 — Trường SEO và quan hệ nội dung trong CMS · P1

- [ ] Thêm SEO title, meta description, social image/title/description override, alt ảnh, tác giả/byline, chuyên mục có slug và nguồn dẫn phù hợp; fallback từ title/excerpt khi chưa nhập SEO riêng.
- Chọn sản phẩm/bài liên quan bằng picker từ dữ liệu thật, hiển thị nhãn dễ hiểu; không bắt biên tập viên nhớ ID/URL. Cảnh báo liên kết tới nội dung đã gỡ.
- Canonical mặc định do hệ thống sinh; ngoại lệ chỉ cho người có trách nhiệm SEO quản lý. Preview SERP ghi rõ mô phỏng, không cam kết Google hiển thị đúng nguyên văn.
- **Nghiệm thu:** lưu–mở lại–public HTML/schema dùng đúng dữ liệu; nội dung cũ vẫn đọc được. Liên quan: `src/admin/ContentSection.tsx`, `src/services/adminApi.ts`, `src/services/storeApi.ts`, migration `articles`.

#### B08 — Editor có cấu trúc và trình bày bài viết · P1

- [ ] Hỗ trợ H2/H3, đoạn văn, danh sách, nhấn mạnh, trích dẫn, link, ảnh/alt/caption; một H1 chính theo tiêu đề trang. Render bằng schema/parser được kiểm soát, không nối HTML tùy ý từ textarea.
- Kiểm URL/link và nội dung nhúng, xử lý an toàn HTML; migration giữ được bài cũ dạng mảng đoạn văn. Có bài liên quan, sản phẩm liên quan và CTA đúng nội dung.
- Validator tách lỗi chặn xuất bản với khuyến nghị: thiếu nội dung/slug trùng khác với title hơi dài hoặc ít H2; không ép lặp từ khóa để đạt điểm.
- **Nghiệm thu:** cùng nội dung được hiển thị nhất quán ở editor, preview, HTML server và client; link/ảnh an toàn, heading rõ trên mobile.

#### B09 — Ngày xuất bản, cập nhật và lịch đăng · P1

- [ ] Tách ngày xuất bản đầu tiên, lịch dự kiến và ngày sửa nội dung, ví dụ `first_published_at`, `scheduled_at`, `content_modified_at`; giữ timestamp ISO từ API và render `<time datetime>` đúng.
- Sửa hành vi đặt `published_at=null` khi ẩn bài, khiến đăng lại có thể mất ngày gốc. Không lấy thời gian render/migration làm ngày xuất bản; không cập nhật ngày sửa chỉ vì thay một cờ nội bộ không đổi nội dung.
- Lưu trữ thời gian nhất quán, hiển thị/lên lịch theo `Asia/Ho_Chi_Minh`; công khai chỉ khi đúng trạng thái và đến hạn. HTML, schema và sitemap dùng cùng dữ liệu ngày.
- **Nghiệm thu:** đăng → sửa → ẩn → đăng lại giữ ngày đầu; bài hẹn giờ không lộ trước hạn và tự xuất hiện theo B17. Liên quan: `src/services/adminApi.ts`, `src/services/storeApi.ts`, `src/Journal.tsx`.

#### B10 — Preview nháp, duyệt bài và lịch sử phiên bản · P1

- [ ] Preview nháp/lên lịch bằng renderer thật, có kiểm quyền, noindex và cache riêng tư; nút mắt không chỉ mở URL public vốn chưa đọc được bản nháp.
- Có lưu nháp, cảnh báo chưa lưu, xử lý ghi đè khi hai người sửa, revision lưu nội dung/người sửa/thời điểm và chức năng khôi phục. Audit sự kiện UPDATE hiện có chưa thay cho revision.
- Chốt soạn → duyệt → đăng/hẹn giờ → cập nhật → lưu trữ. Đội nhỏ có thể duyệt bằng SOP có ghi nhận; nếu yêu cầu ngăn người soạn tự đăng thì phải chặn ở API/DB.
- **Nghiệm thu:** người có quyền preview/khôi phục được; ẩn danh không đọc được nháp qua API, HTML, sitemap hoặc cache. Liên quan: `src/admin/ContentSection.tsx`, `src/services/adminApi.ts`, RLS/migrations.

#### B11 — Đổi slug, gỡ bài và quản lý liên kết cũ · P0 khi đổi URL, P1 cho CMS

- [ ] Lưu lịch sử URL và redirect khi đổi slug; kiểm trùng/vòng lặp, gộp chuỗi redirect về đích cuối, cập nhật link nội bộ và sitemap.
- Gỡ nội dung theo chính sách: redirect khi có nội dung thay thế tương đương; nếu không thì 404/410. Có cảnh báo tác động, lưu trữ/khôi phục thay cho chỉ hard-delete mặc định.
- **Nghiệm thu:** slug cũ tới đúng bài mới một bước; URL gỡ không còn sitemap; revision khôi phục được và không làm mất ngày gốc. Áp dụng cả URL sản phẩm/landing được đổi, không chỉ tin tức.

#### B12 — Pipeline ảnh và ảnh chia sẻ · P1

- [ ] Kiểm kích thước/chất lượng đầu vào, tạo ảnh theo kích thước hiển thị và rendition cho bìa/social; dùng `srcset/sizes`, tỷ lệ width/height đúng và cache phù hợp.
- Có alt/caption khi cần, crop preview, kiểm link ảnh công khai; ảnh LCP ưu tiên tải, ảnh ngoài màn hình lazy-load. Không coi khai báo width=1280 là đã có ảnh nguồn 1280px.
- **Nghiệm thu:** ảnh đẹp trên mobile/desktop, không gây nhảy layout; chia sẻ Facebook/Zalo đúng bìa/title và kiểm lại sau đổi ảnh. Liên quan: `src/services/uploadApi.ts`, editor, bài và card sản phẩm. Giới hạn upload 10MB hiện tại chưa phải cơ chế tối ưu ảnh.

#### B13 — Gắn analytics và chuyển đổi đúng thời điểm · P1

- [ ] Triển khai GA4 theo A05 và tracking plan phần E; chọn một cơ chế gửi `page_view` cho SPA để tránh cộng đôi manual/history tracking. Tách traffic nội bộ và môi trường thử theo cấu hình được kiểm tra.
- Gửi success event sau khi backend chấp nhận thao tác, không chỉ khi bấm nút. Dùng item/transaction ID ổn định; không gửi tên, email, số điện thoại hoặc nội dung chat vào analytics.
- Với đơn COD, thống nhất mốc `purchase` và đối soát đơn giao/tiền thu riêng; refresh/retry không đếm lại. Cơ chế chống trùng cần nằm trong thiết kế, không chỉ dựa vào màn hình cảm ơn.
- **Nghiệm thu:** DebugView và đơn/lead QA đối chiếu đúng, đủ tình huống lỗi/hủy/hoàn trong phạm vi hệ thống. [GA4 cho SPA](https://developers.google.com/analytics/devguides/collection/ga4/single-page-applications), [GA4 ecommerce](https://developers.google.com/analytics/devguides/collection/ga4/ecommerce).

#### B14 — Báo cáo MKT và luồng chăm sóc lead/newsletter · P1, chiến dịch theo nhu cầu

- [ ] Có báo cáo organic landing → bài → sản phẩm/quà → lead/đơn, kết hợp dữ liệu GSC/GA4 và tổng hợp từ hệ thống bán hàng; có thể bắt đầu bằng báo cáo thủ công được đối soát.
- Cấu hình liên hệ/chatbox trỏ đúng kênh và sản phẩm; ghi nhận lead thành công, giao người chăm sóc và trạng thái xử lý. Theo dõi click Zalo/điện thoại riêng.
- Newsletter hiện lưu liên hệ chưa đủ để gửi chiến dịch: nếu dùng, bổ sung nguồn/thời điểm consent, hủy nhận tin, suppression và đồng bộ trạng thái với bên gửi trước chiến dịch đầu tiên.
- **Nghiệm thu:** lead có người xử lý; báo cáo rõ định nghĩa; marketing xem số tổng hợp theo quyền, không cần được đọc toàn bộ dữ liệu cá nhân. Liên quan: `src/Newsletter.tsx`, `src/Contact.tsx`, `src/support.ts`, phần quản trị và API báo cáo.

### B.II. Cấu hình dự án, dữ liệu và triển khai

#### B15 — Tách local, preview và production · P0

- [ ] Có cấu hình origin tin cậy dùng chung cho canonical, OG, sitemap và URL chia sẻ; cấu hình môi trường cho quyền index, analytics và cache. Không tin trực tiếp Host header để sinh URL canonical.
- Local/preview không được dùng như bản chính để index. Bản demo Vercel hiện tại cần noindex/protection phù hợp; khi miền chính hoạt động, alias công khai tương ứng chuyển về miền chính hoặc có chính sách được kiểm chứng riêng.
- Không gắn noindex cho mọi deployment mang cùng nhãn môi trường: alias Vercel và miền chính có thể phục vụ cùng một deployment. Kiểm theo host được phép và response thực tế; Google phải đọc được noindex nếu dùng cơ chế này.
- **Nghiệm thu:** thử từng host bằng HTTP/DOM; không rò canonical localhost/preview lên live, không noindex nhầm miền chính. Chưa có bằng chứng bản Vercel đã index; chỉ xử lý xóa kết quả nếu sau này kiểm thấy cần.

#### B16 — Migration, quyền dữ liệu và cấu hình bí mật · P0 cho bảo vệ dữ liệu, P1 cho CMS

- [ ] Thiết kế migration cho các trường SEO/ngày/tác giả/revision/redirect; sao lưu trước thay đổi, chạy thử và đối chiếu dữ liệu bài cũ. Không tự đặt lại ngày xuất bản hoặc đổi slug hàng loạt.
- Kiểm đúng Supabase project; áp dụng migration theo quy trình và thử admin, marketing, người ẩn danh. Query phía server chỉ được trả nội dung public hợp lệ; không lấy nháp bằng quyền cao rồi trông chờ frontend che lại.
- Tách ID cấu hình công khai với secret phía server; không đưa service-role key, secret build hook, khóa gửi mail/analytics server vào frontend, Git hoặc log. Endpoint revalidation có xác thực và phạm vi quyền rõ.
- **Nghiệm thu:** dữ liệu cũ được giữ, quyền đúng, có cách rollback; xác nhận trên môi trường triển khai thực. File SQL và build thành công không chứng minh remote migration/RLS đã hoạt động.

#### B17 — Đồng bộ CMS, HTML, cache và sitemap · P0

- [ ] Khi đăng/sửa/ẩn/đổi slug/gỡ bài hoặc thay đổi sản phẩm, cập nhật các bản HTML/cache liên quan và sitemap. Xác định cả trang danh sách, liên quan và landing bị ảnh hưởng.
- Bài hẹn giờ cần cơ chế đến hạn tự công khai, không phụ thuộc ai mở admin hoặc Dev deploy. Nếu dùng SSG, nối trigger build/revalidation và lịch chạy; kiểm giới hạn thực tế của hạ tầng trước chọn cách làm.
- Chốt thời gian phản ánh thay đổi; **đề xuất nội bộ không quá 5 phút**, có thể điều chỉnh sau khi chọn kiến trúc. Đây là mục tiêu vận hành của dự án, không phải thời hạn Google crawl/index.
- **Nghiệm thu:** có log, retry và người nhận cảnh báo khi cập nhật lỗi; kiểm trước/sau giờ hẹn, ẩn nội dung và thay đổi giá. Preview/private response không dùng chung cache public.

#### B18 — Kết nối production và các dịch vụ liên quan · P0/P1

- [ ] Sau A01–A03, thêm miền vào đúng Vercel project, tạo DNS theo giá trị dashboard, kiểm TLS, HTTPS, www/non-www, redirect alias và thứ tự routing trước SPA fallback.
- Rà allowlist/CORS, Supabase Auth site URL/redirect URL, đường dẫn email, callback thanh toán/webhook và liên kết chia sẻ **nếu các tích hợp đó có sử dụng**; cập nhật từ miền thử sang miền chính khi cần.
- Không gửi sitemap trên miền chưa hoạt động. Thử URL bài/sản phẩm sâu bằng tab mới, refresh, link cũ và link chatbox; bảo toàn tham số attribution khi redirect.
- **Nghiệm thu:** người dùng đi trọn luồng xem bài → xem sản phẩm/quà → liên hệ/đặt hàng trên miền chính; đăng nhập admin và các callback đang dùng vẫn hoạt động.

#### B19 — Hiệu năng, mobile và khả năng sử dụng · P1

- [ ] Đo riêng home, danh mục, sản phẩm, bài và trang quà trên mobile/desktop; lưu URL, thời điểm và báo cáo Lighthouse/PageSpeed. Sửa theo kết quả đo, không suy từ dung lượng build thành điểm CWV.
- Rà JS/CSS theo route, font trùng/weight không dùng, ảnh LCP và layout shift. Giữ lazy-load 3D đã có; kiểm network thực để tránh tải model nặng ở route không cần.
- Kiểm 320px, 390px, 768px và desktop: chữ, điều hướng bàn phím, form, ảnh, chatbox/CTA không che nội dung và không gây tràn ngang.
- **Nghiệm thu:** không có lỗi nghiêm trọng ở luồng chính; có baseline lab. Mục tiêu field ở p75: LCP ≤2,5 giây, INP ≤200ms, CLS ≤0,1. Website mới chưa đủ field data phải ghi “chưa đủ dữ liệu”, không cần chờ đủ mẫu mới ra mắt và không đánh dấu đã đạt field. [Ngưỡng Core Web Vitals](https://web.dev/articles/defining-core-web-vitals-thresholds).

#### B20 — Kiểm tra phát hành và xử lý sự cố SEO · P0/P1

- [ ] Thêm kiểm tra phù hợp vào CI/quy trình release cho HTTP status, metadata theo route, sitemap/XML, canonical/robots theo host và dữ liệu schema; kiểm vòng đời CMS ở môi trường QA.
- Có kiểm tra sau deploy cho URL đại diện và cảnh báo render/5xx, sitemap lỗi, noindex/canonical sai, lịch đăng/revalidation thất bại. Chọn người trực và cách quay lại bản ổn định.
- Lưu bằng chứng ở phần D, hướng dẫn vận hành CMS/SEO và danh sách cấu hình cần kiểm khi đổi miền hoặc hạ tầng.
- **Nghiệm thu:** phát hiện được lỗi mô phỏng trong QA; người được giao biết cách xử lý và xác minh sau sửa. Viết kế hoạch giám sát chưa có nghĩa hệ thống cảnh báo đã được cài.

### B.III. Bản đồ vị trí code để giao việc

| Nhóm sửa | File/khu vực hiện có | Mã việc chính |
| --- | --- | --- |
| Render, điều hướng, head | `src/main.tsx`, `src/App.tsx`, `index.html`, `vercel.json` | B01–B04, B15, B18 |
| Tin tức và public API | `src/Journal.tsx`, `src/services/storeApi.ts`, `src/hooks/usePublishedArticles.ts` | B01–B02, B06–B09 |
| CMS | `src/admin/ContentSection.tsx`, `src/services/adminApi.ts`, `src/admin/AdminArea.tsx` | B07–B11, B16 |
| Catalog và liên kết chat | `src/StorefrontPages.tsx`, `src/catalog.ts`, `src/services/catalogApi.ts`, `src/supportConversation.ts` | B05, B11, B13 |
| Ảnh và hiệu năng | `src/services/uploadApi.ts`, `src/ProductViewer.tsx`, các component hiển thị ảnh/font | B12, B19 |
| Liên hệ/newsletter | `src/Contact.tsx`, `src/Newsletter.tsx`, `src/support.ts`, `src/SupportWidget.tsx` | B13–B14 |
| DB và phân quyền | `supabase/migrations/`, schema articles/products, RLS và audit hiện có | B07, B09–B11, B16–B17 |
| Hạ tầng mới cần bổ sung | Renderer/cache/sitemap/revalidation, cấu hình triển khai và bộ kiểm SEO theo kiến trúc được chọn | B01, B04, B15–B20 |

## C. Thứ tự làm và điều kiện chuyển bước

Đây là trình tự phụ thuộc, không phải cam kết số ngày. Chốt thời lượng sau khi chọn kiến trúc render và số nội dung cần chuẩn bị.

| Chặng | Bạn/MKT | Dev/QA | Đầu ra để chuyển bước |
| --- | --- | --- | --- |
| 1. Bắt đầu ngay | A01–A02, A06–A09: mua miền, quản lý tài khoản, dữ liệu thật, mục tiêu/nội dung | Chốt B01–B03, mô hình CMS, môi trường và tracking plan | Quyết định URL/render/data và người phụ trách được ghi rõ; local tiếp tục được phát triển dù chưa có miền |
| 2. Làm nền tảng | Chuẩn bị A10, tạo A04–A05 khi có đủ quyền | B01–B04, B15–B17; chuẩn bị migration và bảo vệ nháp | Fetch HTML đúng, robots/sitemap/status đúng, dữ liệu private không lộ |
| 3. Hoàn thiện chức năng vận hành | Duyệt sản phẩm/bài/chính sách; phân công chăm sóc | B05–B14, B19–B20 | MKT có thể soạn–duyệt–đăng–sửa–ẩn; người mua mở đúng sản phẩm và liên hệ; events đúng |
| 4. Gắn miền và kiểm bản phát hành | A03–A05, A12; xác nhận nội dung/đơn vị | B18 và toàn bộ kiểm D01–D15 trên bản dự kiến phát hành | Không còn lỗi P0; các luồng P1 trong phạm vi ra mắt đạt; có rollback và người nhận lỗi |
| 5. Bắt đầu cho phép index | Người phụ trách SEO kiểm Search Console | Mở index đúng host/trang đã duyệt; D16, submit sitemap, kiểm lại response | Miền chính đủ điều kiện crawl/index; ghi nhận URL Inspection và sitemap đọc được |
| 6. Vận hành đều | Thực hiện phần E; cập nhật theo dữ liệu | Theo dõi lỗi/cập nhật hạ tầng và hỗ trợ sửa | Có báo cáo, lịch nội dung và hành động cải thiện theo kết quả |

**Trước khi mở index:** hoàn thành các việc P0, duyệt mọi nội dung dự định công khai và nghiệm thu các luồng sản phẩm/CMS/đo lường thuộc đợt ra mắt. Nếu chưa dùng newsletter, Merchant Center hoặc duyệt nhiều cấp, ghi rõ ngoài phạm vi đợt đầu; không đánh dấu “đã làm”.

Việc Google bắt đầu index, tăng hiển thị và mang lại đơn diễn ra sau đó; không thể dùng một lần bấm “request indexing” để nghiệm thu hiệu quả SEO.

## D. Checklist nghiệm thu trước và ngay khi ra mắt

Người thực hiện lưu URL/môi trường, ngày kiểm, kết quả mong đợi/thực tế, ảnh hoặc log kiểm tra. Test CMS/đơn dùng dữ liệu QA có kiểm soát; không lấy build xanh thay bằng chứng hành vi.

### D.I. Bộ kiểm tra cần có bằng chứng

- [ ] **D01 — Quyền sở hữu và domain:** A01–A05 đủ đầu vào; HTTPS/DNS/redirect đúng; có người dự phòng và tài khoản quản lý GSC/GA4.
- [ ] **D02 — HTML ban đầu:** fetch home, danh mục, sản phẩm, quà, bài và trang thông tin; nội dung chính, title/description, canonical, social metadata và schema đúng ngữ cảnh, không cần JS để tạo chúng.
- [ ] **D03 — HTTP và head khi điều hướng:** 200/301/308/404/410/5xx đúng; bài A → B → danh mục → URL lỗi → trang đúng → admin → storefront không còn thẻ/schema/noindex sai.
- [ ] **D04 — Robots/sitemap/môi trường:** đúng MIME, parse được, đúng miền, không draft/redirect/noindex/404 trong XML; preview không index, bản chính không bị chặn tài nguyên cần render.
- [ ] **D05 — Quyền CMS và preview:** admin/marketing làm đúng phạm vi; phiên ẩn danh không lấy được nháp qua API, HTML, schema, sitemap hoặc cache; preview dùng đúng renderer.
- [ ] **D06 — Lịch đăng và cache:** thử trước/sau giờ hẹn theo múi giờ Việt Nam, không cần deploy tay ngoài quy trình; publish/update/unpublish phản ánh đúng thời gian đã chốt, có log lỗi/retry.
- [ ] **D07 — Ngày và revision:** sửa–ẩn–đăng lại không đổi ngày đầu; ngày sửa phản ánh nội dung; khôi phục phiên bản đúng dữ liệu/người sửa; có xử lý xung đột chỉnh sửa.
- [ ] **D08 — Slug và gỡ nội dung:** A → B redirect một bước, không loop/trùng; gỡ/khôi phục cập nhật sitemap/link; DB lỗi tạm thời không thành 404 giả.
- [ ] **D09 — Phân trang:** dữ liệu QA lớn hơn giới hạn trang/API vẫn được khám phá bằng link; detail theo slug mở trực tiếp được, không phụ thuộc feed.
- [ ] **D10 — Catalog và CTA:** đổi giá/ưu đãi/tồn bán khớp HTML và Product/Offer; bài → đúng sản phẩm/quà; URL query cũ trong chat hoạt động; hàng tạm hết có xử lý phù hợp.
- [ ] **D11 — Schema và chia sẻ:** Rich Results Test/validator phù hợp không có lỗi nghiêm trọng; kiểm facts thực; chia sẻ Facebook/Zalo trên URL có thể truy cập, ảnh/title đúng, thử sau khi cập nhật ảnh.
- [ ] **D12 — Mobile/hiệu năng:** kiểm 320/390/768/desktop, bàn phím/form/chatbox; lưu báo cáo lab theo route, tách rõ field đã có/chưa đủ mẫu.
- [ ] **D13 — Analytics:** DebugView xác nhận page_view/CTA/product/cart/lead/newsletter theo phạm vi; mỗi thao tác chỉ ghi đúng số lần; validation/request lỗi không sinh sự kiện thành công; không có PII.
- [ ] **D14 — Đối soát đơn và lead:** bộ đơn QA gồm refresh/retry/COD/hủy/hoàn theo tính năng hỗ trợ; phân biệt đặt đơn và tiền thu; lead có người nhận, newsletter ngừng gửi được nếu dùng.
- [ ] **D15 — Nội dung và khả năng vận hành:** chủ nội dung duyệt thông tin/ảnh/chính sách; bỏ dữ liệu mẫu khỏi trang index; Dev có rollback/cảnh báo, MKT có lịch bài và cách xử lý lead.
- [ ] **D16 — Kiểm ngay khi mở index:** HTTP miền chính không còn noindex ngoài ý muốn; URL Inspection của các loại trang đại diện đọc được; sitemap gửi thành công và kiểm trạng thái đọc; lập baseline theo dõi index/traffic sau đó.

### D.II. Ma trận URL phải đạt

| Loại URL | Trạng thái mong muốn | Điểm cần lưu ý |
| --- | --- | --- |
| Home, thương hiệu, liên hệ/chính sách có ích | 200, index theo mục đích trang | Nội dung thật, canonical miền chính; liên kết truy cập được |
| Danh mục/chủ đề/quà có nội dung riêng | 200, index | Không chỉ có bộ lọc JS hoặc nội dung nhân bản |
| Sản phẩm | 200 khi trang còn hữu ích | Giá/tình trạng bán/schema thống nhất; không tự 404 vì tạm hết hàng |
| Bài đã đăng và đến hạn | 200, index | HTML có bài, byline/date, social/schema phù hợp |
| Nháp/hẹn giờ trước hạn | Không lộ công khai, public có thể trả 404 | Preview có quyền, noindex và cache riêng tư |
| Slug cũ có đích tương đương | 301/308 | Một bước tới đích cuối trả 200, không mất query attribution cần giữ |
| Không tồn tại/gỡ vĩnh viễn | 404/410 theo chính sách | Không schema bài/sản phẩm giả; UI hướng người dùng tới nội dung hữu ích |
| Lỗi DB/nguồn nội dung tạm thời | 5xx phù hợp hoặc cache hợp lệ theo thiết kế | Không coi nội dung tạm lỗi là đã bị xóa |
| UTM/fbclid | Nội dung đúng, canonical sạch tương ứng | Tracking vẫn hoạt động, không tạo URL index trùng |
| Search/lọc/sort | Theo chính sách, thường không index như landing riêng | Không sinh vô hạn URL rác; không canonical về trang khác nội dung một cách máy móc |
| Phân trang | URL ổn định, canonical theo nội dung từng trang | Anchor trang tiếp theo, không dồn mọi trang về trang 1 |
| Admin/login/preview/cart/checkout nếu có URL | Không index; bảo vệ bằng auth khi cần | Chính sách thể hiện từ response/head ban đầu; noindex không thay bảo mật |
| Robots/sitemap | 200 text/XML đúng tài nguyên | Không SPA fallback; không nháp hoặc miền chưa hoạt động trong sitemap |

## E. Vận hành SEO và MKT sau khi ra mắt

### E.I. Quy trình cho mỗi bài/trang nội dung

1. **Chọn nhu cầu:** đối chiếu A09, chọn URL đích và kiểm đã có bài cùng ý định chưa; ưu tiên cập nhật bài phù hợp thay vì tạo bản trùng.
2. **Lập brief:** đối tượng, câu hỏi cần trả lời, sản phẩm liên quan, nguồn xác minh, ảnh, dàn ý, CTA và người duyệt.
3. **Soạn nội dung thật:** trả lời rõ, heading theo cấu trúc ý, ảnh/alt hợp lý, link tới bài/chủ đề/sản phẩm có liên quan. Thông tin sản phẩm cần được vận hành hàng hóa kiểm tra.
4. **Duyệt và preview:** xem trên mobile, kiểm URL/metadata/crop ảnh, byline/ngày, link và CTA; xử lý cảnh báo trước khi đăng. Không bịa review/nguồn hoặc lặp từ khóa để đủ điểm.
5. **Đăng và kiểm:** kiểm URL public, HTML, sitemap/cache và link từ danh sách; bài mới phải có đường đi từ trang đã tồn tại, không chỉ có trong sitemap.
6. **Phân phối:** chia sẻ qua kênh doanh nghiệp/đối tác phù hợp; dùng UTM thống nhất cho chiến dịch bên ngoài, không gắn UTM vào liên kết nội bộ.
7. **Đo và cập nhật:** xem truy vấn/landing, CTA/lead/đơn và phản hồi thực; đặt ngày xem lại. Khi giá/hàng/chính sách thay đổi, cập nhật cả bài liên quan.

Có thể bắt đầu với **1–2 bài được kiểm chứng mỗi tuần** nếu đủ người và tư liệu, sau đó điều chỉnh theo chất lượng và kết quả. Đây là nhịp làm việc gợi ý, không phải chỉ tiêu Google yêu cầu. Nội dung phải giúp người đọc hiểu và quyết định, không chỉ tăng số URL. [Google: nội dung hữu ích](https://developers.google.com/search/docs/fundamentals/creating-helpful-content).

### E.II. Tracking plan bàn giao Dev

| Sự kiện | Thời điểm ghi nhận | Dữ liệu/điều kiện kiểm |
| --- | --- | --- |
| `page_view` | URL/trang công khai thực sự thay đổi | URL/title/referrer đúng; không nhân đôi auto/manual; không tính mỗi ký tự tìm kiếm thành trang mới |
| `article_view` — custom, nếu cần | Bài tải thành công | article_id/slug/topic; không ghi khi loading, 404, admin preview |
| `article_cta_click` — custom | Bấm CTA trong bài | Bài nguồn, vị trí CTA, loại đích, product_id nếu có |
| `view_item_list`, `select_item`, `view_item` | Xem danh sách/chọn/xem sản phẩm | item_id nhất quán, giá và currency đúng |
| `add_to_cart`, `remove_from_cart`, `begin_checkout` | Thao tác hợp lệ trên giỏ/checkout | items/value/currency; có quy ước cho hộp quà custom, không cộng trùng hộp và món |
| `generate_lead` | Backend nhận yêu cầu liên hệ hợp lệ | Không gửi khi chỉ click submit hoặc request lỗi; không chứa PII |
| `newsletter_signup` — custom, nếu dùng | Đăng ký mới được lưu thành công | Phân biệt gửi lại/đã đăng ký; consent và trạng thái hủy nhận được quản lý |
| `zalo_click`, `phone_click` — custom | Bấm kênh liên hệ | Vị trí/URL nguồn; báo là micro-conversion, không gọi là hội thoại/lead/đơn |
| `purchase` | Mốc đơn được A05 định nghĩa và backend xác nhận | transaction_id ổn định, items/value/currency, cơ chế tránh gửi trùng |
| `refund` | Hoàn tiền được hệ thống xác nhận | transaction_id gốc; đúng toàn phần/một phần khi có hỗ trợ |

Với COD, tách **đơn đặt thành công**, **đơn giao thành công** và **tiền thực thu**. Nếu dùng `purchase` tại mốc đơn được xác nhận, không gọi số đó là tiền đã thu. Hủy đơn chưa thu tiền không tự động đồng nghĩa với một khoản hoàn tiền; đối soát trạng thái nghiệp vụ thay vì suy từ event.

### E.III. Lịch vận hành và KPI

| Nhịp | Người phụ trách | Việc làm / kết quả cần có |
| --- | --- | --- |
| Mỗi lần đăng/sửa | Biên tập + người duyệt | Nội dung đúng, HTML/link/CTA/cache/sitemap cập nhật; ghi ngày xem lại |
| Sau mỗi deploy, thường xuyên khi phát hành | Dev/QA trực | Render/5xx, sitemap, noindex/canonical, lịch đăng/revalidation; sửa hoặc rollback khi lỗi |
| Hằng ngày làm việc | Người chăm sóc | Tiếp nhận lead, phản hồi đúng thời gian đã chốt, ghi chất lượng và kết quả xử lý |
| Hằng tuần | SEO/MKT | GSC clicks/impressions/query/page, index và lý do loại trừ; CTA/lead từ bài; lịch bài mới/cập nhật và phân phối |
| Hằng tháng | Bạn + MKT + vận hành | Organic landing, lead hợp lệ, đơn đặt/giao/thu tiền, hủy/hoàn, doanh thu/lợi nhuận, chi phí nội dung; chọn việc ưu tiên tháng tiếp |
| Khi hàng hóa/chính sách đổi | Vận hành + biên tập | Cập nhật giá, hàng, mô tả, bài liên quan; xử lý link gãy, nội dung trùng ý định hoặc lỗi thời |
| Theo hạn dịch vụ và thay đổi nhân sự | Chủ tài khoản + Dev | Gia hạn miền, quyền truy cập, sao lưu/khôi phục, cảnh báo và người dự phòng |

Báo cáo cần ghi rõ nguồn và định nghĩa: GSC đo hiệu quả tìm kiếm, GA4 đo hành vi ghi nhận được, hệ thống đơn hàng là nơi đối soát trạng thái/tiền thu. Các số có thể khác nhau do phạm vi và cách đo; không mặc định ép khớp tuyệt đối.

Theo dõi nhóm truy vấn thương hiệu/không thương hiệu khi đủ dữ liệu; CTR = clicks/impressions; tỷ lệ chuyển đổi phải ghi mẫu số và loại chuyển đổi. Không dùng riêng traffic, điểm plugin hoặc số bài để kết luận hiệu quả kinh doanh. Website mới chưa có baseline thì thu thập trước khi đặt mục tiêu tăng trưởng cụ thể.

## F. Những việc để sau hoặc chỉ làm khi có nhu cầu

| Hạng mục | Khi nào làm | Điều kiện trước khi triển khai |
| --- | --- | --- |
| Merchant Center/feed sản phẩm | Muốn mở rộng kênh hiển thị sản phẩm và hàng đủ điều kiện | Kiểm chính sách/tài khoản hiện hành; catalog, giá/tồn, shipping/returns khớp website |
| Google Business Profile/Local SEO | Mô hình kinh doanh thực đáp ứng điều kiện hiện hành | Xác minh mô hình, địa điểm/vùng phục vụ; không tạo địa chỉ giả |
| Newsletter tự động, phân nhóm chiến dịch | Có kế hoạch gửi và người vận hành | A11/B14 đạt; nhà cung cấp, xác thực người gửi, consent/hủy nhận và đo lường |
| Quy trình duyệt nhiều cấp trong CMS | Có nhiều người và cần kiểm quyền xuất bản | Chính sách vai trò rõ; thực thi ở API/DB, không chỉ giấu nút |
| Google Discover | Nội dung/hình ảnh đủ chất lượng và phù hợp | Chỉ tối ưu khả năng đáp ứng; không cam kết xuất hiện |
| Google News/news sitemap | Có nhu cầu và loại nội dung phù hợp sau nghiên cứu riêng | Trang tên “Tin tức” không tự trở thành báo; không bắt buộc cho blog cửa hàng |
| Đa ngôn ngữ/hreflang | Có bản dịch/vùng phục vụ thực và nguồn lực duy trì | URL và nội dung bản địa hóa tồn tại; không tạo thẻ cho trang chưa có |
| PR/liên kết đối tác | Có tư liệu/câu chuyện đáng tham khảo | Chọn đối tác liên quan; không mua số lượng backlink/rải bài làm KPI |
| Tối ưu cho tính năng AI | Sau khi nền tảng crawl/nội dung tốt | Không lấy `llms.txt` hoặc “điểm AI SEO” làm điều kiện ra mắt Google Search |

Các mục điều kiện cần kiểm tài liệu nhà cung cấp tại thời điểm triển khai. [Google Discover](https://developers.google.com/search/docs/appearance/google-discover), [Google: tính năng AI và website](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide).

## G. Các quy tắc thay thế ví dụ cũ và cách ghi nhận hoàn thành

### G.I. Không sao chép nguyên các giả định sau từ checklist ban đầu

| Giả định/ví dụ cũ | Quy tắc áp dụng trong kế hoạch này |
| --- | --- |
| Ghi cứng tên miền `.vn` | Dùng origin cấu hình; dự kiến `.com`, chỉ mở bản chính khi miền đã sở hữu/hoạt động |
| Chỉ thêm hook meta client là xong SEO | B01 + B02: HTML theo URL, head thống nhất cả server và client |
| Canonical mặc định chuỗi rỗng hoặc bỏ toàn bộ query | Resolver theo route, giữ ý nghĩa `product`/`page`; không dồn tất cả về home |
| Sitemap động là tùy chọn, chỉ build khi deploy | B04 + B17: phải theo kịp CMS và lịch đăng |
| Robots Disallow đồng nghĩa noindex | Crawl và index là hai cơ chế; auth/RLS mới bảo vệ dữ liệu |
| Thiếu ngày thì lấy hiện tại; ngày sửa bằng ngày đăng | B09: dữ liệu nguồn thật, không bịa và không mất ngày đầu khi ẩn |
| Cleanup head để trống | B02/D03: không sót thẻ/schema/noindex khi đổi trang |
| Title 45–65 ký tự, mô tả 130–160, đủ H2 là đạt | Chỉ là gợi ý biên tập có ngoại lệ; không phải luật khóa đăng hoặc bảo đảm xếp hạng |
| Excerpt phải chứa nguyên tiêu đề | Đánh giá đúng nhu cầu, khác biệt và lợi ích; meta description có thể khác excerpt |
| Ảnh WebP dưới 200KB, chung một ảnh 1200×630 cho mọi chỗ | B12/B19: kích thước/crop/chất lượng/tốc độ theo vị trí và kết quả đo |
| Parser Markdown tự tách đầu dòng là đủ | Editor/parser có cấu trúc, an toàn, hỗ trợ bài cũ và render nhất quán |
| Schema/preview SERP bảo đảm rich result hoặc thứ hạng | Schema phải đúng facts; hiển thị và index thực tế do công cụ tìm kiếm quyết định |

Tham khảo quy tắc hiển thị [title links](https://developers.google.com/search/docs/appearance/title-link), [snippets](https://developers.google.com/search/docs/appearance/snippet), [ngày trong Article](https://developers.google.com/search/docs/appearance/structured-data/article) và [URL thương mại điện tử](https://developers.google.com/search/docs/specialty/ecommerce/designing-a-url-structure-for-ecommerce-sites).

### G.II. Mẫu ghi nhận một việc đã làm

```text
Mã việc: B04
Người phụ trách: ...
Trạng thái: Chưa làm / Đang làm / Chờ đầu vào / Đã kiểm chứng / Ngoài phạm vi đợt này
Môi trường và bản triển khai: ...
Ngày kiểm: ...
Bằng chứng: URL + báo cáo/log/ảnh kiểm thử
Kết quả: ...
Điểm còn thiếu, người xử lý và hạn xem lại: ...
```

**Có thể coi nền tảng sẵn sàng vận hành** khi: đầu vào phần A đủ; phần B đã đạt theo phạm vi ra mắt; D01–D16 có bằng chứng; người vận hành thực hiện được quy trình phần E. Kết quả index, thứ hạng và doanh thu tiếp tục được đo sau launch, không phải lời bảo đảm từ checklist.

Nguồn nội bộ để truy nguyên phát hiện: [SEO_MASTER_CHECKLIST.md](D:/CloneGithub/Website3DTayBac/docs/SEO_MASTER_CHECKLIST.md) và [SEO_MKT_AUDIT_2026-09-29.md](D:/CloneGithub/Website3DTayBac/docs/SEO_MKT_AUDIT_2026-09-29.md). File tổng hợp này là nơi giao việc; hai tài liệu cũ giữ làm lịch sử/phân tích chi tiết.

**Giới hạn xác nhận:** trạng thái mới nhất được ghi ở mục 0.1–0.4. Chủ dự án đã mua miền; code SEO mới đã có ở local và các kiểm tra cơ bản đạt. Lần rà soát này cập nhật tài liệu, không sửa code SEO, tài khoản, DNS, DB hoặc deployment. Chưa xác nhận nghiệm thu GSC/GA4, CMS có đăng nhập/remote RLS sau migration, Lighthouse/CrUX, Rich Results Test, preview Facebook/Zalo hay hiệu quả kinh doanh.
