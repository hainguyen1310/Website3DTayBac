# Rig và animation hộp quà 3D (từ 11/2026)

Hai hộp quà ở trang `/thiet-ke` và khối "Mở hộp quà 3D" trang chủ không còn tách nắp bằng code lúc tải.
Mỗi hộp là một GLB có **rig và animation dựng sẵn trong Blender**; web chỉ phát clip.

## Đường đi của file

```
file combo gốc của hoạ sĩ (hop lon/*.glb, hop nho/*.glb — KHÔNG có animation)
   │  blender -b -P scripts/gift3d/blender/build_gift_rigs.py -- --source <thư mục> --out assets-src/3Dfile/rigs
   ▼
assets-src/3Dfile/rigs/box-{large,small}.blend      (mở bằng Blender để chỉnh keyframe)
assets-src/3Dfile/rigs/box-{large,small}.rig.glb    (chưa nén: lưới + nút neo + 2 clip)
   │  node scripts/build-gift-models.mjs
   ▼
public/models/gift/box-{large,small}.glb            (đã nén, web tải)
public/models/gift/{bag,jar,bottle}-*.glb           (từng món, tâm X/Z = 0, đáy Y = 0)
public/models/gift/pack-*.glb                       (hộp giấy con + tem của từng loại túi)
public/models/gift/layout.json + src/storefront/gift/layout.generated.ts
```

`assets-src/` không nằm trong git. Muốn dựng lại rig cần Blender 5.x và thư mục combo gốc. Sáu file
combo mà hai lệnh trên cần được chép sẵn ở `assets-src/3Dfile/sản phẩm 2026-11/` (mặc định của
`build-gift-models.mjs`; đặt `GIFT3D_SOURCE` để trỏ nơi khác):

```
blender -b -P scripts/gift3d/blender/build_gift_rigs.py -- --source "assets-src/3Dfile/sản phẩm 2026-11" --out assets-src/3Dfile/rigs
node scripts/build-gift-models.mjs
npm test
```

Các chốt chặn dọc đường, để một lần xuất lại lệch chuẩn không lặng lẽ ra web:

- `build_gift_rigs.py` báo lỗi khi lưới hộp lớn không tách được đủ khối (cánh dính vào thân, hai cánh
  lệch diện tích, khoen ôm nhầm ngăn kéo) hoặc file nguồn thiếu bình rượu / hộp giấy; và in số mặt
  "lạc màu" đã sửa ở từng khối (hiện tại: thân 25, cánh trái 16, cánh phải 1).
- `build-gift-models.mjs` dựng mọi thứ vào thư mục tạm, kiểm hai clip (đủ `open` + `bloom`, cùng thời
  lượng, cùng bộ kênh) rồi mới thay file trong `public/models/gift`; một lần dựng hỏng giữa chừng (thiếu
  nút, rig lệch hợp đồng…) không để lại GLB mới đi kèm layout cũ. Bước thay file cuối cùng chỉ là chép
  vài chục file nhỏ, không phải một giao dịch: nếu chính bước đó hỏng (đĩa đầy), chạy lại lệnh.
- `tests/gift-models.test.ts` đọc chính các GLB đang phát hành và kiểm lại hợp đồng bên dưới.
- Trên web, vỏ hộp thiếu clip hoặc thiếu điểm neo làm khung 3D báo lỗi (trang chủ chuyển sang hộp CSS)
  thay vì hiện hộp trống.

Xem nhanh một GLB (kể cả bản đã nén): `node scripts/gift3d/inspect-glb.mjs <file>` (cây nút, lưới, ảnh)
và `node scripts/gift3d/inspect-anim.mjs <file>` (các kênh của từng clip). Khi sửa script dựng rig mà
không định đổi hình học, so `node scripts/gift3d/hash-meshes.mjs <rig.glb>` trước và sau: lệnh dựng cho
kết quả lặp lại được nên lưới và UV phải trùng từng byte.

## Hợp đồng của GLB hộp (`box-large.glb`, `box-small.glb`)

Toạ độ glTF: X sang phải, Y lên trên, Z ra phía người xem. Đáy hộp ở Y = 0, tâm thân hộp ở X = 0.

**Tên nút (không đổi, web tìm theo tên):**

| Nút | Hộp | Ý nghĩa |
| --- | --- | --- |
| `box` | cả hai | gốc của hộp; clip dịch/nghiêng cả hộp qua nút này |
| `slot_bagA`, `slot_bagB` | cả hai | điểm neo hai túi: tâm đáy hộp giấy con (A = bên trái khi nhìn từ trước) |
| `slot_jar`, `slot_cham` | nhỏ | điểm neo hũ thịt xé và hũ chẩm chéo: tâm đáy của món |
| `slot_bottle` | lớn | điểm neo bình rượu: tâm đáy của bình |
| `rise_*` | cả hai | cha của `slot_*`, đặt ở mép đáy trước của món; clip `bloom` nhấc và ngả món qua nút này |
| `lift_bottle` | lớn | cha của `rise_bottle`; bình chìm vào ổ lụa khi hộp đóng |
| `wing_L`, `wing_R`, `drawer`, `ring` | lớn | hai cánh vỏ (bản lề ở mép đáy), ngăn kéo, khoen kéo |
| `lid`, `flap` | nhỏ | nắp (bản lề ở mép trên vách sau) và vạt nam châm (con của `lid`) |
| `*_mesh` | cả hai | lưới, con của nút trục tương ứng, không có animation riêng |

Nút `slot_*` và `rise_*` là nút rỗng: bước tối ưu phải giữ lại (`prune({ keepLeaves: true })`).

**Clip (cùng thời lượng trong một hộp, lấy mẫu 30 khung/giây):**

| Clip | Nút kiểu mở | Nội dung |
| --- | --- | --- |
| `open` | "Hé nắp" | hộp mở; các món nằm yên (hộp lớn: bình rượu nhô lên khỏi ổ lụa, hai túi đi theo ngăn kéo) |
| `bloom` | "Bung hương vị" | cùng cơ cấu mở, cả hộp bay lên, các món cùng nhấc khỏi ngăn, tiến ra trước, ngả mặt 39° |

Thời điểm 0 = đóng kín; cuối clip = dáng mở của mô hình gốc. Dáng nghỉ của các nút (không phát clip)
là dáng mở. Mỗi clip có đủ kênh cho mọi nút động nên web trộn hai clip bằng trọng số (tổng = 1)
khi khách đổi kiểu mở.

Hộp lớn 3,4 giây; hộp nhỏ 2,6 giây (chuyển động cuối cùng dừng trước đó chừng 0,1 giây). Ở `bloom`
của hộp lớn ngăn kéo kéo ra hết (25,8 thay vì 10,7) để hai túi nhấc lên không xuyên qua khay trên.

## Màn chào "hộp tự mở" trên trang `/thiet-ke`

Khung 3D của trang thiết kế truyền `lid.intro` cho `ModelStage`. Khi mọi mô hình đã tải và camera đã canh
khung, hộp hiện ở dáng đóng, nghỉ 0,35 giây (tính từ lúc vỏ hộp bật lên xong) rồi tự phát clip mở tới mức
mở hiện tại của trang, đúng một lần cho mỗi lần vào trang; đổi món hay đổi cỡ hộp không phát lại. Trong
lúc đó các món nằm sẵn trong ngăn, không rơi từ trên xuống xuyên qua nắp. Khách bấm "Đóng hộp/Mở hộp",
kéo thanh "Mức mở hộp" hoặc đổi kiểu mở trước thì màn chào bị bỏ và hộp đi tiếp từ dáng đang hiện; khách
muốn giảm chuyển động thì không có màn chào. Trạng thái `opening` của trang không đổi (thanh trượt vẫn
hiện 100% ngay từ đầu). Logic nằm ở `advanceLid` trong `src/storefront/three/boxRig.ts`.

Trang báo "khách đã tự điều khiển" bằng cách chuyển `lid.intro` về false (`steer` trong
`src/site/gift/GiftPreview.tsx`, chỉ ba nút điều khiển trên gọi). Những thay đổi do trang tự làm — món
chọn sẵn từ trang sản phẩm (`?san-pham=`), bản nháp từ trang chủ, đổi cỡ hộp — không bỏ màn chào: hộp vẫn
nghỉ một nhịp rồi mở tới mức mở mới. Nếu khách đã để hộp đóng rồi quay lại trang (không kèm món chọn sẵn),
hộp giữ dáng đóng cho tới khi khách bấm "Mở hộp".

Khối "Mở hộp quà 3D" ở trang chủ không dùng màn chào: hộp đóng cho tới khi khách bấm "Mở hộp".

## Món đặt vào hộp

- Món (`bag-*`, `jar-*`, `bottle-*`) gắn làm con của `slot_<ngăn>` tại vị trí `seat` trong
  `GIFT_LAYOUT.products[<tên file>]` (hũ, bình: `[0, 0, 0]`).
- Túi nằm trong hộp giấy con có tem theo loại túi: `pack-*.glb` gắn vào cùng `slot_bag*` tại `[0, 0, 0]`,
  túi đặt lệch `seat` so với đáy hộp giấy.
- Hộp lớn mới chỉ có ngăn cho **hai túi và bình rượu**; mô hình không có chỗ cho hũ thịt xé và chẩm chéo.
  Từ 20/11/2026 quy tắc bán hàng đi theo mô hình (xem mục "Hộp chứa những gì" bên dưới).
- Nếu một món trong hộp không dựng được (sản phẩm chưa có mô hình 3D, hoặc sau này quy tắc và mô hình
  lại lệch nhau), trang `/thiet-ke` ghi rõ dưới khung 3D "Mô hình 3D chưa thể hiện: …" thay vì lặng lẽ
  bỏ qua (`undrawnItems` trong `src/storefront/gift/giftScene.ts`). Với hai mẫu hộp hiện tại dòng này
  không xuất hiện; `tests/gift-scene.test.ts` kiểm mọi ngăn hộp bán ra đều có điểm neo trong mô hình.

## Hộp chứa những gì

| Hộp | Khách tự chọn | Kèm sẵn | Giá trọn hộp |
| --- | --- | --- | --- |
| Sinh Lộc (`medium`) | hai túi + một hũ thịt xé | chẩm chéo | 300.000đ |
| Thịnh Đỉnh (`large`) | hai túi | bình rượu ngô Bản Phố | 500.000đ |

Quy tắc khai báo ở hai nơi và phải khớp nhau:

- Trình duyệt: `boxSizes` trong `src/catalog.ts`. Trình tạo hộp (`src/site/gift/*`), giỏ hàng và khung 3D
  đều suy ra từ đó (`choosableSlots`, `includedProductIds`, `choosableSlotsOf`).
- Máy chủ: hàm `public.checkout_order_internal` (migration
  `supabase/migrations/20261120000000_thinh_dinh_two_bags_and_wine.sql`) tự thêm món kèm sẵn theo cỡ hộp
  và từ chối quá số món tự chọn (Sinh Lộc 3, Thịnh Đỉnh 2); danh sách `included` do trình duyệt gửi không
  được tin. Kiểm trên Supabase local bằng `supabase/tests/gift_box_contents_checks.sql`.

Khi triển khai: đưa giao diện mới lên trước rồi chạy migration ngay sau đó. Chạy migration trước thì đơn
Thịnh Đỉnh gửi từ giao diện cũ (hai túi + một hũ) bị từ chối với thông báo yêu cầu tải lại trang. Giỏ hàng
đã lưu của khách tự bỏ món ở ngăn hũ của hộp Thịnh Đỉnh khi mở lại trang (`cleanDesign`).

## Chỉnh animation

1. Mở `assets-src/3Dfile/rigs/box-<cỡ>.blend`. Action `open` đang phát; `bloom` nằm trên NLA track tắt tiếng.
   Sản phẩm mẫu (collection `preview_*`) gắn vào điểm neo để xem, không được xuất.
2. Sửa keyframe trong Blender rồi `File > Export > glTF` với collection `rig_<cỡ>`, chế độ animation
   **Actions**, bật *Sampling* và *Use Current Frame as Rest* (đặt khung hình cuối) — hoặc sửa số trong
   `scripts/gift3d/blender/rig_anim.py` và chạy lại lệnh dựng (cách này lặp lại được).
3. Chạy `node scripts/build-gift-models.mjs` để nén lại, rồi `npm test`.

Quy tắc: khung 0 phải đóng kín hoàn toàn; không để đoạn đứng yên dài (thanh trượt 0–100% trên web kéo
theo thời gian clip và nút "Đóng hộp" phát ngược clip); hai clip phải đặt khoá cho cùng một bộ nút; cả
hai cánh hộp lớn phải mở quá ~16° mới cho bình nhô lên (hiện bình bắt đầu nhô ở 0,88 giây) và phải mở
hết mới cho ngăn kéo trượt.

Kiểm va chạm bằng `rig_common.overlap_report` trên file `.blend` (đếm tam giác cắt nhau ở từng khung
hình). Kết quả của bản 11/2026, mọi khung hình của cả hai clip:

- Sạch: cánh ↔ bình rượu, cánh ↔ túi/hộp giấy, thân ↔ túi/hộp giấy, cánh trái ↔ cánh phải, khoen ↔ cánh
  (hộp lớn); nắp/vạt ↔ các món, nắp/vạt ↔ khay lót (hộp nhỏ).
- Chạm nhau sẵn từ mô hình gốc ở dáng nghỉ, không nhìn thấy: bình rượu ngồi trong ổ lụa và lòng thân;
  mép tấm chắn của cánh chạm thành ngăn kéo (~0,13 đơn vị, sâu thêm chút ít khi cánh nảy lại ở 1,8–2,1
  giây); các món tựa vào lòng thân hộp nhỏ; nắp chạm thân ở bản lề.
