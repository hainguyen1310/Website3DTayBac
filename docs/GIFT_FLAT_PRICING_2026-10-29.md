# Hộp quà trọn giá — 29/10/2026

- Ba bước: size hộp → sản phẩm → thiệp. Không có bước chọn màu.
- Sinh Lộc: xanh lá, 300.000đ; Thịnh Đỉnh: hộp lớn màu đỏ, 500.000đ.
- Giá gồm món tự chọn, món kèm sẵn và thiệp; phí vận chuyển vẫn theo cấu hình cửa hàng.
- Hai ngăn túi loại chẩm chéo và combo thịt gác bếp; ngăn hũ chỉ còn thịt lợn xé, thịt trâu xé và rượu ngô Bản Phố trong danh mục hiện tại. Giữ ba ngăn tự chọn và các món kèm sẵn hiện có.
- Mở trang thiết kế mới bắt đầu từ 0 món; không khôi phục bản nháp cũ từ localStorage. Giỏ hàng vẫn được lưu như trước.

## Thanh toán

Áp dụng `supabase/migrations/20261029000000_gift_box_flat_pricing.sql` cùng bản frontend trước khi nhận đơn với chính sách mới. Migration đặt giá, màu theo size ở máy chủ; ghi các món và thiệp với giá 0 trong đơn, giữ kiểm tra tồn kho và cách tính vận chuyển.

Đã áp dụng lên Supabase production `pqnjhwcvvvsfjgiazfqx` ngày 30/10/2026 qua SQL Editor và ghi lịch sử migration `20261029000000`. Đã thử trước khi áp dụng và kiểm tra lại sau khi commit bằng transaction rollback: giá Sinh Lộc 300k, Thịnh Đỉnh 500k, món/thiệp không cộng phí, màu cố định, giá sản phẩm bán lẻ giữ nguyên, hàm nội bộ không mở cho anon. Không còn đơn thử trong DB.

## Kiểm tra local

- 91 test TypeScript qua; build và SEO build check qua (còn cảnh báo bundle lớn).
- Trình duyệt: bước đầu 0/3, chọn rượu cho ngăn túi được chấp nhận, tổng Thịnh Đỉnh giữ 500.000đ và giỏ hàng hiển thị cùng giá; mở lại trang trở về 0/3.
- Mô hình Sinh Lộc hiển thị xanh lá; Thịnh Đỉnh dùng mô hình lớn màu đỏ.

## Triển khai production — 30/10/2026

- Domain: https://asintaybac.com
- Vercel: `dpl_D3sDDg2SL3xG1QMavayoee2koorX`, `website3dtaybac-cf176cli6-hainguyen1310s-projects.vercel.app`.
- Đã promote sau khi kiểm chứng và áp dụng migration; 11 đường dẫn/tài nguyên kiểm tra đều HTTP 200, ảnh và GLB có đúng content type.
- Giao diện thật: Sinh Lộc xanh lá 300k, Thịnh Đỉnh đỏ 500k; bước đầu 0/3; ngăn hũ chỉ còn lợn xé, trâu xé, rượu; header blur 18px và chữ 700.
- Bằng chứng: `test-results/production-http-check-2026-10-30.json`, `test-results/production-db-verification-2026-10-30.json`, `test-results/production-gift-2026-10-30.png`.
- Bản SQL trước cập nhật: `test-results/checkout-before-deploy-2026-10-30.sql`. Vercel trước promote: `website3dtaybac-lkbu5b782-hainguyen1310s-projects.vercel.app`. Nếu cần rollback phải phục hồi đồng thời website, hàm checkout, setting và đối chiếu lịch sử migration; không xóa đơn hiện có.
- Còn cảnh báo bundle lớn. Audit dependency runtime: 3 moderate, 0 high/critical; không nâng dependency trong đợt deploy này.
- Không commit/push Git trong đợt triển khai này; Vercel deploy từ working tree hiện tại.