-- Chương trình "Ghép Vị Mở Miền": 24 mảnh ghép theo tài khoản khách.
-- - Mỗi mã gắn cố định với một mảnh (0–23), dùng một lần, thường cấp theo đơn hàng.
-- - Khách chỉ mở mảnh qua RPC campaign_redeem; không ai ngoài nhân viên đọc được danh sách mã.
-- - Nhân viên vận hành (can_manage('orders')) cấp, xem và thu hồi mã.
begin;

create table public.campaign_codes (
  code text primary key check (code ~ '^ASIN-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$'),
  piece smallint not null check (piece between 0 and 23),
  order_id uuid references public.orders(id) on delete set null,
  note text check (note is null or char_length(note) <= 200),
  issued_by uuid references auth.users(id) on delete set null,
  issued_at timestamptz not null default now(),
  redeemed_by uuid references auth.users(id) on delete set null,
  redeemed_at timestamptz,
  revoked_at timestamptz,
  -- redeemed_by có thể về null khi tài khoản bị xoá, nhưng thời điểm sử dụng vẫn được giữ.
  check (redeemed_by is null or redeemed_at is not null)
);
create index campaign_codes_order_idx on public.campaign_codes (order_id);
create index campaign_codes_issued_idx on public.campaign_codes (issued_at desc);

create table public.campaign_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  piece smallint not null check (piece between 0 and 23),
  code text not null references public.campaign_codes(code) on delete restrict,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, piece)
);

-- Ghi lại lần nhập sai để chặn dò mã hàng loạt.
create table public.campaign_redeem_failures (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  attempted_at timestamptz not null default now()
);
create index campaign_redeem_failures_user_idx on public.campaign_redeem_failures (user_id, attempted_at desc);

alter table public.campaign_codes enable row level security;
alter table public.campaign_progress enable row level security;
alter table public.campaign_redeem_failures enable row level security;
revoke all on public.campaign_codes, public.campaign_progress, public.campaign_redeem_failures from anon, authenticated;

grant select on public.campaign_codes to authenticated;
create policy "staff read campaign codes" on public.campaign_codes
  for select to authenticated using (public.can_manage('orders'));

grant select on public.campaign_progress to authenticated;
create policy "read own campaign progress" on public.campaign_progress
  for select to authenticated using (user_id = auth.uid() or public.can_manage('orders'));

-- Chuẩn hoá mã khách gõ: bỏ khoảng trắng/gạch, chữ hoa, ghép lại dạng ASIN-XXXX-XXXX.
create or replace function public.campaign_normalize_code(p_code text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when v.clean ~ '^ASIN[A-Z0-9]{8}$' then 'ASIN-' || substr(v.clean, 5, 4) || '-' || substr(v.clean, 9, 4)
    else v.clean
  end
  from (select regexp_replace(upper(coalesce(p_code, '')), '[^A-Z0-9]', '', 'g') as clean) v;
$$;

create or replace function public.campaign_redeem(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_code text := public.campaign_normalize_code(p_code);
  v_row public.campaign_codes%rowtype;
  v_failures integer;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'Bạn hãy đăng nhập để nhập mã mảnh ghép.');
  end if;

  -- Xếp hàng các lượt nhập của cùng một tài khoản để bộ đếm nhập sai không bị vượt khi gửi song song.
  perform pg_advisory_xact_lock(hashtextextended('campaign-redeem:' || v_user::text, 0));

  select count(*) into v_failures
  from public.campaign_redeem_failures
  where user_id = v_user and attempted_at > now() - interval '15 minutes';
  if v_failures >= 8 then
    return jsonb_build_object('ok', false, 'error', 'Bạn đã nhập sai nhiều lần. Vui lòng thử lại sau 15 phút.');
  end if;

  select * into v_row from public.campaign_codes where code = v_code for update;
  if found and v_row.redeemed_by = v_user then
    return jsonb_build_object('ok', false, 'error', format('Mã này đã mở mảnh %s trong hành trình của bạn.', lpad((v_row.piece + 1)::text, 2, '0')));
  end if;
  -- Dựa vào redeemed_at (không bị xoá theo tài khoản) để mã đã dùng không bao giờ dùng lại được.
  -- Một thông báo chung cho mã sai, đã thu hồi hoặc đã dùng: không để lộ mã nào tồn tại.
  if not found or v_row.revoked_at is not null or v_row.redeemed_at is not null then
    insert into public.campaign_redeem_failures (user_id) values (v_user);
    return jsonb_build_object('ok', false, 'error', 'Mã chưa hợp lệ hoặc đã được sử dụng. Hãy kiểm tra lại mã A SỈN đã gửi.');
  end if;

  if exists (select 1 from public.campaign_progress where user_id = v_user and piece = v_row.piece) then
    return jsonb_build_object('ok', false, 'error', format('Bạn đã mở mảnh %s rồi. Mỗi tài khoản chỉ mở mỗi mảnh một lần; mã này chưa bị sử dụng.', lpad((v_row.piece + 1)::text, 2, '0')));
  end if;

  begin
    insert into public.campaign_progress (user_id, piece, code) values (v_user, v_row.piece, v_row.code);
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'error', format('Bạn đã mở mảnh %s rồi. Mỗi tài khoản chỉ mở mỗi mảnh một lần; mã này chưa bị sử dụng.', lpad((v_row.piece + 1)::text, 2, '0')));
  end;
  update public.campaign_codes set redeemed_by = v_user, redeemed_at = now() where code = v_row.code;

  return jsonb_build_object(
    'ok', true,
    'piece', v_row.piece,
    'unlocked', (select coalesce(jsonb_agg(piece order by piece), '[]'::jsonb) from public.campaign_progress where user_id = v_user)
  );
end;
$$;

-- Cấp mã: nhân viên chọn đơn hàng (tuỳ chọn), số lượng và mảnh (để trống = ngẫu nhiên).
create or replace function public.campaign_issue_codes(
  p_order uuid default null,
  p_count integer default 1,
  p_piece smallint default null,
  p_note text default null
)
returns setof public.campaign_codes
language plpgsql
security definer
set search_path = public
as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  -- Bỏ byte 6 và 8 của UUID v4 vì có bit cố định (phiên bản/biến thể).
  positions constant integer[] := array[0, 1, 2, 3, 4, 5, 10, 11];
  v_bytes bytea;
  v_code text;
  v_row public.campaign_codes%rowtype;
  i integer;
  j integer;
begin
  if not public.can_manage('orders') then
    raise exception 'Bạn không có quyền cấp mã mảnh ghép.' using errcode = '42501';
  end if;
  if p_count is null or p_count not between 1 and 24 then
    raise exception 'Mỗi lần cấp từ 1 đến 24 mã.';
  end if;
  if p_piece is not null and p_piece not between 0 and 23 then
    raise exception 'Mảnh ghép phải từ 01 đến 24.';
  end if;
  if p_order is not null then
    if not exists (select 1 from public.orders where id = p_order) then
      raise exception 'Không tìm thấy đơn hàng.';
    end if;
    if exists (select 1 from public.orders where id = p_order and status = 'cancelled') then
      raise exception 'Đơn hàng đã hủy, không cấp mã mảnh ghép.';
    end if;
  end if;

  for i in 1..p_count loop
    loop
      v_bytes := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
      v_code := 'ASIN-';
      for j in 1..8 loop
        if j = 5 then v_code := v_code || '-'; end if;
        v_code := v_code || substr(alphabet, (get_byte(v_bytes, positions[j]) % 32) + 1, 1);
      end loop;
      exit when not exists (select 1 from public.campaign_codes where code = v_code);
    end loop;
    insert into public.campaign_codes (code, piece, order_id, note, issued_by)
    values (v_code, coalesce(p_piece, floor(random() * 24)::smallint), p_order, nullif(btrim(p_note), ''), auth.uid())
    returning * into v_row;
    return next v_row;
  end loop;
end;
$$;

create or replace function public.campaign_revoke_code(p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_manage('orders') then
    raise exception 'Bạn không có quyền thu hồi mã mảnh ghép.' using errcode = '42501';
  end if;
  update public.campaign_codes
  set revoked_at = now()
  where code = public.campaign_normalize_code(p_code) and redeemed_at is null and revoked_at is null;
  if not found then
    raise exception 'Mã đã được sử dụng, đã thu hồi hoặc không tồn tại.';
  end if;
end;
$$;

-- Danh sách mã cho trang quản trị, kèm số đơn và người đã dùng.
create or replace function public.campaign_admin_codes(p_search text default null, p_limit integer default 300)
returns table (
  code text,
  piece smallint,
  order_id uuid,
  order_number text,
  note text,
  issued_at timestamptz,
  issued_by_name text,
  redeemed_at timestamptz,
  redeemed_by_name text,
  revoked_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  -- Ký tự đặc biệt của ILIKE được thoát để tìm đúng chuỗi nhân viên gõ.
  v_search text := nullif(replace(replace(replace(btrim(coalesce(p_search, '')), '!', '!!'), '%', '!%'), '_', '!_'), '');
begin
  if not public.can_manage('orders') then
    raise exception 'Bạn không có quyền xem mã mảnh ghép.' using errcode = '42501';
  end if;
  return query
    select c.code, c.piece, c.order_id, o.order_number, c.note, c.issued_at,
           issuer.full_name, c.redeemed_at, redeemer.full_name, c.revoked_at
    from public.campaign_codes c
    left join public.orders o on o.id = c.order_id
    left join public.profiles issuer on issuer.id = c.issued_by
    left join public.profiles redeemer on redeemer.id = c.redeemed_by
    where v_search is null
       or c.code ilike '%' || v_search || '%' escape '!'
       or o.order_number ilike '%' || v_search || '%' escape '!'
       or redeemer.full_name ilike '%' || v_search || '%' escape '!'
    order by c.issued_at desc
    limit least(greatest(coalesce(p_limit, 300), 1), 1000);
end;
$$;

create or replace function public.campaign_admin_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.can_manage('orders') then
    raise exception 'Bạn không có quyền xem chương trình mảnh ghép.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'issued', (select count(*) from public.campaign_codes),
    'redeemed', (select count(*) from public.campaign_codes where redeemed_at is not null),
    'revoked', (select count(*) from public.campaign_codes where revoked_at is not null),
    'participants', (select count(distinct user_id) from public.campaign_progress),
    'completed', (select count(*) from (select user_id from public.campaign_progress group by user_id having count(*) = 24) done)
  );
end;
$$;

revoke all on function public.campaign_normalize_code(text) from public;
revoke all on function public.campaign_redeem(text) from public, anon;
revoke all on function public.campaign_issue_codes(uuid, integer, smallint, text) from public, anon;
revoke all on function public.campaign_revoke_code(text) from public, anon;
revoke all on function public.campaign_admin_codes(text, integer) from public, anon;
revoke all on function public.campaign_admin_summary() from public, anon;
grant execute on function public.campaign_normalize_code(text) to authenticated;
grant execute on function public.campaign_redeem(text) to authenticated;
grant execute on function public.campaign_issue_codes(uuid, integer, smallint, text) to authenticated;
grant execute on function public.campaign_revoke_code(text) to authenticated;
grant execute on function public.campaign_admin_codes(text, integer) to authenticated;
grant execute on function public.campaign_admin_summary() to authenticated;

-- Cấp và thu hồi mã (thao tác của nhân viên) được ghi vào nhật ký quản trị; lượt khách dùng mã thì không.
create trigger audit_change after insert or delete or update of revoked_at on public.campaign_codes
  for each row execute function public.audit_admin_change();

commit;
