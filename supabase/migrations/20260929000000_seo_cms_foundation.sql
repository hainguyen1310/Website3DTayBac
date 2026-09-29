-- A Sỉn: nền tảng SEO + CMS (B07/B09/B10/B11/B16)
-- - Trường SEO, ngày xuất bản/cập nhật/lên lịch riêng, lưu trữ thay vì xóa cứng.
-- - Lịch sử URL (301/308) khi đổi slug; revision + khôi phục.
-- - Tạo bài chỉ qua RPC kiểm quyền, giữ ngày đầu khi ẩn rồi đăng lại.
-- - Tồn kho công khai dạng in_stock; token hủy nhận tin cho khách.

begin;

create or replace function public.slugify_text(p_value text)
returns text
language sql
immutable
set search_path = public
as $$
  select trim(both '-' from regexp_replace(
    translate(
      lower(coalesce(p_value, '')),
      'áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ',
      'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd'
    ),
    '[^a-z0-9]+', '-', 'g'
  ));
$$;

/* ------------------------------------------------------------------ */
/* Articles: trường SEO, ngày, lưu trữ                                 */
/* ------------------------------------------------------------------ */

alter table public.articles add column if not exists tag_slug text not null default '';
alter table public.articles add column if not exists first_published_at timestamptz;
alter table public.articles add column if not exists scheduled_at timestamptz;
alter table public.articles add column if not exists content_modified_at timestamptz;
alter table public.articles add column if not exists author_name text;
alter table public.articles add column if not exists source_name text;
alter table public.articles add column if not exists source_url text;
alter table public.articles add column if not exists seo_title text;
alter table public.articles add column if not exists seo_description text;
alter table public.articles add column if not exists social_image_url text;
alter table public.articles add column if not exists social_title text;
alter table public.articles add column if not exists social_description text;
alter table public.articles add column if not exists canonical_path text;
alter table public.articles add column if not exists related_product_slugs jsonb not null default '[]'::jsonb;
alter table public.articles add column if not exists related_article_slugs jsonb not null default '[]'::jsonb;
alter table public.articles add column if not exists archived boolean not null default false;

update public.articles set first_published_at = published_at where first_published_at is null and published = true and published_at is not null;
update public.articles set content_modified_at = updated_at where content_modified_at is null;
update public.articles set tag_slug = public.slugify_text(tag) where tag_slug = '';

create index if not exists articles_tag_slug_idx on public.articles (tag_slug);
create index if not exists articles_schedule_idx on public.articles (published, scheduled_at, published_at desc);

create or replace function public.validate_article()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if jsonb_typeof(new.body) <> 'array' then
    raise exception 'Nội dung bài viết không hợp lệ';
  end if;
  if jsonb_typeof(new.related_product_slugs) <> 'array' or jsonb_typeof(new.related_article_slugs) <> 'array' then
    raise exception 'Danh sách nội dung liên quan không hợp lệ';
  end if;
  if jsonb_array_length(new.related_product_slugs) > 6 or jsonb_array_length(new.related_article_slugs) > 6 then
    raise exception 'Chỉ chọn tối đa 6 nội dung liên quan mỗi loại';
  end if;
  if new.canonical_path is not null and new.canonical_path !~ '^/[a-z0-9/.-]*$' then
    raise exception 'Canonical riêng phải là đường dẫn nội bộ bắt đầu bằng /';
  end if;
  if new.source_url is not null and new.source_url !~* '^https?://' then
    raise exception 'Nguồn dẫn phải là đường dẫn http(s)';
  end if;
  if new.published then
    if btrim(new.title) = '' or btrim(new.excerpt) = '' or btrim(new.image_url) = '' then
      raise exception 'Bài xuất bản cần tiêu đề, mô tả, ảnh và nội dung';
    end if;
    if not exists (
      select 1 from jsonb_array_elements(new.body) as block
      where case jsonb_typeof(block)
        when 'string' then btrim(block #>> '{}') <> ''
        when 'object' then coalesce(btrim(block ->> 'text'), '') <> '' or block ->> 'type' in ('image', 'divider')
        else false
      end
    ) then
      raise exception 'Bài xuất bản cần nội dung thật';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.set_article_derived_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.tag_slug := public.slugify_text(new.tag);
  if new.published_at is not null and new.first_published_at is null then
    new.first_published_at := new.published_at;
  end if;
  if tg_op = 'INSERT' then
    new.content_modified_at := coalesce(new.content_modified_at, timezone('utc', now()));
  elsif (new.title, new.excerpt, new.body, new.image_url, new.seo_title, new.seo_description,
         new.social_image_url, new.social_title, new.social_description, new.author_name,
         new.source_name, new.source_url, new.related_product_slugs, new.related_article_slugs)
        is distinct from
        (old.title, old.excerpt, old.body, old.image_url, old.seo_title, old.seo_description,
         old.social_image_url, old.social_title, old.social_description, old.author_name,
         old.source_name, old.source_url, old.related_product_slugs, old.related_article_slugs) then
    new.content_modified_at := timezone('utc', now());
  end if;
  return new;
end;
$$;

drop trigger if exists articles_validate on public.articles;
create trigger articles_validate before insert or update on public.articles
  for each row execute function public.validate_article();
drop trigger if exists articles_derived_fields on public.articles;
create trigger articles_derived_fields before insert or update on public.articles
  for each row execute function public.set_article_derived_fields();

/* ------------------------------------------------------------------ */
/* Lịch sử phiên bản bài viết                                          */
/* ------------------------------------------------------------------ */

create table if not exists public.article_revisions (
  id bigint generated always as identity primary key,
  article_id uuid not null references public.articles(id) on delete cascade,
  slug text not null,
  snapshot jsonb not null,
  reason text not null default 'update' check (reason in ('create', 'update', 'restore')),
  changed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists article_revisions_article_idx on public.article_revisions (article_id, created_at desc, id desc);

alter table public.article_revisions enable row level security;
drop policy if exists "content staff read article revisions" on public.article_revisions;
create policy "content staff read article revisions" on public.article_revisions
  for select to authenticated using (public.can_manage('content'));

create or replace function public.article_content_snapshot(p_row public.articles)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select jsonb_build_object(
    'title', p_row.title,
    'tag', p_row.tag,
    'excerpt', p_row.excerpt,
    'image_url', p_row.image_url,
    'read_time_minutes', p_row.read_time_minutes,
    'body', p_row.body,
    'seo_title', p_row.seo_title,
    'seo_description', p_row.seo_description,
    'social_image_url', p_row.social_image_url,
    'social_title', p_row.social_title,
    'social_description', p_row.social_description,
    'author_name', p_row.author_name,
    'source_name', p_row.source_name,
    'source_url', p_row.source_url,
    'related_product_slugs', p_row.related_product_slugs,
    'related_article_slugs', p_row.related_article_slugs
  );
$$;

create or replace function public.record_article_revision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.article_revisions (article_id, slug, snapshot, reason, changed_by)
    values (new.id, new.slug, public.article_content_snapshot(new), 'create', auth.uid());
    return new;
  end if;
  if public.article_content_snapshot(new) is distinct from public.article_content_snapshot(old) then
    insert into public.article_revisions (article_id, slug, snapshot, reason, changed_by)
    values (new.id, old.slug, public.article_content_snapshot(old), 'update', auth.uid());
    delete from public.article_revisions
    where article_id = new.id
      and id not in (
        select id from public.article_revisions
        where article_id = new.id
        order by created_at desc, id desc
        limit 30
      );
  end if;
  return new;
end;
$$;

drop trigger if exists articles_record_revision on public.articles;
create trigger articles_record_revision after insert or update on public.articles
  for each row execute function public.record_article_revision();

/* ------------------------------------------------------------------ */
/* Lịch sử URL + chuyển hướng slug cũ                                  */
/* ------------------------------------------------------------------ */

create table if not exists public.url_redirects (
  id uuid primary key default gen_random_uuid(),
  from_path text not null unique check (from_path ~ '^/[a-z0-9/.-]+$'),
  to_path text not null check (to_path ~ '^/[a-z0-9/.-]+$'),
  status smallint not null default 308 check (status in (301, 308)),
  entity_type text not null default 'page' check (entity_type in ('article', 'product', 'page')),
  entity_id uuid,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists url_redirects_to_path_idx on public.url_redirects (to_path);

alter table public.url_redirects enable row level security;
drop policy if exists "public read redirects" on public.url_redirects;
create policy "public read redirects" on public.url_redirects
  for select to anon, authenticated using (true);
drop policy if exists "content staff manage redirects" on public.url_redirects;
create policy "content staff manage redirects" on public.url_redirects
  for all to authenticated using (public.can_manage('content')) with check (public.can_manage('content'));

create or replace function public.record_slug_redirect(
  p_entity_type text,
  p_entity_id uuid,
  p_from_path text,
  p_to_path text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cursor text := p_to_path;
  v_next text;
  v_hops integer := 0;
begin
  if p_from_path = p_to_path then return; end if;
  if p_from_path !~ '^/[a-z0-9/.-]+$' or p_to_path !~ '^/[a-z0-9/.-]+$' then
    raise exception 'Đường dẫn chuyển hướng không hợp lệ';
  end if;
  loop
    v_hops := v_hops + 1;
    if v_hops > 10 then raise exception 'Chuỗi chuyển hướng quá dài'; end if;
    select to_path into v_next from public.url_redirects where from_path = v_cursor;
    if not found then exit; end if;
    if v_next = p_from_path then raise exception 'Chuyển hướng tạo vòng lặp'; end if;
    v_cursor := v_next;
  end loop;
  update public.url_redirects set to_path = p_to_path where to_path = p_from_path;
  insert into public.url_redirects (from_path, to_path, status, entity_type, entity_id, created_by)
  values (p_from_path, p_to_path, 308, p_entity_type, p_entity_id, auth.uid())
  on conflict (from_path) do update set
    to_path = excluded.to_path,
    status = excluded.status,
    entity_type = excluded.entity_type,
    created_by = excluded.created_by,
    created_at = now();
end;
$$;

revoke all on function public.record_slug_redirect(text, uuid, text, text) from public, anon, authenticated;

/* ------------------------------------------------------------------ */
/* RPC lưu bài viết: ngày, lên lịch, redirect, chống ghi đè            */
/* ------------------------------------------------------------------ */

create or replace function public.save_admin_article(
  p_id uuid,
  p_article jsonb,
  p_expected_updated_at timestamptz default null
)
returns table (article_id uuid, updated_at timestamptz, redirect_from text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.articles%rowtype;
  v_id uuid;
  v_updated timestamptz;
  v_redirect_from text := null;
  v_slug text := btrim(coalesce(p_article ->> 'slug', ''));
  v_tag text := btrim(coalesce(p_article ->> 'tag', ''));
  v_title text := btrim(coalesce(p_article ->> 'title', ''));
  v_excerpt text := btrim(coalesce(p_article ->> 'excerpt', ''));
  v_image text := btrim(coalesce(p_article ->> 'image_url', ''));
  v_read smallint := greatest(1, least(120, coalesce((p_article ->> 'read_time_minutes')::integer, 1)));
  v_body jsonb := coalesce(p_article -> 'body', '[]'::jsonb);
  v_published boolean := coalesce((p_article ->> 'published')::boolean, false);
  v_schedule timestamptz := nullif(btrim(coalesce(p_article ->> 'scheduled_at', '')), '')::timestamptz;
  v_seo_title text := nullif(btrim(coalesce(p_article ->> 'seo_title', '')), '');
  v_seo_description text := nullif(btrim(coalesce(p_article ->> 'seo_description', '')), '');
  v_social_image text := nullif(btrim(coalesce(p_article ->> 'social_image_url', '')), '');
  v_social_title text := nullif(btrim(coalesce(p_article ->> 'social_title', '')), '');
  v_social_description text := nullif(btrim(coalesce(p_article ->> 'social_description', '')), '');
  v_author text := nullif(btrim(coalesce(p_article ->> 'author_name', '')), '');
  v_source_name text := nullif(btrim(coalesce(p_article ->> 'source_name', '')), '');
  v_source_url text := nullif(btrim(coalesce(p_article ->> 'source_url', '')), '');
  v_canonical text := nullif(btrim(coalesce(p_article ->> 'canonical_path', '')), '');
  v_products jsonb := coalesce(p_article -> 'related_product_slugs', '[]'::jsonb);
  v_articles jsonb := coalesce(p_article -> 'related_article_slugs', '[]'::jsonb);
  v_published_at timestamptz;
  v_first_published_at timestamptz;
  v_scheduled_at timestamptz;
begin
  if not public.can_manage('content') then
    raise exception 'Không có quyền quản lý nội dung';
  end if;
  if v_slug !~ '^[a-z0-9-]+$' then
    raise exception 'Slug chỉ gồm chữ thường, số và dấu gạch ngang';
  end if;
  if jsonb_typeof(v_body) <> 'array' then
    raise exception 'Nội dung bài viết không hợp lệ';
  end if;

  if p_id is null then
    v_published_at := case when v_published then coalesce(v_schedule, timezone('utc', now())) else null end;
    v_first_published_at := v_published_at;
    v_scheduled_at := case when v_published and v_schedule > timezone('utc', now()) then v_schedule else null end;
    insert into public.articles (
      slug, tag, title, excerpt, image_url, read_time_minutes, body, published,
      published_at, first_published_at, scheduled_at, author_name, source_name, source_url,
      seo_title, seo_description, social_image_url, social_title, social_description,
      canonical_path, related_product_slugs, related_article_slugs, archived
    ) values (
      v_slug, v_tag, v_title, v_excerpt, v_image, v_read, v_body, v_published,
      v_published_at, v_first_published_at, v_scheduled_at, v_author, v_source_name, v_source_url,
      v_seo_title, v_seo_description, v_social_image, v_social_title, v_social_description,
      v_canonical, v_products, v_articles, false
    )
    returning id, updated_at into v_id, v_updated;
  else
    select * into v_existing from public.articles where id = p_id for update;
    if not found then raise exception 'Không tìm thấy bài viết'; end if;
    if p_expected_updated_at is not null and v_existing.updated_at <> p_expected_updated_at then
      raise exception 'Bài viết đã được người khác cập nhật. Hãy mở lại bài trước khi lưu';
    end if;
    v_published_at := case
      when v_published then coalesce(v_existing.published_at, v_schedule, timezone('utc', now()))
      else v_existing.published_at
    end;
    v_first_published_at := case
      when v_published then coalesce(v_existing.first_published_at, v_existing.published_at, v_schedule, timezone('utc', now()))
      else v_existing.first_published_at
    end;
    v_scheduled_at := case when v_published and v_schedule > timezone('utc', now()) then v_schedule else null end;
    update public.articles set
      slug = v_slug,
      tag = v_tag,
      title = v_title,
      excerpt = v_excerpt,
      image_url = v_image,
      read_time_minutes = v_read,
      body = v_body,
      published = v_published,
      published_at = v_published_at,
      first_published_at = v_first_published_at,
      scheduled_at = v_scheduled_at,
      author_name = v_author,
      source_name = v_source_name,
      source_url = v_source_url,
      seo_title = v_seo_title,
      seo_description = v_seo_description,
      social_image_url = v_social_image,
      social_title = v_social_title,
      social_description = v_social_description,
      canonical_path = v_canonical,
      related_product_slugs = v_products,
      related_article_slugs = v_articles,
      archived = false
    where id = p_id
    returning id, updated_at into v_id, v_updated;
    if v_existing.slug <> v_slug then
      v_redirect_from := '/tin-tuc/' || v_existing.slug;
      perform public.record_slug_redirect('article', v_id, v_redirect_from, '/tin-tuc/' || v_slug);
    end if;
  end if;

  return query select v_id, v_updated, v_redirect_from;
end;
$$;

revoke all on function public.save_admin_article(uuid, jsonb, timestamptz) from public, anon;
grant execute on function public.save_admin_article(uuid, jsonb, timestamptz) to authenticated;

create or replace function public.archive_admin_article(p_id uuid, p_archived boolean default true)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_manage('content') then
    raise exception 'Không có quyền quản lý nội dung';
  end if;
  update public.articles
  set archived = p_archived,
      published = case when p_archived then false else published end
  where id = p_id;
  if not found then raise exception 'Không tìm thấy bài viết'; end if;
end;
$$;

revoke all on function public.archive_admin_article(uuid, boolean) from public, anon;
grant execute on function public.archive_admin_article(uuid, boolean) to authenticated;

create or replace function public.delete_admin_article(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_manage('content') then
    raise exception 'Không có quyền quản lý nội dung';
  end if;
  delete from public.articles where id = p_id;
  if not found then raise exception 'Không tìm thấy bài viết'; end if;
end;
$$;

revoke all on function public.delete_admin_article(uuid) from public, anon;
grant execute on function public.delete_admin_article(uuid) to authenticated;

create or replace function public.restore_article_revision(p_revision_id bigint)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_revision public.article_revisions%rowtype;
  v_snapshot jsonb;
begin
  if not public.can_manage('content') then
    raise exception 'Không có quyền quản lý nội dung';
  end if;
  select * into v_revision from public.article_revisions where id = p_revision_id;
  if not found then raise exception 'Không tìm thấy phiên bản'; end if;
  v_snapshot := v_revision.snapshot;
  update public.articles set
    title = v_snapshot ->> 'title',
    tag = v_snapshot ->> 'tag',
    excerpt = v_snapshot ->> 'excerpt',
    image_url = v_snapshot ->> 'image_url',
    read_time_minutes = (v_snapshot ->> 'read_time_minutes')::smallint,
    body = v_snapshot -> 'body',
    seo_title = v_snapshot ->> 'seo_title',
    seo_description = v_snapshot ->> 'seo_description',
    social_image_url = v_snapshot ->> 'social_image_url',
    social_title = v_snapshot ->> 'social_title',
    social_description = v_snapshot ->> 'social_description',
    author_name = v_snapshot ->> 'author_name',
    source_name = v_snapshot ->> 'source_name',
    source_url = v_snapshot ->> 'source_url',
    related_product_slugs = coalesce(v_snapshot -> 'related_product_slugs', '[]'::jsonb),
    related_article_slugs = coalesce(v_snapshot -> 'related_article_slugs', '[]'::jsonb)
  where id = v_revision.article_id;
  if not found then raise exception 'Bài viết không còn tồn tại'; end if;
  return v_revision.article_id;
end;
$$;

revoke all on function public.restore_article_revision(bigint) from public, anon;
grant execute on function public.restore_article_revision(bigint) to authenticated;

/* ------------------------------------------------------------------ */
/* Sản phẩm: giữ nguyên guard tồn kho, thêm redirect khi đổi slug      */
/* ------------------------------------------------------------------ */

create or replace function public.save_admin_product(
  p_id uuid,
  p_product jsonb,
  p_quantity integer,
  p_threshold integer,
  p_expected_quantity integer default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  quantity_now integer;
  v_old_slug text;
  v_new_slug text := btrim(coalesce(p_product ->> 'slug', ''));
  v_id uuid;
begin
  if not public.can_manage('products') then
    raise exception 'Không có quyền sửa sản phẩm';
  end if;
  if v_new_slug !~ '^[a-z0-9-]+$' then
    raise exception 'Slug sản phẩm chỉ gồm chữ thường, số và dấu gạch ngang';
  end if;
  if p_id is not null then
    select slug into v_old_slug from public.products where id = p_id;
    if not found then raise exception 'Không tìm thấy sản phẩm'; end if;
    select quantity into quantity_now from public.product_inventory where product_id = p_id for update;
    if p_expected_quantity is null or coalesce(quantity_now, 0) <> p_expected_quantity then
      raise exception 'Tồn kho đã thay đổi. Hãy mở lại sản phẩm trước khi lưu';
    end if;
  end if;
  v_id := public.save_product_internal(p_id, p_product, p_quantity, p_threshold);
  if v_old_slug is not null and v_old_slug <> v_new_slug then
    perform public.record_slug_redirect('product', v_id, '/san-pham/' || v_old_slug, '/san-pham/' || v_new_slug);
  end if;
  return v_id;
end;
$$;

revoke all on function public.save_admin_product(uuid, jsonb, integer, integer, integer) from public, anon;
grant execute on function public.save_admin_product(uuid, jsonb, integer, integer, integer) to authenticated;

/* ------------------------------------------------------------------ */
/* RLS: bài công khai khi đã đăng, không lưu trữ, đến hạn             */
/* ------------------------------------------------------------------ */

drop policy if exists "public read published articles" on public.articles;
create policy "public read published articles" on public.articles
  for select to anon, authenticated using (
    published = true
    and archived = false
    and coalesce(scheduled_at, published_at) <= timezone('utc', now())
  );
drop policy if exists "staff manage articles" on public.articles;
drop policy if exists "staff read articles" on public.articles;
create policy "staff read articles" on public.articles
  for select to authenticated using (public.is_staff());

-- Ghi bài chỉ qua RPC kiểm quyền để giữ ngày/thứ tự redirect/revision.
revoke insert, update, delete on public.articles from authenticated, anon;

/* ------------------------------------------------------------------ */
/* Tồn kho công khai dạng in_stock (không mở bảng product_inventory)   */
/* ------------------------------------------------------------------ */

create or replace function public.public_product_stock()
returns table (slug text, in_stock boolean)
language sql
stable
security definer
set search_path = public
as $$
  select p.slug, coalesce(i.quantity, 0) > 0
  from public.products p
  left join public.product_inventory i on i.product_id = p.id
  where p.active = true
  order by p.sort_order, p.name;
$$;

revoke all on function public.public_product_stock() from public;
grant execute on function public.public_product_stock() to anon, authenticated;

/* ------------------------------------------------------------------ */
/* Newsletter: token hủy nhận tin + suppression                        */
/* ------------------------------------------------------------------ */

alter table public.customers add column if not exists unsubscribe_token uuid not null default gen_random_uuid();
alter table public.customers add column if not exists consent_withdrawn_at timestamptz;
create unique index if not exists customers_unsubscribe_token_idx on public.customers (unsubscribe_token);

create or replace function public.withdraw_marketing_consent_by_token(p_token uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_token is null then return false; end if;
  update public.customers
  set marketing_consent = false,
      consent_withdrawn_at = timezone('utc', now())
  where unsubscribe_token = p_token;
  return found;
end;
$$;

revoke all on function public.withdraw_marketing_consent_by_token(uuid) from public;
grant execute on function public.withdraw_marketing_consent_by_token(uuid) to anon, authenticated;

commit;
