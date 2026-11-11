import { GIFT_DRAFT_KEY, GIFT_VARIANTS, giftPhotoFor } from "../../../gift/variants";
import { Icon } from "../../../icons";

const arrow = () => <Icon name="diagonal" />;

const gifts = [
  {
    size: "medium" as const,
    tone: "green",
    label: "Hộp cỡ vừa",
    photo: giftPhotoFor("medium"),
    alt: "Hộp quà Sinh Lộc của A SỈN với bao bì xanh rêu và các món đặc sản",
    description:
      "Lời chúc an lành trong sắc xanh rêu, cùng những hương vị thân quen.",
  },
  {
    size: "large" as const,
    tone: "wine",
    label: "Hộp cỡ lớn",
    photo: giftPhotoFor("large"),
    alt: "Hộp quà Thịnh Đỉnh màu đỏ đô của A SỈN, họa tiết ngựa và núi vàng",
    description:
      "Gửi lời chúc thịnh vượng, với thêm không gian để chọn món hợp ý người nhận.",
  },
];

export function GiftCollectionSection() {
  return (
    <section
      className="ph-section ph-collection ph-refined-gifts"
      id="mo-hop-qua"
      aria-labelledby="ph-collection-title"
    >
      <div className="ph-wrap">
        <div className="ph-gift-section-title" data-ph-reveal>
          <span className="ph-eyebrow">Bộ sưu tập hộp quà</span>
          <h2 id="ph-collection-title">
            Gói tinh hoa, <em>trao trọn tâm ý</em>
          </h2>
        </div>

        <div className="ph-collection-grid">
          {gifts.map(({ size, tone, label, photo, alt, description }) => {
            const variant = GIFT_VARIANTS[size];
            return (
              <article
                key={size}
                className={`ph-gift-card ph-gift-${tone}`}
                aria-labelledby={`ph-gift-${variant.artKey}-title`}
              >
                <figure className="ph-gift-card-art">
                  <img src={photo} alt={alt} width={1024} height={1024} loading="lazy" decoding="async" />
                </figure>
                <div className="ph-gift-card-copy">
                  <p className="ph-gift-spec">
                    <span>{label}</span>
                    <span>{variant.dimensions}</span>
                  </p>
                  <h3 id={`ph-gift-${variant.artKey}-title`}>{variant.name}</h3>
                  <p className="ph-gift-description">{description}</p>
                  <div className="ph-gift-actions">
                    <a
                      className="ph-btn ph-btn-light"
                      data-ph-gift={variant.artKey}
                      href="/thiet-ke?nguon=trang-chu"
                      onClick={() => {
                        try {
                          sessionStorage.setItem(GIFT_DRAFT_KEY, JSON.stringify({ size: variant.artKey, recipient: "", message: "" }));
                        } catch {
                          /* Trang hộp quà vẫn mở được khi trình duyệt chặn lưu trữ. */
                        }
                      }}
                    >
                      Chọn hộp {variant.name} {arrow()}
                    </a>
                    <a
                      className="ph-gift-showroom-link"
                      data-pgp-show={variant.artKey}
                      href="/#hop-qua-3d"
                      aria-label={`Xem hộp ${variant.name} trong không gian 3D`}
                    >
                      <Icon name="box" /> Xem 3D
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
