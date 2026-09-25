begin;
-- Store a request fingerprint so retrying cannot silently submit a different cart.
alter table orders add column request_fingerprint text;
alter function public.create_checkout_order(text,text,text,jsonb,public.payment_method,text,text,uuid) rename to checkout_order_internal;
revoke all on function public.checkout_order_internal(text,text,text,jsonb,public.payment_method,text,text,uuid) from public,anon,authenticated;
create function public.create_checkout_order(p_customer_name text,p_customer_phone text,p_shipping_address text,p_items jsonb,
 p_payment_method public.payment_method default 'cod',p_customer_email text default null,p_customer_note text default null,p_request_id uuid default gen_random_uuid())
returns table(order_id uuid,order_number text,total_amount_vnd bigint) language plpgsql security definer set search_path=public as $$
declare fingerprint text; existing orders%rowtype; created record;
begin
 fingerprint:=md5(jsonb_build_array(btrim(p_customer_name),normalize_phone(p_customer_phone),btrim(p_shipping_address),p_items,p_payment_method,lower(btrim(p_customer_email)),btrim(p_customer_note))::text);
 if p_request_id is null then raise exception 'Thiếu mã yêu cầu'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
 select * into existing from orders where request_id=p_request_id;
 if found then
  if existing.request_fingerprint is distinct from fingerprint then raise exception 'Yêu cầu đã được sử dụng với thông tin khác. Hãy tạo yêu cầu mới'; end if;
  return query select existing.id,existing.order_number,existing.total_vnd; return;
 end if;
 select * into created from checkout_order_internal(p_customer_name,p_customer_phone,p_shipping_address,p_items,p_payment_method,p_customer_email,p_customer_note,p_request_id);
 update orders set request_fingerprint=fingerprint where id=created.order_id;
 return query select created.order_id,created.order_number,created.total_amount_vnd;
end; $$;
revoke all on function public.create_checkout_order(text,text,text,jsonb,public.payment_method,text,text,uuid) from public;
grant execute on function public.create_checkout_order(text,text,text,jsonb,public.payment_method,text,text,uuid) to anon,authenticated;

-- Product editing must not overwrite inventory changed by an order since opening the form.
alter function public.save_admin_product(uuid,jsonb,integer,integer) rename to save_product_internal;
revoke all on function public.save_product_internal(uuid,jsonb,integer,integer) from public,anon,authenticated;
create function public.save_admin_product(p_id uuid,p_product jsonb,p_quantity integer,p_threshold integer,p_expected_quantity integer default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare quantity_now integer;
begin
 if not can_manage('products') then raise exception 'Không có quyền sửa sản phẩm'; end if;
 if p_id is not null then
  select quantity into quantity_now from product_inventory where product_id=p_id for update;
  if p_expected_quantity is null or coalesce(quantity_now,0)<>p_expected_quantity then raise exception 'Tồn kho đã thay đổi. Hãy mở lại sản phẩm trước khi lưu'; end if;
 end if;
 return save_product_internal(p_id,p_product,p_quantity,p_threshold);
end; $$;
revoke all on function public.save_admin_product(uuid,jsonb,integer,integer,integer) from public,anon;
grant execute on function public.save_admin_product(uuid,jsonb,integer,integer,integer) to authenticated;
revoke insert,update,delete on product_inventory from authenticated;

-- The existing verified gateway transaction already deducts stock. Mark it atomically.
alter function public.confirm_gateway_payment(uuid,text,text,jsonb) rename to confirm_payment_internal;
revoke all on function public.confirm_payment_internal(uuid,text,text,jsonb) from public,anon,authenticated,service_role;
create function public.confirm_gateway_payment(p_order_id uuid,p_provider_reference text,p_provider text,p_raw_payload jsonb default null)
returns void language plpgsql security definer set search_path=public as $$
begin
 perform confirm_payment_internal(p_order_id,p_provider_reference,p_provider,p_raw_payload);
 update orders set stock_deducted=true where id=p_order_id and payment_status='paid';
end; $$;
revoke all on function public.confirm_gateway_payment(uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.confirm_gateway_payment(uuid,text,text,jsonb) to service_role;

-- Select the cheapest active promotion consistently with the storefront.
create or replace function public.product_sale_price(p_product uuid) returns bigint language sql stable set search_path=public as $$
 select least(p.price_vnd,coalesce((select min(round(pp.original_price_vnd*(100-pp.discount_percent)/100.0)::bigint)
 from promotion_products pp join promotions pr on pr.id=pp.promotion_id where pp.product_id=p.id
 and pr.is_active and (pr.starts_at is null or pr.starts_at<=now()) and (pr.ends_at is null or pr.ends_at>now())),p.price_vnd)) from products p where p.id=p_product;
$$;

drop policy "user read own profile" on profiles;
create policy "read permitted profiles" on profiles for select to authenticated
using(id=auth.uid() or can_manage('settings') or (public.is_staff() and role in ('admin','staff')));

-- Do not create a second CRM record for an already registered email/phone.
create function public.prevent_duplicate_customer_identity() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if tg_op='UPDATE' and new.email is not distinct from old.email and new.phone is not distinct from old.phone then return new; end if;
 perform pg_advisory_xact_lock(hashtextextended('asin-guest-identities',0));
 if exists(select 1 from customers c where c.id<>new.id and
  ((nullif(lower(btrim(new.email)),'') is not null and lower(c.email)=lower(btrim(new.email))) or
   (normalize_phone(new.phone) is not null and normalize_phone(c.phone)=normalize_phone(new.phone)))) then
  raise exception 'Email hoặc số điện thoại đã thuộc hồ sơ khác. Hãy mở hồ sơ hiện có';
 end if;
 return new;
end; $$;
create trigger customer_identity_unique before insert or update on customers for each row execute function prevent_duplicate_customer_identity();

create or replace function public.validate_article() returns trigger language plpgsql set search_path=public as $$
begin
 if jsonb_typeof(new.body)<>'array' then raise exception 'Nội dung bài viết không hợp lệ'; end if;
 if new.published and (not exists(select 1 from jsonb_array_elements_text(new.body) p where btrim(p)<>'') or btrim(new.title)='' or btrim(new.excerpt)='' or btrim(new.image_url)='') then raise exception 'Bài xuất bản cần tiêu đề, mô tả, ảnh và nội dung'; end if;
 return new;
end; $$;
commit;
