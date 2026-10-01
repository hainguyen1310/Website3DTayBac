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
    returning articles.id, articles.updated_at into v_id, v_updated;
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
    returning articles.id, articles.updated_at into v_id, v_updated;
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


