-- A Sỉn: operational storefront schema
-- Apply with Supabase CLI (`supabase db push`) or paste into the SQL Editor.
-- All VND values are stored as integer dong; never accept client-side prices.

begin;

create extension if not exists pgcrypto;

create type public.app_role as enum ('admin', 'staff', 'customer');
create type public.order_status as enum (
  'awaiting_payment', 'paid', 'packing', 'shipping', 'completed', 'cancelled'
);
create type public.payment_status as enum ('pending', 'paid', 'failed', 'refunded');
create type public.payment_method as enum ('qr', 'cod');
create type public.payment_transaction_status as enum ('initiated', 'verified', 'failed', 'refunded');
create type public.contact_status as enum ('new', 'in_progress', 'resolved', 'spam');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role public.app_role not null default 'customer',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.product_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.product_categories(id) on delete set null,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  sku text not null unique,
  name text not null,
  origin text not null,
  weight_label text not null,
  price_vnd bigint not null check (price_vnd >= 0),
  image_url text not null,
  tag text not null default '',
  description text not null default '',
  active boolean not null default true,
  featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.product_inventory (
  product_id uuid primary key references public.products(id) on delete cascade,
  quantity integer not null default 0 check (quantity >= 0),
  low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  tag text not null,
  title text not null,
  excerpt text not null,
  image_url text not null,
  read_time_minutes smallint not null check (read_time_minutes between 1 and 120),
  body jsonb not null default '[]'::jsonb check (jsonb_typeof(body) = 'array'),
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check ((published = false) or published_at is not null)
);

create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  is_active boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table public.promotion_products (
  promotion_id uuid not null references public.promotions(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  original_price_vnd bigint not null check (original_price_vnd >= 0),
  discount_percent smallint not null check (discount_percent between 1 and 100),
  display_label text not null default '',
  display_ending text not null default '',
  accent text not null default 'forest',
  sort_order integer not null default 0,
  primary key (promotion_id, product_id)
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id) on delete set null,
  full_name text not null,
  email text,
  phone text not null unique,
  default_address text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid not null references public.customers(id) on delete restrict,
  status public.order_status not null default 'awaiting_payment',
  payment_status public.payment_status not null default 'pending',
  payment_method public.payment_method not null,
  subtotal_vnd bigint not null default 0 check (subtotal_vnd >= 0),
  discount_vnd bigint not null default 0 check (discount_vnd >= 0),
  shipping_vnd bigint not null default 0 check (shipping_vnd >= 0),
  total_vnd bigint not null default 0 check (total_vnd >= 0),
  shipping_address text not null,
  customer_note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (total_vnd = subtotal_vnd - discount_vnd + shipping_vnd)
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  sku text,
  unit_price_vnd bigint not null check (unit_price_vnd >= 0),
  quantity integer not null check (quantity between 1 and 20),
  line_total_vnd bigint generated always as (unit_price_vnd * quantity) stored,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null,
  provider_reference text unique,
  amount_vnd bigint not null check (amount_vnd >= 0),
  status public.payment_transaction_status not null default 'initiated',
  raw_payload jsonb,
  verified_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.order_status_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status public.order_status not null,
  note text,
  changed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  status public.contact_status not null default 'new',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.site_settings (
  key text primary key,
  value jsonb not null,
  is_public boolean not null default false,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default timezone('utc', now())
);

create index products_public_index on public.products (active, sort_order, name);
create index articles_public_index on public.articles (published, published_at desc);
create index orders_operational_index on public.orders (status, created_at desc);
create index orders_customer_index on public.orders (customer_id, created_at desc);
create index order_items_order_index on public.order_items (order_id);
create index payment_transactions_order_index on public.payment_transactions (order_id);
create index contact_messages_status_index on public.contact_messages (status, created_at desc);

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger categories_set_updated_at before update on public.product_categories
  for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create trigger articles_set_updated_at before update on public.articles
  for each row execute function public.set_updated_at();
create trigger promotions_set_updated_at before update on public.promotions
  for each row execute function public.set_updated_at();
create trigger customers_set_updated_at before update on public.customers
  for each row execute function public.set_updated_at();
create trigger orders_set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();
create trigger payment_transactions_set_updated_at before update on public.payment_transactions
  for each row execute function public.set_updated_at();
create trigger contact_messages_set_updated_at before update on public.contact_messages
  for each row execute function public.set_updated_at();
create trigger site_settings_set_updated_at before update on public.site_settings
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and role in ('admin', 'staff')
  );
$$;

create or replace function public.submit_contact_message(
  p_name text,
  p_email text,
  p_message text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if char_length(btrim(coalesce(p_name, ''))) not between 2 and 80 then
    raise exception 'Tên liên hệ không hợp lệ';
  end if;
  if char_length(btrim(coalesce(p_email, ''))) not between 5 and 254
     or btrim(p_email) !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Email liên hệ không hợp lệ';
  end if;
  if char_length(btrim(coalesce(p_message, ''))) not between 5 and 2000 then
    raise exception 'Lời nhắn phải có từ 5 đến 2000 ký tự';
  end if;

  insert into public.contact_messages (name, email, message)
  values (btrim(p_name), lower(btrim(p_email)), btrim(p_message))
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.create_checkout_order(
  p_customer_name text,
  p_customer_phone text,
  p_shipping_address text,
  p_items jsonb,
  p_payment_method public.payment_method default 'qr'
)
returns table (order_id uuid, order_number text, total_amount_vnd bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid := gen_random_uuid();
  v_order_number text := format(
    'MOCTB-%s-%s',
    to_char(timezone('utc', now()), 'YYYYMMDD'),
    upper(substr(replace(v_order_id::text, '-', ''), 1, 6))
  );
  v_customer_id uuid;
  v_item jsonb;
  v_kind text;
  v_product_slug text;
  v_quantity integer;
  v_product public.products%rowtype;
  v_total bigint := 0;
  v_gift_product_ids jsonb;
  v_gift_box_price constant bigint := 65000;
begin
  if char_length(btrim(coalesce(p_customer_name, ''))) not between 2 and 80 then
    raise exception 'Tên khách hàng không hợp lệ';
  end if;
  if btrim(coalesce(p_customer_phone, '')) !~ '^(0[0-9]{9}|\+84[0-9]{9})$' then
    raise exception 'Số điện thoại không hợp lệ';
  end if;
  if char_length(btrim(coalesce(p_shipping_address, ''))) not between 10 and 300 then
    raise exception 'Địa chỉ giao hàng không hợp lệ';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 50 then
    raise exception 'Giỏ hàng không hợp lệ';
  end if;

  insert into public.customers (full_name, phone, default_address)
  values (btrim(p_customer_name), btrim(p_customer_phone), btrim(p_shipping_address))
  on conflict (phone) do update set
    full_name = excluded.full_name,
    default_address = excluded.default_address
  returning id into v_customer_id;

  insert into public.orders (
    id, order_number, customer_id, payment_method, shipping_address
  ) values (
    v_order_id, v_order_number, v_customer_id, p_payment_method, btrim(p_shipping_address)
  );

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_kind := v_item ->> 'kind';
    v_quantity := greatest(1, least(20, coalesce((v_item ->> 'quantity')::integer, 0)));

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
        v_order_id, v_product.id, v_product.name, v_product.sku, v_product.price_vnd, v_quantity
      );
      v_total := v_total + v_product.price_vnd * v_quantity;

    elsif v_kind = 'gift_box' then
      v_gift_product_ids := v_item -> 'product_ids';
      if jsonb_typeof(v_gift_product_ids) <> 'array'
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
          v_product.price_vnd, v_quantity,
          jsonb_build_object('gift_design', coalesce(v_item -> 'design', '{}'::jsonb))
        );
        v_total := v_total + v_product.price_vnd * v_quantity;
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

  update public.orders
  set subtotal_vnd = v_total, total_vnd = v_total
  where id = v_order_id;

  if p_payment_method = 'qr' then
    insert into public.payment_transactions (order_id, provider, amount_vnd)
    values (v_order_id, 'qr_pending_webhook', v_total);
  end if;

  return query select v_order_id, v_order_number, v_total;
end;
$$;

-- Call this only from an Edge Function using SUPABASE_SERVICE_ROLE_KEY after
-- verifying the QR provider's signed webhook. It is intentionally not exposed
-- to the browser roles.
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
begin
  select payment_status into v_payment_status
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

  update public.orders
  set payment_status = 'paid', status = 'paid'
  where id = p_order_id and payment_status = 'pending';

  insert into public.order_status_events (order_id, status, note)
  values (p_order_id, 'paid', 'Webhook thanh toán đã được xác thực');
end;
$$;

create or replace function public.record_order_status_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.order_status_events (order_id, status, note, changed_by)
    values (new.id, new.status, 'Đơn được tạo', auth.uid());
  elsif new.status is distinct from old.status then
    insert into public.order_status_events (order_id, status, changed_by)
    values (new.id, new.status, auth.uid());
  end if;
  return new;
end;
$$;

create trigger orders_record_status_event
  after insert or update of status on public.orders
  for each row execute function public.record_order_status_event();

alter table public.profiles enable row level security;
alter table public.product_categories enable row level security;
alter table public.products enable row level security;
alter table public.product_inventory enable row level security;
alter table public.articles enable row level security;
alter table public.promotions enable row level security;
alter table public.promotion_products enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.order_status_events enable row level security;
alter table public.contact_messages enable row level security;
alter table public.site_settings enable row level security;

create policy "public read product categories" on public.product_categories
  for select to anon, authenticated using (true);
create policy "staff manage product categories" on public.product_categories
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "public read active products" on public.products
  for select to anon, authenticated using (active = true);
create policy "staff manage products" on public.products
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "staff manage inventory" on public.product_inventory
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "public read published articles" on public.articles
  for select to anon, authenticated using (published = true and published_at <= timezone('utc', now()));
create policy "staff manage articles" on public.articles
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "public read active promotions" on public.promotions
  for select to anon, authenticated using (
    is_active = true
    and (starts_at is null or starts_at <= timezone('utc', now()))
    and (ends_at is null or ends_at > timezone('utc', now()))
  );
create policy "staff manage promotions" on public.promotions
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "public read promotion products" on public.promotion_products
  for select to anon, authenticated using (
    exists (
      select 1 from public.promotions pr
      where pr.id = promotion_id and pr.is_active = true
        and (pr.starts_at is null or pr.starts_at <= timezone('utc', now()))
        and (pr.ends_at is null or pr.ends_at > timezone('utc', now()))
    )
  );
create policy "staff manage promotion products" on public.promotion_products
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "user read own profile" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_staff());
create policy "user edit own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));
create policy "staff manage profiles" on public.profiles
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "staff manage customers" on public.customers
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "staff manage orders" on public.orders
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "staff manage order items" on public.order_items
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "staff manage payment transactions" on public.payment_transactions
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "staff manage order events" on public.order_status_events
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "staff manage contact messages" on public.contact_messages
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "public read public settings" on public.site_settings
  for select to anon, authenticated using (is_public = true);
create policy "staff manage settings" on public.site_settings
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

grant execute on function public.submit_contact_message(text, text, text) to anon, authenticated;
grant execute on function public.create_checkout_order(text, text, text, jsonb, public.payment_method) to anon, authenticated;
revoke all on function public.confirm_gateway_payment(uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.confirm_gateway_payment(uuid, text, text, jsonb) to service_role;

-- Seed data mirrors the current demonstration UI and can be replaced in Admin.
insert into public.product_categories (slug, name, sort_order) values
  ('tra-thao-moc', 'Trà & thảo mộc', 10),
  ('mat-ong', 'Mật ong', 20),
  ('dac-san-gac-bep', 'Đặc sản gác bếp', 30),
  ('gia-vi-nui-rung', 'Gia vị núi rừng', 40);

insert into public.products (
  category_id, slug, sku, name, origin, weight_label, price_vnd, image_url, tag, description, featured, sort_order
)
select c.id, d.slug, d.sku, d.name, d.origin, d.weight_label, d.price_vnd, d.image_url, d.tag, d.description, true, d.sort_order
from (values
  ('tra-thao-moc', 'tea', 'MOC-TEA-001', 'Trà Shan Tuyết cổ thụ', 'SUỐI GIÀNG', 'Hộp 100g', 180000::bigint, '/images/tea.webp', 'Vị thanh của núi', 'Những búp trà phủ lớp lông tơ trắng, gợi hương hoa nhẹ và hậu vị ngọt sâu.', 10),
  ('mat-ong', 'honey', 'MOC-HONEY-001', 'Mật ong hoa rừng', 'MÙ CANG CHẢI', 'Hũ 500ml', 250000::bigint, '/images/honey.webp', 'Ngọt lành tự nhiên', 'Sắc mật hổ phách và hương hoa rừng ấm áp, hợp làm món quà nhỏ gửi người thương.', 20),
  ('dac-san-gac-bep', 'jerky', 'MOC-JERKY-001', 'Trâu gác bếp Tây Bắc', 'SƠN LA', 'Túi 250g', 320000::bigint, '/images/jerky.webp', 'Đậm đà bản sắc', 'Hương khói bếp quyện cùng vị thơm mắc khén, gợi những buổi quây quần.', 30),
  ('gia-vi-nui-rung', 'spice', 'MOC-SPICE-001', 'Mắc khén rừng', 'ĐIỆN BIÊN', 'Hũ 100g', 95000::bigint, '/images/spice.webp', 'Gia vị của bản', 'Mùi thơm đặc trưng, ấm nồng và tê nhẹ cho căn bếp thêm hương núi.', 40)
) as d(category_slug, slug, sku, name, origin, weight_label, price_vnd, image_url, tag, description, sort_order)
join public.product_categories c on c.slug = d.category_slug;

insert into public.product_inventory (product_id, quantity, low_stock_threshold)
select id, case slug when 'tea' then 42 when 'honey' then 18 when 'jerky' then 9 else 7 end, 5
from public.products;

insert into public.articles (slug, tag, title, excerpt, image_url, read_time_minutes, body, published, published_at) values
  ('hanh-trinh-tra', 'Từ bản làng', 'Theo mây lên Suối Giàng, tìm vị trà Shan tuyết', 'Một buổi sớm se lạnh, búp trà phủ sương và câu chuyện giữ rừng của những người làm trà.', '/images/tea.webp', 5, '["Sớm ở Suối Giàng, mây đi rất thấp. Từ hiên nhà nhìn ra, những tán trà cổ thụ nằm yên trong màn sương mỏng, như thể đang chờ nắng gọi dậy.", "Trong câu chuyện minh họa của A Sỉn, mỗi búp trà được hái bằng một nhịp chậm. Không phải để làm ra thật nhiều, mà để giữ lại cảm giác dịu dàng của buổi sớm miền cao.", "Pha một ấm trà Shan tuyết, điều đáng nhớ nhất không chỉ là vị ngọt hậu. Đó còn là khoảng lặng nho nhỏ, khi ta đặt điện thoại xuống và để hương trà dẫn mình trở về với hiện tại."]'::jsonb, true, '2026-09-18T00:00:00Z'),
  ('mon-qua-nho', 'Gợi ý tặng quà', 'Ba cách gói một lời cảm ơn thật dịu dàng', 'Không cần cầu kỳ. Chỉ cần một món quà nhỏ được chọn bằng sự thấu hiểu.', '/images/honey.webp', 4, '["Một món quà không nhất thiết phải lớn. Có khi chỉ là hũ mật ong hoa rừng, gói cùng một tấm thiệp viết tay và một lời cảm ơn thật lòng.", "Khi chọn quà, A Sỉn thường bắt đầu bằng một câu hỏi đơn giản: người ấy đang cần được nhắc nhớ điều gì?", "Trong phiên bản minh họa này, chúng tôi gợi ý ba cách gói quà: dịu dàng với trà, ấm áp với mật, và thật riêng với lời nhắn của bạn."]'::jsonb, true, '2026-09-12T00:00:00Z'),
  ('bep-nha', 'Vị Tây Bắc', 'Mắc khén: hạt gia vị đánh thức căn bếp', 'Mùi thơm ấm, vị tê nhẹ và vài mẹo nhỏ để bữa cơm thường ngày thêm hương núi.', '/images/spice.webp', 3, '["Mắc khén là một hạt gia vị nhỏ nhưng có cách xuất hiện rất riêng: thơm ấm, tê nhẹ, rồi để lại dư vị dễ nhớ nơi đầu lưỡi.", "Với món nướng, bạn có thể rang thơm hạt mắc khén, giã vừa tay rồi rắc sau cùng.", "Các mẹo và sản vật trong bài đều được viết cho trải nghiệm minh họa."]'::jsonb, true, '2026-09-05T00:00:00Z');

insert into public.promotions (code, name, is_active, starts_at) values
  ('LANDING-DEALS', 'Deal hời giá sốc', true, '2026-09-01T00:00:00Z');

insert into public.promotion_products (
  promotion_id, product_id, original_price_vnd, discount_percent, display_label, display_ending, accent, sort_order
)
select pr.id, p.id, d.original_price_vnd, d.discount_percent, d.display_label, d.display_ending, d.accent, d.sort_order
from (values
  ('tea', 225000::bigint, 20::smallint, 'Sớm trên đỉnh núi', 'Còn 2 ngày', 'forest', 10),
  ('honey', 310000::bigint, 19::smallint, 'Ngọt lành cuối tuần', 'Còn 08:24:16', 'honey', 20),
  ('spice', 125000::bigint, 24::smallint, 'Bếp thơm vị bản', 'Số lượng có hạn', 'earth', 30)
) as d(product_slug, original_price_vnd, discount_percent, display_label, display_ending, accent, sort_order)
join public.products p on p.slug = d.product_slug
cross join public.promotions pr
where pr.code = 'LANDING-DEALS';

insert into public.site_settings (key, value, is_public) values
  ('gift_box_price_vnd', '65000'::jsonb, false),
  ('storefront_notice', '{"text":"Từ bản làng, gửi đến bạn."}'::jsonb, true);

commit;
