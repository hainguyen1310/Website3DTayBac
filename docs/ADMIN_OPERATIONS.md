# A Sỉn — rà soát và vận hành quản trị

Cập nhật ngày 25/09/2026. Đây là mô tả bản mã nguồn và kết quả kiểm thử cục bộ, **không phải xác nhận đã triển khai lên Supabase/Vercel thật**.

## Kết quả rà soát

Trước thay đổi, admin chưa đủ để vận hành độc lập: thiếu nội dung landing page, hồ sơ khách chỉ có thông tin cơ bản, hộp thư không có lịch sử phản hồi, COD thiếu bước xử lý phù hợp và một số thao tác ghi nhiều bảng có thể lưu dở dang. Các phần sau đã được bổ sung:

| Khu vực | Cấu trúc và nghiệp vụ hiện tại |
|---|---|
| Sản phẩm | Tên, slug tự gợi ý, SKU, danh mục quan hệ, xuất xứ, quy cách, giá, ảnh tải lên, mô tả, thứ tự, trạng thái bán/nổi bật, tồn và ngưỡng cảnh báo. Sản phẩm và tồn kho lưu trong một transaction. Form cũ bị chặn nếu tồn kho đã thay đổi. |
| Danh mục | Trang quản lý riêng, tên/slug/thứ tự, số sản phẩm sử dụng. Chặn xóa danh mục đang có sản phẩm. |
| Khuyến mãi | Mã/tên, bật/tắt, thời gian bắt đầu/kết thúc, từng sản phẩm chọn từ database, giá gốc/% giảm/giá áp dụng, nhãn, thông tin thêm, tông màu, sắp xếp. Lưu toàn bộ chương trình và dòng hàng nguyên tử; không cho sản phẩm trùng. Giữ ràng buộc không chồng thời gian của dự án. |
| Bài viết | Tiêu đề, slug tự gợi ý, chuyên mục, mô tả, ảnh, thời lượng đọc, nội dung từng đoạn, nháp/xuất bản/lịch xuất bản. Bài tương lai không lọt ra storefront. Không cho xuất bản nội dung trống. |
| Nội dung website | Hero, các giá trị thương hiệu, phần sản phẩm, quà tặng, câu chuyện/chỉ số, tạp chí, trang sản phẩm/giới thiệu, ảnh, CTA, thông tin liên hệ, bản tin và hướng dẫn mua hàng/vận chuyển/đổi trả. Form chia nhóm; sản phẩm, ưu đãi, bài viết tiếp tục lấy từ bảng nghiệp vụ. |
| Khách hàng | Tên, email/điện thoại, địa chỉ, công ty, nguồn đầu tiên, nhóm khách, nhãn, ghi chú, tương tác gần nhất, lựa chọn nhận tin, lịch sử đơn và liên hệ có liên kết hai chiều. Lọc và xuất kết quả CSV. Có thao tác ghi nhận khách ngừng nhận tin. |
| Liên hệ | Danh sách có lọc, ưu tiên, người phụ trách; chi tiết có luồng thư, ghi chú nội bộ, soạn trả lời, trạng thái SMTP, gửi lại thư thất bại, thông tin khách, phân loại, mã đơn khách cung cấp. Liên hệ cũ chưa rõ khách có chọn hồ sơ để liên kết thủ công. |
| Đơn hàng | Thông tin người nhận được chụp tại thời điểm đặt; email/ghi chú; mã vận đơn/đơn vị giao; bước trạng thái hợp lệ; xác nhận COD, tồn kho, lý do hủy, ghi nhận hoàn trả toàn bộ và đối soát. |
| Cài đặt | Phí giao hàng/ngưỡng miễn phí, thông báo cửa hàng, trạng thái cấu hình SMTP/IMAP, phân quyền, mời nhân viên qua email, nhật ký thao tác. Không có ô JSON cấu hình thô. |
| Báo cáo | Đơn theo trạng thái, giá trị đơn đã thu tiền, sản phẩm, phương thức thanh toán, 7/30/90 ngày, CSV. Ngày tính theo Việt Nam; không âm thầm giới hạn ở 100/200/1.000 đơn đầu tiên. |

Giao diện dùng chung khoảng cách, nhãn, ô nhập, nút hành động và trạng thái lỗi/rỗng/đang tải. Các form dài là trang làm việc có thanh lưu; form khuyến mãi dùng các khối sản phẩm thay cho bảng nhập liệu quá rộng. Bảng danh sách trên mobile cuộn ngang bên trong, không đẩy toàn bộ trang.

## Vai trò và cách vận hành

- **Nhân viên vận hành:** tổng quan, đơn hàng, sản phẩm/tồn kho, khách hàng, liên hệ, báo cáo. Ghi nhận thông tin giao hàng, chuyển đơn theo bước, chăm sóc khách từ lịch sử thống nhất.
- **Marketing:** sản phẩm, khuyến mãi, bài viết và nội dung website. Không được đọc đơn hàng, hồ sơ khách hoặc hộp thư chỉ bằng cách gọi API trực tiếp.
- **Admin:** toàn bộ các phần trên, cài đặt, quyền nhân viên, mời tài khoản và ghi nhận hoàn trả. Không tự thay vai trò của tài khoản đang đăng nhập.
- **Khách mua hàng:** không cần đăng nhập. Chỉ gọi RPC đặt hàng/liên hệ; không được đọc dữ liệu CRM, email hoặc đơn của người khác.

Quyền được kiểm tra tại RLS/RPC/API máy chủ, không chỉ ẩn menu. Đã bỏ policy cho phép người dùng tự sửa vai trò của chính mình. Nhật ký không cho nhân viên sửa/xóa.

### Hồ sơ khách và liên hệ

1. Khách gửi form với tên, email nhận phản hồi, điện thoại tùy chọn, chủ đề, tiêu đề, mã đơn tùy chọn và nội dung. Checkbox marketing mặc định tắt.
2. Database chuẩn hóa email, điện thoại `+84`/`0`, tìm hồ sơ tương ứng và liên kết yêu cầu. Khi thông tin trùng nhiều hồ sơ hoặc email/điện thoại chỉ tới hai người khác nhau, dừng để đối chiếu; không tự nhập hai người làm một.
3. Đặt hàng dùng lại hồ sơ tương ứng. Không ghi đè tên/hồ sơ cũ từ một form công khai; thông tin người nhận của từng đơn có bản riêng.
4. Nhân viên mở **Liên hệ**, phân công/ưu tiên, mở hồ sơ, ghi chú hoặc trả lời. Ghi chú nội bộ không gửi email.
5. Email khách trả lời được nhập từ IMAP khi bấm **Nhận email mới**. Chỉ nối vào luồng có token tham chiếu và đúng email người gửi; thư không khớp tạo yêu cầu mới. Chống nhập trùng theo Message-ID và UID.

Việc khách khai email/điện thoại không chứng minh họ sở hữu địa chỉ đó. Đây là CRM khách vãng lai; không dùng hồ sơ này làm cơ chế xác thực hoặc cho khách xem lịch sử của người khác.

### COD, hủy và hoàn trả

- Khách xác nhận → chờ xác nhận → đóng gói → đang giao → hoàn tất.
- Giá, khuyến mãi, phí giao hàng và tồn khả dụng được tính lại ở database. Một mã yêu cầu chỉ được dùng cho một nội dung đặt hàng.
- Tồn kho trừ khi chuyển sang đóng gói; hai nhân viên xử lý đồng thời không trừ hai lần. Đơn QR cũ đã trừ tồn qua webhook không trừ lại lúc đóng gói.
- Chuyển sang đang giao cần đơn vị vận chuyển và mã vận đơn. Hoàn tất COD cần tích xác nhận đã nhận/đối soát đủ tiền.
- Đơn chưa thu tiền có thể hủy trước khi giao, phải có lý do; hoàn lại tồn nếu đã trừ.
- Admin ghi nhận hoàn trả cho đơn đã thu tiền hoặc đã giao: lý do, mã đối soát hoàn tiền, xác nhận hoàn đủ tiền và nhận lại hàng khi cần. Chọn nhập lại tồn chỉ khi hàng đủ điều kiện bán lại. Chặn xử lý lặp.
- **Ghi nhận hoàn tiền không thực hiện chuyển tiền ngân hàng.** Hiện hỗ trợ hoàn toàn bộ đơn; chưa có hoàn một phần hoặc đổi từng dòng hàng.

Báo cáo hiện là giá trị các đơn đang ở trạng thái đã thu tiền, nhóm theo ngày đặt. Đơn hủy/hoàn toàn bộ được loại ra; đây không phải sổ kế toán dòng tiền theo ngày thu/chi.

## SMTP và nhận email

Thông số người dùng đã xác nhận:

```ini
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_FROM=noreply@asintaybac.com
```

API đặt tại `api/contact-reply.ts`, `api/mail-sync.ts`, `api/staff-invite.ts`, chạy trên **Node/Vercel**. Supabase vẫn giữ Auth/database/Storage. Lý do chọn Node: [Supabase Edge Functions chặn cổng 587](https://supabase.com/docs/guides/functions/limits), trong khi [Vercel hỗ trợ SMTP cổng 587/465](https://vercel.com/kb/guide/sending-emails-from-an-application-on-vercel).

Thiết lập các biến **server** trong Vercel Environment Variables:

| Biến | Nội dung |
|---|---|
| `SUPABASE_URL` | Cùng project với frontend |
| `SUPABASE_SERVICE_ROLE_KEY` | Khóa server, không có tiền tố `VITE_` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM` | Như trên |
| `SMTP_USER`, `SMTP_PASSWORD` | Thông tin SMTP do quản trị hộp thư cấp; chưa được cung cấp/cấu hình trong phiên này |
| `EMAIL_REPLY_TO` | Tùy chọn; hộp thư nhận phản hồi thực sự nếu khác `SMTP_FROM` |
| `APP_ORIGIN` | URL website thật, dùng cho lời mời nhân viên |
| `IMAP_HOST`, `IMAP_PORT` | Máy chủ nhận thư; cổng mặc định 993/TLS. Chưa xác nhận hộp thư nhận |
| `IMAP_USER`, `IMAP_PASSWORD` | Có thể dùng riêng; nếu để trống sẽ dùng tài khoản SMTP |
| `IMAP_FOLDER` | Mặc định INBOX; nên là hộp thư riêng dành cho chăm sóc khách |
| `IMAP_SINCE` | Tùy chọn ngày bắt đầu lần đồng bộ đầu; mặc định 30 ngày gần nhất |

Chỉ đưa khóa công khai và URL vào các biến `VITE_`. Không nhập mật khẩu vào chat, form CMS hoặc Git. File `.env.example` chỉ chứa mẫu. Môi trường QA có `.env.qa.local` bị Git bỏ qua và chỉ chứa khóa của Supabase cục bộ.

Trạng thái `sent` nghĩa là SMTP đã chấp nhận thư, không đồng nghĩa thư đã đến hộp thư khách hoặc đã được đọc. Lỗi SMTP chắc chắn bị từ chối có nút gửi lại trên cùng bản ghi; kết quả không chắc chắn sau timeout được giữ để kiểm tra, không tự gửi lại. Mã Message-ID và References được lưu để nối hội thoại.

Nhận thư hiện dùng nút đồng bộ thủ công, tối đa 30 thư/lượt với con trỏ tiếp tục. Chỉ hiển thị văn bản, không tải ảnh từ email hoặc thực thi HTML. Email lớn hơn 10 MB cần được xử lý trực tiếp trong hộp thư trước khi tiếp tục. Chưa có giao diện tệp đính kèm, lịch chạy IMAP tự động, chỉ báo đã đọc hoặc webhook xác nhận giao thư của Gmail.

`SMTP_FROM` phải là hộp thư/địa chỉ gửi mà tài khoản SMTP được phép sử dụng. Cần thử gửi thật và trả lời từ một hộp thư kiểm thử được chỉ định sau khi cấu hình; phiên này chưa gửi email ra ngoài.

### Mời nhân viên

Admin vào **Cài đặt → Mời nhân viên mới**, nhập tên/email và chọn vận hành hoặc marketing. Máy chủ tạo link Supabase Auth và gửi qua SMTP; không trả link đăng nhập hay mật khẩu về API/UI. Nhân viên xác thực email rồi tự đặt mật khẩu tại `/admin?setup=password`.

Trong Supabase Auth, thêm URL thật `https://<domain>/admin?setup=password` vào Redirect URLs và đặt Site URL đúng website. Lời mời không ghi đè quyền của tài khoản đã hoạt động. SMTP chưa cấu hình thì không tạo lời mời.

## Đưa lên môi trường thật

1. Sao lưu và kiểm tra email/điện thoại cũ bị trùng hoặc sai định dạng. Giữ bản ghi để đối chiếu, không gộp dựa trên tên.
2. Đăng nhập/link Supabase CLI đúng project; chạy `npx supabase db push --dry-run`, xem thứ tự, rồi `npx supabase db push`. Áp dụng toàn bộ migration theo tên, gồm 4 migration cũ và 8 migration ngày `20260925` từ `000000` đến `000007`.
3. **Không chạy seed demo hoặc script QA trên production.** Seed có tài khoản demo và dữ liệu minh họa. Script QA chủ động từ chối URL khác localhost:54321.
4. Cấu hình các biến Vercel ở bảng trên; thiết lập Supabase Auth Redirect URLs. Tài khoản admin đầu tiên vẫn cần được khởi tạo trong Supabase Auth và cấp role admin một lần.
5. Triển khai frontend cùng các API Node trong thư mục `api/`. `vite preview` chỉ phục vụ static build, không chạy API email; local dùng `npm run dev`, production dùng Vercel Functions.
6. Kiểm tra thực tế với tài khoản admin/staff/MKT: upload ảnh, lưu sản phẩm/khuyến mãi/bài viết/CMS, gửi liên hệ, đặt COD, đóng gói, giao, đối soát, và kiểm tra hồ sơ cùng lịch sử.
7. Sau khi có hộp thư kiểm thử được chỉ định: gửi một phản hồi, kiểm tra hộp thư nhận, trả lời lại và bấm **Nhận email mới** để xác minh IMAP/nối luồng. Kiểm tra alias gửi, TLS và cấu hình nhà cung cấp nếu bị từ chối.

Các bước đăng nhập Supabase hosted, cấu hình SMTP/IMAP thật, migration hosted, deploy Vercel mới và gửi/nhận email thật **chưa được thực hiện trong phiên này**.

## Kiểm thử cục bộ có thể chạy lại

```powershell
npm ci
npx supabase start -x studio,imgproxy,realtime,logflare,vector,supavisor
npx supabase migration up --local
node scripts/qa-admin.mjs
npm run dev -- --mode qa --host 127.0.0.1 --port 4174
npm test
npm run build
```

Docker và cổng 54321/54322 cần sẵn sàng. `scripts/qa-admin.mjs` tạo tài khoản và dữ liệu giả trong Supabase local, tải một ảnh lên Storage local, sinh `.env.qa.local` và ghi ID fixture vào `test-results/admin-fixture.json`. Nó không gọi SMTP thật; mock phương thức gửi của Nodemailer và kiểm tra database thật.

Các kiểm thử đã chạy qua:

- CRM khách vãng lai, chuẩn hóa số điện thoại, giữ nguyên hồ sơ cũ, consent mặc định tắt, chặn trùng danh tính.
- RLS với anon/customer/marketing/operations/admin; chặn tự nâng quyền, sửa thanh toán hoặc sửa tồn kho trực tiếp.
- Tạo và gửi lại cùng đơn; chặn đổi nội dung với cùng mã; COD, stock, QR không trừ hai lần, hoàn trả chỉ admin và hoàn tồn một lần.
- Upload ảnh local; tạo/sửa sản phẩm; transaction khuyến mãi rollback đúng; bài tương lai không công khai; nội dung trắng bị chặn.
- Ghi chú, nhập email đúng luồng và chống trùng; SMTP mock: quyền, STARTTLS, người nhận từ dữ liệu đã lưu, phản hồi thành công, gửi lại lỗi chắc chắn, timeout không gửi trùng; mời nhân viên với Auth local.
- Kiểm thử trình duyệt: gửi form liên hệ, lưu ghi chú và metadata ticket, sửa CRM, điều hướng liên kết, sửa CMS và xác minh nội dung xuất hiện trên trang công khai. Kiểm tra form và bố cục ở desktop/mobile.

Chưa thể coi website thật đã sẵn sàng gửi/nhận thư chỉ từ kết quả các kiểm thử trên. Cần hoàn tất các bước kích hoạt môi trường thật.
