-- Quy cách sản phẩm (100g / 250g / 500g / 1kg, lọ, combo…) với giá riêng, theo bảng giá của cửa hàng.
-- - Mỗi sản phẩm có thể không có quy cách nào (bán một quy cách như trước) hoặc nhiều quy cách,
--   trong đó đúng một quy cách là mặc định.
-- - Giá và quy cách trên bảng products luôn bằng quy cách mặc định, nên thẻ sản phẩm, SEO và
--   hộp quà không phải đổi.
-- - Thanh toán nhận variant_id; máy chủ tự tính giá (kể cả khuyến mãi) và ghi quy cách vào đơn.
-- - Tồn kho vẫn tính theo sản phẩm (mỗi gói bán ra trừ 1 đơn vị, không phân biệt quy cách).

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  label text not null check (char_length(btrim(label)) between 1 and 40),
  price_vnd bigint not null check (price_vnd > 0),
  is_default boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Kiểm tra lúc commit để đổi tên/đổi chỗ quy cách trong một lần lưu không vướng ràng buộc.
  constraint product_variants_label_unique unique (product_id, label) deferrable initially deferred
);
create unique index product_variants_one_default on public.product_variants (product_id) where is_default;
create index product_variants_product_idx on public.product_variants (product_id, sort_order);

create trigger product_variants_set_updated_at before update on public.product_variants
  for each row execute function public.set_updated_at();
create trigger audit_change after insert or update or delete on public.product_variants
  for each row execute function public.audit_admin_change();

alter table public.product_variants enable row level security;
revoke all on public.product_variants from anon, authenticated;
grant select on public.product_variants to anon, authenticated;
create policy "read variants of active products" on public.product_variants
  for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.active) or public.can_manage('products'));

-- Giá bán của một quy cách: áp phần trăm giảm của khuyến mãi đang chạy cho sản phẩm đó.
create or replace function public.product_variant_sale_price(p_variant uuid)
returns bigint
language sql
stable
set search_path = public
as $$
  select coalesce((
    select min(round(v.price_vnd * (100 - pp.discount_percent) / 100.0)::bigint)
    from public.promotion_products pp
    join public.promotions pr on pr.id = pp.promotion_id
    where pp.product_id = v.product_id and pr.is_active
      and (pr.starts_at is null or pr.starts_at <= now())
      and (pr.ends_at is null or pr.ends_at > now())
  ), v.price_vnd)
  from public.product_variants v
  where v.id = p_variant;
$$;

-- Đưa giá và quy cách mặc định lên bảng products (thẻ sản phẩm, SEO, hộp quà đọc từ đây).
create or replace function public.sync_product_default_variant(p_product uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.products p
  set price_vnd = v.price_vnd, weight_label = v.label
  from public.product_variants v
  where v.product_id = p.id and v.is_default and p.id = p_product
    and (p.price_vnd is distinct from v.price_vnd or p.weight_label is distinct from v.label);
$$;
revoke all on function public.sync_product_default_variant(uuid) from public, anon, authenticated;

-- Lưu toàn bộ quy cách của một sản phẩm (thêm, sửa, xoá) trong một lần.
-- p_variants: [{ id?, label, price_vnd, is_default }], theo thứ tự hiển thị. Mảng rỗng = bỏ quy cách.
create or replace function public.save_product_variants(p_product uuid, p_variants jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_label text;
  v_price bigint;
  v_default boolean;
  v_id uuid;
  v_keep uuid[] := '{}';
  v_order integer := 0;
begin
  if not public.can_manage('products') then
    raise exception 'Không có quyền sửa sản phẩm' using errcode = '42501';
  end if;
  if not exists (select 1 from public.products where id = p_product) then
    raise exception 'Không tìm thấy sản phẩm';
  end if;
  if p_variants is null or jsonb_typeof(p_variants) <> 'array' or jsonb_array_length(p_variants) > 8 then
    raise exception 'Mỗi sản phẩm có tối đa 8 quy cách';
  end if;
  if jsonb_array_length(p_variants) > 0 then
    if (select count(*) from jsonb_array_elements(p_variants) e where coalesce((e ->> 'is_default')::boolean, false)) <> 1 then
      raise exception 'Hãy chọn đúng một quy cách mặc định';
    end if;
    if (select count(distinct lower(btrim(coalesce(e ->> 'label', '')))) from jsonb_array_elements(p_variants) e) <> jsonb_array_length(p_variants) then
      raise exception 'Tên quy cách bị trùng';
    end if;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('product-variants:' || p_product::text, 0));
  -- Bỏ mặc định cũ trước để chỉ mục "một mặc định" không vướng khi đổi quy cách mặc định.
  update public.product_variants set is_default = false where product_id = p_product and is_default;

  for v_item in select value from jsonb_array_elements(p_variants)
  loop
    v_label := btrim(coalesce(v_item ->> 'label', ''));
    if char_length(v_label) not between 1 and 40 then
      raise exception 'Tên quy cách dài từ 1 đến 40 ký tự';
    end if;
    if coalesce(v_item ->> 'price_vnd', '') !~ '^[0-9]{1,10}$' or (v_item ->> 'price_vnd')::bigint <= 0 then
      raise exception 'Giá của quy cách % phải là số nguyên dương', v_label;
    end if;
    v_price := (v_item ->> 'price_vnd')::bigint;
    v_default := coalesce((v_item ->> 'is_default')::boolean, false);
    v_id := null;
    if coalesce(v_item ->> 'id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      update public.product_variants
      set label = v_label, price_vnd = v_price, is_default = v_default, sort_order = v_order
      where id = (v_item ->> 'id')::uuid and product_id = p_product
      returning id into v_id;
    end if;
    if v_id is null then
      insert into public.product_variants (product_id, label, price_vnd, is_default, sort_order)
      values (p_product, v_label, v_price, v_default, v_order)
      returning id into v_id;
    end if;
    v_keep := v_keep || v_id;
    v_order := v_order + 1;
  end loop;

  delete from public.product_variants where product_id = p_product and not (id = any(v_keep));
  perform public.sync_product_default_variant(p_product);
end;
$$;
revoke all on function public.save_product_variants(uuid, jsonb) from public, anon;
grant execute on function public.save_product_variants(uuid, jsonb) to authenticated;

-- Lưu sản phẩm và quy cách trong cùng một giao dịch, để giá trên thẻ sản phẩm (products) và giá
-- thanh toán (product_variants) không bao giờ lệch nhau khi một trong hai bước lỗi.
create or replace function public.save_admin_product_with_variants(
  p_id uuid,
  p_product jsonb,
  p_quantity integer,
  p_threshold integer,
  p_expected_quantity integer,
  p_variants jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  -- Cả hai hàm con tự kiểm tra can_manage('products') theo người gọi (auth.uid()).
  v_id := public.save_admin_product(p_id, p_product, p_quantity, p_threshold, p_expected_quantity);
  perform public.save_product_variants(v_id, coalesce(p_variants, '[]'::jsonb));
  return v_id;
end;
$$;
revoke all on function public.save_admin_product_with_variants(uuid, jsonb, integer, integer, integer, jsonb) from public, anon;
grant execute on function public.save_admin_product_with_variants(uuid, jsonb, integer, integer, integer, jsonb) to authenticated;

-- Thanh toán: dòng "product" nhận thêm variant_id (giữ nguyên phần còn lại của hàm hiện hành).

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
  v_variant public.product_variants%rowtype;
  v_variant_text text;
  v_unit bigint;
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
      -- Quy cách khách chọn; giỏ cũ chưa có quy cách dùng quy cách mặc định (nếu sản phẩm có).
      v_variant_text := nullif(btrim(coalesce(v_item ->> 'variant_id', '')), '');
      if v_variant_text is not null then
        if v_variant_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
          raise exception 'Quy cách sản phẩm không hợp lệ';
        end if;
        select * into v_variant from public.product_variants where id = v_variant_text::uuid and product_id = v_product.id;
        if not found then
          raise exception 'Quy cách của % không còn bán. Vui lòng chọn lại', v_product.name;
        end if;
      else
        select * into v_variant from public.product_variants where product_id = v_product.id and is_default;
      end if;
      if v_variant.id is not null then
        v_unit := public.product_variant_sale_price(v_variant.id);
        insert into public.order_items (order_id, product_id, product_name, sku, unit_price_vnd, quantity, metadata)
        values (v_order_id, v_product.id, v_product.name || ' · ' || v_variant.label, v_product.sku, v_unit, v_quantity,
                jsonb_build_object('variant_id', v_variant.id, 'variant_label', v_variant.label));
      else
        v_unit := public.product_sale_price(v_product.id);
        insert into public.order_items (order_id, product_id, product_name, sku, unit_price_vnd, quantity)
        values (v_order_id, v_product.id, v_product.name, v_product.sku, v_unit, v_quantity);
      end if;
      v_total := v_total + v_unit * v_quantity;

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

-- Quy cách theo bảng giá bán trực tiếp tháng 11/2026. Quy cách mặc định trùng quy cách đang bán.
with prices(slug, label, price_vnd, is_default, sort_order) as (
  values
    ('trau-gac-bep-tay-bac', 'Túi 100g', 100000, false, 0),
    ('trau-gac-bep-tay-bac', 'Túi 250g', 225000, false, 1),
    ('trau-gac-bep-tay-bac', 'Túi 500g', 450000, true, 2),
    ('trau-gac-bep-tay-bac', 'Túi 1kg', 850000, false, 3),
    ('ba-chi-gac-bep', 'Túi 100g', 65000, false, 0),
    ('ba-chi-gac-bep', 'Túi 250g', 122500, false, 1),
    ('ba-chi-gac-bep', 'Túi 500g', 245000, true, 2),
    ('ba-chi-gac-bep', 'Túi 1kg', 490000, false, 3),
    ('thit-lon-gac-bep', 'Túi 100g', 75000, false, 0),
    ('thit-lon-gac-bep', 'Túi 250g', 142500, false, 1),
    ('thit-lon-gac-bep', 'Túi 500g', 285000, true, 2),
    ('thit-lon-gac-bep', 'Túi 1kg', 590000, false, 3),
    ('lap-xuong-gac-bep', 'Túi 100g', 50000, false, 0),
    ('lap-xuong-gac-bep', 'Túi 250g', 112500, false, 1),
    ('lap-xuong-gac-bep', 'Túi 500g', 225000, true, 2),
    ('lap-xuong-gac-bep', 'Túi 1kg', 415000, false, 3),
    ('thit-lon-xe', 'Lọ 200g', 150000, true, 0),
    ('thit-lon-xe', 'Combo 2 lọ', 290000, false, 1)
)
insert into public.product_variants (product_id, label, price_vnd, is_default, sort_order)
select p.id, prices.label, prices.price_vnd, prices.is_default, prices.sort_order
from prices join public.products p on p.slug = prices.slug
-- Chỉ gieo cho sản phẩm chưa có quy cách nào (chạy lại không nhân đôi).
where not exists (select 1 from public.product_variants v where v.product_id = p.id);

select public.sync_product_default_variant(p.id)
from public.products p
where exists (select 1 from public.product_variants v where v.product_id = p.id);
