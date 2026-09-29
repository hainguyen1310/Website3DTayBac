# Giao diện A Sỉn theo mẫu PDF - 26/09/2026

## Sửa trình chọn hộp quà và tách lối vào quản trị — 27/09/2026

- Header chỉ giữ liên kết chuyển trang: Sản phẩm, Hộp quà, Về A Sỉn, Tin tức, Liên hệ. Logo dẫn về `/`; bỏ ba liên kết section landing và biểu tượng tài khoản quản trị trên cả desktop/mobile.
- Trình chọn hộp có khoảng đệm và cỡ chữ rõ hơn, thẻ món được chọn, nút bỏ món trực tiếp và lời giải thích giới hạn 4 món. Khi đủ món, các món còn lại vẫn đọc được thay vì làm mờ toàn thẻ. Chuyển bước đưa tiêu đề mới vào vùng nhìn và nhận focus.
- Danh sách ghép hộp loại danh mục `hop-qua` (hộp phối sẵn); thiết kế lưu cũ được lọc theo danh mục ghép hiện tại, giữ màu/họa tiết/lời nhắn. Giá và nội dung giỏ đã có giữ theo luồng thương mại hiện hành.
- `/admin/dang-nhap` là trang riêng dành cho đội ngũ; `/admin/*` tách khỏi shell mua sắm và chỉ ở đây mới gắn AuthProvider. Xem hướng dẫn trong `ADMIN_OPERATIONS.md`.
- Build và 17/17 test đạt; kiểm tra ba bước ở 320/390/768/1440 px không tràn ngang. Đã thử đủ 4 món, bỏ món mở lại lựa chọn, menu mobile và chuyển hướng `/admin?section=orders` về đăng nhập giữ query. Không tạo đơn, ghi DB hoặc deploy.

## Cập nhật trang con và tin tức — 27/09/2026

- Các trang Sản phẩm, Giới thiệu, Thiết kế hộp quà, Liên hệ, Tin tức và chi tiết bài đã dùng chung nền giấy kem, đỏ trầm, Cormorant Garamond và ảnh núi hòa nền như landing. Bảng màu quản trị được đồng bộ, giữ chữ sans cho thao tác nghiệp vụ.
- Thêm phần Tin tức trên landing và menu desktop/mobile, tìm bài không dấu, lọc chủ đề, bài nổi bật/liên quan, các trạng thái tải/lỗi/rỗng. Bài viết lấy từ Supabase đã xuất bản.
- Cải thiện nhãn thêm giỏ, hướng dẫn mua hàng và giới hạn 4 món trong hộp quà. Giữ luồng dữ liệu/giá/CMS hiện có.
- Build đạt; 16/16 test đạt. Các trang công khai được kiểm tra ở 320, 390, 768, 1440 px không tràn ngang. Đã thử lọc/tìm bài, chi tiết bài, chọn hộp quà, thêm giỏ và bước xem trước COD; không tạo đơn thật.
- Xem [đánh giá sẵn sàng mở bán](ASIN_LAUNCH_READINESS.md) để phân biệt UI hoàn tất với những phần dữ liệu, production và vận hành còn phải nghiệm thu. Chưa deploy hoặc ghi DB trong lần này.

## Tinh chỉnh header và hero

- Header trang chủ phủ lên ảnh nền, trong suốt ở đầu trang; nền kem trở lại khi cuộn quá 24 px hoặc mở menu mobile. Các trang khác tiếp tục dùng header có nền.
- Hero mới `public/images/asin/hero-watercolor.webp` có khoảng giấy kem ở mép phải, hòa vào núi rừng bằng vệt loang màu nước. Cụm sản phẩm được dịch sang trái để dành chỗ cho chữ viết tay màu nâu đỏ.
- Dòng chữ viết tay được đặt trong vùng giấy trống ở desktop, ẩn ở màn hình hẹp để tránh đè lên sản phẩm. Ảnh hero cũ được giữ cho trang sản phẩm.
- Prompt riêng tại `docs/hero-watercolor-prompt.md`; manifest đồng bộ giữ cả ảnh hero ban đầu và bản loang màu nước.

## Tinh chỉnh câu chuyện theo ảnh tham chiếu

- Section `#cau-chuyen` dùng nền giấy có bản đồ và núi nét mảnh, ảnh bản làng lớn với mép cắt tự nhiên, hai mốc Lào Cai/Bắc Hà và ba ảnh khung giấy nghiêng: người vùng cao, thịt gác bếp, ruộng bậc thang.
- Mép trên dùng đường sóng riêng vẽ theo ảnh tham chiếu, áp dụng cho toàn section để ảnh và nền chung một đường mép. Chiều cao sóng cố định khi đổi kích thước màn hình.
- Chỉ số theo nội dung người dùng cung cấp: **200+ hộ nông dân đồng hành**, **5 dòng sản phẩm chủ lực**, **100% truy xuất nguồn gốc**. Đây là nội dung giới thiệu thương hiệu; không bổ sung chức năng truy xuất QR trong lần sửa này.
- Năm ảnh minh họa được tạo bằng ImageGen tích hợp, lưu tại `public/images/asin/story-{village,portrait,smoked-meat,terraces,map-paper}.webp`. Prompt đầy đủ tại `docs/story-reference-prompts.json`, đồng thời có trong manifest đồng bộ 15 ảnh `docs/asin-image-prompts.json`.
- CMS có thêm bốn trường ảnh nền và ảnh nhỏ trong nhóm Câu chuyện. Ảnh cũ được giữ cho trang Giới thiệu và phần Hành trình. Không thực hiện ghi Supabase trong lần tinh chỉnh giao diện này.
- Desktop giữ cách xếp lớp như mẫu; tablet và điện thoại xếp ba ảnh thành một hàng, chỉ số thành ba cột để đọc rõ.

## Phần đã thực hiện trong source

- Tinh chỉnh typography: tiêu đề landing dùng Cormorant Garamond Variable (normal/italic, tự host qua Fontsource, có bộ ký tự tiếng Việt), phối với Be Vietnam Pro ở mô tả và nút. Hero nhấn lớn hai dòng “Tinh hoa / Tây Bắc”, dòng kết nhỏ hơn và nghiêng; tiêu đề các section dùng cùng hệ chữ. Các trang nghiệp vụ vẫn dùng hệ chữ hiện có.
- Giữ header trong suốt khi ở đầu trang; đẩy ảnh hero xuống 70 px trên desktop (84 px ở màn hình lớn, 62 px ở tablet) và thêm chuyển sắc kem mềm phía trên. Bố cục ảnh dưới phần chữ trên điện thoại được giữ riêng để không đè vào điều hướng.

- Phần cuối landing theo ba ảnh mới: `LandingJourney.tsx` có sáu bước bằng ảnh tròn trên nền ruộng bậc thang liền mạch, khung giấy “Vì sao là A Sỉn”; `LandingReviews.tsx` có ba thẻ nhận xét, điều hướng ngang trên màn hình hẹp và hộp xem toàn bộ; khu hộp quà và footer dùng ảnh mới, màu nâu đỏ và đường núi khắc nét mảnh.
- Chưa có xác nhận rằng ba nhận xét trong mẫu là đánh giá thật. Mặc định hiển thị nhãn **Đánh giá minh họa**; chân dung cũng là ảnh minh họa AI. Quản trị Nội dung website có nhóm Đánh giá để sửa nội dung, tên, địa điểm, ảnh và số sao; chọn minh họa / thật đã xác nhận / ẩn. Ảnh chân dung mẫu tự ẩn khi chọn đánh giá thật mà chưa nhập ảnh riêng. Không ghi dữ liệu đánh giá vào Supabase trong phiên này.
- QR ở bước 5 dẫn đến trang `/gioi-thieu` trên tên miền hiện tại, kèm liên kết có thể bấm; chưa phải hệ thống truy xuất theo lô hàng. Không thêm tuyên bố “không chất bảo quản” khi chưa có thông tin sản phẩm xác nhận.
- Năm ảnh mới bằng ImageGen tích hợp nằm tại `public/images/asin/{journey-panorama,journey-handover,gift-reference,footer-mountains,review-portraits}.webp`. Prompt và đầu vào tại `docs/lower-landing-image-prompts.json`. Manifest đồng bộ ảnh CMS bổ sung nền hành trình và hộp quà mới, tổng 17 ảnh; các ảnh trang trí dùng trực tiếp từ bản build.
- Footer giữ biểu mẫu nhận tin và liên kết mua sắm hiện có. Biểu tượng mạng xã hội chưa có URL được làm mờ và không phải liên kết; URL cấu hình trong quản trị tiếp tục được ưu tiên.

- Theo ảnh tham chiếu phần sản phẩm: thêm hai ảnh nét núi nền trong suốt ở góc trái/phải, `public/images/asin/products-mountain-left.webp` và `public/images/asin/products-mountain-right.webp`. Họa tiết màu nâu nhạt co lại trên điện thoại, không nhận thao tác chuột/chạm. Ảnh được tạo bằng ImageGen tích hợp, prompt ở `docs/product-mountain-prompts.json`.

- Dựng lại landing page từ mẫu `A_SIN_UXUI_Website.pdf`: header A SỈN, hero núi rừng và đặc sản, dải giá trị, câu chuyện, sáu sản vật, khu trải nghiệm 3D, hành trình sản phẩm, quà tặng và footer.
- Đổi bảng màu chủ đạo sang đỏ trầm `#681b22`, nền giấy kem `#f8ecd9`, chữ nâu `#332920`; dùng Cormorant Garamond ở tiêu đề landing, Lora ở các trang còn lại, cùng Be Vietnam Pro cho nội dung. Đồng bộ các trang mua sắm, thiết kế hộp quà, câu chuyện và liên hệ.
- Tạo sáu preview WebP từ ảnh tham chiếu sản phẩm, cùng ba ảnh hero/câu chuyện/hộp quà. Danh sách file và prompt đầy đủ ở `docs/asin-image-prompts.json`. Ảnh câu chuyện và bộ quà là ảnh minh họa tạo bằng AI.
- Tích hợp file người dùng cung cấp `public/3Dfile/thit_lon_say_tay_bac.glb`: kéo xoay, năm góc nhìn, phóng to/thu nhỏ, tự xoay, đặt lại góc nhìn, toàn màn hình trên thiết bị hỗ trợ. Thư viện và GLB tự tải khi khu 3D cách khung nhìn dưới 500 px, không cần bấm kích hoạt. Có ảnh dự phòng và nút thử lại khi tải lỗi.
- Phần 3D dùng nền rừng tối, bệ gỗ trong suốt, vòng 360°, danh sách góc nhìn và ảnh cận cảnh theo mẫu. Ba ảnh được tạo bằng ImageGen tích hợp tại `public/images/asin/experience-forest.webp`, `experience-stump.webp`, `pork-viewer-poster.webp`; prompt đầy đủ tại `docs/experience-image-prompts.json`. Sản phẩm chuyển động là GLB thật được cung cấp, không phải ảnh minh họa xoay phẳng.
- Sản phẩm tự xoay 24°/giây khi đang hiển thị; dừng khi kéo tay, chọn góc, phóng to hoặc bấm tạm dừng. Tạm ngừng khi cuộn ra ngoài màn hình hoặc ẩn tab. Người dùng bật chế độ giảm chuyển động sẽ không bị tự xoay mặc định. Nút cận cảnh đưa mô hình về mặt trước và phóng to; có thể bật lại tự xoay bằng nút Play.
- Giữ dữ liệu giá/quy cách của sản phẩm đang bán từ Supabase. Preview cũ `/images/jerky.webp` của slug `jerky` được thay bằng ảnh mới ở lớp trình bày trong khi chờ đồng bộ DB; URL ảnh tùy chỉnh trong DB vẫn được ưu tiên.
- Link cũ `/#lien-he` chuyển sang trang `/lien-he`. Menu điện thoại, tìm sản phẩm, giỏ hàng, danh mục, CMS và form nhận tin tiếp tục dùng luồng hiện có.

Ba chỉ số trong phần Câu chuyện đã được người dùng cung cấp trong yêu cầu tinh chỉnh. Đánh giá trong mẫu được dựng với nhãn minh họa rõ ràng; các tuyên bố bảo quản và chức năng truy xuất theo lô hàng chưa được bổ sung.

## DB thật: chưa áp dụng trong phiên này

Public read của Supabase hoạt động và danh mục hiện tại đã được kiểm tra. Phiên Supabase Dashboard dừng ở xác thực GitHub; CLI không có access token cho dự án từ xa. Không có cập nhật DB hay upload Storage nào được xác nhận trong phiên này.

Đã chuẩn bị:

1. `supabase/migrations/20260926000000_asin_product_previews.sql`: thêm cột `model_url`, tạo năm sản phẩm còn thiếu ở trạng thái `active = false`, tồn kho ban đầu bằng 0. Giá 0 chỉ là giá trị nháp trong dữ liệu quản trị, không phải giá bán được công bố. Sản phẩm hiện hữu được giữ nguyên.
2. `scripts/sync-asin-branding.mjs`: upload các ảnh trong manifest lên bucket `site-images` bằng đường dẫn phiên bản riêng, kiểm tra ảnh đọc công khai được, sao lưu dữ liệu cũ rồi cập nhật ảnh sản phẩm và nội dung CMS. Script giữ giá, quy cách, trạng thái bán và không sửa khách hàng/đơn hàng/tồn kho.

Kiểm tra cấu hình mà không ghi dữ liệu:

```powershell
node --experimental-strip-types scripts/sync-asin-branding.mjs
```

Sau khi áp dụng migration qua tài khoản Supabase đã đăng nhập, có thể đồng bộ bằng môi trường quản trị riêng trên máy:

```powershell
node --experimental-strip-types scripts/sync-asin-branding.mjs --env .env.admin.local --apply
```

File môi trường riêng cần `SUPABASE_SERVICE_ROLE_KEY` của đúng dự án trong `.env`. Không đặt khóa riêng trong biến có tiền tố `VITE_`; `.env*` đã được git ignore. Script từ chối project URL khác dự án storefront. Bản sao trước khi sửa nằm trong `test-results/asin-branding-before-<timestamp>.json`. Đây là cập nhật từng bản ghi có sao lưu, không phải một giao dịch SQL nguyên tử; nếu lỗi giữa chừng cần kiểm tra bản sao trước khi chạy lại.

File GLB dùng đường dẫn cùng website, cần được phát hành cùng source. Script upload ảnh lên Storage để các URL ảnh mới dùng được cả trước khi website mới được phát hành.

## Thông tin đang chờ

Người dùng đã trả lời sẽ gửi giá và quy cách đóng gói cho: thịt lợn gác bếp, lạp xưởng, chẩm chéo, thịt trâu xé, thịt lợn xé. Chưa có giá/quy cách cụ thể được cung cấp. Các sản phẩm này trên landing hiện dẫn đến Liên hệ; chỉ mở bán sau khi xác nhận thông tin và tồn kho.

## Xác minh

- Sau tinh chỉnh typography/header: xem thực tế ở 320, 390, 768, 1440 và 1920 px, không tràn ngang; chữ tiếng Việt hiển thị đúng, tiêu đề chính/phụ khác cỡ và kiểu chữ. Header tại đầu trang vẫn có nền trong suốt, ảnh hero bắt đầu dưới vùng điều hướng trên desktop/tablet. `npm run build` đạt, chỉ còn cảnh báo kích thước bundle hiện có.
- `npm run build`: đạt. Vite còn cảnh báo dung lượng bundle; `model-viewer` nằm ở chunk tải theo yêu cầu.
- `npm test`: 13/13 đạt; bao gồm giá hộp quà, khôi phục giỏ hàng/thiết kế và tính giá khuyến mãi.
- `git diff --check`: đạt.
- Dry-run đồng bộ: nhận đủ 17 file ảnh và sáu slug, không thực hiện ghi DB.
- Trình duyệt: landing ở 320, 390, 768 và 1440 px không tràn ngang; đã kiểm tra menu mobile, ảnh, xem sản phẩm, thêm/xóa sản phẩm trong giỏ và liên kết liên hệ cũ.
- GLB đã tải và hiển thị thực tế; đã thử kéo xoay, đổi mặt trước/sau, phóng to và tự xoay. Chưa kiểm chứng lỗi WebGL trên thiết bị không hỗ trợ hay mọi trình duyệt di động vật lý.
- Không gửi đơn hàng, form liên hệ hoặc đăng ký email thử vào DB thật. Chưa kiểm thử thay đổi DB, chưa deploy bản này.
- Sau tinh chỉnh Câu chuyện: kiểm tra 320, 390, 768 và 1440 px không tràn ngang, tải đủ năm ảnh mới và nút Khám phá câu chuyện dẫn đúng trang Giới thiệu.
- Sau tinh chỉnh 3D: kiểm tra 320, 390, 768 và 1440 px không tràn ngang; mô hình tự tải không cần nút kích hoạt, tự xoay, dừng khi kéo tay hoặc chọn góc. Đã xác nhận mặt trước/sau, phóng cận cảnh, ngừng xoay khi cuộn ra ngoài và tiếp tục khi trở lại. Kiểm thử viewer compact trên trang tạm với URL GLB không tồn tại: hiển thị ảnh dự phòng, sau khi khôi phục file, một lần bấm Thử lại tải thành công. Build cuối có đủ ba ảnh mới; chỉ còn cảnh báo dung lượng bundle đã nêu trên.
- Sau tinh chỉnh phần cuối: 320, 390, 768 và 1440 px không tràn ngang; ảnh hành trình/hộp quà/đánh giá hiển thị; carousel trên mobile chuyển tới/lùi được. Hộp đánh giá mở bằng nút, đóng bằng Escape và trả focus về nút mở. CTA hộp quà dẫn tới `/thiet-ke`; ô email từ chối định dạng không hợp lệ theo kiểm tra HTML. Không gửi đăng ký thật. `npm test` đạt 13/13; bản build có đủ năm ảnh mới. Nhóm CMS mới đã qua TypeScript/build, chưa kiểm thử lưu vào DB thật.

Bản local: `http://127.0.0.1:5173/` (chỉ localhost).
