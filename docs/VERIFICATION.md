# Kiểm tra bản dựng

Ngày kiểm tra: 20/09/2026.

- TypeScript và bản production: đạt (`npm run build`).
- 4 bài kiểm tra logic giá, khôi phục giỏ hàng, lọc dữ liệu lưu lỗi và giữ nguyên thông tin thiết kế: đạt (`npm test`).
- 17 tệp Kage nguyên bản: SHA-256 khớp (`npm run verify:threeui`).
- Trình duyệt máy tính và khung điện thoại 390 × 844: đã kiểm tra trực quan; trang chủ và trình thiết kế không tràn ngang.
- Đã thử lọc danh mục Mật ong, tìm `mac khen` không dấu, thêm vào giỏ, tăng số lượng, khôi phục giỏ sau khi tải lại.
- Đã thử thêm sản vật vào hộp, đổi sang màu Đỏ đất và họa tiết Triền núi, điền người nhận/lời nhắn, lưu và tải lại; nội dung và giá được giữ đúng khi thêm giỏ.
- Tổng thử: 2 hũ mật ong (500.000đ) + hộp quà 3 sản vật (590.000đ) = 1.090.000đ.
- Biểu mẫu để trống chặn tạo đơn và báo 3 trường chưa hợp lệ; dữ liệu mẫu hợp lệ mở bản tóm tắt, ghi rõ chưa gửi đơn/chưa thanh toán.
- Cảnh WebGL Kage tải tại đường dẫn nội bộ `/landing-pages/kage.html`; đã kiểm tra trên máy tính/điện thoại và điều hướng Gardens.
- Đã kiểm tra chặn hộp quà rỗng, đặt lại thiết kế và xóa hết giỏ hàng. Dữ liệu thao tác thử đã được dọn.
- Đã kiểm tra danh sách yêu thích, mở chi tiết từ danh sách, và bản production của cả cửa hàng lẫn Kage: không có lỗi/cảnh báo console.

Ghi chú: bản phát triển của entrypoint ThreeUI có thể báo nhiều phiên bản Three.js do package xuất nhiều renderer. Bản production loại bỏ các renderer không dùng; nguồn Kage và runtime cục bộ không bị chỉnh sửa.
