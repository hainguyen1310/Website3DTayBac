import { useSearchParams } from "react-router-dom";
import { useShop } from "../../ShopContext";
import { useDocumentSeo } from "../../hooks/useDocumentSeo";
import { productsMeta } from "../../seo/meta";
import { normalizeSearch } from "../../search";
import { toSeoProductInput } from "../../seo/product";
import { MEDIA, TESTIMONIALS_PRODUCTS } from "../content";
import { PRODUCT_FILTERS } from "../products";
import type { ProductFilter, StorefrontProduct } from "../products";
import { ButtonLink, Contours, Eyebrow, ProductCard, SplitHero, Testimonial, WhyBand } from "../ui";

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
    <main className="sf-page">
      <SplitHero contours={MEDIA.contours.hero} image={MEDIA.productsHero} alt="Lạp xưởng gác bếp bày trên mẹt tre" caption="Lạp xưởng gác bếp · Bắc Hà">
        <Eyebrow>Khám phá đặc sản</Eyebrow>
        <h1 className="sf-script-display is-xl">
          Đặc sản được chọn lọc
          <br />
          từ núi rừng Tây Bắc
        </h1>
        <p className="sf-lead">
          Tinh hoa ẩm thực vùng cao được A SỈN tuyển chọn kỹ lưỡng từ những bản làng Tây Bắc, mang đến hương vị nguyên bản.
        </p>
        <a href="#danh-sach" className="sf-button is-primary">Khám phá sản phẩm <span aria-hidden="true">→</span></a>
      </SplitHero>

      <section className="sf-section sf-container" id="danh-sach">
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

      <section className="sf-gift-highlight">
        <div className="sf-container sf-split">
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
            <ButtonLink to="/thiet-ke">Khám phá hộp quà</ButtonLink>
          </div>
          <figure className="sf-media-frame is-poster">
            <img src={MEDIA.giftPoster} alt="Hộp quà đặc sản Tây Bắc Sinh Lộc" loading="lazy" width={860} height={504} />
          </figure>
        </div>
      </section>

      <WhyBand />

      <section className="sf-section sf-container sf-products-testimonials">
        <Contours src={MEDIA.contours.productsBottom} className="sf-bottom-contours" />
        <Eyebrow>Khách hàng nói về A SỈN</Eyebrow>
        <h2 className="sf-garamond-title is-wine">Những trải nghiệm thật từ khách hàng</h2>
        <div className="sf-testimonials">
          {TESTIMONIALS_PRODUCTS.map((item) => <Testimonial key={item.name} {...item} compact />)}
        </div>
      </section>
    </main>
  );
}
