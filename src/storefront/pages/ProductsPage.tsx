import { useSearchParams } from "react-router-dom";
import { Feather, Gem, Gift, Truck, UsersRound } from "lucide-react";
import { useShop } from "../../ShopContext";
import { useDocumentSeo } from "../../hooks/useDocumentSeo";
import { productsMeta } from "../../seo/meta";
import { normalizeSearch } from "../../search";
import { toSeoProductInput } from "../../seo/product";
import { MEDIA, TESTIMONIALS_PRODUCTS } from "../content";
import { PRODUCT_FILTERS } from "../products";
import type { ProductFilter, StorefrontProduct } from "../products";
import { ButtonLink, Eyebrow, ProductCard, SplitHero, WhyBand } from "../ui";
import FeedbackSection from "../FeedbackSection";

const HERO_FEATURES = [
  { icon: Feather, label: "Nguyên liệu vùng cao" },
  { icon: Gem, label: "Chất lượng tuyển chọn" },
  { icon: Gift, label: "Phù hợp làm quà biếu" },
  { icon: Truck, label: "Giao hàng toàn quốc" },
];

export default function ProductsPage() {
  const { products } = useShop();
  useDocumentSeo((ctx) => productsMeta(ctx, products.map((product) => toSeoProductInput(product))), [products]);
  const [params, setParams] = useSearchParams();
  const requested = params.get("loc") as ProductFilter | null;
  const filter: ProductFilter = requested && PRODUCT_FILTERS.includes(requested) ? requested : "Tất cả";
  const query = normalizeSearch(params.get("q") ?? "");

  const visible = (products as StorefrontProduct[]).filter((product) => {
    const inFilter = filter === "Tất cả" || product.filters?.includes(filter);
    const inQuery = !query || normalizeSearch(`${product.name} ${product.description} ${product.category}`).includes(query);
    return inFilter && inQuery;
  });

  const choose = (next: ProductFilter) => {
    const updated = new URLSearchParams(params);
    if (next === "Tất cả") updated.delete("loc");
    else updated.set("loc", next);
    setParams(updated, { replace: true });
  };

  return (
    <main className="sf-page sf-products-page">
      <SplitHero className="sf-products-hero" scene="painted" image={MEDIA.productsHero} focus="center" alt="Bộ đặc sản A SỈN trên bàn gỗ trước ruộng bậc thang và núi rừng Tây Bắc">
        <Eyebrow>Sản phẩm</Eyebrow>
        <h1 className="sf-script-display is-xl">
          Đặc sản được chọn lọc
          <br />
          từ núi rừng Tây Bắc
        </h1>
        <p className="sf-lead">
          Tinh hoa ẩm thực vùng cao, được A SỈN tuyển chọn kỹ lưỡng từ những bản làng Tây Bắc, mang đến hương vị nguyên bản và chất lượng cao nhất.
        </p>
        <ul className="sf-hero-features">
          {HERO_FEATURES.map(({ icon: Icon, label }) => (
            <li key={label}>
              <Icon aria-hidden="true" strokeWidth={1.3} />
              <span>{label}</span>
            </li>
          ))}
        </ul>
      </SplitHero>

      <section className="sf-section sf-container sf-deco is-sides" id="danh-sach">
        <Eyebrow>Danh sách sản phẩm</Eyebrow>
        <div className="sf-chips" role="toolbar" aria-label="Lọc sản phẩm">
          {PRODUCT_FILTERS.map((item) => (
            <button key={item} type="button" className="sf-chip" aria-pressed={filter === item} onClick={() => choose(item)}>
              {item}
            </button>
          ))}
        </div>
        {query && <p className="sf-result-note">Kết quả cho “{params.get("q")}” · {visible.length} sản phẩm</p>}
        <div className="sf-product-grid">
          {visible.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
        {!visible.length && <p className="sf-empty">Chưa có sản phẩm trong mục này. Hãy thử mục khác nhé.</p>}
      </section>

      <section className="sf-gift-highlight sf-deco is-pattern">
        <div className="sf-container sf-gift-highlight-grid">
          <div>
            <Eyebrow>Hộp quà đặc biệt</Eyebrow>
            <h2 className="sf-garamond-title is-wine">
              Món quà tinh hoa
              <br />
              từ núi rừng Tây Bắc
            </h2>
            <p className="sf-body">
              Kết tinh những đặc sản trứ danh, hộp quà A SỈN là món quà ý nghĩa dành tặng người thân, đối tác. Chỉn chu trong từng chi tiết, đậm đà hương vị núi rừng.
            </p>
            <ButtonLink to="/thiet-ke" className="is-gold">Khám phá hộp quà</ButtonLink>
          </div>
          <figure className="sf-gift-highlight-media" data-reveal="photo">
            <img src={MEDIA.giftOpen} alt="Hộp quà A SỈN mở với thịt gác bếp, chẩm chéo và lạp xưởng" loading="lazy" width={800} height={800} />
          </figure>
          <ul className="sf-gift-benefits">
            {[{ icon: Gift, text: "Thiết kế sang trọng, đậm bản sắc Tây Bắc" }, { icon: Feather, text: "Sản phẩm tuyển chọn, chất lượng cao" }, { icon: UsersRound, text: "Phù hợp làm quà tặng cho nhiều dịp" }, { icon: Truck, text: "Giao hàng toàn quốc, đóng gói cẩn thận" }].map(({ icon: Icon, text }) => <li key={text}><Icon aria-hidden="true" strokeWidth={1.3} /><span>{text}</span></li>)}
          </ul>
        </div>
      </section>

      <WhyBand />

      <FeedbackSection reviews={TESTIMONIALS_PRODUCTS} compact />
    </main>
  );
}
