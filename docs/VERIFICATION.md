# Kiểm tra bản dựng

Ngày kiểm tra: 22/09/2026.

## Lần kiểm tra gần nhất (sau khi nối admin với Supabase)

- `npm run build`: đạt (TypeScript + Vite, 1667 module).
- `npm test`: 4/4 bài kiểm tra giá, khôi phục giỏ hàng, lọc dữ liệu lỗi và giữ nguyên thiết kế: đạt.
- Truy vấn PostgREST thật (publishable key trong `.env`) cho toàn bộ câu lệnh admin dùng: `products`, `product_inventory`, `orders` + `customers` + `order_items`, `order_status_events`, `customers` + `orders`, `articles`, `promotions` + `promotion_products` + `products`, `contact_messages`, `site_settings`, `order_items` + `orders!inner` (báo cáo), count HEAD. Tất cả trả 200, không lỗi cú pháp; các bảng vận hành trả rỗng vì RLS chặn `anon`.
- RPC `submit_contact_message` và `create_checkout_order`: tồn tại, chặn dữ liệu rỗng bằng lỗi `P0001`.
- RPC `confirm_gateway_payment`: `anon` bị từ chối `42501 permission denied`.
- Render thật bằng trình duyệt headless:
  - `/admin`: hiện form đăng nhập “Đăng nhập Mộc.” (AuthProvider + router hoạt động, không lỗi runtime).
  - `/san-pham`: hiện 4 sản phẩm, danh mục và thanh tìm kiếm; không rơi vào trạng thái rỗng.
- Chưa kiểm tra được luồng ghi khi đã đăng nhập vì dự án chưa có tài khoản `admin`/`staff`; cần tạo tài khoản theo `docs/SUPABASE.md` rồi kiểm tra CRUD thủ công.

## Lần kiểm tra trước (20/09/2026)

- TypeScript và bản production: đạt (`npm run build`).
- 4 bài kiểm tra logic giá, khôi phục giỏ hàng, lọc dữ liệu lưu lỗi và giữ nguyên thông tin thiết kế: đạt (`npm test`).
- Trình duyệt máy tính và khung điện thoại 390 × 844: đã kiểm tra trực quan; trang chủ và trình thiết kế không tràn ngang.
- Đã thử lọc danh mục Mật ong, tìm `mac khen` không dấu, thêm vào giỏ, tăng số lượng, khôi phục giỏ sau khi tải lại.
- Đã thử thêm sản vật vào hộp, đổi sang màu Đỏ đất và họa tiết Triền núi, điền người nhận/lời nhắn, lưu và tải lại; nội dung và giá được giữ đúng khi thêm giỏ.
- Tổng thử: 2 hũ mật ong (500.000đ) + hộp quà 3 sản vật (590.000đ) = 1.090.000đ.
- Biểu mẫu để trống chặn tạo đơn và báo 3 trường chưa hợp lệ; dữ liệu mẫu hợp lệ mở bản tóm tắt, ghi rõ chưa gửi đơn/chưa thanh toán.
- Đã kiểm tra chặn hộp quà rỗng, đặt lại thiết kế và xóa hết giỏ hàng. Dữ liệu thao tác thử đã được dọn.
- Đã kiểm tra danh sách yêu thích, mở chi tiết từ danh sách, và bản production của cửa hàng: không có lỗi/cảnh báo console.
