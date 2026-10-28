-- A SỈN — danh mục theo Figma Page 4 và hộp quà 3D (Sinh Lộc / Thịnh Đỉnh).
-- Áp dụng sau các migration hiện có. Chưa được chạy trên cơ sở dữ liệu thật: cần chủ cửa hàng
-- xem lại giá, quy cách và tồn kho trước khi apply.
--
-- 1. Thêm/cập nhật 9 sản phẩm của thiết kế (giá theo Figma; thịt trâu xé là giá tạm).
-- 2. Ẩn các sản phẩm minh họa của bản demo cũ (trà, mật ong…), không xoá dữ liệu.
-- 3. Checkout hộp quà: giá vỏ theo size (250.000 / 420.000), thiệp viết tay 30.000,
--    tối đa 3 món tự chọn, cho phép trùng món; món cố định (chẩm chéo, rượu) đã gồm trong giá vỏ
--    nhưng vẫn ghi dòng hàng 0đ để trừ tồn kho.
begin;

insert into public.product_categories (slug, name, sort_order)
values ('ruou', 'Rượu', 6)
on conflict (slug) do nothing;

insert into public.products (category_id, slug, sku, name, origin, weight_label, price_vnd, image_url, tag, description, active, featured, sort_order, model_url)
select c.id, d.slug, d.sku, d.name, 'TÂY BẮC', d.weight, d.price, d.image, d.tag, d.description, true, true, d.position, d.model
from (values
  ('trau-gac-bep-tay-bac', 'ASIN-TRAU-GAC-BEP', 'Thịt trâu gác bếp', 'Túi 500g', 480000, '/media/products/trau/cam-on-12.webp', 'Bán chạy', 'Thịt trâu tươi tuyển chọn, tẩm ướp gia vị núi rừng, sấy gác bếp truyền thống.', 'dac-san-gac-bep', 1, '/models/gift/bag-thit-trau.glb'),
  ('lap-xuong-gac-bep', 'ASIN-LAP-XUONG-GAC-BEP', 'Lạp xưởng gác bếp', 'Túi 500g', 320000, '/media/products/lap-xuong/cam-on-7.webp', 'Quà biếu', 'Hương khói đậm đà, thịt tươi và gia vị vùng cao.', 'dac-san-gac-bep', 2, '/models/gift/bag-lap-xuong.glb'),
  ('thit-lon-gac-bep', 'ASIN-THIT-LON-GAC-BEP', 'Thịt lợn gác bếp', 'Túi 500g', 550000, '/media/products/lon/cam-on-5.webp', 'Thịt gác bếp', 'Thịt lợn bản sấy khô, hương khói đặc trưng, vị ngọt tự nhiên.', 'dac-san-gac-bep', 3, '/models/gift/bag-lon-say.glb'),
  ('thit-lon-xe', 'ASIN-THIT-LON-XE', 'Thịt lợn xé', 'Hũ 500g', 220000, '/media/products/lon-xe/cam-on-8.webp', 'Thịt gác bếp', 'Sợi thịt tẩm ướp khéo, mềm dai và tiện lợi.', 'dac-san-gac-bep', 4, '/models/gift/jar-lon-xe.glb'),
  ('cham-cheo', 'ASIN-CHAM-CHEO', 'Chẩm chéo Tây Bắc', 'Hũ 100g', 85000, '/media/products/cham-cheo/cam-on-10.webp', 'Gia vị', 'Gia vị đặc trưng của người Thái, hòa quyện nhiều loại thảo mộc.', 'gia-vi-nui-rung', 5, '/models/gift/jar-cham-cheo.glb'),
  ('ruou-ngo-ban-pho', 'ASIN-RUOU-NGO-BAN-PHO', 'Rượu ngô Bản Phố', 'Bình 500ml', 135000, '/media/products/ruou/cam-on-11.webp', 'Rượu', 'Ngô men lá truyền thống của người Mông Bản Phố, hương thơm dịu.', 'ruou', 6, '/models/gift/bottle-ruou-ngo.glb'),
  ('ba-chi-gac-bep', 'ASIN-BA-CHI-GAC-BEP', 'Ba chỉ lợn gác bếp', 'Túi 500g', 75000, '/media/products/ba-chi/cam-on-6.webp', 'Thịt gác bếp', 'Ba chỉ lợn bản tẩm mắc khén, hun khói gác bếp, béo ngậy mà không ngấy.', 'dac-san-gac-bep', 7, '/models/gift/bag-ba-chi.glb'),
  ('combo-thit-gac-bep', 'ASIN-COMBO-THIT-GAC-BEP', 'Combo thịt gác bếp', 'Combo 3 món', 650000, '/media/products/trau/f8451008.webp', 'Quà biếu', 'Trâu, lạp xưởng và chẩm chéo trong một set quà đậm vị núi rừng.', 'hop-qua', 8, null),
  ('thit-trau-xe', 'ASIN-THIT-TRAU-XE', 'Thịt trâu xé', 'Hũ 500g', 250000, '/media/products/trau/f8371072.webp', 'Thịt gác bếp', 'Thịt trâu gác bếp xé sợi, đóng hũ tiện dùng làm quà.', 'dac-san-gac-bep', 9, '/models/gift/jar-trau-xe.glb')
) as d(slug, sku, name, weight, price, image, tag, description, category, position, model)
left join public.product_categories c on c.slug = d.category
on conflict (slug) do update set
  category_id = excluded.category_id,
  name = excluded.name,
  weight_label = excluded.weight_label,
  price_vnd = excluded.price_vnd,
  image_url = excluded.image_url,
  tag = excluded.tag,
  description = excluded.description,
  active = true,
  featured = true,
  sort_order = excluded.sort_order,
  model_url = excluded.model_url;

-- Tồn kho khởi tạo 0: chủ cửa hàng nhập số lượng thật trong trang quản trị trước khi mở bán.
insert into public.product_inventory (product_id, quantity, low_stock_threshold)
select id, 0, 5 from public.products
where slug in ('trau-gac-bep-tay-bac', 'lap-xuong-gac-bep', 'thit-lon-gac-bep', 'thit-lon-xe', 'cham-cheo',
               'ruou-ngo-ban-pho', 'ba-chi-gac-bep', 'combo-thit-gac-bep', 'thit-trau-xe')
on conflict (product_id) do nothing;

update public.products set active = false
where slug in ('hop-qua-mua-thu', 'mac-khen-rung', 'mat-ong-hoa-rung', 'tra-shan-tuyet-co-thu', 'hop-qua-tet',
               'hat-mac-khen-rang', 'mat-ong-bac-ha', 'tra-shan-tuyet-uop-hoa', 'thit-trau-gac-bep-cay',
               'ga-gac-bep', 'mat-ong-san-day');

create or replace function public.checkout_order_internal(
  p_customer_name text,
  p_customer_phone text,
  p_shipping_address text,
  p_items jsonb,
  p_payment_method public.payment_method default 'cod',
  p_customer_email text default null, p_customer_note text default null, p_request_id uuid default gen_random_uuid()
)
returns table (order_id uuid, order_number text, total_amount_vnd bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid := gen_random_uuid();
  v_order_number text := format(
    'ASIN-%s-%s',
    to_char(timezone('utc', now()), 'YYYYMMDD'),
    upper(substr(replace(v_order_id::text, '-', ''), 1, 6))
  );
  v_customer_id uuid;
  v_existing public.orders%rowtype;
  v_shipping bigint := 0;
  v_item jsonb;
  v_kind text;
  v_product_slug text;
  v_quantity integer;
  v_product public.products%rowtype;
  v_total bigint := 0;
  v_gift_product_ids jsonb;
  v_design jsonb;
  v_size text;
  v_box_price bigint;
  v_card_price constant bigint := 30000;
  v_included text[];
begin
  if p_request_id is null then raise exception 'Thiếu mã yêu cầu'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
  select * into v_existing from orders where request_id=p_request_id;
  if found then return query select v_existing.id,v_existing.order_number,v_existing.total_vnd; return; end if;
  if p_customer_email is not null and (char_length(p_customer_email)>254 or p_customer_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$') then raise exception 'Email không hợp lệ'; end if;
  if char_length(coalesce(p_customer_note,'')) > 1000 then raise exception 'Ghi chú tối đa 1000 ký tự'; end if;
  if char_length(btrim(coalesce(p_customer_name, ''))) not between 2 and 80 then
    raise exception 'Tên khách hàng không hợp lệ';
  end if;
  if coalesce(normalize_phone(p_customer_phone),'') !~ '^0[0-9]{9}$' then
    raise exception 'Số điện thoại không hợp lệ';
  end if;
  if char_length(btrim(coalesce(p_shipping_address, ''))) not between 10 and 300 then
    raise exception 'Địa chỉ giao hàng không hợp lệ';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 50 then
    raise exception 'Giỏ hàng không hợp lệ';
  end if;

  v_customer_id := resolve_guest_customer(p_customer_name,p_customer_email,p_customer_phone,'checkout',p_shipping_address,false);
  if (select count(*) from orders where customer_id=v_customer_id and created_at > now()-interval '1 hour') >= 10 then raise exception 'Bạn đã tạo nhiều đơn. Vui lòng liên hệ cửa hàng'; end if;
  update customers set stage=case when stage='lead' then 'active' else stage end where id=v_customer_id;
  insert into public.orders (id,order_number,customer_id,payment_method,shipping_address,customer_note,request_id,recipient_name,recipient_phone,recipient_email)
  values(v_order_id,v_order_number,v_customer_id,p_payment_method,btrim(p_shipping_address),nullif(btrim(p_customer_note),''),p_request_id,btrim(p_customer_name),normalize_phone(p_customer_phone),nullif(lower(btrim(p_customer_email)),''));

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_kind := v_item ->> 'kind';
    v_quantity := (v_item ->> 'quantity')::integer;
    if v_quantity is null or v_quantity not between 1 and 20 then raise exception 'Số lượng phải từ 1 đến 20'; end if;

    if v_kind = 'product' then
      v_product_slug := v_item ->> 'product_id';
      select * into v_product from public.products where slug = v_product_slug and active = true;
      if not found then
        raise exception 'Sản phẩm % không còn bán', coalesce(v_product_slug, 'không xác định');
      end if;
      insert into public.order_items (order_id, product_id, product_name, sku, unit_price_vnd, quantity)
      values (v_order_id, v_product.id, v_product.name, v_product.sku, public.product_sale_price(v_product.id), v_quantity);
      v_total := v_total + public.product_sale_price(v_product.id) * v_quantity;

    elsif v_kind = 'gift_box' then
      v_design := coalesce(v_item -> 'design', '{}'::jsonb);
      v_size := coalesce(v_design ->> 'size', 'medium');
      if v_size not in ('medium', 'large') then raise exception 'Size hộp quà không hợp lệ'; end if;
      v_box_price := case when v_size = 'large' then 420000 else 250000 end;
      -- Món cố định do máy chủ quyết định theo size, không tin danh sách từ trình duyệt.
      v_included := case when v_size = 'large' then array['cham-cheo', 'ruou-ngo-ban-pho'] else array['cham-cheo'] end;

      v_gift_product_ids := v_item -> 'product_ids';
      if v_gift_product_ids is null or jsonb_typeof(v_gift_product_ids) <> 'array'
         or jsonb_array_length(v_gift_product_ids) not between 1 and 3 then
        raise exception 'Sản vật trong hộp quà không hợp lệ';
      end if;

      for v_product_slug in select value from jsonb_array_elements_text(v_gift_product_ids)
      loop
        select * into v_product from public.products where slug = v_product_slug and active = true;
        if not found then
          raise exception 'Sản phẩm % trong hộp quà không còn bán', v_product_slug;
        end if;
        insert into public.order_items (order_id, product_id, product_name, sku, unit_price_vnd, quantity, metadata)
        values (v_order_id, v_product.id, v_product.name, v_product.sku, public.product_sale_price(v_product.id), v_quantity,
                jsonb_build_object('gift_design', v_design));
        v_total := v_total + public.product_sale_price(v_product.id) * v_quantity;
      end loop;

      foreach v_product_slug in array v_included
      loop
        select * into v_product from public.products where slug = v_product_slug and active = true;
        if not found then
          raise exception 'Sản phẩm % trong hộp quà không còn bán', v_product_slug;
        end if;
        insert into public.order_items (order_id, product_id, product_name, sku, unit_price_vnd, quantity, metadata)
        values (v_order_id, v_product.id, v_product.name || ' (gồm trong hộp)', v_product.sku, 0, v_quantity,
                jsonb_build_object('gift_design', v_design, 'included_in_box', true));
      end loop;

      insert into public.order_items (order_id, product_name, unit_price_vnd, quantity, metadata)
      values (v_order_id, case when v_size = 'large' then 'Hộp quà Thịnh Đỉnh' else 'Hộp quà Sinh Lộc' end, v_box_price, v_quantity,
              jsonb_build_object('gift_design', v_design));
      v_total := v_total + v_box_price * v_quantity;

      if coalesce((v_design ->> 'includeCard')::boolean, false) then
        insert into public.order_items (order_id, product_name, unit_price_vnd, quantity, metadata)
        values (v_order_id, 'Thiệp chúc viết tay', v_card_price, v_quantity, jsonb_build_object('gift_design', v_design));
        v_total := v_total + v_card_price * v_quantity;
      end if;

    else
      raise exception 'Loại dòng hàng không hợp lệ';
    end if;
  end loop;

  if exists(select 1 from order_items i left join product_inventory s on s.product_id=i.product_id
    where i.order_id=v_order_id and i.product_id is not null group by i.product_id,s.quantity having sum(i.quantity)>coalesce(s.quantity,0)) then
    raise exception 'Một sản phẩm không đủ tồn kho. Vui lòng giảm số lượng'; end if;
  select coalesce((value->>'shippingFee')::bigint,0) into v_shipping from site_settings where key='commerce';
  v_shipping := coalesce(v_shipping,0);
  if v_total >= coalesce((select (value->>'freeShippingFrom')::bigint from site_settings where key='commerce'),500000) then v_shipping:=0; end if;
  update public.orders set subtotal_vnd = v_total, shipping_vnd=v_shipping, total_vnd = v_total+v_shipping where id = v_order_id;

  if p_payment_method = 'qr' then
    insert into public.payment_transactions (order_id, provider, amount_vnd) values (v_order_id, 'qr_pending_webhook', v_total+v_shipping);
  end if;

  return query select v_order_id, v_order_number, v_total+v_shipping;
end;
$$;

revoke all on function public.checkout_order_internal(text,text,text,jsonb,public.payment_method,text,text,uuid) from public, anon, authenticated;

update public.site_settings set value = '250000'::jsonb where key = 'gift_box_price_vnd';

commit;
