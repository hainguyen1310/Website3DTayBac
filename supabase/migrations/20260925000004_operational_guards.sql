begin;
revoke update on profiles from authenticated;
create function public.set_staff_access(p_id uuid,p_role text) returns void language plpgsql security definer set search_path=public as $$
begin
 if not can_manage('settings') or p_id=auth.uid() then raise exception 'Không có quyền thay đổi tài khoản này'; end if;
 if p_role not in ('admin','operations','marketing','customer') then raise exception 'Vai trò không hợp lệ'; end if;
 update profiles set role=case when p_role='admin' then 'admin'::app_role when p_role='customer' then 'customer'::app_role else 'staff'::app_role end,
 staff_scope=case when p_role='marketing' then 'marketing' else 'operations' end where id=p_id;
 if not found then raise exception 'Không tìm thấy tài khoản'; end if;
end; $$;
revoke all on function public.set_staff_access(uuid,text) from public,anon;
grant execute on function public.set_staff_access(uuid,text) to authenticated;

create function public.validate_operational_setting() returns trigger language plpgsql set search_path=public as $$
begin
 if new.key='commerce' then
  if jsonb_typeof(new.value)<>'object' or coalesce((new.value->>'shippingFee')::bigint,-1) not between 0 and 1000000 or coalesce((new.value->>'freeShippingFrom')::bigint,-1) not between 0 and 100000000 then raise exception 'Chính sách phí giao hàng không hợp lệ'; end if;
  new.is_public:=true;
 end if;
 if new.key='website_content' and (jsonb_typeof(new.value)<>'object' or octet_length(new.value::text)>200000) then raise exception 'Nội dung website không hợp lệ'; end if;
 return new;
end; $$;
create trigger validate_operational_setting before insert or update on site_settings for each row execute function validate_operational_setting();

create function public.validate_contact_assignment() returns trigger language plpgsql set search_path=public as $$
begin
 if new.assigned_to is not null and not exists(select 1 from profiles where id=new.assigned_to and (role='admin' or (role='staff' and staff_scope='operations'))) then raise exception 'Người phụ trách phải có quyền chăm sóc khách hàng'; end if;
 return new;
end; $$;
create trigger validate_contact_assignment before update on contact_messages for each row execute function validate_contact_assignment();

-- Preserve stock-bearing order lines even if a catalogue entry is removed later.
create function public.prevent_used_product_delete() returns trigger language plpgsql set search_path=public as $$
begin
 if exists(select 1 from order_items where product_id=old.id) then raise exception 'Sản phẩm đã có đơn hàng. Hãy ẩn sản phẩm thay vì xóa'; end if;
 return old;
end; $$;
create trigger prevent_used_product_delete before delete on products for each row execute function prevent_used_product_delete();

create function public.prevent_used_category_delete() returns trigger language plpgsql set search_path=public as $$
begin
 if exists(select 1 from products where category_id=old.id) then raise exception 'Chuyển sản phẩm sang danh mục khác trước khi xóa'; end if;
 return old;
end; $$;
create trigger prevent_used_category_delete before delete on product_categories for each row execute function prevent_used_category_delete();
commit;
