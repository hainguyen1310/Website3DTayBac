-- Kiểm tra thủ công nội dung hai mẫu hộp quà trên Supabase local (mọi thay đổi bị rollback):
--   docker exec -i supabase_db_Website3DTayBac psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/gift_box_contents_checks.sql
-- Quy tắc (khớp boxSizes trong src/catalog.ts):
--   Sinh Lộc (medium): tối đa 3 món tự chọn, kèm sẵn chẩm chéo, 300.000đ.
--   Thịnh Đỉnh (large): tối đa 2 món tự chọn, kèm sẵn bình rượu ngô Bản Phố, không kèm chẩm chéo, 500.000đ.
begin;

update public.product_inventory set quantity = 100
where product_id in (select id from public.products
                     where slug in ('trau-gac-bep-tay-bac', 'lap-xuong-gac-bep', 'thit-lon-xe', 'cham-cheo', 'ruou-ngo-ban-pho'));

-- 1. Thịnh Đỉnh: hai túi tự chọn + bình rượu ngô kèm sẵn, không có chẩm chéo; trọn hộp 500.000đ.
do $$
declare
  v_order record;
  v_lines text;
begin
  -- `included` do trình duyệt gửi lên (ở đây là danh sách của giao diện cũ) không được máy chủ tin.
  select * into v_order from public.checkout_order_internal('Khách Thử', '0912000002', '12 Đường Thử, Phường Thử, Hà Nội',
    jsonb_build_array(jsonb_build_object('kind', 'gift_box', 'quantity', 1,
      'product_ids', jsonb_build_array('trau-gac-bep-tay-bac', 'lap-xuong-gac-bep'),
      'design', jsonb_build_object('size', 'large', 'includeCard', true,
        'slots', jsonb_build_object('bagA', 'trau-gac-bep-tay-bac', 'bagB', 'lap-xuong-gac-bep'),
        'included', jsonb_build_array('cham-cheo', 'ruou-ngo-ban-pho')))));
  select string_agg(product_name, ' | ' order by product_name) into v_lines from public.order_items where order_id = v_order.order_id;

  if exists (select 1 from public.order_items i join public.products p on p.id = i.product_id
             where i.order_id = v_order.order_id and p.slug = 'cham-cheo') then
    raise exception 'FAIL: hộp Thịnh Đỉnh vẫn kèm chẩm chéo (%)', v_lines;
  end if;
  if (select count(*) from public.order_items i join public.products p on p.id = i.product_id
      where i.order_id = v_order.order_id and p.slug = 'ruou-ngo-ban-pho' and i.unit_price_vnd = 0
        and (i.metadata ->> 'included_in_box')::boolean) <> 1 then
    raise exception 'FAIL: hộp Thịnh Đỉnh phải kèm đúng một bình rượu ngô (%)', v_lines;
  end if;
  if (select count(*) from public.order_items where order_id = v_order.order_id and product_id is not null) <> 3 then
    raise exception 'FAIL: hộp Thịnh Đỉnh phải có đúng ba dòng sản phẩm: hai túi và rượu ngô (%)', v_lines;
  end if;
  if (select subtotal_vnd from public.orders where id = v_order.order_id) <> 500000 then
    raise exception 'FAIL: giá trọn hộp Thịnh Đỉnh phải là 500.000đ';
  end if;
  raise notice 'OK 1: Thịnh Đỉnh = hai túi + rượu ngô, 500.000đ';
end $$;

-- 2. Thịnh Đỉnh từ chối món tự chọn thứ ba (giao diện cũ gửi hai túi + một hũ) bằng thông báo rõ ràng.
do $$
begin
  begin
    perform public.checkout_order_internal('Khách Thử', '0912000002', '12 Đường Thử, Phường Thử, Hà Nội',
      jsonb_build_array(jsonb_build_object('kind', 'gift_box', 'quantity', 1,
        'product_ids', jsonb_build_array('trau-gac-bep-tay-bac', 'lap-xuong-gac-bep', 'thit-lon-xe'),
        'design', jsonb_build_object('size', 'large', 'includeCard', false))));
    raise exception 'FAIL: hộp Thịnh Đỉnh nhận ba món tự chọn';
  exception when raise_exception then
    if sqlerrm like 'FAIL:%' then raise; end if;
    if sqlerrm not like 'Hộp quà Thịnh Đỉnh chỉ gồm 2 món tự chọn%' then
      raise exception 'FAIL: thông báo từ chối món thứ ba không rõ ràng (%)', sqlerrm;
    end if;
  end;
  raise notice 'OK 2: Thịnh Đỉnh từ chối món tự chọn thứ ba';
end $$;

-- 3. Sinh Lộc không đổi: ba món tự chọn, kèm chẩm chéo, không kèm rượu ngô; 300.000đ; món thứ tư bị từ chối.
do $$
declare
  v_order record;
  v_lines text;
begin
  select * into v_order from public.checkout_order_internal('Khách Thử', '0912000002', '12 Đường Thử, Phường Thử, Hà Nội',
    jsonb_build_array(jsonb_build_object('kind', 'gift_box', 'quantity', 1,
      'product_ids', jsonb_build_array('trau-gac-bep-tay-bac', 'lap-xuong-gac-bep', 'thit-lon-xe'),
      'design', jsonb_build_object('size', 'medium', 'includeCard', true))));
  select string_agg(product_name, ' | ' order by product_name) into v_lines from public.order_items where order_id = v_order.order_id;

  if (select count(*) from public.order_items i join public.products p on p.id = i.product_id
      where i.order_id = v_order.order_id and p.slug = 'cham-cheo' and i.unit_price_vnd = 0) <> 1 then
    raise exception 'FAIL: hộp Sinh Lộc phải kèm đúng một chẩm chéo (%)', v_lines;
  end if;
  if exists (select 1 from public.order_items i join public.products p on p.id = i.product_id
             where i.order_id = v_order.order_id and p.slug = 'ruou-ngo-ban-pho') then
    raise exception 'FAIL: hộp Sinh Lộc không kèm rượu ngô (%)', v_lines;
  end if;
  if (select count(*) from public.order_items where order_id = v_order.order_id and product_id is not null) <> 4 then
    raise exception 'FAIL: hộp Sinh Lộc phải có đúng bốn dòng sản phẩm: ba món tự chọn và chẩm chéo (%)', v_lines;
  end if;
  if (select subtotal_vnd from public.orders where id = v_order.order_id) <> 300000 then
    raise exception 'FAIL: giá trọn hộp Sinh Lộc phải là 300.000đ';
  end if;

  begin
    perform public.checkout_order_internal('Khách Thử', '0912000002', '12 Đường Thử, Phường Thử, Hà Nội',
      jsonb_build_array(jsonb_build_object('kind', 'gift_box', 'quantity', 1,
        'product_ids', jsonb_build_array('trau-gac-bep-tay-bac', 'lap-xuong-gac-bep', 'thit-lon-xe', 'trau-gac-bep-tay-bac'),
        'design', jsonb_build_object('size', 'medium', 'includeCard', false))));
    raise exception 'FAIL: hộp Sinh Lộc nhận bốn món tự chọn';
  exception when raise_exception then
    if sqlerrm like 'FAIL:%' then raise; end if;
  end;
  begin
    perform public.checkout_order_internal('Khách Thử', '0912000002', '12 Đường Thử, Phường Thử, Hà Nội',
      jsonb_build_array(jsonb_build_object('kind', 'gift_box', 'quantity', 1,
        'product_ids', '[]'::jsonb, 'design', jsonb_build_object('size', 'large', 'includeCard', false))));
    raise exception 'FAIL: nhận hộp quà không có món tự chọn nào';
  exception when raise_exception then
    if sqlerrm like 'FAIL:%' then raise; end if;
  end;
  raise notice 'OK 3: Sinh Lộc = ba món tự chọn + chẩm chéo, 300.000đ';
end $$;

-- 4. Hàm nội bộ vẫn không mở cho khách (create or replace giữ nguyên quyền, migration thu hồi lại cho chắc).
do $$
begin
  if has_function_privilege('anon', 'public.checkout_order_internal(text,text,text,jsonb,public.payment_method,text,text,uuid)', 'execute')
     or has_function_privilege('authenticated', 'public.checkout_order_internal(text,text,text,jsonb,public.payment_method,text,text,uuid)', 'execute') then
    raise exception 'FAIL: checkout_order_internal bị mở cho anon/authenticated';
  end if;
  raise notice 'OK 4: quyền của hàm nội bộ giữ nguyên';
end $$;

rollback;
