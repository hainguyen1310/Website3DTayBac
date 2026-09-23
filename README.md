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
- `/admin`: dashboard quản trị thật, đăng nhập bằng Supabase Auth; CRUD sản phẩm + tồn kho, danh mục, đơn hàng, khách hàng, khuyến mãi, bài viết, hộp thư liên hệ, báo cáo và cài đặt cửa hàng.

Các đường dẫn cũ `/deal-hoi` và `/lien-he` được giữ để điều hướng về section tương ứng trên trang chủ.

```sh
npm run build
npm run preview
npm test
```

## Phạm vi bản hiện tại

- Danh mục, giá, bài viết, ưu đãi và câu thông báo được đọc từ Supabase (RLS công khai). Khi chưa cấu hình Supabase, cửa hàng tự dùng dữ liệu tĩnh trong `src/catalog.ts` và `src/shopData.ts`.
- Ảnh sản phẩm và nội dung thương hiệu vẫn là dữ liệu minh họa, cần chủ cửa hàng thay bằng dữ liệu thật trước khi mở bán.
- Giỏ hàng, yêu thích và bản thiết kế được lưu trong localStorage của trình duyệt. Không cần tài khoản để mua.
- Luồng đặt hàng ghi đơn thật vào Supabase qua RPC `create_checkout_order` (giá do database tính lại). QR chỉ mã hóa nội dung demo; thao tác “đã thanh toán” là mô phỏng tại trình duyệt. **Chưa có webhook cổng thanh toán nên đơn dừng ở trạng thái chờ thanh toán và tồn kho chưa bị trừ; chưa tính phí giao hàng.**
- Khu vực `/admin` yêu cầu tài khoản có `profiles.role` là `admin` hoặc `staff`. Tài khoản khác chỉ thấy màn hình từ chối truy cập. Xem hướng dẫn tạo tài khoản tại [docs/SUPABASE.md](docs/SUPABASE.md).
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

- Ảnh minh họa được tạo bằng ImageGen, lưu trong `public/images/`; prompt và nguồn gốc ở [tài liệu ảnh](docs/IMAGE-PROMPTS.md). Ảnh thật do cửa hàng tải lên được lưu trong Supabase Storage bucket `site-images` và ghi URL vào database.
- Phông chữ tiếng Việt được đóng gói nội bộ; trang cửa hàng không phụ thuộc CDN ảnh/phông chữ.

Kết quả kiểm tra giao diện và chức năng: [VERIFICATION.md](docs/VERIFICATION.md).

## Đưa lên hosting

Xuất thư mục `dist` bằng `npm run build`. Hosting cần SPA fallback về `index.html` cho `/thiet-ke`, đồng thời phục vụ nguyên các tài nguyên `/images/*`.

Để bán hàng thật, còn cần: Edge Function nhận webhook QR và gọi `confirm_gateway_payment` (để chốt thanh toán và trừ tồn kho), phí giao hàng, ảnh sản phẩm thật, chính sách và thông tin cửa hàng. Không coi trạng thái QR demo là dữ liệu đáng tin cậy phía máy chủ.
