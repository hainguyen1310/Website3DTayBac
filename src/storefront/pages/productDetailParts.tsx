import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Leaf, Mountain, Beef, Wind, ZoomIn } from "lucide-react";
import type { StorefrontProduct } from "../products";
import { cookingVideoUrl } from "../productDetails";
import type { Feature, ProductDetail } from "../productDetails";
import { Lightbox, ProductCard, Testimonial } from "../ui";

const ModelStage = lazy(() => import("../three/ModelStage"));

type View = number | "3d";

/** Ảnh lớn + dải thumbnail có nút trái/phải, phóng to và xem 3D (Figma 07). */
export function ProductGallery({ product, images }: { product: StorefrontProduct; images: string[] }) {
  const [view, setView] = useState<View>(0);
  const [zoomed, setZoomed] = useState(false);
  const strip = useRef<HTMLDivElement>(null);
  const stageItems = product.giftModel ? [{ key: product.id, url: product.giftModel, position: [0, 0, 0] as [number, number, number] }] : [];
  const count = images.length;
  const step = (delta: number) => {
    const current = view === "3d" ? count : view;
    const next = (current + delta + count + (product.giftModel ? 1 : 0)) % (count + (product.giftModel ? 1 : 0));
    setView(next === count ? "3d" : next);
  };
  useEffect(() => {
    const active = strip.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    active?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [view]);

  return (
    <div className="sf-gallery">
      <div className="sf-gallery-stage">
        {view === "3d" ? (
          <Suspense fallback={<div className="sf-stage"><p className="sf-stage-status">Đang chuẩn bị 3D…</p></div>}>
            <ModelStage items={stageItems} fitKey={product.id} label={`Mô hình 3D ${product.name}`} autoRotate viewDirection={[0.4, 0.9, 1]} />
          </Suspense>
        ) : (
          <>
            <img src={images[view] ?? product.image} alt={product.name} width={900} height={900} fetchPriority="high" />
            <button type="button" className="sf-gallery-zoom" aria-label="Phóng to ảnh" onClick={() => setZoomed(true)}>
              <ZoomIn size={18} />
            </button>
          </>
        )}
      </div>
      <div className="sf-gallery-strip">
        <button type="button" className="sf-gallery-arrow" aria-label="Ảnh trước" onClick={() => step(-1)}><ChevronLeft size={18} /></button>
        <div className="sf-gallery-thumbs" role="tablist" aria-label="Hình ảnh sản phẩm" ref={strip}>
          {images.map((image, index) => (
            <button key={image} type="button" role="tab" aria-selected={view === index} aria-label={`Ảnh ${index + 1}`} onClick={() => setView(index)}>
              <img src={image} alt="" loading="lazy" width={160} height={160} />
            </button>
          ))}
          {product.giftModel && (
            <button type="button" role="tab" aria-selected={view === "3d"} className="is-3d" onClick={() => setView("3d")}>
              3D
            </button>
          )}
        </div>
        <button type="button" className="sf-gallery-arrow" aria-label="Ảnh sau" onClick={() => step(1)}><ChevronRight size={18} /></button>
      </div>
      {zoomed && typeof view === "number" && <Lightbox src={images[view]} alt={product.name} onClose={() => setZoomed(false)} />}
    </div>
  );
}

const FEATURE_ICONS: Record<Feature["icon"], ReactNode> = {
  meat: <Beef size={22} strokeWidth={1.4} />,
  leaf: <Leaf size={22} strokeWidth={1.4} />,
  smoke: <Wind size={22} strokeWidth={1.4} />,
  mountain: <Mountain size={22} strokeWidth={1.4} />,
};

type Review = { quote: string; name: string };
type TabId = "desc" | "ingredients" | "usage" | "storage" | "reviews";

export function ProductTabs({ product, detail, reviews, youtube }: { product: StorefrontProduct; detail: ProductDetail; reviews: Review[]; youtube?: string }) {
  const tabs: { id: TabId; label: string }[] = [
    { id: "desc", label: "Mô tả sản phẩm" },
    ...(detail.ingredients ? [{ id: "ingredients" as const, label: "Thành phần" }] : []),
    { id: "usage", label: "Cách sử dụng" },
    ...(detail.storage ? [{ id: "storage" as const, label: "Bảo quản" }] : []),
    { id: "reviews", label: `Đánh giá (${reviews.length})` },
  ];
  const [active, setActive] = useState<TabId>("desc");
  useEffect(() => setActive("desc"), [product.id]);

  return (
    <section className="sf-product-tabs sf-deco is-terraces" aria-label="Thông tin sản phẩm">
      <div className="sf-container">
        <div className="sf-tablist" role="tablist">
          {tabs.map((tab) => (
            <button key={tab.id} type="button" role="tab" id={`tab-${tab.id}`} aria-selected={active === tab.id} aria-controls={`panel-${tab.id}`} onClick={() => setActive(tab.id)}>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="sf-tabpanel" role="tabpanel" id={`panel-${active}`} aria-labelledby={`tab-${active}`}>
          <div className="sf-tabpanel-main">
            {active === "desc" && (
              <>
                <h2>Giới thiệu sản phẩm</h2>
                {detail.intro.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </>
            )}
            {active === "ingredients" && (
              <>
                <h2>Thành phần</h2>
                <p>{detail.ingredients}</p>
              </>
            )}
            {active === "usage" && (
              <>
                <h2>Cách sử dụng</h2>
                <p>{detail.isMeat ? "Dùng ngay như món nhắm, hoặc hấp/nướng sơ 3–5 phút cho thịt mềm và dậy mùi khói. Chấm cùng chẩm chéo để trọn vị Tây Bắc." : "Dùng trực tiếp hoặc kết hợp cùng các món nướng, món luộc của bữa cơm gia đình."}</p>
                <a className="sf-button is-outline" href={cookingVideoUrl(product, youtube)} target="_blank" rel="noopener noreferrer">
                  Xem video hướng dẫn trên YouTube <span aria-hidden="true">↗</span>
                </a>
              </>
            )}
            {active === "storage" && detail.storage && (
              <>
                <h2>Bảo quản</h2>
                {detail.storage.map((group) => (
                  <div key={group.title} className="sf-storage">
                    <h3>{group.title}</h3>
                    <ul>
                      {group.items.map((item) => <li key={item.label}><strong>{item.label}:</strong> {item.text}</li>)}
                    </ul>
                  </div>
                ))}
              </>
            )}
            {active === "reviews" && (
              <>
                <h2>Khách hàng nói về A SỈN</h2>
                <div className="sf-review-list">
                  {reviews.map((review) => <Testimonial key={review.name + review.quote} {...review} compact />)}
                </div>
              </>
            )}
          </div>
          <ul className="sf-feature-card">
            {detail.features.map((feature) => (
              <li key={feature.title}>
                <span aria-hidden="true">{FEATURE_ICONS[feature.icon]}</span>
                <div>
                  <h3>{feature.title}</h3>
                  <p>{feature.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/** Dải sản phẩm liên quan, cuộn ngang có nút trái/phải. */
export function RelatedCarousel({ products, title, link }: { products: StorefrontProduct[]; title: ReactNode; link: ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  const scroll = (direction: number) => {
    const element = track.current;
    if (!element) return;
    element.scrollBy({ left: direction * element.clientWidth * 0.8, behavior: "smooth" });
  };
  return (
    <section className="sf-related sf-deco is-pattern">
      <div className="sf-container">
        <div className="sf-section-head">
          {title}
          {link}
        </div>
        <div className="sf-related-frame">
          <button type="button" className="sf-gallery-arrow" aria-label="Sản phẩm trước" onClick={() => scroll(-1)}><ChevronLeft size={18} /></button>
          <div className="sf-related-track" ref={track}>
            {products.map((item) => <ProductCard key={item.id} product={item} />)}
          </div>
          <button type="button" className="sf-gallery-arrow" aria-label="Sản phẩm sau" onClick={() => scroll(1)}><ChevronRight size={18} /></button>
        </div>
      </div>
    </section>
  );
}
