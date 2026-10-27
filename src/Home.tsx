import { useRef } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Box,
  ChevronRight,
  Gift,
  HandHeart,
  Heart,
  MapPin,
  ShieldCheck,
  Truck,
  Users,
  Wheat,
} from "lucide-react";
import { useCatalog } from "./CatalogContext";
import { useShop } from "./ShopContext";
import { money } from "./catalog";
import { useWebsite } from "./WebsiteContext";
import { SIGNATURE_PRODUCTS } from "./asinContent";
import LandingJourney from "./LandingJourney";
import LandingReviews from "./LandingReviews";
import { LandingNews } from "./Journal";
import { useDocumentSeo } from "./hooks/useDocumentSeo";
import { homeMeta } from "./seo/meta";

export default function Home() {
  const { content: c } = useWebsite();
  const { products } = useCatalog();
  const { setSelectedProduct } = useShop();
  useDocumentSeo((ctx) => homeMeta(ctx), []);
  const rail = useRef<HTMLDivElement>(null);
  return (
    <main className="asin-home">
      <section className="asin-hero" aria-labelledby="hero-title">
        <img
          className="asin-hero-image"
          src={c["hero.image"]}
          alt="Đặc sản gác bếp và gia vị Tây Bắc giữa núi rừng, ruộng bậc thang"
          fetchPriority="high"
          width={1942}
          height={809}
        />
        <div className="asin-container asin-hero-inner">
          <div className="asin-hero-copy">
            <span className="asin-eyebrow">{c["hero.eyebrow"]}</span>
            <h1 id="hero-title">
              <span>{c["hero.line1"]}</span>
              <span>{c["hero.line2"]}</span>
              <span>{c["hero.line3"]}</span>
            </h1>
            <p>{c["hero.description"]}</p>
            <div className="asin-actions">
              <Link className="asin-button" to="/san-pham">
                {c["hero.cta"]} <ArrowRight size={17} />
              </Link>
              <Link className="asin-button asin-button-light" to="/thiet-ke">
                Làm hộp quà 3D <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
        <aside className="asin-hero-note" aria-hidden="true">
          <span>
            TỪ
            <br />
            NÚI RỪNG
            <br />
            ĐẾN
            <br />
            BÀN TIỆC
          </span>
          <i />
          <b>01</b>
          <span>
            02
            <br />
            03
          </span>
        </aside>
        <span className="asin-hero-script" aria-hidden="true">
          Hơn cả đặc sản,
          <br />
          là một
          <br />
          câu chuyện.
        </span>
      </section>
      <aside className="asin-values" aria-label="Giá trị A Sỉn">
        <div className="asin-container">
          {[ShieldCheck, Wheat, Gift, Box, Truck].map((Icon, index) => (
            <div className="asin-value" key={index}>
              <Icon size={33} strokeWidth={1.25} aria-hidden="true" />
              <div>
                <b>{index === 4 ? "Giao hàng toàn quốc" : c[`values.${index + 1}.title`]}</b>
                <small>{index === 4 ? "Nâng niu từng món quà" : c[`values.${index + 1}.text`]}</small>
              </div>
            </div>
          ))}
        </div>
      </aside>
      <section
        className="asin-story"
        id="cau-chuyen"
        aria-labelledby="story-title"
      >
        <div className="asin-story-paper" aria-hidden="true">
          <img
            src={c["story.backgroundImage"]}
            alt=""
            width={2164}
            height={727}
            loading="lazy"
          />
        </div>
        <div className="asin-container asin-story-grid">
          <div className="asin-story-copy">
            <span className="asin-eyebrow">
              CÂU CHUYỆN <strong>A SỈN</strong>
            </span>
            <h2 id="story-title">{c["story.title"]}</h2>
            <p>{c["story.description"]}</p>
            <Link className="asin-button" to="/gioi-thieu">
              Khám phá câu chuyện <ArrowRight size={16} />
            </Link>
          </div>
          <div className="asin-story-landscape">
            <img
              src={c["story.image"]}
              alt="Minh họa nếp nhà gỗ, khói bếp và ruộng bậc thang giữa núi rừng Tây Bắc"
              width={1400}
              height={1120}
              loading="lazy"
            />
            <Link
              to="/gioi-thieu"
              className="asin-story-play"
              aria-label="Khám phá câu chuyện A Sỉn"
            >
              <ArrowRight size={24} />
            </Link>
          </div>
          <span className="asin-story-handwriting" aria-hidden="true">
            Con người.
            <br />
            Vùng đất.
            <br />
            Hương vị.
          </span>
          <div className="asin-story-map" aria-label="Vùng đất Lào Cai, Bắc Hà">
            <span className="asin-map-place">
              <MapPin size={29} fill="currentColor" /> <b>Lào Cai</b>
            </span>
            <span className="asin-map-place second">
              <MapPin size={29} fill="currentColor" /> <b>Bắc Hà</b>
            </span>
          </div>
          <div
            className="asin-story-photos"
            aria-label="Con người, hương vị và vùng đất Tây Bắc"
          >
            <figure className="asin-story-photo asin-story-photo-portrait">
              <img
                src={c["story.portraitImage"]}
                alt="Minh họa người phụ nữ H'Mông trong trang phục chàm và khăn thổ cẩm"
                width={600}
                height={480}
                loading="lazy"
              />
            </figure>
            <figure className="asin-story-photo asin-story-photo-meat">
              <img
                src={c["story.meatImage"]}
                alt="Những dải thịt gác bếp treo trong gian bếp gỗ vùng cao"
                width={600}
                height={400}
                loading="lazy"
              />
            </figure>
            <figure className="asin-story-photo asin-story-photo-terraces">
              <img
                src={c["story.terracesImage"]}
                alt="Ruộng bậc thang xanh vàng trải dọc thung lũng núi Tây Bắc"
                width={600}
                height={400}
                loading="lazy"
              />
            </figure>
          </div>
          <div className="asin-story-facts">
            {[HandHeart, Users, Heart].map((Icon, i) => (
              <div key={i}>
                <Icon size={33} strokeWidth={1.25} aria-hidden="true" />
                <b>{c[`story.stat${i + 1}`]}</b>
                <small>{c[`story.stat${i + 1}Label`]}</small>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section
        className="asin-products asin-paper"
        id="deal-hoi"
        aria-labelledby="products-title"
      >
        <div className="asin-container asin-products-layout">
          <div>
            <span className="asin-eyebrow">SẢN PHẨM A SỈN</span>
            <h2 id="products-title">{c["products.title"]}</h2>
            <Link to="/san-pham" className="asin-button">
              Tất cả sản phẩm <ArrowRight size={16} />
            </Link>
          </div>
          <div className="asin-product-rail" ref={rail}>
            {SIGNATURE_PRODUCTS.map((item) => {
              const live = products.find((p) => p.id === item.id);
              return (
                <article className="asin-product" key={item.id}>
                  {live ? (
                    <button
                      onClick={() => setSelectedProduct(live)}
                      className="asin-product-image"
                      aria-label={`Xem ${live.name}`}
                    >
                      <img
                        src={live.image}
                        alt={live.name}
                        loading="lazy"
                        width={800}
                        height={800}
                      />
                    </button>
                  ) : (
                    <Link
                      to="/lien-he"
                      className="asin-product-image"
                      aria-label={`Tìm hiểu ${item.name}`}
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        loading="lazy"
                        width={800}
                        height={800}
                      />
                    </Link>
                  )}
                  <h3>
                    {live ? (
                      <button onClick={() => setSelectedProduct(live)}>
                        {live.name}
                      </button>
                    ) : (
                      <Link to="/lien-he">{item.name}</Link>
                    )}
                  </h3>
                  <small>{live?.weight || item.type}</small>
                  {live ? (
                    <span>{money(live.price)}</span>
                  ) : (
                    <Link className="asin-product-inquiry" to="/lien-he">
                      Tìm hiểu sản phẩm <ChevronRight size={12} />
                    </Link>
                  )}
                </article>
              );
            })}
          </div>
          <button
            className="asin-rail-next"
            aria-label="Xem thêm sản phẩm"
            onClick={() => {
              const el = rail.current;
              if (el)
                el.scrollTo({
                  left:
                    el.scrollLeft + el.clientWidth >= el.scrollWidth - 4
                      ? 0
                      : el.scrollLeft + 280,
                  behavior: "smooth",
                });
            }}
          >
            <ChevronRight size={19} />
          </button>
        </div>
      </section>
      <LandingJourney />
      <LandingReviews />
      <LandingNews />
    </main>
  );
}
