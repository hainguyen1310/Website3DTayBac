-- Giá trọn hộp: Sinh Lộc xanh lá 300k, Thịnh Đỉnh đỏ 500k; gồm món và thiệp.
begin;

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
  v_card_price constant bigint := 0;
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
      v_box_price := case when v_size = 'large' then 500000 else 300000 end;
      -- Màu và giá trọn hộp do máy chủ quyết định.
      v_design := jsonb_set(v_design, '{color}', to_jsonb(case when v_size = 'large' then '#681b22' else '#315442' end));
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
        if exists (select 1 from public.product_categories c where c.id = v_product.category_id and (c.slug = 'hop-qua' or c.name ~* '^hộp quà')) then
          raise exception 'Không thể chọn hộp quà làm món trong hộp';
        end if;
        insert into public.order_items (order_id, product_id, product_name, sku, unit_price_vnd, quantity, metadata)
        values (v_order_id, v_product.id, v_product.name, v_product.sku, 0, v_quantity,
                jsonb_build_object('gift_design', v_design, 'included_in_box', true));
      end loop;

      foreach v_product_slug in array v_included
      loop
        select * into v_product from public.products where slug = v_product_slug and active = true;
        if not found then
          raise exception 'Sản phẩm % trong hộp quà không còn bán', v_product_slug;
        end if;
        if exists (select 1 from public.product_categories c where c.id = v_product.category_id and (c.slug = 'hop-qua' or c.name ~* '^hộp quà')) then
          raise exception 'Không thể chọn hộp quà làm món trong hộp';
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

update public.site_settings set value = '300000'::jsonb where key = 'gift_box_price_vnd';

commit;


