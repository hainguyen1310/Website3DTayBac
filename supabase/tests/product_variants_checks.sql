-- Kiểm tra thủ công quy cách sản phẩm trên Supabase local (mọi thay đổi bị rollback):
--   docker exec -i supabase_db_Website3DTayBac psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/product_variants_checks.sql
begin;

-- 1. Dữ liệu gieo: mỗi sản phẩm có quy cách có đúng một mặc định, giá sản phẩm = giá mặc định.
do $$
begin
  if exists (
    select 1 from public.products p
    where exists (select 1 from public.product_variants v where v.product_id = p.id)
      and (select count(*) from public.product_variants v where v.product_id = p.id and v.is_default) <> 1
  ) then raise exception 'FAIL: sản phẩm có số quy cách mặc định khác 1'; end if;
  if exists (
    select 1 from public.products p join public.product_variants v on v.product_id = p.id and v.is_default
    where p.price_vnd <> v.price_vnd or p.weight_label <> v.label
  ) then raise exception 'FAIL: giá/quy cách sản phẩm lệch quy cách mặc định'; end if;
  raise notice 'OK 1: dữ liệu quy cách';
end $$;

-- 2. Thanh toán với quy cách khách chọn, giỏ cũ không có quy cách, và quy cách sai.
do $$
declare
  v_trau uuid := (select id from public.products where slug = 'trau-gac-bep-tay-bac');
  v_100g uuid := (select id from public.product_variants where product_id = v_trau and label = 'Túi 100g');
  v_combo uuid := (select v.id from public.product_variants v join public.products p on p.id = v.product_id where p.slug = 'thit-lon-xe' and v.label = 'Combo 2 lọ');
  v_order record;
  v_item record;
begin
  update public.product_inventory set quantity = 100 where product_id in (select id from public.products where slug in ('trau-gac-bep-tay-bac', 'cham-cheo'));

  select * into v_order from public.checkout_order_internal('Khách Thử', '0912000001', '12 Đường Thử, Phường Thử, Hà Nội',
    jsonb_build_array(jsonb_build_object('kind', 'product', 'product_id', 'trau-gac-bep-tay-bac', 'variant_id', v_100g, 'quantity', 2)));
  select * into v_item from public.order_items where order_id = v_order.order_id;
  if v_item.unit_price_vnd <> 100000 or v_item.product_name <> 'Thịt trâu gác bếp · Túi 100g' or v_item.metadata ->> 'variant_label' <> 'Túi 100g' then
    raise exception 'FAIL: dòng quy cách 100g sai (% / % / %)', v_item.unit_price_vnd, v_item.product_name, v_item.metadata;
  end if;
  if (select subtotal_vnd from public.orders where id = v_order.order_id) <> 200000 then raise exception 'FAIL: tạm tính quy cách 100g'; end if;

  -- Giỏ cũ (chưa có variant_id): dùng quy cách mặc định Túi 500g.
  select * into v_order from public.checkout_order_internal('Khách Thử', '0912000001', '12 Đường Thử, Phường Thử, Hà Nội',
    jsonb_build_array(jsonb_build_object('kind', 'product', 'product_id', 'trau-gac-bep-tay-bac', 'quantity', 1)));
  select * into v_item from public.order_items where order_id = v_order.order_id;
  if v_item.unit_price_vnd <> 450000 or v_item.metadata ->> 'variant_label' <> 'Túi 500g' then raise exception 'FAIL: giỏ cũ không dùng quy cách mặc định'; end if;

  -- Sản phẩm không có quy cách giữ cách tính cũ.
  select * into v_order from public.checkout_order_internal('Khách Thử', '0912000001', '12 Đường Thử, Phường Thử, Hà Nội',
    jsonb_build_array(jsonb_build_object('kind', 'product', 'product_id', 'cham-cheo', 'quantity', 1)));
  select * into v_item from public.order_items where order_id = v_order.order_id;
  if v_item.unit_price_vnd <> 28000 or v_item.product_name <> 'Chẩm chéo Tây Bắc' or v_item.metadata is distinct from '{}'::jsonb and v_item.metadata ? 'variant_id' then
    raise exception 'FAIL: sản phẩm không quy cách (% / %)', v_item.unit_price_vnd, v_item.product_name;
  end if;

  -- Quy cách của sản phẩm khác và chuỗi không phải uuid đều bị từ chối.
  begin
    perform public.checkout_order_internal('Khách Thử', '0912000001', '12 Đường Thử, Phường Thử, Hà Nội',
      jsonb_build_array(jsonb_build_object('kind', 'product', 'product_id', 'trau-gac-bep-tay-bac', 'variant_id', v_combo, 'quantity', 1)));
    raise exception 'FAIL: nhận quy cách của sản phẩm khác';
  exception when raise_exception then
    if sqlerrm like 'FAIL:%' then raise; end if;
  end;
  begin
    perform public.checkout_order_internal('Khách Thử', '0912000001', '12 Đường Thử, Phường Thử, Hà Nội',
      jsonb_build_array(jsonb_build_object('kind', 'product', 'product_id', 'trau-gac-bep-tay-bac', 'variant_id', 'abc', 'quantity', 1)));
    raise exception 'FAIL: nhận variant_id không hợp lệ';
  exception when raise_exception then
    if sqlerrm like 'FAIL:%' then raise; end if;
  end;
  raise notice 'OK 2: thanh toán theo quy cách';
end $$;

-- 3. Khuyến mãi theo phần trăm áp cho giá quy cách.
do $$
declare
  v_trau uuid := (select id from public.products where slug = 'trau-gac-bep-tay-bac');
  v_promo uuid;
begin
  insert into public.promotions (code, name, is_active, starts_at, ends_at) values ('THU-QUY-CACH', 'Thử quy cách', true, now() - interval '1 day', now() + interval '1 day') returning id into v_promo;
  insert into public.promotion_products (promotion_id, product_id, original_price_vnd, discount_percent) values (v_promo, v_trau, 450000, 10);
  if public.product_variant_sale_price((select id from public.product_variants where product_id = v_trau and label = 'Túi 250g')) <> 202500 then
    raise exception 'FAIL: giảm 10%% cho Túi 250g phải còn 202.500';
  end if;
  raise notice 'OK 3: khuyến mãi theo quy cách';
end $$;

-- 4. Nhân viên lưu quy cách: đổi giá, đổi mặc định, xoá bớt; giá sản phẩm theo mặc định mới.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';
do $$
declare
  v_xe uuid := (select id from public.products where slug = 'thit-lon-xe');
  v_lo uuid := (select id from public.product_variants where product_id = v_xe and label = 'Lọ 200g');
begin
  perform public.save_product_variants(v_xe, jsonb_build_array(
    jsonb_build_object('id', v_lo, 'label', 'Lọ 200g', 'price_vnd', 155000, 'is_default', false),
    jsonb_build_object('label', 'Combo 3 lọ', 'price_vnd', 420000, 'is_default', true)
  ));
  if (select count(*) from public.product_variants where product_id = v_xe) <> 2 then raise exception 'FAIL: không xoá quy cách bỏ đi'; end if;
  if (select id from public.product_variants where product_id = v_xe and label = 'Lọ 200g') <> v_lo then raise exception 'FAIL: quy cách giữ lại bị đổi id'; end if;
  if (select price_vnd from public.products where id = v_xe) <> 420000 or (select weight_label from public.products where id = v_xe) <> 'Combo 3 lọ' then
    raise exception 'FAIL: giá sản phẩm không theo quy cách mặc định mới';
  end if;
  begin
    perform public.save_product_variants(v_xe, jsonb_build_array(jsonb_build_object('label', 'A', 'price_vnd', 1000, 'is_default', false)));
    raise exception 'FAIL: nhận danh sách không có quy cách mặc định';
  exception when raise_exception then
    if sqlerrm like 'FAIL:%' then raise; end if;
  end;
  raise notice 'OK 4: nhân viên lưu quy cách';
end $$;

-- 4b. Lưu sản phẩm + quy cách là một giao dịch: quy cách sai thì giá sản phẩm cũng không đổi.
do $$
declare
  v_trau public.products%rowtype;
  v_payload jsonb;
begin
  select * into v_trau from public.products where slug = 'trau-gac-bep-tay-bac';
  v_payload := jsonb_build_object('category_id', v_trau.category_id, 'slug', v_trau.slug, 'sku', v_trau.sku, 'name', v_trau.name,
    'origin', v_trau.origin, 'weight_label', 'Túi 500g', 'price_vnd', 1, 'image_url', v_trau.image_url, 'tag', v_trau.tag,
    'description', v_trau.description, 'active', v_trau.active, 'featured', v_trau.featured, 'sort_order', v_trau.sort_order);
  begin
    perform public.save_admin_product_with_variants(v_trau.id, v_payload,
      (select quantity from public.product_inventory where product_id = v_trau.id),
      (select low_stock_threshold from public.product_inventory where product_id = v_trau.id),
      (select quantity from public.product_inventory where product_id = v_trau.id),
      jsonb_build_array(jsonb_build_object('label', 'Túi 500g', 'price_vnd', 1, 'is_default', true), jsonb_build_object('label', 'Túi 1kg', 'price_vnd', 2, 'is_default', true)));
    raise exception 'FAIL: nhận hai quy cách mặc định';
  exception when raise_exception then
    if sqlerrm like 'FAIL:%' then raise; end if;
  end;
  if (select price_vnd from public.products where id = v_trau.id) <> v_trau.price_vnd then
    raise exception 'FAIL: giá sản phẩm đã đổi dù quy cách bị từ chối';
  end if;
  raise notice 'OK 4b: lưu sản phẩm + quy cách là một giao dịch';
end $$;
reset role;

-- 5. Khách vãng lai đọc được quy cách của sản phẩm đang bán, không ghi được.
set local role anon;
do $$
begin
  if (select count(*) from public.product_variants) = 0 then raise exception 'FAIL: khách không đọc được quy cách'; end if;
  begin
    insert into public.product_variants (product_id, label, price_vnd) select id, 'Hack', 1 from public.products limit 1;
    raise exception 'FAIL: khách ghi được quy cách';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.save_product_variants((select id from public.products limit 1), '[]'::jsonb);
    raise exception 'FAIL: khách gọi được save_product_variants';
  exception when insufficient_privilege then null;
  end;
  raise notice 'OK 5: quyền khách vãng lai';
end $$;
reset role;

rollback;
