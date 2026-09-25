begin;
-- Preserve the legacy source while deriving the known purchase stage.
update customers c set stage='active' where stage='lead' and source='legacy' and exists(select 1 from orders o where o.customer_id=c.id);
-- Also handles seed/imported contacts added after the initial CRM migration.
do $$ declare r record; cid uuid; begin
 for r in select * from contact_messages where customer_id is null loop
  begin
   cid:=resolve_guest_customer(r.name,r.email,r.phone,case when r.source='newsletter' then 'newsletter' else 'contact' end,null,false);
   update contact_messages set customer_id=cid where id=r.id;
  exception when others then
   -- An ambiguous legacy identity must be reviewed by staff, never merged silently.
   raise notice 'Contact % requires manual customer linking',r.id;
  end;
 end loop;
end $$;
insert into contact_entries(contact_id,direction,body,sender_name,sender_email,created_at)
select c.id,'inbound',c.message,c.name,c.email,c.created_at from contact_messages c
where not exists(select 1 from contact_entries e where e.contact_id=c.id);

create function public.link_contact_customer(p_contact_id uuid,p_customer_id uuid) returns void language plpgsql security definer set search_path=public as $$
begin
 if not can_manage('messages') then raise exception 'Không có quyền liên kết khách hàng'; end if;
 if not exists(select 1 from customers where id=p_customer_id) then raise exception 'Không tìm thấy khách hàng'; end if;
 update contact_messages set customer_id=p_customer_id where id=p_contact_id and customer_id is null;
 if not found then raise exception 'Liên hệ đã có hồ sơ hoặc không tồn tại. Hãy tải lại'; end if;
end; $$;
revoke all on function public.link_contact_customer(uuid,uuid) from public,anon;
grant execute on function public.link_contact_customer(uuid,uuid) to authenticated;
create function public.withdraw_marketing_consent(p_customer_id uuid) returns void language plpgsql security definer set search_path=public as $$
begin
 if not can_manage('customers') then raise exception 'Không có quyền chăm sóc khách hàng'; end if;
 update customers set marketing_consent=false where id=p_customer_id;
 if not found then raise exception 'Không tìm thấy khách hàng'; end if;
end; $$;
revoke all on function public.withdraw_marketing_consent(uuid) from public,anon;
grant execute on function public.withdraw_marketing_consent(uuid) to authenticated;
commit;
