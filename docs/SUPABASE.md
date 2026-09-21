# Vận hành Mộc Tây Bắc với Supabase

## Những gì đã có

- Migration tại `supabase/migrations/20260921000000_moc_storefront.sql` tạo toàn bộ bảng vận hành: danh mục, sản phẩm, tồn kho, tin tức, khuyến mãi, khách hàng, đơn hàng, chi tiết đơn, thanh toán, lịch sử trạng thái, liên hệ và cấu hình cửa hàng.
- Tất cả bảng đều bật Row Level Security (RLS). Khách chỉ đọc sản phẩm/bài viết/khuyến mãi đã công khai; dữ liệu đơn, khách và lời nhắn chỉ dành cho `admin` hoặc `staff`.
- `create_checkout_order` nhận giỏ hàng nhưng tự đọc giá sản phẩm từ PostgreSQL. Giá gửi từ trình duyệt không được sử dụng.
- `submit_contact_message` là RPC ghi tối thiểu: khách gửi được lời nhắn nhưng không thể đọc lại hộp thư.
- `confirm_gateway_payment` chỉ dành cho `service_role`, dùng trong Edge Function/webhook sau khi nhà cung cấp QR xác thực thanh toán.

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
3. QR thật phải do máy chủ/Edge Function tạo từ mã đơn vừa sinh. Nhà cung cấp thanh toán gọi webhook đã ký về Edge Function.
4. Edge Function xác thực chữ ký và số tiền, sau đó dùng `SUPABASE_SERVICE_ROLE_KEY` gọi `confirm_gateway_payment`. Hàm này khóa tồn kho, giảm tồn, lưu giao dịch và chuyển đơn sang `paid`.

Nút QR trong giao diện hiện là mô phỏng, do chưa có thông số nhà cung cấp QR thật. Nó không thể tự đánh dấu đơn đã thanh toán trong database; đây là chủ ý để tránh giả mạo thanh toán từ trình duyệt.

## Kiểm tra sau khi chạy migration

- Gửi form Liên hệ: có một bản ghi mới trong `contact_messages`.
- Tạo đơn QR: `orders`, `order_items` và `payment_transactions` có bản ghi mới với trạng thái `awaiting_payment` / `pending`.
- Đăng nhập tài khoản có `profiles.role = 'admin'` hoặc `staff`: có thể đọc các bảng vận hành qua RLS. Tài khoản không có vai trò này không đọc được dữ liệu nhạy cảm.

## Bảng và trách nhiệm

| Nhóm | Bảng |
| --- | --- |
| Cửa hàng | `product_categories`, `products`, `product_inventory` |
| Nội dung và ưu đãi | `articles`, `promotions`, `promotion_products`, `site_settings` |
| Khách và bán hàng | `customers`, `orders`, `order_items`, `order_status_events` |
| Thanh toán | `payment_transactions` |
| Vận hành | `profiles`, `contact_messages` |
