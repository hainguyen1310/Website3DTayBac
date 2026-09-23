-- Ảnh sản phẩm/bài viết lưu trong Supabase Storage.
-- Bucket công khai để cửa hàng hiển thị ảnh; chỉ admin/staff được tải lên và xóa.
-- Chạy một lần trong SQL Editor (sau migration moc_storefront).

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-images',
  'site-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public read site images" on storage.objects;
drop policy if exists "staff upload site images" on storage.objects;
drop policy if exists "staff update site images" on storage.objects;
drop policy if exists "staff delete site images" on storage.objects;

create policy "public read site images" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'site-images');

create policy "staff upload site images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'site-images' and public.is_staff());

create policy "staff update site images" on storage.objects
  for update to authenticated
  using (bucket_id = 'site-images' and public.is_staff())
  with check (bucket_id = 'site-images' and public.is_staff());

create policy "staff delete site images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'site-images' and public.is_staff());

commit;
