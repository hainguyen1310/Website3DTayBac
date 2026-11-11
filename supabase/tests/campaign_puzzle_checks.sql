-- Kiểm thử thủ công RPC/RLS chương trình mảnh ghép trên DB local (mọi thay đổi được rollback).
-- Chạy: docker cp supabase/tests/campaign_puzzle_checks.sql supabase_db_Website3DTayBac:/tmp/c.sql && docker exec supabase_db_Website3DTayBac psql -U postgres -v ON_ERROR_STOP=1 -tA -f /tmp/c.sql
-- Cần dữ liệu mẫu của seed.sql (tài khoản *@moctaybac.demo) và tài khoản QA từ scripts/qa-admin.mjs.
begin;
create temp table t_codes(code text, piece smallint);
grant all on t_codes to authenticated;
-- 1. Nhân viên marketing không được cấp mã.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"0a4619d5-2b66-4f8b-8c52-5180345751b9","role":"authenticated"}', true);
do $$ begin perform public.campaign_issue_codes(null, 1, null, null); raise exception 'FAIL marketing issued'; exception when others then if sqlerrm like 'FAIL%' then raise; end if; raise notice 'OK marketing blocked: %', sqlerrm; end $$;
-- 2. Nhân viên vận hành cấp 3 mã cho đơn đã thanh toán, 2 mã cùng mảnh 05.
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
insert into t_codes select code, piece from public.campaign_issue_codes('b7e5ebae-3f4e-4888-8cf1-c41ad9492bc4', 2, 4::smallint, 'test');
insert into t_codes select code, piece from public.campaign_issue_codes(null, 1, null, null);
select 'issued', count(*), min(code) ~ '^ASIN-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$' as format_ok from t_codes;
select 'staff sees codes', count(*) from public.campaign_codes;
-- 3. Khách: không đọc được bảng mã; mở mảnh bằng mã (gõ thường, bỏ gạch).
select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}', true);
select 'customer sees codes', count(*) from public.campaign_codes;
select 'redeem 1', public.campaign_redeem(lower(replace((select code from t_codes where piece = 4 order by code limit 1), '-', '')));
select 'redeem same piece', public.campaign_redeem((select code from t_codes where piece = 4 order by code desc limit 1));
select 'redeem invalid', public.campaign_redeem('ASIN-ZZZZ-ZZZZ');
select 'own progress', array_agg(piece) from public.campaign_progress;
-- 4. Người khác dùng lại mã đã dùng → bị từ chối; mã còn lại (cùng mảnh) vẫn dùng được cho người khác.
select set_config('request.jwt.claims', '{"sub":"813d37a8-1e44-464a-82c1-787b391550e8","role":"authenticated"}', true);
select 'reuse by other', public.campaign_redeem((select code from t_codes where piece = 4 order by code limit 1));
select 'other redeems unused same-piece code', public.campaign_redeem((select code from t_codes where piece = 4 order by code desc limit 1));
-- 4b. Tài khoản đã dùng mã bị xoá (redeemed_by về null): mã vẫn không dùng lại được.
reset role;
update public.campaign_codes set redeemed_by = null where code = (select code from t_codes where piece = 4 order by code limit 1);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
select 'reuse after account deletion', public.campaign_redeem((select code from t_codes where piece = 4 order by code limit 1));
-- 5. Thu hồi: mã đã dùng không thu hồi được; mã chưa dùng thu hồi xong thì không dùng được.
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
do $$ begin perform public.campaign_revoke_code((select code from t_codes where piece = 4 order by code limit 1)); raise exception 'FAIL revoked used'; exception when others then if sqlerrm like 'FAIL%' then raise; end if; raise notice 'OK used code not revocable'; end $$;
select public.campaign_revoke_code((select code from t_codes where piece <> 4 or piece is null order by code limit 1) );
select 'admin list', count(*), count(*) filter (where revoked_at is not null) as revoked, count(*) filter (where redeemed_at is not null) as redeemed from public.campaign_admin_codes(null, 50);
select 'summary', public.campaign_admin_summary();
-- 6. Chặn dò mã: 8 lần sai trong 15 phút.
select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}', true);
select public.campaign_redeem('ASIN-2222-2222') from generate_series(1, 8);
select 'after 9 failures', public.campaign_redeem((select code from t_codes order by code desc limit 1));
-- 7. Khách ẩn danh không gọi được RPC.
reset role;
set local role anon;
do $$ begin perform public.campaign_redeem('x'); raise exception 'FAIL anon'; exception when others then if sqlerrm like 'FAIL%' then raise; end if; raise notice 'OK anon blocked: %', sqlerrm; end $$;
rollback;
