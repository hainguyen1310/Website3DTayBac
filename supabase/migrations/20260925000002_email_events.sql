begin;
create function public.ingest_email_event(p_event_id text,p_type text,p_provider_id text,p_payload jsonb) returns void
language plpgsql security definer set search_path=public as $$
declare t contact_messages%rowtype; v_customer uuid; v_email text; v_name text; v_status text;
begin
 insert into email_webhook_events(id) values(p_event_id) on conflict do nothing;
 if not found then return; end if;
 if p_type='email.received' then
  if exists(select 1 from contact_entries where provider_id=p_provider_id) then return; end if;
  v_email:=lower(p_payload->>'email'); v_name:=coalesce(nullif(p_payload->>'name',''),v_email);
  if p_payload->>'token' is not null then
   select * into t from contact_messages where reply_token=(p_payload->>'token')::uuid and lower(email)=v_email;
  end if;
  if t.id is null then
   v_customer:=resolve_guest_customer(v_name,v_email,null,'email');
   insert into contact_messages(name,email,message,subject,source,customer_id,status)
   values(v_name,v_email,p_payload->>'body',coalesce(nullif(p_payload->>'subject',''),'Email từ khách hàng'),'email',v_customer,
    case when coalesce((p_payload->>'spam')::boolean,false) then 'spam'::contact_status else 'new'::contact_status end) returning * into t;
  end if;
  insert into contact_entries(contact_id,direction,body,sender_name,sender_email,provider_id,internet_message_id)
  values(t.id,'inbound',p_payload->>'body',v_name,v_email,p_provider_id,p_payload->>'message_id');
  update contact_messages set status=case when status='spam' or coalesce((p_payload->>'spam')::boolean,false) then 'spam'::contact_status else 'new'::contact_status end,last_message_at=now() where id=t.id;
  update customers set last_seen_at=now() where id=t.customer_id;
 elsif p_type in ('email.delivered','email.bounced','email.failed','email.complained') then
  v_status:=case p_type when 'email.delivered' then 'delivered' when 'email.failed' then 'failed' else 'bounced' end;
  -- An early webhook may beat the sender's database update; retry rather than lose it.
  if not exists(select 1 from contact_entries where provider_id=p_provider_id) then raise exception 'Email not recorded yet'; end if;
  update contact_entries set status=v_status,error=case when v_status='delivered' then null else 'Dịch vụ email báo thư không được giao thành công' end
   where provider_id=p_provider_id and (status not in ('bounced','failed') or v_status<>'delivered');
 end if;
end; $$;
revoke all on function public.ingest_email_event(text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.ingest_email_event(text,text,text,jsonb) to service_role;
commit;
