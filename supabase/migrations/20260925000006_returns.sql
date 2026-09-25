begin;
create table public.order_returns (
 id uuid primary key default gen_random_uuid(), order_id uuid not null unique references orders(id),
 amount_vnd bigint not null check(amount_vnd>=0), reference text not null, reason text not null,
 goods_received boolean not null, restocked boolean not null, created_by uuid references profiles(id), created_at timestamptz not null default now()
);
alter table order_returns enable row level security;
create policy "operations read returns" on order_returns for select to authenticated using(can_manage('orders'));
grant select on order_returns to authenticated;
create function public.record_order_return(p_id uuid,p_expected public.order_status,p_reason text,p_reference text,p_money_refunded boolean,p_goods_received boolean,p_restock boolean)
returns void language plpgsql security definer set search_path=public as $$
declare o orders%rowtype; r record;
begin
 if not can_manage('settings') then raise exception 'Chỉ quản trị viên được ghi nhận hoàn trả'; end if;
 select * into o from orders where id=p_id for update;
 if not found or o.status<>p_expected or o.status='cancelled' then raise exception 'Đơn đã thay đổi. Hãy tải lại'; end if;
 if o.payment_status<>'paid' and o.status not in ('shipping','completed') then raise exception 'Dùng thao tác hủy cho đơn chưa giao và chưa thu tiền'; end if;
 if char_length(btrim(coalesce(p_reason,''))) not between 5 and 1000 then raise exception 'Cần lý do hoàn trả từ 5 đến 1000 ký tự'; end if;
 if o.payment_status='paid' and (not coalesce(p_money_refunded,false) or char_length(btrim(coalesce(p_reference,''))) not between 3 and 200) then raise exception 'Cần xác nhận đã hoàn đủ tiền và mã đối soát thực tế'; end if;
 if o.status in ('shipping','completed') and not coalesce(p_goods_received,false) then raise exception 'Chỉ đóng hoàn trả khi đã nhận lại hàng'; end if;
 if p_restock and o.stock_deducted then
  for r in select product_id,sum(quantity)::integer as qty from order_items where order_id=o.id and product_id is not null group by product_id order by product_id loop
   update product_inventory set quantity=quantity+r.qty where product_id=r.product_id;
  end loop;
 end if;
 insert into order_returns(order_id,amount_vnd,reference,reason,goods_received,restocked,created_by)
 values(o.id,case when o.payment_status='paid' then o.total_vnd else 0 end,btrim(coalesce(p_reference,'')),btrim(p_reason),p_goods_received,p_restock,auth.uid());
 perform set_config('moc.status_note','Hoàn trả: '||btrim(p_reason)||case when o.payment_status='paid' then ' · Đã hoàn tiền, đối soát: '||btrim(p_reference) else ' · COD chưa thu tiền' end,true);
 update orders set status='cancelled',payment_status=case when payment_status='paid' then 'refunded'::payment_status else payment_status end,
 stock_deducted=case when p_restock then false else stock_deducted end where id=o.id;
end; $$;
revoke all on function public.record_order_return(uuid,public.order_status,text,text,boolean,boolean,boolean) from public,anon;
grant execute on function public.record_order_return(uuid,public.order_status,text,text,boolean,boolean,boolean) to authenticated;
commit;
