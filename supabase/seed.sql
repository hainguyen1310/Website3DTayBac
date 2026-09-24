-- =====================================================================
-- A Sỉn — DỮ LIỆU MẪU CHO TOÀN BỘ BẢNG
-- =====================================================================
-- Cách chạy: Supabase Dashboard → SQL Editor → dán toàn bộ tệp → Run.
--           (hoặc `supabase db reset` sẽ tự chạy migrations rồi tới tệp này)
--
-- THỨ TỰ BẮT BUỘC:
--   1. 20260921000000_moc_storefront.sql      (bảng + RLS + hàm)
--   2. 20260922000000_site_images_storage.sql (bucket ảnh)
--   3. 20260923000000_promotion_exclusivity.sql  (ràng buộc khuyến mãi)
--   4. 20260923000001_payment_confirmation_guard.sql (chặn đơn hủy hồi sinh)
--   5. tệp này
--
-- ĐẶC ĐIỂM
--   * Chạy lại được nhiều lần (idempotent): mọi bảng đều ghi theo khoá tự
--     nhiên (slug / code / phone / key / order_number) nên không sinh trùng.
--   * Chỉ xoá đúng dữ liệu do tệp này tạo ra, nhận diện bằng tiền tố
--     `MOCTB-DEMO-` (đơn hàng) và hậu tố `@vi-du.vn` (lời nhắn liên hệ).
--     Dữ liệu khác trong database không bị đụng tới.
--   * Toàn bộ nằm trong một transaction: lỗi giữa đường sẽ tự hoàn tác.
--
-- TÀI KHOẢN ĐĂNG NHẬP (xem mục 5), mật khẩu chung: MocDemo@2026
--   admin@moctaybac.demo   → quyền admin
--   staff@moctaybac.demo   → quyền staff
--   khach@moctaybac.demo   → quyền customer (không vào được /admin)
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. DANH MỤC SẢN PHẨM
-- ---------------------------------------------------------------------
insert into public.product_categories (slug, name, sort_order) values
  ('tra-thao-moc',      'Trà & thảo mộc',   10),
  ('mat-ong',           'Mật ong',          20),
  ('dac-san-gac-bep',   'Đặc sản gác bếp',  30),
  ('gia-vi-nui-rung',   'Gia vị núi rừng',  40),
  ('hop-qua',           'Hộp quà & combo',  50)
on conflict (slug) do update set
  name = excluded.name,
  sort_order = excluded.sort_order;

-- ---------------------------------------------------------------------
-- 2. SẢN PHẨM + TỒN KHO
--    Giá trong `price_vnd` CHÍNH LÀ giá đang bán. Giá "gạch ngang" nằm ở
--    `promotion_products.original_price_vnd` (xem mục 4), không phải ở đây.
-- ---------------------------------------------------------------------
insert into public.products (
  category_id, slug, sku, name, origin, weight_label, price_vnd,
  image_url, tag, description, active, featured, sort_order
)
select c.id, d.slug, d.sku, d.name, d.origin, d.weight_label, d.price_vnd,
       d.image_url, d.tag, d.description, d.active, d.featured, d.sort_order
from (values
  -- Trà & thảo mộc
  ('tra-thao-moc', 'tea', 'MOC-TEA-001', 'Trà Shan Tuyết cổ thụ', 'SUỐI GIÀNG', 'Hộp 100g', 180000::bigint,
   '/images/tea.webp', 'Vị thanh của núi',
   'Những búp trà phủ lớp lông tơ trắng, gợi hương hoa nhẹ và hậu vị ngọt sâu. Một khoảng lặng dịu dàng trong ngày, dành cho người yêu chén trà mộc.',
   true, true, 10),
  ('tra-thao-moc', 'tra-shan-tuyet-uop-hoa', 'MOC-TEA-002', 'Trà Shan Tuyết ướp hoa', 'SUỐI GIÀNG', 'Hộp 100g', 210000::bigint,
   '/images/tea.webp', 'Hương hoa trên núi',
   'Búp trà cổ thụ ướp cùng hoa bản địa theo lối thủ công, cho hương thơm mềm và vị hậu ngọt kéo dài.',
   true, false, 20),
  ('tra-thao-moc', 'tra-nuong-man', 'MOC-TEA-003', 'Trà nướng mạn', 'SƠN LA', 'Túi 150g', 145000::bigint,
   '/images/tea.webp', 'Ấm như bếp lửa',
   'Trà được sao nướng trên chảo gang nên giữ mùi khói nhẹ, hợp pha ấm lớn cho buổi trò chuyện dài. Tạm ngưng bán để chờ lô mới.',
   false, false, 30),
  -- Mật ong
  ('mat-ong', 'honey', 'MOC-HONEY-001', 'Mật ong hoa rừng', 'MÙ CANG CHẢI', 'Hũ 500ml', 250000::bigint,
   '/images/honey.webp', 'Ngọt lành tự nhiên',
   'Sắc mật hổ phách và hương hoa rừng ấm áp. Thưởng thức cùng trà ấm, bánh mì hoặc dùng làm món quà nhỏ gửi đến người thương.',
   true, true, 10),
  ('mat-ong', 'mat-ong-bac-ha', 'MOC-HONEY-002', 'Mật ong bạc hà', 'MÙ CANG CHẢI', 'Hũ 350ml', 285000::bigint,
   '/images/honey.webp', 'Mát lành miền cao',
   'Mùa bạc hà nở trắng các triền núi, ong hút mật rồi trả lại cho người một hũ mật thoảng mùi the mát rất riêng.',
   true, false, 20),
  ('mat-ong', 'mat-ong-san-day', 'MOC-HONEY-003', 'Mật ong sắn dây', 'ĐIỆN BIÊN', 'Hũ 400ml', 195000::bigint,
   '/images/honey.webp', 'Dịu cho ngày se lạnh',
   'Vị ngọt thanh, ít gắt, thường được pha cùng nước ấm để nhâm nhi buổi sáng.',
   true, false, 30),
  -- Đặc sản gác bếp
  ('dac-san-gac-bep', 'jerky', 'MOC-JERKY-001', 'Trâu gác bếp Tây Bắc', 'SƠN LA', 'Túi 250g', 320000::bigint,
   '/images/jerky.webp', 'Đậm đà bản sắc',
   'Hương khói bếp quyện cùng vị thơm của mắc khén, từng thớ thịt đậm đà gợi nhớ những buổi quây quần bên bếp lửa vùng cao.',
   true, true, 10),
  ('dac-san-gac-bep', 'thit-trau-gac-bep-cay', 'MOC-JERKY-002', 'Trâu gác bếp vị cay', 'SƠN LA', 'Túi 250g', 345000::bigint,
   '/images/jerky.webp', 'Cay nhẹ nơi đầu lưỡi',
   'Thêm ớt rừng và hạt dổi vào công thức gác bếp quen thuộc, dành cho người thích vị mạnh hơn một chút.',
   true, false, 20),
  ('dac-san-gac-bep', 'ga-gac-bep', 'MOC-JERKY-003', 'Gà gác bếp', 'LAI CHÂU', 'Túi 200g', 265000::bigint,
   '/images/jerky.webp', 'Thơm khói, ngọt thịt',
   'Gà bản thả đồi được ướp rồi gác trên gác bếp, miếng thịt săn lại nhưng vẫn ngọt.',
   true, false, 30),
  -- Gia vị núi rừng
  ('gia-vi-nui-rung', 'spice', 'MOC-SPICE-001', 'Mắc khén rừng', 'ĐIỆN BIÊN', 'Hũ 100g', 95000::bigint,
   '/images/spice.webp', 'Gia vị của bản',
   'Mùi thơm đặc trưng, ấm nồng và tê nhẹ nơi đầu lưỡi. Một chút mắc khén cho món nướng, nước chấm, hay bữa cơm thêm hương vị vùng cao.',
   true, false, 10),
  ('gia-vi-nui-rung', 'hat-mac-khen-rang', 'MOC-SPICE-002', 'Mắc khén rang sẵn', 'ĐIỆN BIÊN', 'Hũ 80g', 120000::bigint,
   '/images/spice.webp', 'Rang sẵn, dùng ngay',
   'Hạt mắc khén đã rang thơm và giã vừa tay, mở nắp là dùng được ngay cho món nướng.',
   true, false, 20),
  -- Hộp quà
  ('hop-qua', 'hop-qua-mua-thu', 'MOC-GIFT-001', 'Hộp quà mùa thu', 'TÂY BẮC', 'Hộp 4 món', 520000::bigint,
   '/images/hero.webp', 'Gói cả mùa thu',
   'Trà, mật và hai món khô gác bếp xếp trong hộp giấy mộc, kèm thiệp viết tay theo lời nhắn của bạn.',
   true, true, 10),
  ('hop-qua', 'hop-qua-tet', 'MOC-GIFT-002', 'Hộp quà Tết sum vầy', 'TÂY BẮC', 'Hộp 6 món', 680000::bigint,
   '/images/hero.webp', 'Quà biếu ngày Tết',
   'Sáu món sản vật chia thành hai tầng, phù hợp biếu ông bà, đối tác hoặc gia đình trong dịp Tết.',
   true, false, 20)
) as d(category_slug, slug, sku, name, origin, weight_label, price_vnd,
       image_url, tag, description, active, featured, sort_order)
join public.product_categories c on c.slug = d.category_slug
on conflict (slug) do update set
  category_id  = excluded.category_id,
  sku          = excluded.sku,
  name         = excluded.name,
  origin       = excluded.origin,
  weight_label = excluded.weight_label,
  price_vnd    = excluded.price_vnd,
  image_url    = excluded.image_url,
  tag          = excluded.tag,
  description  = excluded.description,
  active       = excluded.active,
  featured     = excluded.featured,
  sort_order   = excluded.sort_order;

-- Tồn kho. Cố ý để vài món dưới ngưỡng cảnh báo (5) và một món bằng 0
-- để màn hình Tổng quan hiện được thẻ "Sản phẩm sắp hết".
insert into public.product_inventory (product_id, quantity, low_stock_threshold)
select p.id, d.quantity, d.low_stock_threshold
from (values
  ('tea',                 48, 10),
  ('tra-shan-tuyet-uop-hoa', 22, 5),
  ('tra-nuong-man',        0,  5),
  ('honey',                36, 10),
  ('mat-ong-bac-ha',       14, 5),
  ('mat-ong-san-day',       4,  5),   -- dưới ngưỡng
  ('jerky',                27, 8),
  ('thit-trau-gac-bep-cay', 3,  8),   -- dưới ngưỡng
  ('ga-gac-bep',           11, 5),
  ('spice',                63, 12),
  ('hat-mac-khen-rang',    19, 5),
  ('hop-qua-mua-thu',       6,  3),
  ('hop-qua-tet',           2,  3)    -- dưới ngưỡng
) as d(product_slug, quantity, low_stock_threshold)
join public.products p on p.slug = d.product_slug
on conflict (product_id) do update set
  quantity = excluded.quantity,
  low_stock_threshold = excluded.low_stock_threshold;

-- ---------------------------------------------------------------------
-- 3. BÀI VIẾT
--    Gồm 4 bài đã xuất bản, 1 bài hẹn giờ (published = true nhưng
--    published_at ở tương lai nên RLS chưa cho khách đọc), 1 bản nháp.
-- ---------------------------------------------------------------------
insert into public.articles (
  slug, tag, title, excerpt, image_url, read_time_minutes, body, published, published_at
)
values
  ('hanh-trinh-tra', 'Từ bản làng', 'Theo mây lên Suối Giàng, tìm vị trà Shan tuyết',
   'Một buổi sớm se lạnh, búp trà phủ sương và câu chuyện giữ rừng của những người làm trà.',
   '/images/tea.webp', 5,
   '["Sớm ở Suối Giàng, mây đi rất thấp. Từ hiên nhà nhìn ra, những tán trà cổ thụ nằm yên trong màn sương mỏng, như thể đang chờ nắng gọi dậy.","Trong câu chuyện minh họa của A Sỉn, mỗi búp trà được hái bằng một nhịp chậm. Không phải để làm ra thật nhiều, mà để giữ lại cảm giác dịu dàng của buổi sớm miền cao.","Pha một ấm trà Shan tuyết, điều đáng nhớ nhất không chỉ là vị ngọt hậu. Đó còn là khoảng lặng nho nhỏ, khi ta đặt điện thoại xuống và để hương trà dẫn mình trở về với hiện tại."]'::jsonb,
   true, '2026-09-18T00:00:00Z'),

  ('mon-qua-nho', 'Gợi ý tặng quà', 'Ba cách gói một lời cảm ơn thật dịu dàng',
   'Không cần cầu kỳ. Chỉ cần một món quà nhỏ được chọn bằng sự thấu hiểu.',
   '/images/honey.webp', 4,
   '["Một món quà không nhất thiết phải lớn. Có khi chỉ là hũ mật ong hoa rừng, gói cùng một tấm thiệp viết tay và một lời cảm ơn thật lòng.","Khi chọn quà, A Sỉn thường bắt đầu bằng một câu hỏi đơn giản: người ấy đang cần được nhắc nhớ điều gì?","Trong phiên bản minh họa này, chúng tôi gợi ý ba cách gói quà: dịu dàng với trà, ấm áp với mật, và thật riêng với lời nhắn của bạn."]'::jsonb,
   true, '2026-09-12T00:00:00Z'),

  ('bep-nha', 'Vị Tây Bắc', 'Mắc khén: hạt gia vị đánh thức căn bếp',
   'Mùi thơm ấm, vị tê nhẹ và vài mẹo nhỏ để bữa cơm thường ngày thêm hương núi.',
   '/images/spice.webp', 3,
   '["Mắc khén là một hạt gia vị nhỏ nhưng có cách xuất hiện rất riêng: thơm ấm, tê nhẹ, rồi để lại dư vị dễ nhớ nơi đầu lưỡi.","Với món nướng, bạn có thể rang thơm hạt mắc khén, giã vừa tay rồi rắc sau cùng.","Các mẹo và sản vật trong bài đều được viết cho trải nghiệm minh họa."]'::jsonb,
   true, '2026-09-05T00:00:00Z'),

  ('gac-bep-mua-gio', 'Từ bản làng', 'Gác bếp mùa gió: khi khói giữ lại vị núi',
   'Người Tây Bắc gác thịt trên bếp từ độ tháng Mười, để khói và thời gian làm nên món ăn.',
   '/images/jerky.webp', 6,
   '["Tháng Mười, gió bắt đầu se. Đó cũng là lúc những gác bếp vùng cao bắt đầu đỏ lửa.","Thịt được ướp mắc khén, hạt dổi rồi treo lên gác. Khói bếp không chỉ sấy khô mà còn thơm vào từng thớ thịt.","Trong bản minh họa này, quy trình được kể lại một cách đơn giản; khi bán thật, A Sỉn sẽ công bố đầy đủ tiêu chuẩn an toàn thực phẩm."]'::jsonb,
   true, '2026-08-30T00:00:00Z'),

  -- Hẹn giờ: RLS yêu cầu published_at <= now() nên bài này chỉ hiện trong /admin.
  ('qua-tet-tu-nui', 'Gợi ý tặng quà', 'Một hộp quà Tết đi từ bản làng về xuôi',
   'Chuyện chuẩn bị những hộp quà Tết, viết sẵn nhưng chưa tới ngày đăng.',
   '/images/hero.webp', 5,
   '["Mỗi mùa Tết, A Sỉn lại bắt đầu chuẩn bị từ rất sớm: chọn món, đặt hộp, viết thiệp.","Bài viết này đang ở trạng thái hẹn giờ để kiểm tra luồng xuất bản.","Khi tới ngày, bài sẽ tự xuất hiện trên trang Tin tức."]'::jsonb,
   true, '2026-12-01T00:00:00Z'),

  -- Bản nháp: published = false nên published_at phải để trống.
  ('tra-va-giac-ngu', 'Vị Tây Bắc', 'Trà và giấc ngủ: ghi chép còn dang dở',
   'Bản nháp chưa hoàn thiện, dùng để kiểm tra bộ lọc "Bản nháp" trong trang quản trị.',
   '/images/tea.webp', 4,
   '["Đây là bản nháp. Nội dung sẽ được viết tiếp trước khi xuất bản."]'::jsonb,
   false, null)
on conflict (slug) do update set
  tag               = excluded.tag,
  title             = excluded.title,
  excerpt           = excluded.excerpt,
  image_url         = excluded.image_url,
  read_time_minutes = excluded.read_time_minutes,
  body              = excluded.body,
  published         = excluded.published,
  published_at      = excluded.published_at;

-- ---------------------------------------------------------------------
-- 4. KHUYẾN MÃI
--    Quy ước của hệ thống: chỉ MỘT chương trình đang bật được chạy tại một
--    thời điểm (ràng buộc `promotions_active_no_overlap`). Vì vậy tệp này
--    đặt các chương trình nối tiếp nhau:
--        06-01 → 08-31  Hè rực rỡ 2026      (đã kết thúc)
--        09-15 → 09-30  Deal hời cuối tháng 9 (ĐANG CHẠY, hôm nay 23/09)
--        10-01 → 10-31  Mùa thu hoạch tháng 10 (sắp diễn ra)
--        2027-01-15 → 2027-02-15  Tết sum vầy 2027 (sắp diễn ra)
--    Chương trình "Nháp nội bộ" để is_active = false nên được phép trùng
--    thời gian — đúng như ràng buộc mong đợi.
-- ---------------------------------------------------------------------
insert into public.promotions (code, name, is_active, starts_at, ends_at) values
  ('HE-2026',      'Hè rực rỡ 2026',          true,  '2026-06-01T00:00:00Z', '2026-08-31T23:59:59Z'),
  ('LANDING-DEALS','Deal hời cuối tháng 9',   true,  '2026-09-15T00:00:00Z', '2026-09-30T23:59:59Z'),
  ('THU-HOACH-10', 'Mùa thu hoạch tháng 10',  true,  '2026-10-01T00:00:00Z', '2026-10-31T23:59:59Z'),
  ('TET-2027',     'Tết sum vầy 2027',        true,  '2027-01-15T00:00:00Z', '2027-02-15T23:59:59Z'),
  ('NHAP-NOI-BO',  'Nháp nội bộ (chưa bật)',  false, '2026-09-01T00:00:00Z', '2026-12-31T23:59:59Z')
on conflict (code) do update set
  name      = excluded.name,
  is_active = excluded.is_active,
  starts_at = excluded.starts_at,
  ends_at   = excluded.ends_at;

-- Sản phẩm của từng chương trình.
-- Bất biến được giữ đúng: price_vnd = original_price_vnd × (100 − discount)/100.
insert into public.promotion_products (
  promotion_id, product_id, original_price_vnd, discount_percent,
  display_label, display_ending, accent, sort_order
)
select pr.id, p.id, d.original_price_vnd, d.discount_percent,
       d.display_label, d.display_ending, d.accent, d.sort_order
from (values
  -- Hè rực rỡ 2026 (đã kết thúc) — xả hàng 50%
  ('HE-2026', 'honey',            500000::bigint, 50::smallint, 'Hè ngọt lành',        'Đã kết thúc', 'honey', 10),
  ('HE-2026', 'spice',            190000::bigint, 50::smallint, 'Gia vị cho món nướng','Đã kết thúc', 'earth', 20),
  -- Deal hời cuối tháng 9 (đang chạy)
  ('LANDING-DEALS', 'tea',        225000::bigint, 20::smallint, 'Sớm trên đỉnh núi',   'Còn 7 ngày',  'forest', 10),
  ('LANDING-DEALS', 'honey',      312500::bigint, 20::smallint, 'Ngọt lành cuối tuần', 'Còn 7 ngày',  'honey',  20),
  ('LANDING-DEALS', 'spice',      125000::bigint, 24::smallint, 'Bếp thơm vị bản',     'Số lượng có hạn', 'earth', 30),
  -- Mùa thu hoạch tháng 10 (sắp diễn ra)
  ('THU-HOACH-10', 'jerky',       400000::bigint, 20::smallint, 'Mùa gác bếp',         'Bắt đầu 01/10', 'earth', 10),
  ('THU-HOACH-10', 'thit-trau-gac-bep-cay', 460000::bigint, 25::smallint, 'Cay nồng ngày thu', 'Bắt đầu 01/10', 'earth', 20),
  ('THU-HOACH-10', 'hop-qua-mua-thu',       650000::bigint, 20::smallint, 'Gói cả mùa thu',    'Bắt đầu 01/10', 'forest', 30),
  -- Tết sum vầy 2027 (sắp diễn ra)
  ('TET-2027', 'hop-qua-tet',     850000::bigint, 20::smallint, 'Quà biếu ngày Tết',   'Sắp mở bán', 'forest', 10),
  ('TET-2027', 'mat-ong-bac-ha',  380000::bigint, 25::smallint, 'Mật Tết sum vầy',     'Sắp mở bán', 'honey', 20),
  -- Nháp nội bộ (đang tắt)
  ('NHAP-NOI-BO', 'tra-shan-tuyet-uop-hoa', 300000::bigint, 30::smallint, 'Thử nghiệm nội bộ', 'Chưa công bố', 'forest', 10)
) as d(promotion_code, product_slug, original_price_vnd, discount_percent,
       display_label, display_ending, accent, sort_order)
join public.promotions pr on pr.code = d.promotion_code
join public.products p on p.slug = d.product_slug
on conflict (promotion_id, product_id) do update set
  original_price_vnd = excluded.original_price_vnd,
  discount_percent   = excluded.discount_percent,
  display_label      = excluded.display_label,
  display_ending     = excluded.display_ending,
  accent             = excluded.accent,
  sort_order         = excluded.sort_order;

-- ---------------------------------------------------------------------
-- 5. TÀI KHOẢN QUẢN TRỊ (auth.users → trigger tự tạo profiles)
--
--     Đặt trước mục khách hàng vì `customers.profile_id` trỏ tới
--     `profiles.id`, mà profiles chỉ có sau khi tài khoản tồn tại.
--
--     CẢNH BÁO: bước này ghi thẳng vào schema `auth` của Supabase. Chỉ nên
--     chạy trên database demo. Trên môi trường thật, hãy tạo người dùng qua
--     Dashboard → Authentication → Users rồi bỏ qua mục này.
--
--     Tài khoản được đặt sẵn UUID cố định để chạy lại không sinh trùng.
--     Mật khẩu demo: MocDemo@2026
-- ---------------------------------------------------------------------
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
select
  d.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  d.email, extensions.crypt('MocDemo@2026', extensions.gen_salt('bf')),
  jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
  jsonb_build_object('full_name', d.full_name),
  timezone('utc', now()), timezone('utc', now())
from (values
  ('11111111-1111-4111-8111-111111111111'::uuid, 'admin@moctaybac.demo', 'Quản trị A Sỉn'),
  ('22222222-2222-4222-8222-222222222222'::uuid, 'staff@moctaybac.demo', 'Nhân viên A Sỉn'),
  ('33333333-3333-4333-8333-333333333333'::uuid, 'khach@moctaybac.demo', 'Đỗ Thanh Tùng')
) as d(id, email, full_name)
on conflict (id) do nothing;

-- Đánh dấu đã xác thực email để đăng nhập được ngay.
-- `confirmed_at` là cột sinh (generated) ở các bản GoTrue mới và là cột
-- thường ở bản cũ, nên phải kiểm tra sự tồn tại của cột trước khi ghi.
do $$
declare
  v_ids uuid[] := array[
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
    '33333333-3333-4333-8333-333333333333'
  ];
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'auth' and table_name = 'users'
      and column_name = 'email_confirmed_at'
      and is_generated = 'NEVER'
  ) then
    execute $sql$
      update auth.users
      set email_confirmed_at = coalesce(email_confirmed_at, timezone('utc', now())),
          updated_at = timezone('utc', now())
      where id = any($1)
    $sql$ using v_ids;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'auth' and table_name = 'users'
      and column_name = 'confirmed_at'
      and is_generated = 'NEVER'
  ) then
    execute $sql$
      update auth.users
      set confirmed_at = coalesce(confirmed_at, timezone('utc', now()))
      where id = any($1)
    $sql$ using v_ids;
  end if;
end $$;

-- GoTrue hiện đại cần thêm một dòng trong auth.identities cho đăng nhập
-- bằng mật khẩu; bản cũ không có bảng này nên phải kiểm tra trước.
do $$
declare
  v_ids uuid[] := array[
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
    '33333333-3333-4333-8333-333333333333'
  ];
begin
  if to_regclass('auth.identities') is null then
    return;
  end if;

  execute $sql$
    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    )
    select
      gen_random_uuid(), u.id, u.id::text,
      jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
      'email', timezone('utc', now()), timezone('utc', now()), timezone('utc', now())
    from auth.users u
    where u.id = any($1)
      and not exists (
        select 1 from auth.identities i
        where i.user_id = u.id and i.provider = 'email'
      )
  $sql$ using v_ids;
end $$;

-- Phân vai. Trigger on_auth_user_created đã tạo sẵn dòng profiles với
-- role mặc định là 'customer'; ở đây nâng đúng hai tài khoản lên admin/staff.
-- Nếu database chưa từng có trigger đó, câu lệnh dưới vẫn tạo đủ dòng.
insert into public.profiles (id, full_name, role)
select d.id, d.full_name, d.role::public.app_role
from (values
  ('11111111-1111-4111-8111-111111111111'::uuid, 'Quản trị A Sỉn',   'admin'),
  ('22222222-2222-4222-8222-222222222222'::uuid, 'Nhân viên A Sỉn',  'staff'),
  ('33333333-3333-4333-8333-333333333333'::uuid, 'Đỗ Thanh Tùng',  'customer')
) as d(id, full_name, role)
where exists (select 1 from auth.users u where u.id = d.id)
on conflict (id) do update set
  full_name  = excluded.full_name,
  role       = excluded.role;

-- ---------------------------------------------------------------------
-- 6. KHÁCH HÀNG
--    Số điện thoại theo đúng định dạng mà create_checkout_order chấp nhận
--    (0 + 9 chữ số). Một khách được gắn `profile_id` để kiểm tra quan hệ
--    giữa tài khoản đăng nhập và hồ sơ khách.
-- ---------------------------------------------------------------------
insert into public.customers (profile_id, full_name, email, phone, default_address) values
  ('33333333-3333-4333-8333-333333333333', 'Đỗ Thanh Tùng', 'khach@moctaybac.demo',  '0912345609', '88 Nguyễn Văn Cừ, TP. Thái Nguyên'),
  (null, 'Nguyễn An Nhiên',  'an.nhien@vi-du.vn',   '0912345601', '12 Đường Mây, Q. Ba Đình, Hà Nội'),
  (null, 'Trần Minh Khoa',   'minh.khoa@vi-du.vn',  '0912345602', '45 Phố Cổ, Q. Hoàn Kiếm, Hà Nội'),
  (null, 'Lê Thu Hà',        'thu.ha@vi-du.vn',     '0912345603', '78 Nguyễn Trãi, Q. Thanh Xuân, Hà Nội'),
  (null, 'Phạm Quốc Bảo',    'quoc.bao@vi-du.vn',   '0912345604', '23 Lê Lợi, TP. Sơn La'),
  (null, 'Hoàng Mai Phương', 'mai.phuong@vi-du.vn','0912345605', '09 Trần Hưng Đạo, TP. Điện Biên Phủ'),
  (null, 'Vũ Đình Nam',      'dinh.nam@vi-du.vn',   '0912345606', '156 Phan Đình Phùng, TP. Lào Cai'),
  (null, 'Đặng Thị Lan',     'thi.lan@vi-du.vn',    '0912345607', '31 Hoàng Diệu, TP. Yên Bái'),
  (null, 'Bùi Tuấn Anh',     null,                  '0912345608', null)
on conflict (phone) do update set
  profile_id      = excluded.profile_id,
  full_name       = excluded.full_name,
  email           = excluded.email,
  default_address = excluded.default_address;

-- ---------------------------------------------------------------------
-- 7. ĐƠN HÀNG
--    Gồm mọi trạng thái của enum order_status, cả QR lẫn COD, cùng các
--    trường hợp thanh toán pending / paid / failed / refunded.
--
--    Ba bước để tổng tiền luôn khớp ràng buộc
--      total_vnd = subtotal_vnd − discount_vnd + shipping_vnd:
--        a) tạo đơn với mọi số tiền = 0
--        b) thêm dòng hàng (đơn giá lấy trực tiếp từ bảng products)
--        c) cập nhật lại tạm tính/giảm giá/phí giao và tổng
-- ---------------------------------------------------------------------

-- Xoá đúng bộ dữ liệu demo cũ (order_items, order_status_events và
-- payment_transactions đều có ON DELETE CASCADE theo order_id).
delete from public.orders where order_number like 'MOCTB-DEMO-%';

insert into public.orders (
  order_number, customer_id, status, payment_status, payment_method,
  subtotal_vnd, discount_vnd, shipping_vnd, total_vnd,
  shipping_address, customer_note, created_at, updated_at
)
select d.order_number, c.id,
       d.status::public.order_status,
       d.payment_status::public.payment_status,
       d.payment_method::public.payment_method,
       0, 0, 0, 0,
       d.shipping_address, d.customer_note,
       d.created_at, d.created_at
from (values
  -- --- Đang chờ thanh toán (QR chờ webhook; COD chờ xác nhận) ---
  ('MOCTB-DEMO-20260923-0001', '0912345601', 'awaiting_payment', 'pending', 'qr',
   '12 Đường Mây, Q. Ba Đình, Hà Nội', 'Gói giúp mình kèm thiệp nhé.', '2026-09-23T09:15:00Z'::timestamptz),
  ('MOCTB-DEMO-20260923-0002', '0912345603', 'awaiting_payment', 'pending', 'cod',
   '78 Nguyễn Trãi, Q. Thanh Xuân, Hà Nội', null, '2026-09-23T08:05:00Z'::timestamptz),

  -- --- Đã thanh toán ---
  ('MOCTB-DEMO-20260922-0003', '0912345602', 'paid', 'paid', 'qr',
   '45 Phố Cổ, Q. Hoàn Kiếm, Hà Nội', null, '2026-09-22T14:20:00Z'::timestamptz),

  -- --- Đang đóng gói ---
  ('MOCTB-DEMO-20260922-0004', '0912345605', 'packing', 'paid', 'qr',
   '09 Trần Hưng Đạo, TP. Điện Biên Phủ', 'Giao trong giờ hành chính.', '2026-09-22T10:40:00Z'::timestamptz),
  ('MOCTB-DEMO-20260921-0005', '0912345604', 'packing', 'paid', 'cod',
   '23 Lê Lợi, TP. Sơn La', null, '2026-09-21T16:00:00Z'::timestamptz),

  -- --- Đang giao ---
  ('MOCTB-DEMO-20260921-0006', '0912345606', 'shipping', 'paid', 'qr',
   '156 Phan Đình Phùng, TP. Lào Cai', null, '2026-09-21T09:10:00Z'::timestamptz),
  ('MOCTB-DEMO-20260920-0007', '0912345607', 'shipping', 'paid', 'cod',
   '31 Hoàng Diệu, TP. Yên Bái', 'Gọi trước khi giao 15 phút.', '2026-09-20T11:25:00Z'::timestamptz),
  ('MOCTB-DEMO-20260908-0018', '0912345603', 'shipping', 'paid', 'qr',
   '78 Nguyễn Trãi, Q. Thanh Xuân, Hà Nội', null, '2026-09-08T09:45:00Z'::timestamptz),

  -- --- Hoàn tất ---
  ('MOCTB-DEMO-20260920-0008', '0912345601', 'completed', 'paid', 'qr',
   '12 Đường Mây, Q. Ba Đình, Hà Nội', null, '2026-09-20T15:45:00Z'::timestamptz),
  ('MOCTB-DEMO-20260919-0009', '0912345602', 'completed', 'paid', 'cod',
   '45 Phố Cổ, Q. Hoàn Kiếm, Hà Nội', 'Dùng mã giảm giá của khách quen.', '2026-09-19T13:30:00Z'::timestamptz),
  ('MOCTB-DEMO-20260918-0010', '0912345603', 'completed', 'paid', 'qr',
   '78 Nguyễn Trãi, Q. Thanh Xuân, Hà Nội', 'Hộp quà tặng sinh nhật.', '2026-09-18T10:05:00Z'::timestamptz),
  ('MOCTB-DEMO-20260917-0011', '0912345608', 'completed', 'paid', 'cod',
   '41 Ngõ 8 Tô Hiệu, TP. Sơn La', null, '2026-09-17T17:50:00Z'::timestamptz),
  ('MOCTB-DEMO-20260916-0012', '0912345604', 'completed', 'paid', 'qr',
   '23 Lê Lợi, TP. Sơn La', null, '2026-09-16T08:35:00Z'::timestamptz),
  ('MOCTB-DEMO-20260911-0016', '0912345601', 'completed', 'paid', 'cod',
   '12 Đường Mây, Q. Ba Đình, Hà Nội', null, '2026-09-11T10:00:00Z'::timestamptz),
  ('MOCTB-DEMO-20260910-0017', '0912345602', 'completed', 'paid', 'qr',
   '45 Phố Cổ, Q. Hoàn Kiếm, Hà Nội', null, '2026-09-10T18:15:00Z'::timestamptz),
  ('MOCTB-DEMO-20260828-0020', '0912345604', 'completed', 'paid', 'qr',
   '23 Lê Lợi, TP. Sơn La', null, '2026-08-28T13:05:00Z'::timestamptz),

  -- --- Đã hủy ---
  ('MOCTB-DEMO-20260915-0013', '0912345605', 'cancelled', 'pending', 'qr',
   '09 Trần Hưng Đạo, TP. Điện Biên Phủ', null, '2026-09-15T12:00:00Z'::timestamptz),
  ('MOCTB-DEMO-20260914-0014', '0912345606', 'cancelled', 'failed', 'qr',
   '156 Phan Đình Phùng, TP. Lào Cai', null, '2026-09-14T09:20:00Z'::timestamptz),
  ('MOCTB-DEMO-20260912-0015', '0912345607', 'cancelled', 'refunded', 'qr',
   '31 Hoàng Diệu, TP. Yên Bái', 'Khách đổi ý, đã hoàn tiền.', '2026-09-12T14:10:00Z'::timestamptz),
  ('MOCTB-DEMO-20260905-0019', '0912345608', 'cancelled', 'pending', 'cod',
   '41 Ngõ 8 Tô Hiệu, TP. Sơn La', null, '2026-09-05T11:30:00Z'::timestamptz)
) as d(order_number, customer_phone, status, payment_status, payment_method,
       shipping_address, customer_note, created_at)
join public.customers c on c.phone = d.customer_phone;

-- 7b. Dòng hàng — sản phẩm lẻ. Đơn giá lấy từ bảng products nên luôn khớp.
insert into public.order_items (
  order_id, product_id, product_name, sku, unit_price_vnd, quantity, metadata, created_at
)
select o.id, p.id, p.name, p.sku, p.price_vnd, d.quantity,
       case when d.design is not null
            then jsonb_build_object('gift_design', d.design::jsonb)
            else '{}'::jsonb end,
       o.created_at
from (values
  ('MOCTB-DEMO-20260923-0001', 'tea', 2::integer, null::text),
  ('MOCTB-DEMO-20260923-0001', 'spice', 1::integer, null::text),
  ('MOCTB-DEMO-20260923-0002', 'jerky', 1::integer, null::text),
  ('MOCTB-DEMO-20260922-0003', 'honey', 1::integer, null::text),
  ('MOCTB-DEMO-20260922-0003', 'tea', 1::integer, null::text),
  ('MOCTB-DEMO-20260922-0004', 'hop-qua-mua-thu', 1::integer, null::text),
  ('MOCTB-DEMO-20260921-0005', 'thit-trau-gac-bep-cay', 2::integer, null::text),
  ('MOCTB-DEMO-20260921-0006', 'mat-ong-bac-ha', 1::integer, null::text),
  ('MOCTB-DEMO-20260921-0006', 'hat-mac-khen-rang', 2::integer, null::text),
  ('MOCTB-DEMO-20260920-0007', 'ga-gac-bep', 1::integer, null::text),
  ('MOCTB-DEMO-20260920-0007', 'spice', 2::integer, null::text),
  ('MOCTB-DEMO-20260920-0008', 'hop-qua-tet', 1::integer, null::text),
  ('MOCTB-DEMO-20260919-0009', 'tea', 3::integer, null::text),
  ('MOCTB-DEMO-20260917-0011', 'jerky', 1::integer, null::text),
  ('MOCTB-DEMO-20260916-0012', 'mat-ong-san-day', 2::integer, null::text),
  ('MOCTB-DEMO-20260915-0013', 'spice', 1::integer, null::text),
  ('MOCTB-DEMO-20260914-0014', 'honey', 1::integer, null::text),
  ('MOCTB-DEMO-20260912-0015', 'hop-qua-mua-thu', 1::integer, null::text),
  ('MOCTB-DEMO-20260911-0016', 'tra-shan-tuyet-uop-hoa', 1::integer, null::text),
  ('MOCTB-DEMO-20260911-0016', 'hat-mac-khen-rang', 1::integer, null::text),
  ('MOCTB-DEMO-20260910-0017', 'jerky', 1::integer, null::text),
  ('MOCTB-DEMO-20260910-0017', 'honey', 1::integer, null::text),
  ('MOCTB-DEMO-20260908-0018', 'hop-qua-tet', 1::integer, null::text),
  ('MOCTB-DEMO-20260905-0019', 'tea', 1::integer, null::text),
  ('MOCTB-DEMO-20260828-0020', 'spice', 4::integer, null::text),
  -- Đơn có hộp quà cá nhân hóa: 2 sản vật + 1 dòng tiền công đóng hộp.
  ('MOCTB-DEMO-20260918-0010', 'tea', 1::integer,
   '{"color":"#315442","pattern":"Thổ cẩm","recipient":"Chị Hoa","message":"Chúc mừng sinh nhật chị."}'),
  ('MOCTB-DEMO-20260918-0010', 'honey', 1::integer,
   '{"color":"#315442","pattern":"Thổ cẩm","recipient":"Chị Hoa","message":"Chúc mừng sinh nhật chị."}')
) as d(order_number, product_slug, quantity, design)
join public.orders o on o.order_number = d.order_number
join public.products p on p.slug = d.product_slug;

-- 7c. Dòng hàng — tiền công đóng hộp quà (không gắn product_id, đúng như
--     hàm create_checkout_order sinh ra). Giá 65.000đ lấy theo
--     site_settings.gift_box_price_vnd.
insert into public.order_items (
  order_id, product_name, unit_price_vnd, quantity, metadata, created_at
)
select o.id, 'Hộp quà cá nhân hóa', 65000, 1,
       jsonb_build_object('gift_design', d.design::jsonb),
       o.created_at
from (values
  ('MOCTB-DEMO-20260918-0010',
   '{"color":"#315442","pattern":"Thổ cẩm","recipient":"Chị Hoa","message":"Chúc mừng sinh nhật chị."}')
) as d(order_number, design)
join public.orders o on o.order_number = d.order_number;

-- 7d. Chốt lại tiền của đơn. Tạm tính lấy từ chính các dòng hàng vừa thêm,
--     nên không thể lệch; tổng luôn thoả ràng buộc của bảng orders.
with discounts(order_number, discount_vnd) as (
  -- Chỉ đơn này dùng mã khách quen; các đơn còn lại không giảm giá.
  values
    ('MOCTB-DEMO-20260919-0009', 40000::bigint)
),
totals as (
  select
    o.id,
    sum(oi.line_total_vnd)                        as subtotal,
    coalesce(max(d.discount_vnd), 0)              as discount_vnd,
    -- Phí giao hàng áp đúng chính sách ở site_settings.free_shipping_from:
    -- miễn phí từ 500.000đ, dưới mức đó thu 30.000đ.
    case when sum(oi.line_total_vnd) >= 500000 then 0 else 30000 end as shipping_vnd
  from public.orders o
  join public.order_items oi on oi.order_id = o.id
  left join discounts d on d.order_number = o.order_number
  where o.order_number like 'MOCTB-DEMO-%'
  group by o.id
)
update public.orders o
set subtotal_vnd = t.subtotal,
    discount_vnd = t.discount_vnd,
    shipping_vnd = t.shipping_vnd,
    total_vnd    = t.subtotal - t.discount_vnd + t.shipping_vnd
from totals t
where o.id = t.id;

-- ---------------------------------------------------------------------
-- 8. GIAO DỊCH THANH TOÁN
--    Chỉ đơn QR mới có giao dịch. Trạng thái giao dịch đi kèm trạng thái
--    thanh toán của đơn: pending→initiated, paid→verified,
--    failed→failed, refunded→refunded.
--    provider_reference phải duy nhất (hoặc NULL), nên chỉ đặt khi đã xác thực.
-- ---------------------------------------------------------------------
insert into public.payment_transactions (
  order_id, provider, provider_reference, amount_vnd, status,
  raw_payload, verified_at, created_at, updated_at
)
select o.id, d.provider, d.provider_reference, o.total_vnd,
       d.status::public.payment_transaction_status,
       jsonb_build_object(
         'seed', true,
         'note', d.note,
         'order_number', o.order_number
       ),
       case when d.status = 'verified' then o.created_at + interval '25 minutes' else null end,
       o.created_at + interval '3 minutes',
       o.created_at + interval '3 minutes'
from (values
  ('MOCTB-DEMO-20260923-0001', 'qr_pending_webhook', null, 'initiated', 'Chờ webhook xác thực'),
  ('MOCTB-DEMO-20260922-0003', 'vnpay_qr', 'SEED-20260922-0003', 'verified', 'Webhook đã xác thực'),
  ('MOCTB-DEMO-20260922-0004', 'vnpay_qr', 'SEED-20260922-0004', 'verified', 'Webhook đã xác thực'),
  ('MOCTB-DEMO-20260921-0006', 'vnpay_qr', 'SEED-20260921-0006', 'verified', 'Webhook đã xác thực'),
  ('MOCTB-DEMO-20260920-0008', 'vnpay_qr', 'SEED-20260920-0008', 'verified', 'Webhook đã xác thực'),
  ('MOCTB-DEMO-20260918-0010', 'vnpay_qr', 'SEED-20260918-0010', 'verified', 'Webhook đã xác thực'),
  ('MOCTB-DEMO-20260916-0012', 'vnpay_qr', 'SEED-20260916-0012', 'verified', 'Webhook đã xác thực'),
  ('MOCTB-DEMO-20260910-0017', 'vnpay_qr', 'SEED-20260910-0017', 'verified', 'Webhook đã xác thực'),
  ('MOCTB-DEMO-20260908-0018', 'vnpay_qr', 'SEED-20260908-0018', 'verified', 'Webhook đã xác thực'),
  ('MOCTB-DEMO-20260828-0020', 'vnpay_qr', 'SEED-20260828-0020', 'verified', 'Webhook đã xác thực'),
  ('MOCTB-DEMO-20260915-0013', 'qr_pending_webhook', null, 'initiated', 'Khách không chuyển khoản, đơn bị hủy'),
  ('MOCTB-DEMO-20260914-0014', 'vnpay_qr', 'SEED-20260914-0014', 'failed',   'Nhà cung cấp báo giao dịch lỗi'),
  ('MOCTB-DEMO-20260912-0015', 'vnpay_qr', 'SEED-20260912-0015', 'refunded', 'Đã hoàn tiền cho khách')
) as d(order_number, provider, provider_reference, status, note)
join public.orders o on o.order_number = d.order_number;

-- ---------------------------------------------------------------------
-- 9. LỊCH SỬ TRẠNG THÁI ĐƠN
--    Trigger `orders_record_status_event` đã tự ghi một dòng "Đơn được tạo"
--    cho mỗi đơn vừa thêm ở bước 6. Xoá các dòng tự sinh đó rồi ghi lại
--    đúng lịch sử của từng đơn, mốc thời gian lùi về quá khứ.
-- ---------------------------------------------------------------------
delete from public.order_status_events
where order_id in (
  select id from public.orders where order_number like 'MOCTB-DEMO-%'
);

insert into public.order_status_events (order_id, status, note, created_at)
select o.id, d.status::public.order_status, d.note,
       o.created_at + (d.minute_offset * interval '1 minute')
from (values
  -- Đơn mới tạo, chưa đi bước nào
  ('MOCTB-DEMO-20260923-0001', 'awaiting_payment', 'Đơn được tạo', 0::integer),
  ('MOCTB-DEMO-20260923-0002', 'awaiting_payment', 'Đơn COD được tạo, chờ xác nhận', 0::integer),

  -- QR: chờ thanh toán → đã thanh toán (webhook)
  ('MOCTB-DEMO-20260922-0003', 'awaiting_payment', 'Đơn được tạo', 0::integer),
  ('MOCTB-DEMO-20260922-0003', 'paid', 'Webhook thanh toán đã được xác thực', 25::integer),

  -- Đang đóng gói
  ('MOCTB-DEMO-20260922-0004', 'awaiting_payment', 'Đơn được tạo', 0::integer),
  ('MOCTB-DEMO-20260922-0004', 'paid', 'Webhook thanh toán đã được xác thực', 20::integer),
  ('MOCTB-DEMO-20260922-0004', 'packing', 'Bắt đầu đóng gói', 260::integer),
  ('MOCTB-DEMO-20260921-0005', 'awaiting_payment', 'Đơn COD được tạo, chờ xác nhận', 0::integer),
  ('MOCTB-DEMO-20260921-0005', 'paid', 'Nhân viên xác nhận đã thu tiền COD', 45::integer),
  ('MOCTB-DEMO-20260921-0005', 'packing', 'Bắt đầu đóng gói', 300::integer),

  -- Đang giao
  ('MOCTB-DEMO-20260921-0006', 'awaiting_payment', 'Đơn được tạo', 0::integer),
  ('MOCTB-DEMO-20260921-0006', 'paid', 'Webhook thanh toán đã được xác thực', 18::integer),
  ('MOCTB-DEMO-20260921-0006', 'packing', 'Bắt đầu đóng gói', 200::integer),
  ('MOCTB-DEMO-20260921-0006', 'shipping', 'Đã bàn giao cho đơn vị vận chuyển', 420::integer),
  ('MOCTB-DEMO-20260920-0007', 'awaiting_payment', 'Đơn COD được tạo, chờ xác nhận', 0::integer),
  ('MOCTB-DEMO-20260920-0007', 'paid', 'Nhân viên xác nhận đã thu tiền COD', 30::integer),
  ('MOCTB-DEMO-20260920-0007', 'packing', 'Bắt đầu đóng gói', 180::integer),
  ('MOCTB-DEMO-20260920-0007', 'shipping', 'Đã bàn giao cho đơn vị vận chuyển', 400::integer),
  ('MOCTB-DEMO-20260908-0018', 'awaiting_payment', 'Đơn được tạo', 0::integer),
  ('MOCTB-DEMO-20260908-0018', 'paid', 'Webhook thanh toán đã được xác thực', 22::integer),
  ('MOCTB-DEMO-20260908-0018', 'packing', 'Bắt đầu đóng gói', 150::integer),
  ('MOCTB-DEMO-20260908-0018', 'shipping', 'Đã bàn giao cho đơn vị vận chuyển', 390::integer),

  -- Hoàn tất
  ('MOCTB-DEMO-20260920-0008', 'awaiting_payment', 'Đơn được tạo', 0::integer),
  ('MOCTB-DEMO-20260920-0008', 'paid', 'Webhook thanh toán đã được xác thực', 17::integer),
  ('MOCTB-DEMO-20260920-0008', 'packing', 'Bắt đầu đóng gói', 160::integer),
  ('MOCTB-DEMO-20260920-0008', 'shipping', 'Đã bàn giao cho đơn vị vận chuyển', 380::integer),
  ('MOCTB-DEMO-20260920-0008', 'completed', 'Khách đã nhận hàng', 2600::integer),
  ('MOCTB-DEMO-20260919-0009', 'awaiting_payment', 'Đơn COD được tạo, chờ xác nhận', 0::integer),
  ('MOCTB-DEMO-20260919-0009', 'paid', 'Nhân viên xác nhận đã thu tiền COD', 40::integer),
  ('MOCTB-DEMO-20260919-0009', 'packing', 'Bắt đầu đóng gói', 200::integer),
  ('MOCTB-DEMO-20260919-0009', 'shipping', 'Đã bàn giao cho đơn vị vận chuyển', 410::integer),
  ('MOCTB-DEMO-20260919-0009', 'completed', 'Khách đã nhận hàng', 2500::integer),
  ('MOCTB-DEMO-20260918-0010', 'awaiting_payment', 'Đơn được tạo', 0::integer),
  ('MOCTB-DEMO-20260918-0010', 'paid', 'Webhook thanh toán đã được xác thực', 15::integer),
  ('MOCTB-DEMO-20260918-0010', 'packing', 'Bắt đầu đóng gói hộp quà', 120::integer),
  ('MOCTB-DEMO-20260918-0010', 'shipping', 'Đã bàn giao cho đơn vị vận chuyển', 340::integer),
  ('MOCTB-DEMO-20260918-0010', 'completed', 'Khách đã nhận hàng', 2400::integer),
  ('MOCTB-DEMO-20260917-0011', 'awaiting_payment', 'Đơn COD được tạo, chờ xác nhận', 0::integer),
  ('MOCTB-DEMO-20260917-0011', 'paid', 'Nhân viên xác nhận đã thu tiền COD', 35::integer),
  ('MOCTB-DEMO-20260917-0011', 'packing', 'Bắt đầu đóng gói', 190::integer),
  ('MOCTB-DEMO-20260917-0011', 'shipping', 'Đã bàn giao cho đơn vị vận chuyển', 360::integer),
  ('MOCTB-DEMO-20260917-0011', 'completed', 'Khách đã nhận hàng', 2300::integer),
  ('MOCTB-DEMO-20260916-0012', 'awaiting_payment', 'Đơn được tạo', 0::integer),
  ('MOCTB-DEMO-20260916-0012', 'paid', 'Webhook thanh toán đã được xác thực', 21::integer),
  ('MOCTB-DEMO-20260916-0012', 'packing', 'Bắt đầu đóng gói', 170::integer),
  ('MOCTB-DEMO-20260916-0012', 'shipping', 'Đã bàn giao cho đơn vị vận chuyển', 350::integer),
  ('MOCTB-DEMO-20260916-0012', 'completed', 'Khách đã nhận hàng', 2200::integer),
  ('MOCTB-DEMO-20260911-0016', 'awaiting_payment', 'Đơn COD được tạo, chờ xác nhận', 0::integer),
  ('MOCTB-DEMO-20260911-0016', 'paid', 'Nhân viên xác nhận đã thu tiền COD', 28::integer),
  ('MOCTB-DEMO-20260911-0016', 'packing', 'Bắt đầu đóng gói', 150::integer),
  ('MOCTB-DEMO-20260911-0016', 'shipping', 'Đã bàn giao cho đơn vị vận chuyển', 330::integer),
  ('MOCTB-DEMO-20260911-0016', 'completed', 'Khách đã nhận hàng', 2100::integer),
  ('MOCTB-DEMO-20260910-0017', 'awaiting_payment', 'Đơn được tạo', 0::integer),
  ('MOCTB-DEMO-20260910-0017', 'paid', 'Webhook thanh toán đã được xác thực', 19::integer),
  ('MOCTB-DEMO-20260910-0017', 'packing', 'Bắt đầu đóng gói', 140::integer),
  ('MOCTB-DEMO-20260910-0017', 'shipping', 'Đã bàn giao cho đơn vị vận chuyển', 320::integer),
  ('MOCTB-DEMO-20260910-0017', 'completed', 'Khách đã nhận hàng', 2050::integer),
  ('MOCTB-DEMO-20260828-0020', 'awaiting_payment', 'Đơn được tạo', 0::integer),
  ('MOCTB-DEMO-20260828-0020', 'paid', 'Webhook thanh toán đã được xác thực', 23::integer),
  ('MOCTB-DEMO-20260828-0020', 'packing', 'Bắt đầu đóng gói', 180::integer),
  ('MOCTB-DEMO-20260828-0020', 'shipping', 'Đã bàn giao cho đơn vị vận chuyển', 400::integer),
  ('MOCTB-DEMO-20260828-0020', 'completed', 'Khách đã nhận hàng', 2700::integer),

  -- Đã hủy (ba tình huống khác nhau)
  ('MOCTB-DEMO-20260915-0013', 'awaiting_payment', 'Đơn được tạo', 0::integer),
  ('MOCTB-DEMO-20260915-0013', 'cancelled', 'Quá hạn thanh toán, hủy đơn', 1440::integer),
  ('MOCTB-DEMO-20260914-0014', 'awaiting_payment', 'Đơn được tạo', 0::integer),
  ('MOCTB-DEMO-20260914-0014', 'cancelled', 'Cổng thanh toán báo lỗi, hủy đơn', 55::integer),
  ('MOCTB-DEMO-20260912-0015', 'awaiting_payment', 'Đơn được tạo', 0::integer),
  ('MOCTB-DEMO-20260912-0015', 'paid', 'Webhook thanh toán đã được xác thực', 24::integer),
  ('MOCTB-DEMO-20260912-0015', 'cancelled', 'Khách đổi ý, đã hoàn tiền', 300::integer),
  ('MOCTB-DEMO-20260905-0019', 'awaiting_payment', 'Đơn COD được tạo, chờ xác nhận', 0::integer),
  ('MOCTB-DEMO-20260905-0019', 'cancelled', 'Khách không nghe máy, hủy đơn', 2880::integer)
) as d(order_number, status, note, minute_offset)
join public.orders o on o.order_number = d.order_number;

-- ---------------------------------------------------------------------
-- 10. LỜI NHẮN LIÊN HỆ
--    Bảng không có khoá tự nhiên nên tệp nhận diện dữ liệu mẫu qua miền
--    email: mọi lời nhắn dưới đây đều đến từ @vi-du.vn hoặc @moctaybac.demo.
--    Xoá đúng nhóm đó trước khi ghi lại để chạy nhiều lần không sinh trùng.
-- ---------------------------------------------------------------------
delete from public.contact_messages
where email like '%@vi-du.vn' or email like '%@moctaybac.demo';

insert into public.contact_messages (name, email, message, status, created_at, updated_at)
values
  ('Nguyễn An Nhiên', 'an.nhien@vi-du.vn', 'Mình muốn đặt 5 hộp quà mùa thu để biếu đối tác, không biết có đủ hàng không ạ?', 'new', '2026-09-23T07:40:00Z', '2026-09-23T07:40:00Z'),
  ('Trần Minh Khoa', 'minh.khoa@vi-du.vn', 'Cho mình hỏi trà Shan Tuyết ướp hoa khác gì so với loại cổ thụ thường ngày?', 'new', '2026-09-22T16:12:00Z', '2026-09-22T16:12:00Z'),
  ('Lê Thu Hà', 'thu.ha@vi-du.vn', 'Đơn MOCTB-DEMO-20260918-0010 mình nhận được rồi, hộp gói rất đẹp. Cảm ơn A Sỉn nhiều!', 'resolved', '2026-09-19T09:05:00Z', '2026-09-19T14:30:00Z'),
  ('Phạm Quốc Bảo', 'quoc.bao@vi-du.vn', 'Mắc khén rang sẵn bảo quản được bao lâu sau khi mở nắp ạ?', 'in_progress', '2026-09-18T11:48:00Z', '2026-09-18T15:20:00Z'),
  ('Hoàng Mai Phương', 'mai.phuong@vi-du.vn', 'Mình ở Điện Biên, phí giao hàng tính thế nào và mất mấy ngày?', 'in_progress', '2026-09-17T13:25:00Z', '2026-09-17T18:00:00Z'),
  ('Vũ Đình Nam', 'dinh.nam@vi-du.vn', 'Có xuất hoá đơn VAT cho đơn hàng số lượng lớn không?', 'resolved', '2026-09-15T10:02:00Z', '2026-09-16T08:45:00Z'),
  ('Đặng Thị Lan', 'thi.lan@vi-du.vn', 'Trang web này bán hàng thật hay chỉ là bản demo vậy ạ?', 'resolved', '2026-09-13T20:15:00Z', '2026-09-14T09:10:00Z'),
  ('Người Dùng Ẩn Danh', 'spam.bot@vi-du.vn', 'MUA NGAY LINK GIAM GIA CUC SOC >>> vi-du-khuyen-mai.example', 'spam', '2026-09-12T03:31:00Z', '2026-09-12T08:00:00Z'),
  ('Bùi Tuấn Anh', 'tuan.anh@vi-du.vn', 'Mình muốn tự chọn sản vật trong hộp quà thì làm ở trang nào nhỉ?', 'new', '2026-09-11T15:55:00Z', '2026-09-11T15:55:00Z'),
  ('Đỗ Thanh Tùng', 'khach@moctaybac.demo', 'Đã tạo tài khoản rồi, làm sao để xem lại lịch sử đơn hàng của mình?', 'new', '2026-09-10T12:20:00Z', '2026-09-10T12:20:00Z');

-- ---------------------------------------------------------------------
-- 11. CẤU HÌNH CỬA HÀNG
--     Bốn khoá đầu khớp đúng với INFO_KEYS trong trang Cài đặt nên giao
--     diện đọc được ngay (chúng phải là JSON chuỗi, không phải JSON object).
--     `storefront_notice` là object {"text": ...} theo cách cửa hàng đọc.
-- ---------------------------------------------------------------------
insert into public.site_settings (key, value, is_public) values
  ('store_name',          '"A Sỉn"'::jsonb,                              false),
  ('order_email',         '"orders@moctaybac.vn"'::jsonb,                      false),
  ('hotline',             '"0900 000 001"'::jsonb,                             false),
  ('currency',            '"VND"'::jsonb,                                      false),
  ('gift_box_price_vnd',  '65000'::jsonb,                                      false),
  ('storefront_notice',   '{"text":"Từ bản làng, gửi đến bạn."}'::jsonb,       true),
  ('free_shipping_from',  '500000'::jsonb,                                     true),
  ('default_low_stock',   '5'::jsonb,                                          false)
on conflict (key) do update set
  value      = excluded.value,
  is_public  = excluded.is_public,
  updated_at = timezone('utc', now());

commit;

-- =====================================================================
-- KIỂM TRA NHANH SAU KHI CHẠY
-- =====================================================================
-- select 'danh mục'   as bảng, count(*) from public.product_categories
-- union all select 'sản phẩm',      count(*) from public.products
-- union all select 'tồn kho',       count(*) from public.product_inventory
-- union all select 'bài viết',      count(*) from public.articles
-- union all select 'khuyến mãi',    count(*) from public.promotions
-- union all select 'sp km',         count(*) from public.promotion_products
-- union all select 'khách hàng',    count(*) from public.customers
-- union all select 'đơn hàng',      count(*) from public.orders
-- union all select 'dòng hàng',     count(*) from public.order_items
-- union all select 'giao dịch',     count(*) from public.payment_transactions
-- union all select 'lịch sử đơn',   count(*) from public.order_status_events
-- union all select 'lời nhắn',      count(*) from public.contact_messages
-- union all select 'cấu hình',      count(*) from public.site_settings
-- union all select 'hồ sơ',         count(*) from public.profiles
-- order by 1;
--
-- -- Ưu đãi mà khách nhìn thấy ngay bây giờ (phải KHÔNG có sản phẩm trùng):
-- select p.name, pp.display_label, pp.original_price_vnd, p.price_vnd, pp.discount_percent
-- from public.promotion_products pp
-- join public.promotions pr on pr.id = pp.promotion_id
-- join public.products p on p.id = pp.product_id
-- where pr.is_active and pr.starts_at <= now() and pr.ends_at > now()
-- order by pp.sort_order;
