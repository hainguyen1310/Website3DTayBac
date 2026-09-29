-- A Sỉn PDF redesign. Apply after the existing migrations.
-- New products remain unpublished until their real prices, weights and stock are supplied.
-- Do not change existing prices, stock, IDs, orders, customer data or authentication.
begin;
alter table public.products add column if not exists model_url text;
comment on column public.products.model_url is 'Optional GLB URL for the product viewer. Presentation only.';

insert into public.products (category_id,slug,sku,name,origin,weight_label,price_vnd,image_url,tag,description,active,featured,sort_order,model_url)
select c.id,d.slug,d.sku,d.name,'TÂY BẮC','Chờ cập nhật quy cách',0,d.image,d.tag,
 'Đặc sản A Sỉn. Đang chờ xác nhận giá bán và quy cách đóng gói.',false,true,d.position,d.model
from (values
('thit-lon-gac-bep','ASIN-THIT-LON-GAC-BEP','Thịt lợn gác bếp','/images/products/pork.webp','ĐẶC SẢN GÁC BẾP','dac-san-gac-bep',2,'/3Dfile/thit_lon_say_tay_bac.glb'),
('lap-xuong-gac-bep','ASIN-LAP-XUONG-GAC-BEP','Lạp xưởng gác bếp','/images/products/sausage.webp','ĐẶC SẢN GÁC BẾP','dac-san-gac-bep',3,null),
('cham-cheo','ASIN-CHAM-CHEO','Chẩm chéo','/images/products/cham-cheo.webp','GIA VỊ NÚI RỪNG','gia-vi-nui-rung',4,null),
('thit-trau-xe','ASIN-THIT-TRAU-XE','Thịt trâu xé','/images/products/shredded-buffalo.webp','HƯƠNG VỊ TÂY BẮC','dac-san-gac-bep',5,null),
('thit-lon-xe','ASIN-THIT-LON-XE','Thịt lợn xé','/images/products/shredded-pork.webp','HƯƠNG VỊ TÂY BẮC','dac-san-gac-bep',6,null)
) as d(slug,sku,name,image,tag,category,position,model)
left join public.product_categories c on c.slug=d.category
on conflict (slug) do nothing;
insert into public.product_inventory(product_id,quantity,low_stock_threshold)
select id,0,5 from public.products where slug in ('thit-lon-gac-bep','lap-xuong-gac-bep','cham-cheo','thit-trau-xe','thit-lon-xe')
on conflict(product_id) do nothing;
update public.products set model_url='/3Dfile/thit_lon_say_tay_bac.glb' where slug='thit-lon-gac-bep' and model_url is null;
commit;

-- Image URLs and CMS copy are synchronized AFTER uploading assets with:
-- node --experimental-strip-types scripts/sync-asin-branding.mjs --env <private-env-file> --apply
-- The sync script preserves existing commerce values and backs up the changed rows.
