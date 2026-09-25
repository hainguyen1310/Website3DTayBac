# Nền giấy A Sỉn

Trạng thái: đang dùng `public/images/paper-do-warm-crumpled.png`, giấy kem beige đậm nhẹ hơn với các nếp nhàu mềm, tạo ngày 25/09/2026.

- Asset: `public/images/paper-do-warm-crumpled.png`. Bản trước vẫn được giữ tại `public/images/paper-do-seamless.png`.
- Generated with the built-in imagegen tool on 2026-09-25; no CLI/API-key fallback.
- Giữ nền riêng từng section và kích thước lặp 1000 px. Lớp phủ kem trên landing giảm từ 87% xuống 72%; các trang nội dung giảm từ 91% xuống 76% để nếp giấy nhìn rõ nhưng chữ vẫn dễ đọc.
- Dùng cùng ảnh mới cho nhãn quà, ghi chú và lớp texture nền xanh. Bố cục, animation và ảnh Hero giữ nguyên.
- Style reference: ảnh người dùng `codex-clipboard-8da3dada-a8dc-40cf-8be1-7a237132a76d.png`.
- The torn corner uses the existing `public/images/paper_tear_hero.png`, resized only through CSS.

## Chuyển tiếp giữa các section

- `src/paper-transitions.css` dùng hai mặt nạ SVG `paper-edge-soft.svg` và `paper-edge-deckled.svg` để tạo mép giấy thấp, có độ cong và xơ nhỏ. Các section vẫn sở hữu nền riêng.
- Mép giấy lấy đúng nền của section, bù vị trí texture theo chiều cao mép để không xuất hiện một dải màu trơn khác tông. Có đường bóng mảnh giữa các lớp giấy.
- Bản tin không cắt toàn bộ section bằng polygon nữa. `moc-newsletter-edge` chồng lên nền giấy phía trên, dùng cùng nền xanh và texture với phần thân. Chiều cao mép giới hạn 28–46 px, không phụ thuộc chiều cao nội dung form.
- Kiểm tra trình duyệt ở 320, 390, 768, 1440 và 1920 px: không tràn ngang; section liên hệ và bản tin sát nhau, mép xanh phủ lên vùng giấy. Build TypeScript/Vite thành công.

## Final generation prompt

Use case: photorealistic-natural.
Asset type: seamless repeating paper background for the A Sỉn website.
Input image 1 is a STYLE REFERENCE for the aged paper grain, not an edit target. Generate a NEW square 1024x1024 texture.
Primary request: warm cream-beige handmade paper, a little richer and darker than pale ivory, with a small amount of gentle crumpling. Base tone around #e6dac2, softly mottled beige and warm taupe fibers. Fine organic grain with shallow, irregular softly rounded wrinkles and a few broad relaxed creases, as if a sheet was gently crumpled once and then carefully flattened. Restrained, elegant, tactile, suitable behind dark green website text.
Composition: flat top-down macro scan, paper fills the entire image, one continuous surface. All four edges must match for seamless horizontal and vertical tiling. Distribute texture and delicate wrinkles naturally across the whole surface.
Lighting: even diffuse illumination, very subtle local crease shading, low to moderate contrast.
Avoid: text, symbols, objects, sheet boundaries, framing, dark vignette or dark corners from the reference, heavy stains, torn holes, strong fold grid, prominent diagonal fold, shiny plastic, harsh shadows, thick cracks, overly busy or heavily distressed texture.
