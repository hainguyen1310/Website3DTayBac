begin;
alter table public.orders add column request_id uuid unique;
alter table public.orders add column recipient_name text;
alter table public.orders add column recipient_phone text;
alter table public.orders add column recipient_email text;
alter table public.orders add column carrier text not null default '';
alter table public.orders add column tracking_number text not null default '';
alter table public.orders add column stock_deducted boolean not null default false;
update orders o set recipient_name=c.full_name,recipient_phone=c.phone,recipient_email=c.email,
  stock_deducted=(o.payment_status='paid' and o.payment_method='qr') from customers c where c.id=o.customer_id;

create function public.product_sale_price(p_product uuid) returns bigint language sql stable set search_path=public as $$
 select least(p.price_vnd,coalesce((select round(pp.original_price_vnd*(100-pp.discount_percent)/100.0)::bigint
 from promotion_products pp join promotions pr on pr.id=pp.promotion_id where pp.product_id=p.id
 and pr.is_active and (pr.starts_at is null or pr.starts_at<=now()) and (pr.ends_at is null or pr.ends_at>now())
 order by pp.sort_order limit 1),p.price_vnd)) from products p where p.id=p_product;
$$;
drop function public.create_checkout_order(text,text,text,jsonb,public.payment_method);
create or replace function public.create_checkout_order(
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
  v_unit bigint;
  v_item jsonb;
  v_kind text;
  v_product_slug text;
  v_quantity integer;
  v_product public.products%rowtype;
  v_total bigint := 0;
  v_gift_product_ids jsonb;
  v_gift_box_price constant bigint := 65000;
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
      select * into v_product
      from public.products
      where slug = v_product_slug and active = true;
      if not found then
        raise exception 'Sản phẩm % không còn bán', coalesce(v_product_slug, 'không xác định');
      end if;

      insert into public.order_items (
        order_id, product_id, product_name, sku, unit_price_vnd, quantity
      ) values (
        v_order_id, v_product.id, v_product.name, v_product.sku, public.product_sale_price(v_product.id), v_quantity
      );
      v_total := v_total + public.product_sale_price(v_product.id) * v_quantity;

    elsif v_kind = 'gift_box' then
      v_gift_product_ids := v_item -> 'product_ids';
      if v_gift_product_ids is null or jsonb_typeof(v_gift_product_ids) <> 'array'
         or jsonb_array_length(v_gift_product_ids) not between 1 and 4 then
        raise exception 'Sản vật trong hộp quà không hợp lệ';
      end if;
      if (select count(*) from jsonb_array_elements_text(v_gift_product_ids))
         <> (select count(distinct value) from jsonb_array_elements_text(v_gift_product_ids)) then
        raise exception 'Hộp quà không được chứa sản phẩm trùng lặp';
      end if;

      for v_product_slug in select value from jsonb_array_elements_text(v_gift_product_ids)
      loop
        select * into v_product
        from public.products
        where slug = v_product_slug and active = true;
        if not found then
          raise exception 'Sản phẩm % trong hộp quà không còn bán', v_product_slug;
        end if;

        insert into public.order_items (
          order_id, product_id, product_name, sku, unit_price_vnd, quantity, metadata
        ) values (
          v_order_id, v_product.id, v_product.name, v_product.sku,
          public.product_sale_price(v_product.id), v_quantity,
          jsonb_build_object('gift_design', coalesce(v_item -> 'design', '{}'::jsonb))
        );
        v_total := v_total + public.product_sale_price(v_product.id) * v_quantity;
      end loop;

      insert into public.order_items (
        order_id, product_name, unit_price_vnd, quantity, metadata
      ) values (
        v_order_id, 'Hộp quà cá nhân hóa', v_gift_box_price, v_quantity,
        jsonb_build_object('gift_design', coalesce(v_item -> 'design', '{}'::jsonb))
      );
      v_total := v_total + v_gift_box_price * v_quantity;

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
  update public.orders
  set subtotal_vnd = v_total, shipping_vnd=v_shipping, total_vnd = v_total+v_shipping
  where id = v_order_id;

  if p_payment_method = 'qr' then
    insert into public.payment_transactions (order_id, provider, amount_vnd)
    values (v_order_id, 'qr_pending_webhook', v_total+v_shipping);
  end if;

  return query select v_order_id, v_order_number, v_total+v_shipping;
end;
$$;


revoke all on function public.create_checkout_order(text,text,text,jsonb,public.payment_method,text,text,uuid) from public;
grant execute on function public.create_checkout_order(text,text,text,jsonb,public.payment_method,text,text,uuid) to anon,authenticated;

create function public.advance_order(p_id uuid,p_expected public.order_status,p_status public.order_status,
 p_note text default '',p_carrier text default '',p_tracking text default '',p_cod_collected boolean default false) returns void
language plpgsql security definer set search_path=public as $$
declare o orders%rowtype; r record; v_allowed boolean;
begin
 if not can_manage('orders') then raise exception 'Không có quyền xử lý đơn'; end if;
 select * into o from orders where id=p_id for update;
 if not found or o.status<>p_expected then raise exception 'Đơn đã thay đổi. Hãy tải lại trước khi xử lý'; end if;
 v_allowed := (o.status='awaiting_payment' and (p_status='cancelled' or (o.payment_method='cod' and p_status='packing')))
  or (o.status='paid' and p_status in ('packing','cancelled'))
  or (o.status='packing' and p_status in ('shipping','cancelled'))
  or (o.status='shipping' and p_status='completed');
 if not v_allowed then raise exception 'Bước xử lý không hợp lệ'; end if;
 if p_status='cancelled' and char_length(btrim(p_note))<5 then raise exception 'Cần ghi rõ lý do hủy (ít nhất 5 ký tự)'; end if;
 if p_status='cancelled' and o.payment_status='paid' then raise exception 'Đơn đã thu tiền cần xử lý hoàn tiền trước khi hủy'; end if;
 if p_status='shipping' and (btrim(p_carrier)='' or btrim(p_tracking)='') then raise exception 'Cần đơn vị giao hàng và mã vận đơn'; end if;
 if p_status='completed' and o.payment_method='cod' and not p_cod_collected then raise exception 'Cần xác nhận đã đối soát tiền COD'; end if;
 if p_status='packing' and not o.stock_deducted then
  for r in select product_id,sum(quantity)::integer as qty from order_items where order_id=o.id and product_id is not null group by product_id order by product_id loop
   update product_inventory set quantity=quantity-r.qty where product_id=r.product_id and quantity>=r.qty;
   if not found then raise exception 'Không đủ tồn kho để đóng gói'; end if;
  end loop;
  update orders set stock_deducted=true where id=o.id;
 end if;
 if p_status='cancelled' and o.stock_deducted then
  for r in select product_id,sum(quantity)::integer as qty from order_items where order_id=o.id and product_id is not null group by product_id order by product_id loop
   update product_inventory set quantity=quantity+r.qty where product_id=r.product_id;
  end loop;
  update orders set stock_deducted=false where id=o.id;
 end if;
 perform set_config('moc.status_note',nullif(btrim(p_note),''),true);
 update orders set status=p_status,
  carrier=case when p_status='shipping' then btrim(p_carrier) else carrier end,
  tracking_number=case when p_status='shipping' then btrim(p_tracking) else tracking_number end,
  payment_status=case when p_status='completed' and payment_method='cod' then 'paid'::payment_status else payment_status end
 where id=o.id;
 if p_status='completed' and o.payment_method='cod' then
  insert into payment_transactions(order_id,provider,amount_vnd,status,verified_at) values(o.id,'cod',o.total_vnd,'verified',now());
 end if;
end; $$;
revoke all on function public.advance_order(uuid,public.order_status,public.order_status,text,text,text,boolean) from public,anon;
grant execute on function public.advance_order(uuid,public.order_status,public.order_status,text,text,text,boolean) to authenticated;

create function public.save_admin_product(p_id uuid,p_product jsonb,p_quantity integer,p_threshold integer) returns uuid
language plpgsql security definer set search_path=public as $$
declare v_id uuid; begin
 if not can_manage('products') then raise exception 'Không có quyền sửa sản phẩm'; end if;
 if p_quantity<0 or p_threshold<0 or p_quantity is null or p_threshold is null then raise exception 'Tồn kho không hợp lệ'; end if;
 if btrim(coalesce(p_product->>'name',''))='' or btrim(coalesce(p_product->>'sku',''))='' or btrim(coalesce(p_product->>'origin',''))='' or btrim(coalesce(p_product->>'weight_label',''))='' or btrim(coalesce(p_product->>'image_url',''))='' then raise exception 'Cần tên, SKU, xuất xứ, quy cách và ảnh'; end if;
 if p_id is null then
  insert into products(category_id,slug,sku,name,origin,weight_label,price_vnd,image_url,tag,description,active,featured,sort_order)
  values((p_product->>'category_id')::uuid,p_product->>'slug',p_product->>'sku',p_product->>'name',p_product->>'origin',p_product->>'weight_label',(p_product->>'price_vnd')::bigint,p_product->>'image_url',coalesce(p_product->>'tag',''),coalesce(p_product->>'description',''),(p_product->>'active')::boolean,(p_product->>'featured')::boolean,(p_product->>'sort_order')::integer) returning id into v_id;
 else
  update products set category_id=(p_product->>'category_id')::uuid,slug=p_product->>'slug',sku=p_product->>'sku',name=p_product->>'name',origin=p_product->>'origin',weight_label=p_product->>'weight_label',price_vnd=(p_product->>'price_vnd')::bigint,image_url=p_product->>'image_url',tag=coalesce(p_product->>'tag',''),description=coalesce(p_product->>'description',''),active=(p_product->>'active')::boolean,featured=(p_product->>'featured')::boolean,sort_order=(p_product->>'sort_order')::integer where id=p_id returning id into v_id;
  if not found then raise exception 'Sản phẩm không tồn tại'; end if;
 end if;
 insert into product_inventory(product_id,quantity,low_stock_threshold) values(v_id,p_quantity,p_threshold)
 on conflict(product_id) do update set quantity=excluded.quantity,low_stock_threshold=excluded.low_stock_threshold;
 return v_id;
end; $$;
revoke all on function public.save_admin_product(uuid,jsonb,integer,integer) from public,anon;
grant execute on function public.save_admin_product(uuid,jsonb,integer,integer) to authenticated;

create function public.save_admin_promotion(p_id uuid,p_promotion jsonb,p_items jsonb) returns uuid
language plpgsql security definer set search_path=public as $$
declare v_id uuid; r jsonb; begin
 if not can_manage('promotions') then raise exception 'Không có quyền sửa khuyến mãi'; end if;
 if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'Cần ít nhất một sản phẩm'; end if;
 if (select count(*) from jsonb_array_elements(p_items))<>(select count(distinct value->>'productId') from jsonb_array_elements(p_items)) then raise exception 'Sản phẩm trùng lặp'; end if;
 if btrim(coalesce(p_promotion->>'name',''))='' or btrim(coalesce(p_promotion->>'code',''))='' then raise exception 'Thiếu tên hoặc mã chương trình'; end if;
 if p_id is null then
  insert into promotions(code,name,is_active,starts_at,ends_at) values(upper(btrim(p_promotion->>'code')),btrim(p_promotion->>'name'),(p_promotion->>'isActive')::boolean,(p_promotion->>'startsAt')::timestamptz,(p_promotion->>'endsAt')::timestamptz) returning id into v_id;
 else
  update promotions set code=upper(btrim(p_promotion->>'code')),name=btrim(p_promotion->>'name'),is_active=(p_promotion->>'isActive')::boolean,starts_at=(p_promotion->>'startsAt')::timestamptz,ends_at=(p_promotion->>'endsAt')::timestamptz where id=p_id returning id into v_id;
  if not found then raise exception 'Chương trình không tồn tại'; end if;
 end if;
 delete from promotion_products where promotion_id=v_id;
 for r in select value from jsonb_array_elements(p_items) loop
  insert into promotion_products(promotion_id,product_id,original_price_vnd,discount_percent,display_label,display_ending,accent,sort_order)
  values(v_id,(r->>'productId')::uuid,(r->>'originalPriceVnd')::bigint,(r->>'discountPercent')::smallint,coalesce(r->>'displayLabel',''),coalesce(r->>'displayEnding',''),coalesce(r->>'accent','forest'),(r->>'sortOrder')::integer);
 end loop;
 return v_id;
end; $$;
revoke all on function public.save_admin_promotion(uuid,jsonb,jsonb) from public,anon;
grant execute on function public.save_admin_promotion(uuid,jsonb,jsonb) to authenticated;

-- Protect historic transactions and validate staff customer edits at the database boundary.
create function public.validate_customer() returns trigger language plpgsql set search_path=public as $$
begin
 new.phone:=normalize_phone(new.phone); new.email:=nullif(lower(btrim(new.email)),'');
 if new.phone is null and new.email is null then raise exception 'Cần email hoặc số điện thoại'; end if;
 if new.phone is not null and new.phone !~ '^0[0-9]{9}$' then raise exception 'Số điện thoại không hợp lệ'; end if;
 if new.email is not null and new.email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'Email không hợp lệ'; end if;
 if char_length(btrim(new.full_name)) not between 2 and 80 then raise exception 'Tên khách hàng không hợp lệ'; end if;
 return new;
end; $$;
create trigger validate_customer before insert or update on customers for each row execute function validate_customer();

create function public.validate_article() returns trigger language plpgsql set search_path=public as $$
begin
 if new.published and (jsonb_array_length(new.body)=0 or btrim(new.title)='' or btrim(new.excerpt)='' or btrim(new.image_url)='') then raise exception 'Bài xuất bản cần tiêu đề, mô tả, ảnh và nội dung'; end if;
 return new;
end; $$;
create trigger validate_article before insert or update on articles for each row execute function validate_article();

insert into site_settings(key,value,is_public) values('commerce','{"shippingFee":30000,"freeShippingFrom":500000}',true) on conflict(key) do nothing;
commit;
