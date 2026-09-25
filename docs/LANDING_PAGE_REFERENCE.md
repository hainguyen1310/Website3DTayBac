# Landing page theo ảnh tham chiếu

Cập nhật ngày 25/09/2026.

## Bố cục và nguồn dữ liệu

- `src/Home.tsx`: hero, dải giá trị, sản phẩm, bộ quà tặng, câu chuyện, tạp chí, đăng ký nhận tin.
- `src/moc-landing.css`: bố cục desktop theo ảnh tham chiếu, chuyển sang bố cục tablet/mobile ở 900px và 580px. Chữ, đường dẫn, nút và thẻ dữ liệu đều là HTML tương tác.
- Sản phẩm đọc `products` đang hoạt động, bao gồm tên, giá, ảnh, mô tả, `featured`. Ưu tiên sản phẩm trong ưu đãi hiện hành, rồi sản phẩm nổi bật và phần còn lại, giữ thứ tự database và không lặp thẻ.
- Ưu đãi đọc `promotion_products` kết hợp `promotions` đang bật, đã bắt đầu và chưa hết hạn. Giá bán dùng `products.price_vnd`, thống nhất với chi tiết sản phẩm, giỏ hàng và RPC checkout hiện có. Không tính giảm giá lần hai ở frontend.
- Bài viết đọc `articles` đã xuất bản, có `published_at` không nằm trong tương lai, sắp xếp mới nhất trước. Trang chủ hiển thị ba bài đầu.
- Không dùng giá/ảnh/số đánh giá giả để làm giống ảnh mẫu. Không có dữ liệu thì hiển thị trạng thái trống; truy vấn lỗi thì có thông báo và nút thử lại.
- Giỏ hàng, yêu thích và thiết kế quà chỉ được khôi phục/kiểm tra sau khi có danh mục thật, tránh mất lựa chọn khi danh mục đang tải.
- Form nhận tin lưu yêu cầu qua RPC `submit_contact_message` hiện có. Đây là lưu đăng ký, chưa phải tích hợp dịch vụ gửi email marketing.

Ảnh, tiêu đề và giá ở thẻ sản phẩm/tạp chí có thể khác ảnh mẫu vì đây là nội dung database. Phần copy thương hiệu và số liệu câu chuyện giữ theo mẫu người dùng cung cấp.

## Ảnh landing

Dùng công cụ imagegen tích hợp (không dùng CLI/API fallback). Bốn ảnh được tạo dựa trên ảnh tham chiếu, sau đó mã hóa JPEG chất lượng 90 để dùng trên web, không thay đổi kích thước hoặc bố cục ảnh:

| Tệp trong dự án | Mục đích |
| --- | --- |
| `public/images/landing-hero.jpg` | Nền núi rừng hero |
| `public/images/landing-gift.jpg` | Hộp quà xanh mở nắp giữa thiên nhiên |
| `public/images/landing-kraft.jpg` | Đôi tay gói quà giấy kraft |
| `public/images/landing-story.jpg` | Phong cảnh núi và ruộng bậc thang |

Tổng bốn JPEG khoảng 1,67 MB. Ảnh sản phẩm và bài viết không bị thay bằng các ảnh này.

### Prompt hero

```text
Use case: precise-object-edit. Asset type: clean photographic website hero background. Extract and recreate ONLY the mountain landscape photograph from the TOP HERO of the reference website. Output a panoramic 3:1 landscape image, high resolution. Keep the same scene and composition as reference 1: dark dense forest along the left third with quiet darker space behind future text; terraced green-gold rice slopes descending from left-center; layered misty Vietnamese northwest mountains in the background; warm sunrise at far upper right; a wooden hut in the lower right third. Use the second reference as detail for the same setting. Remove ALL text, logo, navigation, badges, circular stamps, buttons, paper, borders, leaves layered over the UI. Output ONLY an edge-to-edge real-looking photographic landscape; no website layout, no lettering, no watermark. Match the deep forest greens, warm gold sunlight, natural mist, and landscape viewpoint from reference 1 closely.
```

### Prompt hộp quà

```text
Use case: product-mockup. Create just the left-hand gift-box PHOTOGRAPH from the middle gift section of the attached website reference, as a standalone landscape 4:3 photographic asset. A dark forest-green premium hinged gift box resting on a mossy rock in a lush Vietnamese mountain forest. Lid open toward the camera, inside lid features a small cream 'mộc.' wordmark above fine gold mountain linework. Inside box: brown kraft wrapped tea at left and a glass amber honey jar at right separated by dark-green dividers. The box occupies the center-right 75% of the frame, leaving softly blurred forest and moss at far left for a separate paper tag which will be added in code. Match the reference's exact earthy forest mood, morning side light, tactile green paper, fine mountain engraving, slightly overhead camera angle. No website, no UI, no paper note overlays, no badges, no circular seals, no other text outside the small wordmark on the inside lid. Fill image edge to edge with photograph.
```

### Prompt phong cảnh câu chuyện

```text
Use case: photorealistic-natural. Asset type: landscape photo for the story section of a Vietnamese brand website. Recreate ONLY the mountain photograph in the CÂU CHUYỆN MỘC section of the provided reference image (below the gift boxes). Output a 2:1 landscape photo filling the canvas. Layers of rugged blue-green mountain ridges under pale morning sky, dense forest, warm yellow-green terraced rice fields entering from lower left and dark hills on right. Morning natural light from upper left. Match the reference's mountain silhouette and terrain. No text, no handwriting, no stamps, no logos, no paper edge or border; clean realistic photograph only.
```

### Prompt gói quà kraft

```text
Use case: product-mockup. Asset type: gift-wrapping detail photo for the gift section of a website. Recreate ONLY the photograph at the right of the gift section in the provided reference: close-up of two hands tying dark natural twine into a bow on a brown kraft paper gift box, with a tiny square kraft tag printed with 'mộc.'. Rustic wooden tabletop, warm soft side light, shadowy natural muted background. Output a landscape 3:2 photograph, box centered, hands entering from the top and right, tactile textured handmade kraft paper, forest-green and earthy brown palette. No UI, no paper note overlays, no border, no watermark. Photographic editorial styling closely matching reference.
```

## Kiểm chứng

- Đọc trực tiếp Supabase bằng publishable key: 12 sản phẩm đang bán, 3 ưu đãi và 4 bài viết tại thời điểm kiểm tra. Không sửa nội dung hoặc schema database.
- Kiểm tra giao diện local ở 320, 390, 768, 1024 và 1440px; carousel có vùng cuộn riêng trên điện thoại.
- Kiểm tra chuyển nhóm sản phẩm, mở chi tiết, thêm sản phẩm database-only vào giỏ và xóa riêng mục kiểm thử để khôi phục giỏ ban đầu.
- `npm test`: 7 bài kiểm thử về giá/giỏ/quà và lựa chọn sản phẩm/carousel.
- Chưa triển khai lên production và không tạo đơn hàng hoặc gửi đăng ký nhận tin thử vào database.
