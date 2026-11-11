import { Icon } from "../icons";
import { ASSETS } from "../data";
import { useSiteUi } from "./SiteUiContext";

/** Nút "Tạm dừng chuyển động" ở chân trang (data-motion). */
export function MotionToggle() {
  const { motionPaused, reducedMotion, toggleMotion } = useSiteUi();
  const still = motionPaused || reducedMotion;
  const label = reducedMotion ? "Chế độ giảm chuyển động" : motionPaused ? "Bật chuyển động" : "Tạm dừng chuyển động";
  return (
    <button
      className="motion-toggle"
      type="button"
      data-motion
      aria-pressed={still}
      disabled={reducedMotion}
      title={reducedMotion ? "Chuyển động đã giảm theo cài đặt của thiết bị" : undefined}
      onClick={toggleMotion}
    >
      <Icon name={still ? "play" : "pause"} />
      <span>{label}</span>
    </button>
  );
}

/** Chân trang của các trang con (kèm dải nhận tin). */
export function SiteFooter() {
  const { setPolicy, setNewsletterOpen } = useSiteUi();
  return (
    <div id="site-footer">
      <section className="site-newsletter" aria-labelledby="newsletter-title">
        <div className="wrap sc-newsletter">
          <div>
            <span className="eyebrow">CÂU CHUYỆN CÒN TIẾP</span>
            <h2 id="newsletter-title">Nhận tin từ A SỈN.</h2>
            <p>Nhận tin về mùa vụ mới, hộp quà giới hạn<br />và ưu đãi dành cho khách quen.</p>
          </div>
          <button className="btn light" type="button" onClick={() => setNewsletterOpen(true)}>
            Đăng ký nhận tin <Icon name="diagonal" />
          </button>
        </div>
      </section>
      <footer className="site-footer">
        <div className="wrap">
          <div className="footer-grid">
            <div className="footer-brand">
              <a href="/" aria-label="A SỈN — Trang chủ"><img src={ASSETS.logoLight} alt="A SỈN" /></a>
              <p>Đặc sản vùng cao, gói ghém bằng sự chỉn chu.<br />Một chút khói bếp. Cả miền Tây Bắc.</p>
              <div className="footer-social">
                <a href="/nguon-goc">Từ miền núi</a>
                <a href="/thiet-ke">Đến bên nhau <Icon name="diagonal" /></a>
              </div>
            </div>
            <div>
              <h2 className="footer-title">Mang Tây Bắc về nhà</h2>
              <div className="footer-links">
                <a href="/san-pham/trau-gac-bep-tay-bac">Thịt trâu gác bếp</a>
                <a href="/san-pham/thit-trau-xe">Thịt trâu xé</a>
                <a href="/san-pham/thit-lon-xe">Thịt lợn xé</a>
                <a href="/san-pham">Tất cả đặc sản</a>
              </div>
            </div>
            <div>
              <h2 className="footer-title">Câu chuyện tiếp nối</h2>
              <div className="footer-links">
                <a href="/chuong-trinh">24 mảnh ghép Tây Bắc</a>
                <a href="/nguon-goc">Nguồn gốc</a>
                <a href="/gioi-thieu">Về A SỈN</a>
                <a href="/tin-tuc">Chuyện &amp; vị</a>
                <a href="/thiet-ke">Tự tay chọn hộp quà</a>
              </div>
            </div>
            <div>
              <h2 className="footer-title">Gặp gỡ A SỈN</h2>
              <div className="footer-links">
                <a href="/lien-he?chu-de=qua-tang-doanh-nghiep#eu-contact-form">Quà tặng doanh nghiệp</a>
                <a href="/gio-hang">Giỏ hàng của bạn</a>
                <a href="/lien-he">Liên hệ A SỈN</a>
                <MotionToggle />
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} A SỈN · Đặc sản Tây Bắc</span>
            <span>Quà núi rừng – Gửi trọn tâm ý</span>
            <span>
              <button type="button" data-policy="privacy" onClick={() => setPolicy("privacy")}>Quyền riêng tư</button>
              {"  /  "}
              <button type="button" data-policy="returns" onClick={() => setPolicy("returns")}>Giao hàng &amp; đổi trả</button>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/** Chân trang biên tập của Trang chủ (renderHomeFooter). */
export function HomeFooter() {
  const { setPolicy } = useSiteUi();
  return (
    <div id="site-footer">
      <footer className="site-footer ph-footer ph-editorial-footer">
        <div className="wrap">
          <div className="footer-grid">
            <div className="footer-brand">
              <a href="/" aria-label="A SỈN – Trang chủ"><img src={ASSETS.logoLight} alt="A SỈN" width="108" height="65" loading="lazy" /></a>
              <p>Đặc sản Tây Bắc, gửi trọn tâm ý.<br />Gìn giữ vị bản trong từng món quà.</p>
              <div className="footer-social"><a href="/gioi-thieu">Câu chuyện A SỈN <Icon name="diagonal" /></a></div>
            </div>
            <nav aria-labelledby="ph-footer-shopping">
              <h2 id="ph-footer-shopping" className="footer-title">Chọn một món quà</h2>
              <div className="footer-links">
                <a href="/san-pham">Tất cả đặc sản</a>
                <a href="/#mo-hop-qua">Sinh Lộc &amp; Thịnh Đỉnh</a>
                <a href="/thiet-ke">Hộp quà 3D</a>
                <a href="/lien-he?chu-de=qua-tang-doanh-nghiep#eu-contact-form">Quà tặng doanh nghiệp</a>
                <a href="/gio-hang">Giỏ hàng của bạn</a>
              </div>
            </nav>
            <nav aria-labelledby="ph-footer-explore">
              <h2 id="ph-footer-explore" className="footer-title">Khám phá A SỈN</h2>
              <div className="footer-links">
                <a href="/gioi-thieu">Về chúng tôi</a>
                <a href="/nguon-goc">Nguồn gốc sản phẩm</a>
                <a href="/chuong-trinh">Ghép Vị Mở Miền</a>
                <a href="/tin-tuc">Tin tức &amp; hành trình</a>
              </div>
            </nav>
            <div className="ph-footer-contact">
              <h2 className="footer-title">Kết nối &amp; tư vấn</h2>
              <div className="footer-links">
                <a href="/lien-he">Liên hệ A SỈN <Icon name="diagonal" /></a>
                <a href="/lien-he#eu-contact-form">Gửi lời nhắn cho A SỈN <Icon name="diagonal" /></a>
                <span className="ph-footer-channel">Facebook · TikTok Shop · Shopee<small>Liên kết chính thức đang cập nhật</small></span>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <div className="ph-footer-credit">
              <span>© {new Date().getFullYear()} A SỈN – Đặc sản Tây Bắc</span>
              <span>Quà núi rừng – Gửi trọn tâm ý</span>
              <span>Ảnh và danh mục từ A SỈN</span>
            </div>
            <div className="ph-footer-utilities">
              <button type="button" data-policy="returns" onClick={() => setPolicy("returns")}>Giao hàng &amp; đổi trả</button>
              <button type="button" data-policy="privacy" onClick={() => setPolicy("privacy")}>Quyền riêng tư</button>
              <MotionToggle />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
