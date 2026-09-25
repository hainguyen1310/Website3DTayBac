# A Sỉn — cập nhật giao diện và tên thương hiệu

## Giao diện

- Trang sản phẩm, giới thiệu, tạp chí và trang đọc bài dùng cùng nền giấy kem, xanh rừng, serif và hình ảnh với landing page.
- Newsletter dùng chung component với trang chủ; giữ nguyên cách lưu đăng ký hiện có.
- Danh mục, giá, ưu đãi và bài viết tiếp tục được đọc từ Supabase. Không thêm dữ liệu sản phẩm hoặc tin tức giả.
- `src/branding.ts` đổi tên thương hiệu cũ trong nội dung hiển thị lấy từ database. Không ghi đè bản ghi từ xa, ID, SKU, URL, địa danh Mộc Châu hoặc lời nhắn khách hàng.
- Giữ nguyên bảng màu, biểu tượng núi, tên route và khóa lưu giỏ hàng. Header trên màn hình nhỏ chia hai hàng để tên A Sỉn và ba liên kết điều hướng không bị chật.

## Ảnh thương hiệu

Công cụ: **image_gen tích hợp**, chế độ chỉnh sửa ảnh. Mỗi ảnh dùng chính ảnh gốc làm edit target. Chỉ yêu cầu thay chữ thương hiệu; giữ bố cục và màu sắc sát ảnh gốc. Sharp được dùng để mã hóa lại WebP/JPEG và giữ kích thước phù hợp cho website.

Các tệp sử dụng trong website:

- `public/images/tea.webp`
- `public/images/honey.webp`
- `public/images/spice.webp`
- `public/images/jerky.webp`
- `public/images/landing-gift.jpg`
- `public/images/landing-kraft.jpg`

Prompt cho từng ảnh (thay `{filename}` bằng tên tương ứng trong danh sách trên):

> Use case: text-localization. Edit target: the attached existing website photograph {filename}. Change ONLY the printed brand name on the packaging from "MỘC" or "mộc." to the exact Vietnamese brand name "A Sỉn" (A, space, S, i with hook above, n). For the open gift box, replace BOTH the logo inside the lid AND the small logo on the honey jar. Preserve the exact original scene, objects, colors, materials, lighting, crop, composition, label illustrations, hands, mountains, background, and existing aspect ratio. Set the new lettering in the same elegant serif style, ink color and placement as the original wordmark, with accurate Vietnamese diacritic. No other visual redesign. No added text. Return the edited photograph only.

## Kiểm tra

- Build TypeScript/Vite và bộ kiểm thử hiện có, kèm kiểm thử đổi tên thương hiệu.
- Trình duyệt local: tìm kiếm, lọc danh mục, sắp xếp giá, mở chi tiết, yêu thích, thêm/xóa sản phẩm kiểm thử trong giỏ; lọc chủ đề và mở nội dung bài viết.
- Responsive ba trang tại 320px, 390px, 768px và desktop; trang đọc bài tại desktop và 390px.
- Bản xem trước: `http://127.0.0.1:4173/`. Không triển khai production trong lần thay đổi này.
