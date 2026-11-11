import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Icon } from "../../icons";
import { money } from "../../format";
import { useSiteProducts, findProduct } from "../../data";
import { ProductCard } from "../../ProductCard";
import { productDetail } from "../../../storefront/productDetails";
import { useSiteCart } from "../../commerce/useSiteCart";
import { motionAllowed } from "../../motion/preference";
import { useCatalog } from "../../../CatalogContext";
import { useDocumentSeo } from "../../../hooks/useDocumentSeo";
import { noindexMeta, productMeta } from "../../../seo/meta";
import { toSeoProductInput } from "../../../seo/product";
import { trackEvent } from "../../../analytics";
import { ecommerceParams, productAnalyticsItem } from "../../../analyticsItems";

const ModelStage = lazy(() => import("../../../storefront/three/ModelStage"));

const animateCatalogSwap = (target: HTMLElement): Animation | undefined => {
  if (!motionAllowed()) return undefined;
  return target.animate?.(
    [
      { opacity: 0.35, transform: "translateY(7px)" },
      { opacity: 1, transform: "translateY(0)" },
    ],
    { duration: 300, easing: "cubic-bezier(.22, .7, .25, 1)" }
  );
};

export function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const products = useSiteProducts();
  const product = findProduct(products, slug);
  const { loading } = useCatalog();
  useDocumentSeo(
    (ctx) => (product ? productMeta(ctx, toSeoProductInput(product)) : loading ? null : noindexMeta(ctx, "Sản phẩm chưa có — A Sỉn")),
    [product, loading],
    !loading || Boolean(product),
  );
  useEffect(() => {
    if (product) trackEvent("view_item", ecommerceParams([productAnalyticsItem(product)]));
  }, [product?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const { addToCart } = useSiteCart();
  const [quantity, setQuantity] = useState(1);
  const [activeTabKey, setActiveTabKey] = useState<"description" | "usage" | "storage" | "delivery" | "feedback">("description");
  const [showModel, setShowModel] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const tabPanelRef = useRef<HTMLDivElement>(null);
  const tabMotionRef = useRef<Animation | undefined>(undefined);

  if (!product) {
    return (
      <section className="section">
        <div className="wrap pg-not-found">
          <p className="eyebrow">A SỈN</p>
          <h1 className="pg-title">Chưa tìm thấy đặc sản này.</h1>
          <a className="btn dark" href="/san-pham">
            Khám phá các món khác <Icon name="arrow" />
          </a>
        </div>
      </section>
    );
  }

  const available = product.inStock !== false;
  const gallery = [product.image, ...(product.gallery || [])]
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i);

  const detail = productDetail(product);
  const paragraphs = detail.intro;

  const tabSections = {
    description: (
      <>
        <h3>Đậm hương vị, trọn câu chuyện.</h3>
        {paragraphs.filter(Boolean).map((line, i) => (
          <p key={i}>{line}</p>
        ))}
        {detail.ingredients && (
          <div className="detail-note">
            <span>THÀNH PHẦN</span>
            <p>{Array.isArray(detail.ingredients) ? detail.ingredients.join(" · ") : detail.ingredients}</p>
          </div>
        )}
      </>
    ),
    usage: (
      <>
        <h3>Thưởng thức theo cách của bạn.</h3>
        <p>Xem hướng dẫn sử dụng trên nhãn sản phẩm. Thưởng thức cùng các món ăn phù hợp với khẩu vị của bạn.</p>
        <a href="/san-pham/cham-cheo" className="pg-text-link">
          Khám phá chẩm chéo <Icon name="arrow" />
        </a>
      </>
    ),
    storage: (
      <>
        <h3>Giữ trọn hương vị.</h3>
        <p>
          {detail.storage
            ? detail.storage.map((s) => `${s.title || ""}: ${s.items?.map((i) => `${i.label || ""} ${i.text || ""}`).join(" ")}`).join(" ")
            : "Bảo quản và sử dụng theo hướng dẫn trên bao bì. Kiểm tra hạn sử dụng trước khi dùng."}
        </p>
      </>
    ),
    delivery: (
      <>
        <h3>Một món ngon, gửi đến tận nơi.</h3>
        <p>Website A SỈN hiện giới thiệu giao hàng toàn quốc và đổi trả trong 7 ngày. Điều kiện áp dụng cần được đối chiếu với chính sách và xác nhận khi đặt hàng.</p>
        <p className="pg-caption">Bản thiết kế xem trước chưa kết nối dịch vụ vận chuyển hay hệ thống tiếp nhận đơn hàng.</p>
      </>
    ),
    feedback: (
      <>
        <h3>Một lời chia sẻ về hương vị.</h3>
        <p>Bạn đã thử món này? Hãy kể cho A SỈN nghe về hương vị, cách thưởng thức hoặc trải nghiệm khi nhận hàng.</p>
        <a href="/lien-he" className="pg-text-link">
          Chia sẻ trải nghiệm ↗
        </a>
      </>
    ),
  };

  const handleTabChange = (key: "description" | "usage" | "storage" | "delivery" | "feedback") => {
    if (key === activeTabKey) return;
    setActiveTabKey(key);
    if (tabPanelRef.current) {
      tabMotionRef.current?.cancel();
      tabMotionRef.current = animateCatalogSwap(tabPanelRef.current);
    }
  };

  const handleAddToCart = () => {
    addToCart(product.slug, quantity, { openCart: true });
  };

  const updateQuantity = (newValue: number) => {
    const value = Math.max(1, Math.min(99, newValue));
    setQuantity(value);
  };

  return (
    <>
      <section className="detail-section">
        <div className="wrap">
          <nav className="pg-crumb" aria-label="Đường dẫn">
            <a href="/">Trang chủ</a>
            <span>/</span>
            <a href="/san-pham">Đặc sản</a>
            <span>/</span>
            <span aria-current="page">{product.name}</span>
          </nav>

          <div className="detail-main">
            <div className="detail-gallery">
              <div className="detail-main-image">
                {showModel && product.giftModel ? (
                  <Suspense fallback={<div className="detail-model-loading">Đang tải mô hình 3D...</div>}>
                    <ModelStage
                      items={[{ key: product.slug, url: product.giftModel, position: [0, 0, 0] }]}
                      fitKey={product.slug}
                      label=""
                      interactive
                      autoRotate
                      className="detail-product-model"
                    />
                  </Suspense>
                ) : (
                  <img src={gallery[currentImageIndex] || ""} alt={`${product.name} — ảnh sản phẩm`} fetchPriority="high" />
                )}
                <button
                  type="button"
                  className="detail-zoom"
                  aria-label="Phóng to ảnh sản phẩm"
                  onClick={() => {
                    const dialog = document.createElement("dialog");
                    dialog.className = "pg-lightbox";
                    dialog.setAttribute("aria-label", `Ảnh phóng to ${product.name}`);
                    dialog.innerHTML = `<button type="button" aria-label="Đóng ảnh phóng to"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="1.5"/></svg></button><img src="${gallery[currentImageIndex] || ""}" alt="${product.name}">`;
                    document.body.appendChild(dialog);
                    dialog.showModal();
                    dialog.querySelector("button")?.addEventListener("click", () => dialog.close());
                    dialog.addEventListener("click", (e) => {
                      if (e.target === dialog) dialog.close();
                    });
                    dialog.addEventListener("close", () => dialog.remove());
                  }}
                  hidden={showModel}
                >
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M9 4H4v5m11-5h5v5M4 15v5h5m6 0h5v-5" stroke="currentColor" strokeWidth="1.3" />
                  </svg>
                </button>
                <span className="detail-image-caption">A SỈN · ĐẶC SẢN TÂY BẮC</span>
              </div>

              <div className="detail-thumbnails" role="group" aria-label="Chọn ảnh sản phẩm">
                {gallery.map((src, i) => (
                  <button
                    key={i}
                    type="button"
                    data-gallery={i}
                    aria-pressed={i === currentImageIndex}
                    aria-label={`Xem ảnh ${i + 1}`}
                    onClick={() => {
                      setCurrentImageIndex(i);
                      setShowModel(false);
                    }}
                  >
                    <img src={src} alt="" loading="lazy" />
                  </button>
                ))}
                {product.giftModel && (
                  <button
                    type="button"
                    className="detail-model-thumb"
                    data-model-view
                    aria-pressed={showModel}
                    aria-label="Xem mô hình 3D sản phẩm"
                    onClick={() => setShowModel(!showModel)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Zm0 0v9m0 9v-9m-8-4.5L12 12l8-4.5"
                        stroke="currentColor"
                        strokeWidth="1.2"
                      />
                    </svg>
                    <span>3D</span>
                  </button>
                )}
              </div>
            </div>

            <div className="detail-info">
              <p className="eyebrow">{product.category || "ĐẶC SẢN VÙNG CAO"}</p>
              <h1>{product.name}</h1>
              <p className="detail-subtitle">{product.description || "Hương vị Tây Bắc, gói ghém gửi trao."}</p>

              <div className="detail-price">
                {money(product.price)}
                <span>Giá tham khảo · {product.weight || "Xem quy cách trên bao bì"}</span>
              </div>

              <div className="detail-stock" data-available={available}>
                <span aria-hidden="true" />
                {available ? "Có trong danh mục" : "Tạm hết hàng"}
              </div>

              <div className="detail-order-row">
                <div className="detail-quantity" aria-label="Số lượng sản phẩm">
                  <button
                    type="button"
                    data-detail-minus
                    aria-label="Giảm số lượng"
                    disabled={quantity === 1}
                    onClick={() => updateQuantity(quantity - 1)}
                  >
                    −
                  </button>
                  <output aria-live="polite">{quantity}</output>
                  <button
                    type="button"
                    data-detail-plus
                    aria-label="Tăng số lượng"
                    disabled={quantity === 99 || !available}
                    onClick={() => updateQuantity(quantity + 1)}
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  className="btn dark detail-add"
                  disabled={!available}
                  onClick={handleAddToCart}
                >
                  Thêm vào giỏ <Icon name="arrow" />
                </button>
              </div>

              {available && (
                <a href="/thanh-toan" className="btn outline detail-buy">
                  Chọn và tiếp tục <Icon name="arrow" />
                </a>
              )}

              {available && ["bag", "jar"].includes(product.giftSlot || "") && (
                <a className="detail-gift-link" href={`/thiet-ke?san-pham=${encodeURIComponent(product.slug)}`}>
                  Gói món này vào hộp quà <Icon name="arrow" />
                </a>
              )}

              <div className="detail-assurances">
                <div>
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M12 3 4.5 6v6c0 4.5 7.5 9 7.5 9s7.5-4.5 7.5-9V6L12 3Z"
                      stroke="currentColor"
                      strokeWidth="1.2"
                    />
                    <path d="m8 12 3 3 5-6" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                  <span>
                    Thông tin
                    <br />
                    rõ ràng
                  </span>
                </div>
                <div>
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M3 6h11v11H3zM14 10h4l3 4v3h-7M6.5 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM17.5 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
                      stroke="currentColor"
                      strokeWidth="1.2"
                    />
                  </svg>
                  <span>
                    Giao hàng
                    <br />
                    toàn quốc
                  </span>
                </div>
                <div>
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M3 8h18v13H3zM2 4h20v4H2zM12 4v17M12 4C8-2 3 1 7 4h5Zm0 0c4-6 9-3 5 0h-5Z"
                      stroke="currentColor"
                      strokeWidth="1.2"
                    />
                  </svg>
                  <span>
                    Chỉn chu
                    <br />
                    khi gửi trao
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="detail-description">
        <div className="wrap detail-description-grid">
          <div className="detail-tab-nav" role="tablist" aria-orientation="vertical" aria-label="Thông tin sản phẩm">
            {(
              [
                ["description", "Câu chuyện sản phẩm"],
                ["usage", "Cách thưởng thức"],
                ["storage", "Bảo quản"],
                ["delivery", "Giao hàng & đổi trả"],
                ["feedback", "Phản hồi"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                id={`detail-tab-${key}`}
                aria-selected={key === activeTabKey}
                aria-controls="detail-tab-panel"
                data-detail-tab={key}
                onClick={() => handleTabChange(key)}
              >
                {label}
                <span>↗</span>
              </button>
            ))}
          </div>
          <div id="detail-tab-panel" className="detail-tab-panel" role="tabpanel" tabIndex={0} aria-labelledby={`detail-tab-${activeTabKey}`} ref={tabPanelRef}>
            {tabSections[activeTabKey]}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <div>
              <p className="eyebrow">THÊM MỘT CHÚT ĐẬM ĐÀ</p>
              <h2 className="pg-section-title">
                Cùng nhau, <em>trọn vị hơn.</em>
              </h2>
            </div>
            <a className="pg-text-link" href="/san-pham">
              Tất cả đặc sản <Icon name="arrow" />
            </a>
          </div>
          <div className="catalog-grid detail-related">
            {products
              .filter((item) => item.slug !== product.slug)
              .slice(0, 3)
              .map((p) => (
                <ProductCard key={p.slug} product={p} />
              ))}
          </div>
        </div>
      </section>

      {available && (
        <div className="detail-mobile-buy">
          <div>
            <strong>{product.name}</strong>
            <span data-detail-mobile-total>{quantity === 1 ? money(product.price) : `${quantity} × ${money(product.price)}`}</span>
          </div>
          <button className="btn dark" type="button" onClick={handleAddToCart}>
            Thêm vào giỏ <Icon name="arrow" />
          </button>
        </div>
      )}
    </>
  );
}
