import { ASSETS } from "../../../data";
import { Icon } from "../../../icons";

const arrow = () => <Icon name="diagonal" />;

export function CorporateGiftSection() {
  return (
    <section
      className="ph-section ph-corporate ph-editorial-corporate"
      id="gui-ve-nha"
      aria-labelledby="ph-corporate-title"
    >
      <div className="ph-wrap ph-editorial-corporate-layout">
        <div className="ph-editorial-corporate-copy">
          <p className="ph-editorial-kicker">Quà tặng doanh nghiệp</p>
          <h2 id="ph-corporate-title">
            Trao đối tác <em>một lời cảm ơn.</em>
          </h2>
          <ul className="ph-editorial-gift-options">
            <li>
              <span aria-hidden="true">01</span> Chọn đặc sản theo ngân sách và dịp tặng
            </li>
            <li>
              <span aria-hidden="true">02</span> Cá nhân hóa thiệp và lời nhắn
            </li>
            <li>
              <span aria-hidden="true">03</span> Tư vấn đặt hộp quà số lượng lớn
            </li>
          </ul>
          <a
            className="ph-btn ph-btn-light"
            href="/lien-he?chu-de=qua-tang-doanh-nghiep#eu-contact-form"
          >
            Nhận tư vấn quà doanh nghiệp {arrow()}
          </a>
        </div>
        <figure className="ph-editorial-corporate-image">
          <div className="ph-editorial-corporate-stage">
            <img
              src={ASSETS.gift}
              alt="Hộp quà Sinh Lộc xanh rêu mở nắp, trưng bày các món đặc sản A SỈN"
              width={2048}
              height={2012}
              loading="lazy"
              decoding="async"
            />
          </div>
          <figcaption>
            <span>Hộp quà Sinh Lộc</span>
            <span>A SỈN</span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
