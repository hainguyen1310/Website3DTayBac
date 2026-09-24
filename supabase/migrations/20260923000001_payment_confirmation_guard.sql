-- A Sỉn: sửa hai lỗi ở luồng xác thực thanh toán.
--
-- LỖI 1 — đơn đã hủy bị webhook hồi sinh
--   `confirm_gateway_payment` chỉ kiểm tra `payment_status`, không nhìn tới
--   `status`. Một đơn QR bị nhân viên hủy vẫn giữ `payment_status = 'pending'`
--   (bước hủy chỉ đổi `status`), nên khi webhook của nhà cung cấp QR về muộn,
--   hàm vẫn đi tiếp: trừ tồn kho, ghi giao dịch 'verified', rồi đặt đơn về
--   `paid`. Kết quả: đơn đã hủy tự sống lại, tồn kho bị trừ cho đơn không còn
--   giao, và lịch sử trạng thái có bước 'paid' nằm sau 'cancelled'.
--
-- LỖI 2 — lịch sử trạng thái ghi trùng một bước
--   Khi hàm đặt đơn sang `paid`, trigger `orders_record_status_event` ghi một
--   dòng cho thay đổi đó; ngay sau đó hàm tự ghi thêm một dòng nữa kèm ghi
--   chú. Màn hình chi tiết đơn vì vậy hiện hai lần cùng một bước.
--
-- Cách sửa:
--   * Đọc thêm `status`; đơn đã hủy thì dừng ngay trước khi trừ tồn kho hay
--     ghi giao dịch, kèm thông báo để Edge Function chuyển hồ sơ hoàn tiền.
--     Tiền đã vào tài khoản là việc thật, nên không tự đánh dấu 'paid' và
--     cũng không lặng lẽ bỏ qua.
--   * Trigger đọc ghi chú từ biến phiên `moc.status_note` nếu có. Hàm đặt
--     biến này trước khi đổi trạng thái, nên chỉ còn ĐÚNG MỘT dòng lịch sử,
--     mang đầy đủ ghi chú. Biến đặt ở phạm vi transaction nên không rò rỉ
--     sang câu lệnh sau.

begin;

-- 1. Trigger: nhận ghi chú kèm theo từ biến phiên (nếu có).
create or replace function public.record_order_status_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_note text;
begin
  -- Biến do hàm gọi đặt trước khi đổi trạng thái; rỗng hoặc chưa đặt thì bỏ qua.
  v_note := nullif(btrim(coalesce(current_setting('moc.status_note', true), '')), '');

  if tg_op = 'INSERT' then
    insert into public.order_status_events (order_id, status, note, changed_by)
    values (new.id, new.status, coalesce(v_note, 'Đơn được tạo'), auth.uid());
  elsif new.status is distinct from old.status then
    insert into public.order_status_events (order_id, status, note, changed_by)
    values (new.id, new.status, v_note, auth.uid());
  end if;
  return new;
end;
$$;

-- 2. Hàm xác thực thanh toán: chặn đơn đã hủy và không ghi trùng lịch sử.
create or replace function public.confirm_gateway_payment(
  p_order_id uuid,
  p_provider_reference text,
  p_provider text,
  p_raw_payload jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_inventory_quantity integer;
  v_payment_status public.payment_status;
  v_order_status public.order_status;
begin
  select payment_status, status
  into v_payment_status, v_order_status
  from public.orders
  where id = p_order_id
  for update;
  if not found then
    raise exception 'Không tìm thấy đơn hàng';
  end if;
  -- Payment providers retry webhooks. A repeated verified event must never
  -- deduct inventory a second time.
  if v_payment_status = 'paid' then
    return;
  end if;
  -- Đơn đã hủy thì không được hồi sinh tự động: không trừ tồn kho, không ghi
  -- 'verified', không đặt lại 'paid'. Ném lỗi để Edge Function biết mà chuyển
  -- hồ sơ sang xử lý hoàn tiền thủ công.
  if v_order_status = 'cancelled' then
    raise exception 'Đơn hàng % đã bị hủy trước khi thanh toán được xác thực. Không ghi nhận thanh toán; cần xử lý hoàn tiền thủ công.', p_order_id;
  end if;
  if v_payment_status <> 'pending' then
    raise exception 'Đơn hàng không ở trạng thái chờ thanh toán';
  end if;

  for v_item in
    select product_id, sum(quantity)::integer as quantity
    from public.order_items
    where order_id = p_order_id and product_id is not null
    group by product_id
  loop
    select quantity into v_inventory_quantity
    from public.product_inventory
    where product_id = v_item.product_id
    for update;
    if not found or v_inventory_quantity < v_item.quantity then
      raise exception 'Tồn kho không đủ để xác nhận thanh toán';
    end if;
    update public.product_inventory
    set quantity = quantity - v_item.quantity
    where product_id = v_item.product_id;
  end loop;

  update public.payment_transactions
  set provider = p_provider,
      provider_reference = p_provider_reference,
      status = 'verified',
      raw_payload = p_raw_payload,
      verified_at = timezone('utc', now())
  where order_id = p_order_id and status = 'initiated';

  -- Ghi chú cho trigger thay vì tự chèn thêm một dòng lịch sử nữa, nhờ vậy
  -- bước 'paid' chỉ xuất hiện một lần trong lịch sử đơn.
  perform set_config('moc.status_note', 'Webhook thanh toán đã được xác thực', true);

  update public.orders
  set payment_status = 'paid', status = 'paid'
  where id = p_order_id and payment_status = 'pending';

  perform set_config('moc.status_note', '', true);
end;
$$;

-- `create or replace` giữ nguyên quyền cũ, nhưng ghi lại cho tường minh để
-- không phụ thuộc vào trạng thái trước đó của database.
revoke all on function public.confirm_gateway_payment(uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.confirm_gateway_payment(uuid, text, text, jsonb) to service_role;

commit;
