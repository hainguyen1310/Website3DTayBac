# Vận hành Mộc Tây Bắc với Supabase

## Những gì đã có

- Migration tại `supabase/migrations/20260921000000_moc_storefront.sql` tạo toàn bộ bảng vận hành: danh mục, sản phẩm, tồn kho, tin tức, khuyến mãi, khách hàng, đơn hàng, chi tiết đơn, thanh toán, lịch sử trạng thái, liên hệ và cấu hình cửa hàng.
- Tất cả bảng đều bật Row Level Security (RLS). Khách chỉ đọc sản phẩm/bài viết/khuyến mãi đã công khai; dữ liệu đơn, khách và lời nhắn chỉ dành cho `admin` hoặc `staff`.
- Cửa hàng đọc dữ liệu thật từ cơ sở dữ liệu: sản phẩm, danh mục, ưu đãi (`promotions` + `promotion_products`), bài viết và câu thông báo (`site_settings.storefront_notice`). Khi Supabase chưa sẵn sàng, cửa hàng tự dùng dữ liệu tĩnh trong `src/catalog.ts` và `src/shopData.ts`.
- `create_checkout_order` nhận giỏ hàng nhưng tự đọc giá sản phẩm từ PostgreSQL. Giá gửi từ trình duyệt không được sử dụng.
- `submit_contact_message` là RPC ghi tối thiểu: khách gửi được lời nhắn nhưng không thể đọc lại hộp thư.
- `confirm_gateway_payment` chỉ dành cho `service_role`, dùng trong Edge Function/webhook sau khi nhà cung cấp QR xác thực thanh toán.
- Dashboard `/admin` đăng nhập bằng Supabase Auth và CRUD trực tiếp qua RLS: sản phẩm + tồn kho, danh mục, đơn hàng (đổi trạng thái, xóa), khách hàng, khuyến mãi, bài viết, hộp thư liên hệ, cài đặt cửa hàng.

## Khởi tạo cơ sở dữ liệu

1. Mở Supabase Dashboard của dự án đã cấu hình.
2. Vào **SQL Editor**, dán toàn bộ migration `supabase/migrations/20260921000000_moc_storefront.sql`, rồi chạy một lần. Hoặc, sau khi liên kết Supabase CLI với dự án, chạy `supabase db push`.
3. Vào **Authentication → Users** tạo hoặc mời tài khoản quản trị đầu tiên. Trigger trong migration sẽ tạo `profiles` tương ứng.
4. Trong SQL Editor, cấp quyền cho đúng người đó (thay email thật trước khi chạy):

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
- Không cần cấu hình redirect URL riêng; đăng nhập mật khẩu không dùng liên kết email. Nếu bật xác thực email, hãy xác thực trước khi đăng nhập.
- Nút bấm trên tên tài khoản ở góc phải (và ở chân sidebar) để đăng xuất.

### Xử lý sự cố đăng nhập

| Hiện tượng | Nguyên nhân thường gặp |
| --- | --- |
| “Email hoặc mật khẩu không đúng” | Sai thông tin, hoặc user chưa được tạo trong Authentication → Users |
| “Tài khoản chưa xác thực email” | Cần xác thực email hoặc dùng “Auto Confirm User” khi tạo user |
| Vào được nhưng báo không đủ quyền | `profiles.role` vẫn là `customer`; chạy lại câu `update` ở mục trên |
| Danh sách rỗng, không có lỗi | Tài khoản chưa phải staff nên RLS lọc hết; kiểm tra lại vai trò |

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
- Phí giao hàng: cột `shipping_vnd` đã có nhưng luồng checkout đang để 0.
