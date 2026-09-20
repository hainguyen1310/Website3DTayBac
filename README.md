# Mộc Tây Bắc

Landing page bán sản vật Tây Bắc và trang tự thiết kế hộp quà. Dựng bằng React 19, TypeScript và Vite, tích hợp `@designcodeio/threeui@1.2.0`.

## Chạy dự án

Yêu cầu Node.js 22.12+ (đã kiểm tra bằng Node.js 24).

```sh
npm ci
npm run dev
```

Mở http://localhost:5173. Các trang:

- `/`: landing page, lọc danh mục, tìm kiếm có/không dấu, yêu thích, chi tiết sản phẩm và giỏ hàng.
- `/thiet-ke`: chọn 1–4 sản vật, màu hộp, họa tiết, tên người nhận, lời nhắn; xem trước và tính giá trực tiếp.
- `/trai-nghiem`: KageLandingPage nguyên bản từ ThreeUI.

```sh
npm run build
npm run preview
npm test
npm run verify:threeui
```

## Phạm vi bản hiện tại

- Thương hiệu Mộc Tây Bắc, danh mục, giá và hình ảnh là dữ liệu minh họa, cần được chủ cửa hàng duyệt và thay bằng dữ liệu thật trước khi mở bán.
- Giỏ hàng, yêu thích và bản thiết kế được lưu trong localStorage của trình duyệt. Không cần tài khoản.
- Luồng đặt hàng là bản mẫu có kiểm tra thông tin và xuất tệp JSON. **Chưa kết nối máy chủ, chưa gửi đơn, chưa thanh toán, chưa tính phí giao hàng.** Thông tin khách hàng chỉ ở bộ nhớ của trang và trong tệp nếu người dùng chủ động tải xuống.
- Không giả lập xác nhận đã nhận đơn hoặc giao dịch thành công.
- Trình thiết kế hiện dùng bản phối CSS/2D. Kage là cảnh đền Kyoto nguyên bản của ThreeUI, không phải mô hình sản phẩm hay cảnh Tây Bắc.

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

## ThreeUI và nguồn gốc

- Chỉ import renderer từ entrypoint được yêu cầu: `import { KageLandingPage } from '@designcodeio/threeui'`.
- `src/Scene.tsx` truyền đúng cả 8 props trong hướng dẫn đính kèm. Trang được tải khi vào `/trai-nghiem` để không làm nặng cửa hàng.
- Đã tải bundle đăng ký https://threeui.com/source-code/kage-landing-page.json và nguồn https://threeui.com/landing-pages/kage.html trước khi tích hợp.
- HTML, fonts.css, Three.js và 14 ảnh được sao chép nguyên byte từ package vào `public/landing-pages`, giữ nguyên đường dẫn.
- Hash chuẩn nằm trong `docs/threeui-manifest.json`. `npm run verify:threeui` kiểm tra 17 tệp; hash HTML là `c8e06b90397ac246baf0ab6f32f5f6b570acc6fe03c7009f711b579fb72d9f49`.
- Nguồn HTML/CSS/JS của Kage không bị viết lại; thư viện dùng iframe nội bộ theo đúng renderer của tác giả, không nhúng trang tài liệu ThreeUI.
- Các giấy phép và ghi chú bên thứ ba được giữ trong `docs/THREEUI-*`.
- Ảnh minh họa được tạo bằng ImageGen, lưu trong `public/images/`; prompt và nguồn gốc ở [tài liệu ảnh](docs/IMAGE-PROMPTS.md).
- Phông chữ tiếng Việt được đóng gói nội bộ; trang cửa hàng không phụ thuộc CDN ảnh/phông chữ.

Kết quả kiểm tra giao diện và chức năng: [VERIFICATION.md](docs/VERIFICATION.md).

## Đưa lên hosting

Xuất thư mục `dist` bằng `npm run build`. Hosting cần SPA fallback về `index.html` cho `/thiet-ke` và `/trai-nghiem`, đồng thời phục vụ nguyên các tài nguyên `/landing-pages/*` và `/images/*`.

Để bán hàng thật, kết nối giỏ hàng/checkout với máy chủ hoặc nền tảng thương mại điện tử, xác thực giá và tồn kho phía máy chủ, bổ sung chính sách và thông tin cửa hàng, tích hợp vận chuyển và cổng thanh toán. Không coi dữ liệu localStorage là giá hoặc đơn hàng đáng tin cậy phía máy chủ.
