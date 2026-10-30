import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Award, ShoppingCart, Truck, PackageCheck } from "lucide-react";
import { money } from "../../catalog";
import { useCatalog } from "../../CatalogContext";
import { useShop } from "../../ShopContext";
import { useWebsite } from "../../WebsiteContext";
import { useDocumentSeo } from "../../hooks/useDocumentSeo";
import { noindexMeta, productMeta } from "../../seo/meta";
import { toSeoProductInput } from "../../seo/product";
import { trackEvent } from "../../analytics";
import { ecommerceParams, productAnalyticsItem } from "../../analyticsItems";
import { TESTIMONIALS_HOME, TESTIMONIALS_PRODUCTS } from "../content";
import { productDetail } from "../productDetails";
import type { StorefrontProduct } from "../products";
import { ButtonLink, Stars, WhyBand } from "../ui";
import { ProductGallery, ProductTabs, RelatedCarousel } from "./productDetailParts";

const REVIEWS = [...TESTIMONIALS_PRODUCTS, ...TESTIMONIALS_HOME];

const ASSURANCES = [
  { icon: <Award size={22} strokeWidth={1.4} />, text: "Đảm bảo chất lượng" },
  { icon: <Truck size={22} strokeWidth={1.4} />, text: "Giao hàng toàn quốc" },
  { icon: <PackageCheck size={22} strokeWidth={1.4} />, text: "Đổi trả trong 7 ngày" },
];

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { loading } = useCatalog();
  const { content } = useWebsite();
  const { products, addProduct, setCartOpen } = useShop();
  const product = products.find((item) => item.id === slug) as StorefrontProduct | undefined;
  const [quantity, setQuantity] = useState(1);

  useDocumentSeo(
    (ctx) => (product ? productMeta(ctx, toSeoProductInput(product)) : loading ? null : noindexMeta(ctx, "Sản phẩm chưa có — A SỈN")),
    [product, loading],
    !loading || Boolean(product),
  );
  useEffect(() => {
    setQuantity(1);
    if (product) trackEvent("view_item", ecommerceParams([productAnalyticsItem(product)]));
  }, [product?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const related = useMemo(() => {
    const all = (products as StorefrontProduct[]).filter((item) => item.id !== slug);
    const similar = all.filter((item) => item.filters?.some((filter) => product?.filters?.includes(filter)));
    return [...similar, ...all.filter((item) => !similar.includes(item))].slice(0, 8);
  }, [products, product, slug]);

  if (!product) {
    return (
      <main className="sf-page sf-container sf-not-found">
        <h1 className="sf-script-title">{loading ? "Đang tìm sản phẩm…" : "Sản phẩm này chưa có ở đây"}</h1>
        {!loading && <ButtonLink to="/san-pham">Xem các đặc sản khác</ButtonLink>}
      </main>
    );
  }

  const detail = productDetail(product);
  const images = [product.image, ...(product.gallery ?? [])];
  const soldOut = product.inStock === false;
  const buyNow = () => {
    addProduct(product.id, quantity);
    setCartOpen(true);
  };

  return (
    <main className="sf-page sf-product-page">
      <section className="sf-product-hero sf-deco is-hero-art">
        <div className="sf-container">
          <nav className="sf-breadcrumb" aria-label="Breadcrumb">
            <Link to="/">Trang chủ</Link> <span aria-hidden="true">›</span> <Link to="/san-pham">Sản phẩm</Link> <span aria-hidden="true">›</span> <span aria-current="page">{product.name}</span>
          </nav>
          <div className="sf-detail-grid">
            <ProductGallery key={product.id} product={product} images={images} />
            <div className="sf-detail-info">
              <p className="sf-detail-category">{product.category}</p>
              <h1>{product.name}</h1>
              <p className="sf-detail-rating"><Stars /> <span>({REVIEWS.length} đánh giá)</span></p>
              <div className="sf-detail-price">
                <strong>{money(product.price)}</strong>
                <span className={soldOut ? "is-out" : ""}>{soldOut ? "Tạm hết hàng" : product.inStock ? "Còn hàng" : "Đặt trước"}</span>
              </div>
              <p className="sf-detail-desc">{detail.intro[0]}</p>
              <p className="sf-detail-meta">{product.weight} · Xuất xứ {product.origin.toLowerCase().replace(/^./, (c) => c.toUpperCase())}</p>
              <div className="sf-detail-qty">
                <span>Số lượng</span>
                <div className="sf-qty">
                  <button type="button" aria-label="Giảm số lượng" disabled={quantity <= 1} onClick={() => setQuantity(quantity - 1)}>−</button>
                  <span aria-live="polite">{quantity}</span>
                  <button type="button" aria-label="Tăng số lượng" disabled={quantity >= 20} onClick={() => setQuantity(quantity + 1)}>+</button>
                </div>
              </div>
              <div className="sf-detail-buy">
                <button type="button" className="sf-button is-outline" disabled={soldOut} onClick={() => addProduct(product.id, quantity)}>
                  <ShoppingCart size={16} strokeWidth={1.6} /> Thêm vào giỏ hàng
                </button>
                <button type="button" className="sf-button is-primary" disabled={soldOut} onClick={buyNow}>Mua ngay</button>
              </div>
              <ul className="sf-assurances">
                {ASSURANCES.map((item) => (
                  <li key={item.text}><span aria-hidden="true">{item.icon}</span>{item.text}</li>
                ))}
              </ul>
              {product.giftSlot && <Link to="/thiet-ke" className="sf-text-link sf-detail-gift">Gói món này vào hộp quà 3D →</Link>}
            </div>
          </div>
        </div>
      </section>

      <ProductTabs product={product} detail={detail} reviews={REVIEWS} youtube={content["social.youtube"]} />

      {related.length > 0 && (
        <RelatedCarousel
          products={related}
          title={<h2 className="sf-related-title">Sản phẩm liên quan</h2>}
          link={<Link to="/san-pham" className="sf-text-link">Xem tất cả →</Link>}
        />
      )}
      <WhyBand />
    </main>
  );
}
