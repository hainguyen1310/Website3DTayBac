-- Mộc Tây Bắc: mỗi thời điểm chỉ được có MỘT khuyến mãi đang chạy.
--
-- Vì sao cần migration này:
--   Bảng `promotions` cho phép nhiều dòng `is_active = true` cùng lúc, và
--   policy RLS "public read active promotions" chỉ lọc theo `is_active` +
--   khoảng thời gian nên hai chương trình trùng thời gian sẽ cùng lọt ra
--   cửa hàng. Khi đó `listStorefrontDeals()` trả về hai ưu đãi cho cùng một
--   sản phẩm: mục "Deal hời" hiện hai giá gạch ngang mâu thuẫn, và thứ tự
--   hiển thị phụ thuộc `sort_order` của hai chương trình khác nhau.
--   Ràng buộc dưới đây chặn ngay ở tầng dữ liệu, không thể lách qua trình
--   duyệt hay gọi API trực tiếp.
--
-- Quy ước thời gian lấy đúng theo policy RLS hiện có:
--   * starts_at IS NULL  -> coi như đã bắt đầu từ trước (không giới hạn dưới)
--   * ends_at   IS NULL  -> coi như chạy mãi mãi (không giới hạn trên)
--   nên `tstzrange(starts_at, ends_at, '[)')` mô tả chính xác khoảng hiệu lực.
--
-- Hệ quả cần biết trước:
--   Một chương trình đang bật mà để trống ngày kết thúc sẽ chiếm trọn toàn bộ
--   thời gian về sau, vì vậy không thể tạo thêm chương trình nào khác cho tới
--   khi đặt ngày kết thúc cho nó. Đây là chủ ý: "đang diễn ra" và "sắp diễn
--   ra" không được chồng lên nhau, muốn mở chương trình mới thì chương trình
--   cũ phải có ngày kết thúc.

begin;

-- 1. Chuẩn hóa chương trình minh họa do migration gốc tạo ra.
--    Migration gốc seed 'LANDING-DEALS' với starts_at = 2026-09-01 và
--    ends_at = NULL, tức chiếm trọn tương lai. Nếu để nguyên, ràng buộc ở
--    bước 3 sẽ khóa mọi chương trình tạo sau này. Chỉ chỉnh đúng dòng minh
--    họa đó, và chỉ khi ngày kết thúc còn trống.
update public.promotions
set ends_at = starts_at + interval '30 days'
where code = 'LANDING-DEALS'
  and starts_at is not null
  and ends_at is null;

-- 2. Dừng lại với thông báo rõ ràng nếu dữ liệu hiện có đã chồng lấn.
--    Tự ý sửa dữ liệu nghiệp vụ là việc của người quản trị, không phải của
--    migration; ở đây chỉ nêu đích danh cặp chương trình đang trùng.
do $$
declare
  v_conflict text;
begin
  select string_agg(format('%s ↔ %s', a.code, b.code), ', ' order by a.code)
  into v_conflict
  from public.promotions a
  join public.promotions b
    on a.id < b.id
   and a.is_active
   and b.is_active
   and tstzrange(a.starts_at, a.ends_at, '[)')
    && tstzrange(b.starts_at, b.ends_at, '[)');

  if v_conflict is not null then
    raise exception
      'Không tạo được ràng buộc: các khuyến mãi ĐANG BẬT bị trùng thời gian: %. Hãy đặt ngày kết thúc cho từng chương trình (hoặc tắt bớt) rồi chạy lại migration.',
      v_conflict;
  end if;
end $$;

-- 3. Ràng buộc chính. Chỉ áp cho các dòng `is_active`, nên chương trình đã
--    tắt thì được tự do trùng thời gian với bất kỳ chương trình nào.
--    `&&` trên kiểu range dùng GiST có sẵn của PostgreSQL, không cần btree_gist.
alter table public.promotions
  drop constraint if exists promotions_active_no_overlap;
alter table public.promotions
  add constraint promotions_active_no_overlap
  exclude using gist (tstzrange(starts_at, ends_at, '[)') with &&)
  where (is_active);

commit;
