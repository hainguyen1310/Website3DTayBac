import type { MouseEvent } from "react";
import { useSiteProducts, findProduct } from "../../../data";
import { money } from "../../../format";
import { Icon } from "../../../icons";
import { useSiteCart, pulseQuickAdd } from "../../../commerce/useSiteCart";

const featured = [
  ["trau-gac-bep-tay-bac", "media__products__trau__f8371072.webp", "Thịt trâu gác bếp A SỈN bày trên thớt"],
  ["thit-lon-gac-bep", "media__products__lon__cam-on-5.webp", "Thịt lợn gác bếp A SỈN cùng phần thịt bày trên thớt"],
  ["ba-chi-gac-bep", "media__products__ba-chi__img-2025.webp", "Ba chỉ gác bếp thái lát trên lá chuối"],
  ["lap-xuong-gac-bep", "media__products__lap-xuong__f10757888.webp", "Lạp xưởng gác bếp A SỈN trên lá chuối"],
] as const;

const arrow = () => <Icon name="diagonal" />;

export function FeaturedProductsSection() {
  const products = useSiteProducts();
  const { addToCart } = useSiteCart();

  const handleQuickAdd = (event: MouseEvent<HTMLButtonElement>, slug: string) => {
    event.preventDefault();
    const button = event.currentTarget;
    if (addToCart(slug, 1, { openCart: false })) {
      pulseQuickAdd(button);
    }
  };

  return (
    <section className="ph-section ph-products" id="dac-san" aria-labelledby="ph-products-title">
      <div className="ph-wrap">
        <div className="ph-section-head" data-ph-reveal>
          <div>
            <span className="ph-eyebrow">01 / Từ gian bếp vùng cao</span>
            <h2 id="ph-products-title">
              Tinh hoa gác bếp <em>Tây Bắc</em>
            </h2>
          </div>
          <div className="ph-section-aside">
            <p>
              Chọn một món hợp vị.
              <br /> Hay bắt đầu một món quà có ý nghĩa.
            </p>
            <a className="ph-text-link" href="/san-pham">
              Xem tất cả đặc sản {arrow()}
            </a>
          </div>
        </div>

        <div className="ph-product-grid">
          {featured.map(([slug, file, alt]) => {
            const product = findProduct(products, slug);
            if (!product) return null;
            const url = `/san-pham/${encodeURIComponent(slug)}`;
            const available = product.inStock !== false;
            return (
              <article key={slug} className="ph-product-card" data-ph-product={slug}>
                <a className="ph-product-image" href={url} aria-label={`Xem ${product.name}`}>
                  <img src={`/assets/original/${file}`} alt={alt} loading="lazy" decoding="async" />
                  <span className="ph-product-detail">
                    Xem chi tiết {arrow()}
                  </span>
                </a>
                <h3>
                  <a href={url}>{product.name}</a>
                </h3>
                <p className="ph-product-weight">{product.weight}</p>
                <div className="ph-product-bottom">
                  <span className="ph-product-price">{money(product.price)}</span>
                  <button
                    type="button"
                    data-add={slug}
                    data-cart-peek="false"
                    aria-label={
                      available
                        ? `Thêm ${product.name} vào giỏ`
                        : `${product.name} tạm hết hàng`
                    }
                    disabled={!available}
                    onClick={(e) => handleQuickAdd(e, slug)}
                  >
                    <Icon name="bag" />
                    <span>{available ? "Thêm vào giỏ" : "Tạm hết hàng"}</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        <p className="ph-data-note">
          Giá và quy cách tham khảo. A SỈN xác nhận tình trạng hàng và giá áp dụng khi đặt mua.
        </p>
      </div>
    </section>
  );
}
