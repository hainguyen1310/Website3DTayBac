# Vận hành A Sỉn với Supabase

> Bản cập nhật quản trị/CRM/COD/SMTP ngày 25/09/2026 được mô tả tại [ADMIN_OPERATIONS.md](ADMIN_OPERATIONS.md), gồm ma trận quyền, các migration mới và hướng dẫn kích hoạt Vercel API. Các ghi chú lịch sử phía dưới không thay thế quy trình này.

## Những gì đã có

- Migration tại `supabase/migrations/20260921000000_moc_storefront.sql` tạo toàn bộ bảng vận hành: danh mục, sản phẩm, tồn kho, tin tức, khuyến mãi, khách hàng, đơn hàng, chi tiết đơn, thanh toán, lịch sử trạng thái, liên hệ và cấu hình cửa hàng.
- Tất cả bảng đều bật Row Level Security (RLS). Khách chỉ đọc sản phẩm/bài viết/khuyến mãi đã công khai; dữ liệu đơn, khách và lời nhắn chỉ dành cho `admin` hoặc `staff`.
- Cửa hàng đọc dữ liệu thật từ cơ sở dữ liệu: sản phẩm, danh mục, ưu đãi (`promotions` + `promotion_products`), bài viết và câu thông báo (`site_settings.storefront_notice`). Khi tải lỗi hoặc database trống, giao diện hiện trạng thái lỗi/trống; không thay bằng sản phẩm giả.
- `create_checkout_order` nhận giỏ hàng nhưng tự đọc giá sản phẩm từ PostgreSQL. Giá gửi từ trình duyệt không được sử dụng.
- `submit_contact_message` là RPC ghi tối thiểu: khách gửi được lời nhắn nhưng không thể đọc lại hộp thư.
- `confirm_gateway_payment` chỉ dành cho `service_role`, dùng trong Edge Function/webhook sau khi nhà cung cấp QR xác thực thanh toán.
- Dashboard `/admin` đăng nhập bằng Supabase Auth. Dữ liệu được bảo vệ bằng RLS và RPC theo admin/vận hành/marketing. Đơn hàng đổi trạng thái qua RPC; không xóa lịch sử đơn. Giao diện khách hàng, liên hệ, website và cài đặt đã mở rộng theo tài liệu mới.

## Khởi tạo cơ sở dữ liệu

1. Mở Supabase Dashboard của dự án đã cấu hình.
2. Vào **SQL Editor**, chạy lần lượt các migration trong `supabase/migrations/` theo đúng thứ tự tên tệp (hoặc, sau khi liên kết Supabase CLI với dự án, chạy `supabase db push`).
3. (Tùy chọn) Chạy `supabase/seed.sql` để nạp dữ liệu mẫu cho toàn bộ bảng — xem mục “Dữ liệu mẫu” bên dưới.
4. Vào **Authentication → Users** tạo hoặc mời tài khoản quản trị đầu tiên. Trigger trong migration sẽ tạo `profiles` tương ứng.
5. Trong SQL Editor, cấp quyền cho đúng người đó (thay email thật trước khi chạy):

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'admin@example.com');
```

Không cấp quyền bằng cách thay policy, và không để bất kỳ khóa `service_role` nào trong `.env` của Vite.

## Đăng nhập khu vực quản trị

- Mở `/admin`. Nếu chưa có phiên đăng nhập, hệ thống hiện form đăng nhập email + mật khẩu.
- Sau khi đăng nhập, ứng dụng đọc `profiles.role` của chính tài khoản đó:
  - `admin` hoặc `staff`: vào được dashboard, mọi truy vấn gửi kèm JWT và được RLS cho phép.
  - `customer` hoặc không có dòng `profiles`: hiện màn hình “không đủ quyền” kèm nút đăng xuất.
- Đăng nhập mật khẩu không cần redirect riêng. Tính năng mời nhân viên cần thêm `/admin?setup=password` của domain thật vào Auth Redirect URLs; xem tài liệu mới.
- Nút bấm trên tên tài khoản ở góc phải (và ở chân sidebar) để đăng xuất.

### Xử lý sự cố đăng nhập

| Hiện tượng | Nguyên nhân thường gặp |
| --- | --- |
| “Email hoặc mật khẩu không đúng” | Sai thông tin, hoặc user chưa được tạo trong Authentication → Users |
| “Tài khoản chưa xác thực email” | Cần xác thực email hoặc dùng “Auto Confirm User” khi tạo user |
| Vào được nhưng báo không đủ quyền | `profiles.role` vẫn là `customer`; chạy lại câu `update` ở mục trên |
| Danh sách rỗng, không có lỗi | Tài khoản chưa phải staff nên RLS lọc hết; kiểm tra lại vai trò |

## Dữ liệu mẫu

`supabase/seed.sql` nạp dữ liệu cho **mọi bảng**: danh mục, sản phẩm, tồn kho, bài viết, khuyến mãi, khách hàng, đơn hàng, dòng hàng, giao dịch, lịch sử trạng thái, lời nhắn và cấu hình cửa hàng.

- **Chạy lại được nhiều lần.** Các bảng ghi theo khoá tự nhiên (slug / code / phone / key / order_number) nên không sinh bản ghi trùng. Hai bảng không có khoá tự nhiên (`contact_messages`, `order_status_events`) dùng miền email và tiền tố `MOCTB-DEMO-` để nhận diện dữ liệu của chính tệp này; dữ liệu khác trong database không bị đụng tới.
- **Một transaction duy nhất.** Lỗi giữa đường sẽ tự hoàn tác, không để lại dữ liệu dở dang.
- **Khuyến mãi nối tiếp nhau**, đúng ràng buộc `promotions_active_no_overlap`: một chương trình đã kết thúc, một chương trình đang chạy, hai chương trình sắp diễn ra, và một bản nháp đang tắt. Nhờ vậy mục “Deal hời” trên cửa hàng chỉ hiện đúng ưu đãi đang chạy.
- **Đơn hàng đủ mọi trạng thái** (`awaiting_payment`, `paid`, `packing`, `shipping`, `completed`, `cancelled`) với cả QR lẫn COD, để dashboard, bộ lọc và báo cáo có số liệu thật mà kiểm tra.
- **Tài khoản đăng nhập** (mục 5 của tệp), mật khẩu chung `MocDemo@2026`:

| Email | Vai trò |
| --- | --- |
| `admin@moctaybac.demo` | `admin` |
| `staff@moctaybac.demo` | `staff` |
| `khach@moctaybac.demo` | `customer` (vào `/admin` sẽ thấy màn hình không đủ quyền) |

> Phần tài khoản ghi thẳng vào schema `auth` của Supabase. Chỉ nên chạy trên database demo; trên môi trường thật hãy tạo người dùng qua **Authentication → Users** và bỏ qua mục 5 bằng cách xoá khối lệnh đó trước khi chạy.

## Môi trường ứng dụng

Tệp `.env` cục bộ dùng hai biến công khai:

```ini
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

`.env` đã bị Git bỏ qua. Khi triển khai, nhập cùng hai biến này trong cấu hình môi trường của hosting. Có sẵn `.env.example` để các môi trường khác tự điền khóa riêng.

## Luồng đơn hàng và QR

1. Khách thêm sản phẩm/hộp quà và nhập thông tin nhận hàng.
2. Khi hoàn tất bước QR, ứng dụng gọi `create_checkout_order`. Database tự đối chiếu sản phẩm đang bán, tính lại tổng VND và tạo đơn `awaiting_payment`.
3. Đơn vừa tạo xuất hiện ngay trong `/admin → Đơn hàng`. Nhân viên đổi trạng thái tại đây; mỗi lần đổi, trigger `orders_record_status_event` ghi thêm một dòng vào `order_status_events`.
4. QR thật phải do máy chủ/Edge Function tạo từ mã đơn vừa sinh. Nhà cung cấp thanh toán gọi webhook đã ký về Edge Function.
5. Edge Function xác thực chữ ký và số tiền, sau đó dùng `SUPABASE_SERVICE_ROLE_KEY` gọi `confirm_gateway_payment`. Hàm này khóa tồn kho, giảm tồn, lưu giao dịch và chuyển đơn sang `paid`.

Nút QR trong giao diện hiện là mô phỏng, do chưa có thông số nhà cung cấp QR thật. Nó không thể tự đánh dấu đơn đã thanh toán trong database; đây là chủ ý để tránh giả mạo thanh toán từ trình duyệt. Vì vậy trạng thái “Đã thanh toán” chỉ nên đặt từ webhook, hoặc do nhân viên xác nhận thủ công trong dashboard.

## Kiểm tra sau khi chạy migration

- Gửi form Liên hệ: có một bản ghi mới trong `contact_messages`, và lời nhắn hiện ở `/admin → Liên hệ`.
- Tạo đơn QR: `orders`, `order_items` và `payment_transactions` có bản ghi mới với trạng thái `awaiting_payment` / `pending`; đơn hiện ở `/admin → Đơn hàng`.
- Sửa một sản phẩm trong `/admin → Sản phẩm`: giá/tồn kho đổi ngay trên `/san-pham` sau khi tải lại.
- Đổi trạng thái đơn trong `/admin`: mở chi tiết đơn để thấy lịch sử trạng thái mới.
- Đăng nhập tài khoản có `profiles.role = 'admin'` hoặc `staff`: có thể đọc các bảng vận hành qua RLS. Tài khoản không có vai trò này không đọc được dữ liệu nhạy cảm.

## Tải ảnh lên Supabase Storage

Ảnh sản phẩm và ảnh bìa bài viết được chọn bằng ô chọn tệp trong `/admin` (không nhập URL tay):

1. `ImageInput` tải tệp lên bucket `site-images` bằng Supabase Storage SDK kèm access token của tài khoản đang đăng nhập.
2. RLS trên `storage.objects` chỉ cho `admin`/`staff` ghi và xóa; khách đọc ảnh công khai.
3. URL công khai của ảnh được lưu vào `products.image_url` / `articles.image_url` và hiển thị lại trên cửa hàng.

Không có khóa bí mật nào ở phía trình duyệt: quyền do phiên đăng nhập + RLS quyết định.

### Khởi tạo bucket

Chạy migration `supabase/migrations/20260922000000_site_images_storage.sql` trong SQL Editor (hoặc `supabase db push`). Migration này:

- tạo bucket `site-images` công khai, giới hạn 10MB và chỉ nhận `image/jpeg|png|webp|avif|gif`;
- cấp quyền đọc ảnh cho `anon` và `authenticated`;
- cấp quyền thêm/sửa/xóa ảnh cho tài khoản có `profiles.role` là `admin` hoặc `staff`.

Muốn đổi giới hạn dung lượng thì sửa `file_size_limit` trong migration và `VITE_MAX_UPLOAD_MB` trong `.env` cho khớp.

### Đường dẫn ảnh

Ảnh được lưu theo cấu trúc `products/2026/09/<mốc-thời-gian>-<tên-slug>-<mã-ngẫu-nhiên>.<đuôi>`, mỗi ảnh một mã riêng nên không ghi đè ảnh cũ. Nút “Xóa ảnh” trong form chỉ bỏ URL khỏi bản ghi, không xóa tệp trong bucket — muốn dọn tệp thì xóa trong Storage → site-images.

### Sự cố thường gặp

| Hiện tượng | Nguyên nhân |
| --- | --- |
| “Chưa có bucket site-images…” | Chưa chạy migration storage |
| “Tài khoản không có quyền tải ảnh lên” | `profiles.role` không phải admin/staff |
| “Ảnh vượt quá 10MB” | Vượt `file_size_limit` hoặc `VITE_MAX_UPLOAD_MB` |
| Ảnh lưu được nhưng không hiển thị | Bucket bị đặt private; kiểm tra `public = true` trong `storage.buckets` |

## Bảng và trách nhiệm

| Nhóm | Bảng |
| --- | --- |
| Cửa hàng | `product_categories`, `products`, `product_inventory` |
| Nội dung và ưu đãi | `articles`, `promotions`, `promotion_products`, `site_settings` |
| Khách và bán hàng | `customers`, `orders`, `order_items`, `order_status_events` |
| Thanh toán | `payment_transactions` |
| Vận hành | `profiles`, `contact_messages` |

## Việc còn lại để bán thật

- Edge Function nhận webhook QR và gọi `confirm_gateway_payment` (hiện chưa có, nên đơn dừng ở `awaiting_payment` và tồn kho chưa bị trừ).
- Ảnh sản phẩm thật thay cho `/images/*.webp` minh họa, và chính sách giao hàng/đổi trả.
- Phí giao hàng: cột `shipping_vnd` đã có, dữ liệu mẫu áp chính sách “miễn phí từ 500.000đ” qua `site_settings.free_shipping_from`, nhưng luồng checkout vẫn để 0 và chưa đọc cấu hình này.

## Ràng buộc nghiệp vụ đã cài trong database

- **Chỉ một khuyến mãi đang bật tại một thời điểm** — ràng buộc loại trừ `promotions_active_no_overlap` (migration `20260923000000`). Chương trình đang tắt được phép trùng thời gian thoải mái. Một chương trình bật mà để trống ngày kết thúc sẽ chiếm trọn tương lai, nên muốn mở chương trình mới thì chương trình cũ phải có ngày kết thúc.
- **Đơn đã hủy không bị webhook hồi sinh** — `confirm_gateway_payment` dừng ngay khi thấy `status = 'cancelled'`, không trừ tồn kho và báo lỗi để Edge Function chuyển hồ sơ hoàn tiền (migration `20260923000001`).
- **Mỗi bước trạng thái chỉ ghi một dòng lịch sử.** Trigger `record_order_status_event` đọc ghi chú từ biến phiên `moc.status_note`, nhờ vậy bước `paid` không còn bị ghi hai lần.
- **Đơn COD đi tiếp được.** Không có webhook cho COD, nên khi đơn COD ở `awaiting_payment`, trang quản trị cho phép nhân viên chọn “Đã thanh toán” để xác nhận đã thu tiền mặt; bước này chốt luôn `payment_status` để đơn được tính vào doanh thu. Đơn QR vẫn chỉ chuyển sang `paid` qua webhook.
