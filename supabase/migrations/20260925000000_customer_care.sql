begin;

alter table public.profiles add column staff_scope text not null default 'operations'
  check (staff_scope in ('operations', 'marketing'));

create or replace function public.can_manage(p_area text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from profiles where id = auth.uid() and (
    role = 'admin' or (role = 'staff' and (
      (staff_scope = 'operations' and p_area in ('dashboard','orders','products','customers','messages','reports')) or
      (staff_scope = 'marketing' and p_area in ('products','promotions','content','website'))
    ))));
$$;
-- Own-profile UPDATE previously allowed a customer to change their own role.
drop policy if exists "user edit own profile" on public.profiles;
drop policy if exists "staff manage profiles" on public.profiles;
create policy "admin manage profiles" on public.profiles for update to authenticated
  using (public.can_manage('settings')) with check (public.can_manage('settings'));

alter table public.customers alter column phone drop not null;
alter table public.customers add column source text not null default 'legacy'
  check (source in ('checkout','contact','newsletter','email','manual','legacy'));
alter table public.customers add column stage text not null default 'lead' check (stage in ('lead','active','vip','inactive'));
alter table public.customers add column company text not null default '';
alter table public.customers add column tags text[] not null default '{}';
alter table public.customers add column internal_note text not null default '';
alter table public.customers add column marketing_consent boolean not null default false;
alter table public.customers add column consent_at timestamptz;
alter table public.customers add column last_seen_at timestamptz not null default now();
update public.customers c set stage = 'active' where exists(select 1 from orders o where o.customer_id = c.id);
create index customers_email_lookup on public.customers(lower(email));

create or replace function public.normalize_phone(p_phone text) returns text
language sql immutable as $$
 select nullif(regexp_replace(regexp_replace(coalesce(p_phone,''), '[\s().-]', '', 'g'), '^\+84', '0'), '');
$$;
create index customers_phone_lookup on public.customers(public.normalize_phone(phone));

-- Guest submissions may enrich an empty field, never replace existing contact details.
-- Serializing identity lookup also prevents concurrent contact/checkout duplicates.
create or replace function public.resolve_guest_customer(p_name text, p_email text, p_phone text, p_source text,
  p_address text default null, p_consent boolean default false) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_phone text := normalize_phone(p_phone); v_email text := nullif(lower(btrim(p_email)), '');
  v_id uuid; v_phone_id uuid; v_email_id uuid; v_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('asin-guest-identities', 0));
  if v_phone is not null and v_phone !~ '^0[0-9]{9}$' then raise exception 'Số điện thoại không hợp lệ'; end if;
  if v_phone is null and v_email is null then raise exception 'Cần email hoặc số điện thoại'; end if;
  if v_phone is not null then
    select count(*), (array_agg(id order by created_at))[1] into v_count, v_phone_id from customers where normalize_phone(phone) = v_phone;
    if v_count > 1 then raise exception 'Thông tin liên hệ cần nhân viên kiểm tra trước khi tiếp tục'; end if;
  end if;
  if v_email is not null then
    select count(*), (array_agg(id order by created_at))[1] into v_count, v_email_id from customers where lower(email) = v_email;
    if v_count > 1 then raise exception 'Thông tin liên hệ cần nhân viên kiểm tra trước khi tiếp tục'; end if;
  end if;
  if v_phone_id is not null and v_email_id is not null and v_phone_id <> v_email_id then
    raise exception 'Email và số điện thoại đang thuộc hai hồ sơ khác nhau. Vui lòng liên hệ cửa hàng';
  end if;
  v_id := coalesce(v_phone_id, v_email_id);
  if v_id is null then
    insert into customers(full_name,email,phone,default_address,source,marketing_consent,consent_at)
    values(btrim(p_name),v_email,v_phone,nullif(btrim(p_address),''),p_source,p_consent,case when p_consent then now() end) returning id into v_id;
  else
    update customers set last_seen_at = now(),
      marketing_consent = marketing_consent or p_consent,
      consent_at = case when p_consent then now() else consent_at end
    where id = v_id;
    -- Do not attach an unverified, different email/phone to an established identity.
    update customers set email = coalesce(email,v_email), phone = coalesce(phone,v_phone),
      default_address = coalesce(default_address,nullif(btrim(p_address),'')) where id = v_id;
  end if;
  return v_id;
end;
$$;
revoke all on function public.resolve_guest_customer(text,text,text,text,text,boolean) from public,anon,authenticated;

alter table public.contact_messages add column customer_id uuid references public.customers(id) on delete restrict;
alter table public.contact_messages add column phone text;
alter table public.contact_messages add column subject text not null default 'Liên hệ từ website';
alter table public.contact_messages add column topic text not null default 'other'
  check (topic in ('product','order','gift','partnership','other','newsletter'));
alter table public.contact_messages add column source text not null default 'contact' check (source in ('contact','newsletter','email'));
alter table public.contact_messages add column priority text not null default 'normal' check (priority in ('low','normal','high','urgent'));
alter table public.contact_messages add column assigned_to uuid references public.profiles(id) on delete set null;
alter table public.contact_messages add column order_reference text;
alter table public.contact_messages add column reply_token uuid not null default gen_random_uuid() unique;
alter table public.contact_messages add column last_message_at timestamptz not null default now();
create index contacts_customer_index on public.contact_messages(customer_id,last_message_at desc);

create table public.contact_entries (
 id uuid primary key default gen_random_uuid(),
 contact_id uuid not null references public.contact_messages(id) on delete restrict,
 direction text not null check(direction in ('inbound','outbound','note')),
 body text not null check(char_length(body) between 1 and 20000),
 sender_name text not null default '', sender_email text, recipient_email text,
 status text not null default 'received' check(status in ('received','queued','sending','sent','delivered','failed','bounced','internal')),
 provider_id text unique, internet_message_id text, error text,
 created_by uuid references public.profiles(id) on delete set null,
 created_at timestamptz not null default now(), sent_at timestamptz
);
create index contact_entries_thread on public.contact_entries(contact_id,created_at);
alter table public.contact_entries enable row level security;
create policy "care read thread" on public.contact_entries for select to authenticated using(public.can_manage('messages'));
-- Writes are only through checked RPCs or the email Edge Function.
revoke insert,update,delete on public.contact_entries from anon,authenticated;

do $$ declare r record; v_customer uuid; begin
  for r in select * from contact_messages where customer_id is null loop
    select id into v_customer from customers where lower(email) = lower(r.email) order by created_at limit 1;
    if v_customer is null then
      insert into customers(full_name,email,source) values(r.name,lower(r.email),'contact') returning id into v_customer;
    end if;
    update contact_messages set customer_id=v_customer,last_message_at=r.created_at where id=r.id;
    insert into contact_entries(contact_id,direction,body,sender_name,sender_email,created_at)
    values(r.id,'inbound',r.message,r.name,r.email,r.created_at);
  end loop;
end $$;

drop function public.submit_contact_message(text,text,text);
create function public.submit_contact_message(p_name text,p_email text,p_message text,
 p_phone text default null,p_subject text default 'Liên hệ từ website',p_topic text default 'other',
 p_order_reference text default null,p_marketing_consent boolean default false,p_website text default '') returns uuid
language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_customer uuid; v_email text := lower(btrim(p_email)); v_source text;
begin
 if coalesce(p_website,'') <> '' then raise exception 'Không thể gửi biểu mẫu'; end if;
 if char_length(btrim(coalesce(p_name,''))) not between 2 and 80 then raise exception 'Tên phải có từ 2 đến 80 ký tự'; end if;
 if char_length(coalesce(v_email,'')) not between 5 and 254 or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'Email không hợp lệ'; end if;
 if char_length(btrim(coalesce(p_message,''))) not between 5 and 5000 then raise exception 'Nội dung phải có từ 5 đến 5000 ký tự'; end if;
 if char_length(btrim(coalesce(p_subject,''))) not between 3 and 160 then raise exception 'Tiêu đề phải có từ 3 đến 160 ký tự'; end if;
 if p_topic not in ('product','order','gift','partnership','other','newsletter') then raise exception 'Chủ đề không hợp lệ'; end if;
 if char_length(coalesce(p_order_reference,'')) > 80 then raise exception 'Mã đơn quá dài'; end if;
 perform pg_advisory_xact_lock(hashtextextended('contact:'||v_email,0));
 if (select count(*) from contact_messages where lower(email)=v_email and created_at > now()-interval '1 hour') >= 5 then
   raise exception 'Bạn đã gửi nhiều lời nhắn. Vui lòng thử lại sau một giờ'; end if;
 if p_topic='newsletter' and not p_marketing_consent then raise exception 'Cần đồng ý nhận bản tin'; end if;
 v_source := case when p_topic='newsletter' then 'newsletter' else 'contact' end;
 v_customer := resolve_guest_customer(p_name,v_email,p_phone,v_source,null,p_marketing_consent);
 insert into contact_messages(name,email,message,customer_id,phone,subject,topic,source,order_reference)
 values(btrim(p_name),v_email,btrim(p_message),v_customer,normalize_phone(p_phone),btrim(p_subject),p_topic,v_source,nullif(btrim(p_order_reference),'')) returning id into v_id;
 insert into contact_entries(contact_id,direction,body,sender_name,sender_email) values(v_id,'inbound',btrim(p_message),btrim(p_name),v_email);
 return v_id;
end;
$$;
revoke all on function public.submit_contact_message(text,text,text,text,text,text,text,boolean,text) from public;
grant execute on function public.submit_contact_message(text,text,text,text,text,text,text,boolean,text) to anon,authenticated,service_role;

create or replace function public.add_contact_note(p_contact_id uuid,p_body text) returns uuid
language plpgsql security definer set search_path=public as $$
declare v_id uuid; begin
 if not can_manage('messages') then raise exception 'Không có quyền chăm sóc khách hàng'; end if;
 if char_length(btrim(coalesce(p_body,''))) not between 1 and 10000 then raise exception 'Ghi chú không hợp lệ'; end if;
 insert into contact_entries(contact_id,direction,body,sender_name,status,created_by)
 select p_contact_id,'note',btrim(p_body),coalesce(full_name,'Nhân viên'),'internal',id from profiles where id=auth.uid() returning id into v_id;
 return v_id;
end; $$;
revoke all on function public.add_contact_note(uuid,text) from public,anon;
grant execute on function public.add_contact_note(uuid,text) to authenticated;

create table public.email_webhook_events(id text primary key, created_at timestamptz not null default now());
alter table public.email_webhook_events enable row level security;
revoke all on public.email_webhook_events from anon,authenticated;

-- Scope every operational table; customers cannot self-escalate, marketing cannot read PII.
do $$ declare r record; begin
 for r in select * from (values
  ('products','products'),('product_categories','products'),('product_inventory','products'),
  ('articles','content'),('promotions','promotions'),('promotion_products','promotions'),
  ('customers','customers'),('orders','orders'),('order_items','orders'),
  ('payment_transactions','orders'),('order_status_events','orders'),('contact_messages','messages')
 ) as t(tbl,area) loop
  execute format('drop policy if exists %I on public.%I','staff manage '||replace(r.tbl,'_',' '),r.tbl);
 end loop;
end $$;
-- Original policy names not identical to table names.
drop policy if exists "staff manage inventory" on product_inventory;
drop policy if exists "staff manage order events" on order_status_events;
create policy "scope categories" on product_categories for all to authenticated using(can_manage('products')) with check(can_manage('products'));
create policy "scope products" on products for all to authenticated using(can_manage('products')) with check(can_manage('products'));
create policy "scope inventory" on product_inventory for all to authenticated using(can_manage('products')) with check(can_manage('products'));
create policy "scope articles" on articles for all to authenticated using(can_manage('content')) with check(can_manage('content'));
create policy "scope promotions" on promotions for all to authenticated using(can_manage('promotions')) with check(can_manage('promotions'));
create policy "scope promotion items" on promotion_products for all to authenticated using(can_manage('promotions')) with check(can_manage('promotions'));
create policy "scope customers" on customers for all to authenticated using(can_manage('customers')) with check(can_manage('customers'));
create policy "scope orders read" on orders for select to authenticated using(can_manage('orders'));
create policy "scope order items read" on order_items for select to authenticated using(can_manage('orders'));
create policy "scope payments read" on payment_transactions for select to authenticated using(can_manage('orders'));
create policy "scope events read" on order_status_events for select to authenticated using(can_manage('orders'));
create policy "scope contacts read" on contact_messages for select to authenticated using(can_manage('messages'));
create policy "scope contacts update" on contact_messages for update to authenticated using(can_manage('messages')) with check(can_manage('messages'));
revoke insert,delete on contact_messages from anon,authenticated;
revoke update on contact_messages from authenticated;
grant update(status,priority,assigned_to,topic) on contact_messages to authenticated;
drop policy if exists "staff manage settings" on site_settings;
create policy "admin settings" on site_settings for all to authenticated using(can_manage('settings')) with check(can_manage('settings'));
create policy "marketing website settings" on site_settings for all to authenticated
 using(can_manage('website') and key in ('website_content','storefront_notice'))
 with check(can_manage('website') and key in ('website_content','storefront_notice') and is_public);

create table public.admin_audit_log(id bigint generated always as identity primary key,actor_id uuid,
 entity text not null,entity_id text,action text not null,created_at timestamptz not null default now());
alter table admin_audit_log enable row level security;
create policy "admin audit read" on admin_audit_log for select to authenticated using(can_manage('settings'));
revoke insert,update,delete on admin_audit_log from anon,authenticated;
create function public.audit_admin_change() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into admin_audit_log(actor_id,entity,entity_id,action) values(auth.uid(),tg_table_name,
 coalesce(to_jsonb(new)->>'id',to_jsonb(old)->>'id',to_jsonb(new)->>'key',to_jsonb(old)->>'key'),tg_op);
 return coalesce(new,old);
end; $$;
do $$ declare t text; begin
 foreach t in array array['products','product_categories','promotions','articles','site_settings','profiles','customers','contact_messages','orders'] loop
 execute format('create trigger audit_change after insert or update or delete on public.%I for each row execute function public.audit_admin_change()',t);
 end loop;
end $$;

commit;
