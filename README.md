# Mộc Tây Bắc

Website demo bán sản vật Tây Bắc, trình thiết kế hộp quà và khu vực quản trị. Dựng bằng React 19, TypeScript và Vite.

Tích hợp cơ sở dữ liệu Supabase, RLS và luồng vận hành được mô tả tại [docs/SUPABASE.md](docs/SUPABASE.md).

## Chạy dự án

Yêu cầu Node.js 22.12+ (đã kiểm tra bằng Node.js 24).

```sh
npm ci
npm run dev
```

Mở http://localhost:5173. Các trang:

- `/`: landing page giới thiệu thương hiệu, Deal hời, tin tức rút gọn, liên hệ, giỏ hàng và hộp quà.
- `/san-pham`: danh mục sản phẩm, giá, tìm kiếm và chọn mua.
- `/gioi-thieu`: câu chuyện thương hiệu và nguồn gốc minh họa.
- `/tin-tuc`: danh sách các bài viết minh họa; `/tin-tuc/:storyId` là trang đọc bài chi tiết.
- `/thiet-ke`: chọn 1–4 sản vật, màu hộp, họa tiết, tên người nhận, lời nhắn; xem trước và tính giá trực tiếp.
- `/admin`: dashboard quản trị demo; quản lý đơn hàng, sản phẩm, khách hàng, khuyến mãi, nội dung, báo cáo và cài đặt.

Các đường dẫn cũ `/deal-hoi` và `/lien-he` được giữ để điều hướng về section tương ứng trên trang chủ.

```sh
npm run build
npm run preview
npm test
```

## Phạm vi bản hiện tại

- Thương hiệu Mộc Tây Bắc, danh mục, giá và hình ảnh là dữ liệu minh họa, cần được chủ cửa hàng duyệt và thay bằng dữ liệu thật trước khi mở bán.
- Giỏ hàng, yêu thích và bản thiết kế được lưu trong localStorage của trình duyệt. Không cần tài khoản.
- Luồng đặt hàng là bản mẫu có kiểm tra thông tin, mã QR có thể quét và xuất tệp JSON. QR chỉ mã hóa nội dung demo; thao tác “đã thanh toán” là mô phỏng tại trình duyệt. **Chưa kết nối máy chủ, ngân hàng, ví điện tử, webhook, chưa gửi đơn và chưa tính phí giao hàng.**
- Dashboard admin dùng dữ liệu giả, không có đăng nhập; danh sách đơn demo được lưu cục bộ trên trình duyệt để hiển thị lại sau khi tải trang.
- Trình thiết kế hiện dùng bản phối CSS/2D.

## Tích hợp mô hình 3D sau

`src/GiftPreview.tsx` là phần hiển thị độc lập nhận đối tượng `GiftDesign`. Nhà cung cấp có thể thay nó bằng trình xem GLB/glTF mà không đổi cách chọn sản vật, tính giá, lưu thiết kế hoặc giỏ hàng.

```ts
type GiftDesign = {
  productIds: string[];
  color: string;
  pattern: string;
  message: string;
  recipient: string;
};
```

Thống nhất với nhà cung cấp tên mesh/material, các vùng thay texture và tọa độ thiệp. Giữ một bản xem trước 2D nếu thiết bị không hỗ trợ WebGL.

## Nguồn gốc tài nguyên

- Ảnh minh họa được tạo bằng ImageGen, lưu trong `public/images/`; prompt và nguồn gốc ở [tài liệu ảnh](docs/IMAGE-PROMPTS.md).
- Phông chữ tiếng Việt được đóng gói nội bộ; trang cửa hàng không phụ thuộc CDN ảnh/phông chữ.

Kết quả kiểm tra giao diện và chức năng: [VERIFICATION.md](docs/VERIFICATION.md).

## Đưa lên hosting

Xuất thư mục `dist` bằng `npm run build`. Hosting cần SPA fallback về `index.html` cho `/thiet-ke`, đồng thời phục vụ nguyên các tài nguyên `/images/*`.

Để bán hàng thật, kết nối giỏ hàng/checkout với máy chủ hoặc nền tảng thương mại điện tử, xác thực giá và tồn kho phía máy chủ, bổ sung chính sách và thông tin cửa hàng, tích hợp vận chuyển và cổng thanh toán. Thanh toán QR thật cần tạo yêu cầu thanh toán ở máy chủ, ký/xác thực callback webhook từ đối tác và chỉ cập nhật trạng thái đơn sau khi xác minh. Không coi dữ liệu localStorage, trạng thái admin demo hoặc QR demo là dữ liệu đáng tin cậy phía máy chủ.
