# Chuyển động giao diện A Sỉn

Hiệu ứng nằm trong `src/storefront-motion.css`; `useStorefrontMotion` theo dõi các phần tử có `data-reveal` trong nội dung storefront. Không áp dụng vào trang quản trị.

- Hero: cảnh núi thu nhẹ về vị trí gốc, ba dòng tiêu đề xuất hiện lệch nhịp, tiếp đến mô tả và nút thiết kế quà. Chạy một lần khi mở trang.
- `rise`: chữ, thẻ sản phẩm và các con số đi lên 26 px.
- `soft`: nội dung tạp chí, giá trị thương hiệu và form hiện dần, không dịch chuyển.
- `photo`: ảnh ghép xuất hiện với góc nghiêng nhẹ; giữ nguyên góc xoay có sẵn của thiết kế.
- `landscape`: cảnh núi và hộp quà mở nhẹ từ 95.5% đến kích thước gốc.
- `side`: một số khối nội dung chuyển ngang 22 px để đổi nhịp.
- Hover: thẻ nổi nhẹ, ảnh zoom chậm, mũi tên tiến về trước; nút bấm có phản hồi khi nhấn. Thiết bị cảm ứng không có hiệu ứng nâng thẻ khi hover.
- Trang thiết kế: đổi bước trong 350 ms, dấu chọn sản phẩm bật nhẹ.

Mỗi phần tử chỉ hiện một lần trong vòng đời của nó; dữ liệu mới tải từ database vẫn được quan sát. Đổi danh mục không phát lại các thẻ còn giữ nguyên. Hiệu ứng dùng opacity và transform/translate/scale/rotate, không animate kích thước bố cục và không thêm thư viện.

`prefers-reduced-motion` và bản in luôn hiển thị toàn bộ nội dung. Chuyển chế độ giảm chuyển động khi đang mở trang cũng bỏ ngay các trạng thái ẩn. Tab bàn phím vào một khối sẽ làm khối đó hiện tức thì. Không có IntersectionObserver thì nội dung hiển thị bình thường. Observer được dọn khi đổi route, không có listener cuộn liên tục.

## Kiểm tra ngày 25/09/2026

- Build TypeScript/Vite thành công.
- Kiểm tra trình duyệt với dữ liệu Supabase local: Hero, section khi cuộn, lọc danh mục, chuyển trang sản phẩm/giới thiệu/tạp chí/chi tiết bài viết và đổi bước thiết kế quà.
- Kiểm tra ở 320, 390, 768 và 1440 px; các màn hình được kiểm tra không tràn ngang. Nội dung đã hiện không chuyển lại về trạng thái ẩn khi cuộn.
- Link Liên hệ giữ đúng khoảng cách dưới header. Tab vào form bản tin đang chờ hiệu ứng làm form hiện tức thì. Không ghi nhận lỗi JavaScript trong lượt kiểm tra.
- Quy tắc reduced motion và print đã được kiểm tra trong mã nguồn; chưa giả lập tùy chọn hệ điều hành trong trình duyệt.
