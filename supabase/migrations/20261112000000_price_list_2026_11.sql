-- Bảng giá bán trực tiếp tháng 11/2026 ("Danh mục đặc sản" do cửa hàng gửi).
-- Website bán mỗi món một quy cách: đồ gác bếp/sấy theo túi 500g, thịt lợn xé lọ 200g,
-- chẩm chéo lọ 100g, rượu ngô theo lít. Thịt trâu xé và combo chưa có trong bảng giá nên giữ nguyên.
update public.products set price_vnd = 450000 where slug = 'trau-gac-bep-tay-bac';
update public.products set price_vnd = 245000 where slug = 'ba-chi-gac-bep';
update public.products set price_vnd = 285000 where slug = 'thit-lon-gac-bep';
update public.products set price_vnd = 225000 where slug = 'lap-xuong-gac-bep';
update public.products set price_vnd = 150000, weight_label = 'Lọ 200g' where slug = 'thit-lon-xe';
update public.products set price_vnd = 28000, weight_label = 'Lọ 100g' where slug = 'cham-cheo';
update public.products set price_vnd = 100000, weight_label = 'Chai 1 lít' where slug = 'ruou-ngo-ban-pho';
