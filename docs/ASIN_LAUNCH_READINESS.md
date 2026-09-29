# A Sỉn — đánh giá mức sẵn sàng mở bán

Ngày kiểm tra: **27/09/2026**. Phạm vi: source hiện tại, giao diện localhost, dữ liệu công khai Supabase và HTTP của website Vercel đang chạy.

## Quyết định ở góc nhìn người vận hành

**Chưa đủ bằng chứng để xác nhận hệ thống đã hoàn thiện cho mở bán chính thức.** Phần giao diện đã đồng bộ và có thể duyệt; cần chốt dữ liệu hàng hóa, thông tin người bán, kênh hỗ trợ và nghiệm thu toàn bộ vòng đời đơn hàng trên môi trường sẽ dùng để bán trước khi nhận khách thật.

Không cần tự động hóa mọi công đoạn ngay từ đầu. Có thể bắt đầu với COD và xử lý giao nhận thủ công khi các điều kiện bắt buộc bên dưới đã đạt, có người chịu trách nhiệm xử lý đơn và đối soát hàng ngày. Chưa nên chạy quảng cáo quy mô lớn trong trạng thái hiện tại.

## Giao diện đã thực hiện

- Đồng bộ trang Sản phẩm, Giới thiệu, Thiết kế hộp quà, Liên hệ, Tin tức và chi tiết bài viết với landing: nền giấy kem, đỏ trầm, ảnh núi hòa nền, mép giấy, Cormorant Garamond cho tiêu đề và Be Vietnam Pro cho nội dung.
- Đồng bộ hộp thoại sản phẩm, giỏ hàng, checkout, trang không tìm thấy và bảng màu quản trị. Quản trị giữ bố cục nghiệp vụ; chưa nghiệm thu thao tác sau đăng nhập trong lần kiểm tra này.
- Thêm Tin tức vào điều hướng desktop/mobile và phần tin trên landing. Bài viết lấy từ dữ liệu đã xuất bản trong Supabase, có tìm kiếm không dấu, lọc chủ đề, bài nổi bật, bài liên quan và trạng thái tải/lỗi/rỗng.
- Trang Liên hệ có mục hướng dẫn mua hàng, giao hàng, đổi trả. Nội dung lấy từ cấu hình hiện có, không tự đặt thời hạn hoặc cam kết kinh doanh.
- Sửa giới hạn tối đa 4 món trong trình thiết kế hộp quà; bổ sung trạng thái tải/lỗi và đặt lại thiết kế theo danh mục khả dụng.
- Bổ sung tiêu đề và mô tả theo trang; nút thêm giỏ hàng có nhãn rõ ràng. Luồng giá, khuyến mãi, CMS và đặt hàng hiện có được giữ lại.

Các file chính: `src/PageElements.tsx`, `src/Journal.tsx`, `src/asin-pages.css`, `src/StorefrontPages.tsx`, `src/Contact.tsx`, `src/Customizer.tsx`, `src/App.tsx`, `src/Home.tsx`.

## Điều kiện bắt buộc trước mở bán

| Ưu tiên | Phát hiện và bằng chứng | Ảnh hưởng | Việc cần hoàn thành / người phụ trách |
| --- | --- | --- | --- |
| P0 | DB công khai có 12 sản phẩm đang hoạt động, nhiều slug/giá/nội dung trùng `supabase/seed.sql`. Năm sản phẩm mới theo landing chưa có trong danh mục đang bán. | Khách có thể xem một bộ sản phẩm quảng bá nhưng mua một danh mục khác; chưa xác nhận giá/quy cách thật. | Chủ shop duyệt từng SKU, giá, quy cách, ảnh, tồn kho, thành phần, bảo quản, hạn sử dụng và nguồn hàng. Năm sản phẩm mới tiếp tục chờ giá/quy cách người dùng đã hẹn cung cấp. |
| P0 | `contact.phone`, `contact.email`, `contact.address`, `contact.hours` đều chưa có giá trị trong cấu hình công khai. | Khách không có kênh hỗ trợ trực tiếp rõ ràng khi cần xử lý đơn. | Chủ shop cung cấp thông tin kinh doanh và kênh hỗ trợ; người quản trị điền CMS và kiểm tra thực tế. |
| P0 | GET API production `/api/contact-reply` trả HTTP 500; cùng phương thức ở localhost trả 405 đúng thiết kế POST-only. | Chưa tin cậy được việc nhân viên trả lời khách qua email. Chưa đủ dữ liệu để kết luận nguyên nhân lỗi hoặc toàn bộ hệ thống email hỏng. | Kỹ thuật xem log Vercel, cấu hình server và bản triển khai; sửa nguyên nhân rồi thử gửi/nhận bằng hộp thư kiểm thử được chỉ định. Cần kênh hỗ trợ thay thế nếu chưa bật email. |
| P0 | Chưa kiểm thử có đăng nhập trên bản hiện tại: đặt đơn → tiếp nhận → đóng gói → giao → thu COD; hủy/hoàn và phân quyền. | Build thành công không chứng minh tiền, hàng và quyền truy cập vận hành đúng. | Kỹ thuật và vận hành nghiệm thu trên dữ liệu kiểm thử riêng, ghi lại mã đơn, số tồn trước/sau, trạng thái tiền và tài khoản thực hiện. |
| P0 | Nội dung đổi trả hiện chỉ hướng dẫn liên hệ; chưa có thông tin người bán/chính sách riêng đủ cụ thể trong các trang công khai. | Người mua và nhân viên chưa có quy tắc thống nhất để xử lý phí giao, hàng lỗi, thời hạn và hoàn tiền. | Chủ shop chốt chính sách mua hàng, vận chuyển, đổi trả, sử dụng dữ liệu và hồ sơ sản phẩm; sau đó đưa nội dung đã duyệt lên web. Báo cáo này không xác nhận tuân thủ pháp lý. |

## Các việc cần xử lý tiếp theo

| Nhóm | Hiện trạng | Hành động đề xuất |
| --- | --- | --- |
| Đồng bộ DB/3D | Truy vấn `products.model_url` trả lỗi 42703: cột chưa tồn tại. Các cột vận hành `orders.request_id`, `stock_deducted`, `recipient_name`, `profiles.staff_scope` và các cột CRM đã truy vấn được. | Đối chiếu lịch sử migration và áp dụng phần còn thiếu bằng tài khoản quản trị đúng dự án. Không kết luận tất cả migration chưa chạy. Hoàn tất đồng bộ ảnh/model rồi kiểm tra bản phát hành. |
| Ảnh sản phẩm | Hai hộp quà dùng `/images/hero.webp`; nhiều sản phẩm khác nhau dùng chung ảnh trà/mật ong/thịt/gia vị. | Dùng ảnh đúng từng SKU và quy cách; ảnh AI minh họa cần được đối chiếu với hàng giao thực tế. |
| Tồn kho | SQL kiểm tra tồn lúc đặt đơn, nhưng chỉ trừ khi chuyển đóng gói. Nhiều đơn chờ có thể vượt khả năng cung ứng. UI sản phẩm chưa thể hiện lượng có thể đặt. | Chốt chính sách giữ hàng hoặc xác nhận thủ công trước cam kết giao; bổ sung trạng thái hết hàng và thử nhiều đơn cạnh tranh tồn. |
| Chống đơn trùng | SQL có request ID và khóa giao dịch. Checkout tạo ID theo lần mở hộp thoại; đóng/mở lại sau lỗi mạng có thể tạo ID mới. | Giữ ID của yêu cầu chưa rõ kết quả qua lần tải lại; cho phép kiểm tra đơn trước thử lại. |
| Hộp quà | Đã giới hạn 4 món. Cập nhật UI 27/09 đã loại hộp quà làm sẵn khỏi danh sách ghép và cải thiện thao tác bỏ/chọn; chưa mô hình hóa kích thước/khả năng vừa hộp. Phí hộp cố định 65.000đ trong luồng hiện có. | Duyệt sản phẩm đủ điều kiện ghép hộp, thử đóng gói vật lý, xác nhận chi phí và trọng lượng vận chuyển. |
| Niềm tin thương hiệu | Nhận xét đang ở chế độ minh họa; QR hành trình dẫn tới trang Giới thiệu, chưa truy xuất theo lô. | Chỉ công bố nhận xét đã xác minh; hoàn thiện dữ liệu theo lô trước khi coi QR là bằng chứng truy xuất. Đối chiếu các chỉ số thương hiệu với hồ sơ thực tế. |
| Tài chính vận hành | Có báo cáo đơn/doanh thu; chưa thấy luồng giá vốn, lãi theo đơn hoặc đối soát tiền COD đầy đủ. Hoàn tiền trong hệ thống là ghi nhận nghiệp vụ, không tự chuyển tiền. | Lập bảng giá vốn, phí hộp, giao nhận, hoàn hàng, chi phí thu hút khách; giao người đối soát COD và ghi chứng từ hoàn tiền. |
| Nội dung và SEO | Có 4 bài xuất bản, trùng bộ seed. Đã thêm metadata phía trình duyệt; sản phẩm vẫn mở dạng hộp thoại, chưa có URL riêng. Chưa thấy sitemap/robots/canonical/OG đầy đủ. | Biên tập bài thật, thêm trang sản phẩm có URL chia sẻ, metadata cho crawler và sơ đồ trang trước tăng đầu tư tìm kiếm. |
| Hiệu năng | Build báo chunk chính khoảng 631 KB, viewer 3D khoảng 1.038 KB chưa nén; viewer tải riêng. | Đo trên điện thoại/mạng thực, tối ưu tải JS/ảnh theo kết quả. Chưa có kết quả Lighthouse hay đo thiết bị vật lý trong lần này. |
| Vận hành hệ thống | Chưa xác minh cảnh báo lỗi, sao lưu/khôi phục, người trực hỗ trợ, xử lý email thất bại. | Chốt người phụ trách và quy trình sự cố; thử khôi phục bản sao ở môi trường riêng trước khi coi việc sao lưu là đủ. |

## Kiến trúc và vai trò của Docker

Website hiện dùng giao diện React/Vite, Vercel để phát hành, Supabase cho dữ liệu/xác thực và một số API Node cho email/mời nhân viên. **Docker không phải yêu cầu để chạy website production hoặc bán hàng.**

Repo có bộ kiểm thử Supabase cục bộ dùng Docker để tách dữ liệu thử khỏi DB đang chạy. Đã thử khởi động Docker Desktop nhưng engine không phản hồi; không chạy được bộ kiểm thử DB đó trong lần này. Không có container, migration hay đơn hàng kiểm thử nào được tạo qua nhánh này. Không lấy kết quả kiểm thử cũ làm bằng chứng cho bản hiện tại.

## Bằng chứng đã kiểm tra

- `npm run build`: đạt sau các thay đổi, còn cảnh báo dung lượng chunk nêu trên.
- `npm test`: **16/16 đạt**, gồm 3 kiểm thử mới bảo đảm API email/mời nhân viên từ chối yêu cầu thiếu phiên đăng nhập và từ chối GET. Sửa kiểm tra Bearer trước khi tạo DB client ở source local; chưa triển khai nên không khẳng định đã sửa HTTP 500 production.
- `git diff --check`: đạt ở lần kiểm tra source.
- Trình duyệt: các trang Sản phẩm, Giới thiệu, Thiết kế hộp quà, Liên hệ, Tin tức, chi tiết bài ở **320, 390, 768, 1440 px** không tràn ngang.
- Tìm bài không dấu `mac khen`, lọc chủ đề, tìm không có kết quả, xóa lọc, mở bài chi tiết: hoạt động.
- Tìm sản phẩm không dấu, mở sản phẩm và thêm vào giỏ: hoạt động. Giỏ được trả về đúng hai sản phẩm/số lượng ban đầu sau thử.
- Hộp quà: chọn đủ 4 món thì các món chưa chọn bị khóa; đã trả thiết kế về lựa chọn ban đầu.
- Checkout: form trống bị chặn 3 trường bắt buộc; xem trước đơn 510.000đ hiển thị miễn phí giao và COD. **Không bấm xác nhận đặt đơn.**
- Liên hệ: form trống bị chặn 4 trường bắt buộc, mở nội dung hỗ trợ đổi trả được. Không gửi lời nhắn/email/đăng ký nhận tin.
- Đọc công khai Supabase: 12 sản phẩm, 4 bài; phí giao 30.000đ, miễn phí từ 500.000đ. Truy vấn ẩn danh bảng đơn/khách hàng/liên hệ/hồ sơ không thấy bản ghi; điều này **không đủ chứng minh phân quyền đúng** nếu thiếu dữ liệu kiểm soát và thử tài khoản từng vai trò.
- HTTP production trang chủ và `/tin-tuc`: 200. Đây là kiểm tra bản đang phát hành, không phải xác nhận UI local đã được deploy.

Script tái kiểm tra chỉ đọc: `node scripts/audit-storefront.mjs`. Kết quả lần này lưu ở `test-results/storefront-readiness.json` (không commit). Cấu hình server thiếu trên máy local không chứng minh Vercel thiếu cùng biến; chưa đọc cấu hình bí mật/log production.

## Biên bản nghiệm thu cần có trước khách hàng đầu tiên

1. Chủ shop duyệt danh mục bán thực tế, giá, tồn và ảnh; sản phẩm chưa đủ dữ liệu được giữ ngừng bán.
2. Người mua kiểm tra được tổng tiền, phí giao, COD, thông tin liên hệ và chính sách trước xác nhận.
3. Tạo đơn kiểm thử trong môi trường riêng; DB tự tính tiền theo giá/khuyến mãi hiện hành, không nhận giá do khách sửa.
4. Thử gửi lại cùng yêu cầu, lỗi mạng, hai người mua phần tồn cuối, hết hàng và sửa giá giữa lúc mở giỏ.
5. Đi hết đơn COD, đối chiếu tồn/tiền; thử hủy trước/sau đóng gói, hoàn hàng và ghi nhận hoàn tiền đúng một lần.
6. Thử admin, nhân viên vận hành, marketing và người chưa đăng nhập bằng dữ liệu kiểm soát; kiểm tra quyền từ API/DB cùng với UI.
7. Xuất bản/ẩn bài, đổi ảnh và sửa CMS; xác nhận website công khai cập nhật đúng.
8. Gửi và nhận email ở hộp thư kiểm thử được chỉ định; kiểm tra cách nhân viên biết có lỗi và kênh thay thế.
9. Xác nhận sao lưu/khôi phục, người trực xử lý đơn và quy trình đối soát cuối ngày.
10. Khi các mục bắt buộc đã đạt, bắt đầu bán COD với số đơn có thể xử lý thủ công; đo giao thành công, hoàn hàng, lãi theo đơn và phản hồi khách trước mở rộng.

Không thực hiện deploy, ghi DB hosted, gửi đơn, gửi email hoặc thay giá sản phẩm trong lần đánh giá này.
