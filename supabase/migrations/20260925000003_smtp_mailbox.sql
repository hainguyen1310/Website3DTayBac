begin;
alter table contact_entries drop constraint contact_entries_status_check;
alter table contact_entries add constraint contact_entries_status_check check(status in ('received','queued','sending','sent','delivered','failed','bounced','internal','uncertain'));
create table public.mail_sync_cursors(mailbox text primary key,validity text not null,uid bigint not null,updated_at timestamptz not null default now());
alter table mail_sync_cursors enable row level security;
revoke all on mail_sync_cursors from anon,authenticated;
create function public.advance_mail_cursor(p_mailbox text,p_validity text,p_uid bigint) returns void
language sql security definer set search_path=public as $$
 insert into mail_sync_cursors(mailbox,validity,uid) values(p_mailbox,p_validity,p_uid)
 on conflict(mailbox) do update set uid=case when mail_sync_cursors.validity=excluded.validity then greatest(mail_sync_cursors.uid,excluded.uid) else excluded.uid end,validity=excluded.validity,updated_at=now();
$$;
revoke all on function public.advance_mail_cursor(text,text,bigint) from public,anon,authenticated;
grant execute on function public.advance_mail_cursor(text,text,bigint) to service_role;
commit;
