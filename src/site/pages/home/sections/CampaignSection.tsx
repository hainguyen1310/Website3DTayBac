import { Icon } from "../../../icons";
import { CampaignPuzzle } from "./CampaignPuzzle";

export function CampaignSection() {
  return (
    <section className="ph-section ph-program" id="ghep-vi-mo-mien" aria-labelledby="ph-campaign-title">
      <div className="ph-campaign-backdrop" aria-hidden="true">
        <img
          className="ph-campaign-panorama"
          src="/assets/scenery/journey-landscape.webp"
          width={1902}
          height={827}
          alt=""
          loading="lazy"
          decoding="async"
        />
        <span className="ph-campaign-mist"></span>
      </div>

      <div className="ph-wrap ph-campaign-layout">
        <div className="ph-campaign-copy">
          <p className="ph-eyebrow ph-campaign-label">Chương trình đặc biệt</p>
          <h2 id="ph-campaign-title" className="ph-campaign-heading">
            Ghép Vị <em>Mở Miền</em>
          </h2>
          <p className="ph-campaign-description">Ghép 24 mảnh để khám phá hương vị và chuyện bản làng Tây Bắc.</p>
        </div>

        <div className="ph-campaign-visual">
          <CampaignPuzzle />
        </div>

        <div className="ph-campaign-actions">
          <a className="ph-campaign-ticket" href="/chuong-trinh#cp-phan-thuong">
            <span className="ph-campaign-ticket-icon" aria-hidden="true">
              <Icon name="gift" />
            </span>
            <span>
              <span className="ph-campaign-ticket-label">Phần thưởng minh họa</span>
              <strong>Chuyến đi Tây Bắc</strong>
            </span>
            <span className="ph-campaign-ticket-arrow" aria-hidden="true">
              <Icon name="diagonal" />
            </span>
          </a>

          <ol className="ph-campaign-flow" aria-label="Ba bước tham gia">
            <li>
              <span aria-hidden="true">01</span>Đơn hàng đủ điều kiện
            </li>
            <li>
              <span aria-hidden="true">02</span>Nhận và nhập mã
            </li>
            <li>
              <span aria-hidden="true">03</span>Ghép đủ 24 mảnh
            </li>
          </ol>

          <a className="ph-btn ph-btn-primary ph-campaign-cta" href="/chuong-trinh" aria-describedby="ph-campaign-note">
            Khám phá chương trình <Icon name="arrow" />
          </a>

          <p className="ph-campaign-note" id="ph-campaign-note">
            Điều kiện cấp mã và nhận thưởng áp dụng theo thể lệ chương trình.
          </p>
        </div>
      </div>

      <svg
        className="ph-campaign-transition"
        viewBox="0 40 1440 228"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable={false}
      >
        <path className="ph-campaign-transition-band" d="M-5 166C153 100 305 158 486 172C705 188 928 134 1111 109C1250 90 1339 74 1445 43V268H-5Z" />
        <path
          className="ph-campaign-transition-paper"
          d="M-5 208C105 183 238 211 414 233C613 259 761 238 984 215C1130 201 1284 154 1445 189V268H-5Z"
        />
        <path className="ph-campaign-transition-gold" d="M-5 166C153 100 305 158 486 172C705 188 928 134 1111 109C1250 90 1339 74 1445 43" vectorEffect="non-scaling-stroke" />
      </svg>
    </section>
  );
}
