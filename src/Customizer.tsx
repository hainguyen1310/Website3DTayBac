import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Gift,
  Leaf,
  RotateCcw,
  Save,
  ShoppingBag,
  X,
} from "lucide-react";
import {
  cleanDesign,
  colors,
  defaultDesign,
  giftPrice,
  money,
  patterns,
  readSaved,
  saveLocal,
  BOX_PRICE,
} from "./catalog";
import type { GiftDesign } from "./catalog";
import { useCatalog } from "./CatalogContext";
import { useShop } from "./ShopContext";
import GiftPreview from "./GiftPreview";
import { PageHero } from "./PageElements";
import { giftComponents } from "./giftSelection";
import { useDocumentSeo } from "./hooks/useDocumentSeo";
import { giftMeta } from "./seo/meta";

export default function Customizer() {
  useDocumentSeo((ctx) => giftMeta(ctx), []);
  const { products: catalogProducts, loading, error, reload, source } = useCatalog();
  const products = useMemo(() => giftComponents(catalogProducts), [catalogProducts]);
  const [design, setDesign] = useState<GiftDesign>({ ...defaultDesign, productIds: [] });
  const [restored, setRestored] = useState(false);
  const [step, setStep] = useState(0);
  const panelRef = useRef<HTMLElement>(null);
  const { addGift, notify } = useShop();
  const steps = ["Chọn sản vật", "Thêm sắc riêng", "Gửi lời thương"];
  const selectedProducts = products.filter(product => design.productIds.includes(product.id));
  const ready = restored && !loading && !error;
  const goToStep = (next: number) => {
    if (step === next) return;
    setStep(next);
    requestAnimationFrame(() => {
      panelRef.current?.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
      panelRef.current?.querySelector<HTMLElement>(".step-heading h2")?.focus({ preventScroll: true });
    });
  };
  const update = (change: Partial<GiftDesign>) =>
    setDesign((current) => ({ ...current, ...change }));
  useEffect(() => {
    if (restored) saveLocal("moc-design-v1", design);
  }, [design, restored]);
  // Danh mục đọc từ cơ sở dữ liệu có thể khác bản tĩnh: loại bỏ sản vật không còn bán.
  useEffect(() => {
    if (loading || source !== "database") return;
    if (!restored) {
      setDesign(cleanDesign(readSaved("moc-design-v1") ?? defaultDesign, products));
      setRestored(true);
      return;
    }
    setDesign((current) => cleanDesign(current, products));
  }, [products, loading, source, restored]);
  const toggleProduct = (id: string) => setDesign(current => ({
    ...current,
    productIds: current.productIds.includes(id)
      ? current.productIds.filter(p => p !== id)
      : current.productIds.length < 4 ? [...current.productIds, id] : current.productIds,
  }));
  return (
    <main className="customizer-page asin-customizer-page moc-page">
      <PageHero current="Thiết kế hộp quà" eyebrow="HỘP QUÀ A SỈN" title={"Món quà của bạn.\nCâu chuyện của riêng bạn."} description="Chọn những hương vị bạn yêu, thêm sắc màu và gửi một lời nhắn riêng đến người nhận." image="/images/asin/gift-reference.webp" alt="Minh họa hộp quà đặc sản A Sỉn"><a className="asin-read-link" href="#thiet-ke-hop-qua">Bắt đầu gói quà <ArrowRight size={17}/></a></PageHero>
      <div className="container" id="thiet-ke-hop-qua">
        <div className="customizer-grid">
          <section className="preview-panel" aria-label="Xem trước hộp quà">
            <div className="preview-top">
              <span>
                <span className="live-dot" /> XEM TRƯỚC TRỰC TIẾP
              </span>
              <span>Bản phối 2D</span>
            </div>
            <GiftPreview design={design} products={products} showProducts />
            <div className="preview-caption">
              <Leaf size={16} />
              <span>Một chiếc hộp nhỏ. Đong đầy sự quan tâm.</span>
            </div>
          </section>
          <section ref={panelRef} className="design-panel" aria-label="Tùy chỉnh hộp quà">
            <div className="stepper" aria-label="Các bước thiết kế">
              {steps.map((title, i) => (
                <button
                  key={title}
                  className={step === i ? "active" : ""}
                  onClick={() => goToStep(i)}
                  disabled={i > 0 && (!ready || !design.productIds.length)}
                  aria-current={step === i ? "step" : undefined}
                >
                  <span>{i < step ? <Check size={14} /> : `0${i + 1}`}</span>
                  <b>{title}</b>
                </button>
              ))}
            </div>
            {step === 0 && (
              <div className="step-content">
                <div className="step-heading">
                  <h2 tabIndex={-1}>Gói những điều bạn thích</h2>
                  <p>Chọn từ 1 đến 4 sản vật cho hộp quà của bạn.</p>
                </div>
                <div className="gift-selection-summary">
                  <div className="gift-selection-summary-heading"><h3>Trong hộp của bạn</h3><span>{design.productIds.length} / 4 món</span></div>
                  {selectedProducts.length > 0 && <ul className="gift-selected-items" aria-label="Sản vật đã chọn">
                    {selectedProducts.map(product => <li key={product.id}><img src={product.image} alt=""/><span>{product.name}</span><button aria-label={`Bỏ ${product.name} khỏi hộp`} onClick={() => toggleProduct(product.id)}><X size={15}/></button></li>)}
                  </ul>}
                  <p id="gift-selection-help" className="asin-selection-count" aria-live="polite">{design.productIds.length === 4 ? "Hộp đã đủ 4 món. Bỏ một món bên trên để chọn món khác." : selectedProducts.length ? `Bạn có thể chọn thêm ${4 - design.productIds.length} món.` : "Chọn món bên dưới để bắt đầu gói quà."}</p>
                </div>
                {loading || error || !products.length ? <div className="asin-builder-state" role={error ? "alert" : "status"}><p>{loading ? "Đang tải các sản vật…" : error ? "Chưa tải được sản phẩm. Hãy thử lại để tiếp tục chọn quà." : "A Sỉn đang chuẩn bị danh mục quà tặng."}</p>{error ? <button className="asin-button" onClick={() => void reload()}>Thử lại</button> : !loading && <Link className="asin-read-link" to="/lien-he">Nhờ A Sỉn tư vấn <ArrowRight size={16}/></Link>}</div> : null}
                <div className="product-choices">
                  {products.map((p) => (
                    <button
                      key={p.id}
                      className={`product-choice ${design.productIds.includes(p.id) ? "selected" : ""}`}
                      aria-pressed={design.productIds.includes(p.id)}
                      aria-label={`${design.productIds.includes(p.id) ? "Bỏ chọn" : "Chọn"} ${p.name}`}
                      aria-describedby="gift-selection-help"
                      disabled={!ready || (design.productIds.length >= 4 && !design.productIds.includes(p.id))}
                      onClick={() => toggleProduct(p.id)}
                    >
                      <img src={p.image} alt="" />
                      <span>
                        <strong>{p.name}</strong>
                        <small>{p.weight}</small>
                        <b>{money(p.price)}</b>
                      </span>
                      <span className="selection-check">
                        {design.productIds.includes(p.id) && (
                          <Check size={14} />
                        )}
                      </span>
                    </button>
                  ))}
                </div>
                <Link className="gift-ready-link" to="/san-pham">Tìm hộp quà phối sẵn? Xem tại cửa hàng <ArrowRight size={14}/></Link>
                <div className="packaging-note">
                  <Gift size={18} />
                  <span>
                    Hộp quà, ruy băng & thiệp viết lời thương{" "}
                    <b>{money(BOX_PRICE)}</b>
                  </span>
                </div>
              </div>
            )}
            {step === 1 && (
              <div className="step-content">
                <div className="step-heading">
                  <h2 tabIndex={-1}>Một sắc màu, một dấu ấn</h2>
                  <p>Lấy cảm hứng từ những điều bình dị của núi rừng.</p>
                </div>
                <fieldset>
                  <legend>
                    Màu hộp{" "}
                    <span>
                      {colors.find((c) => c.value === design.color)?.name}
                    </span>
                  </legend>
                  <div className="color-options">
                    {colors.map((c) => (
                      <button
                        key={c.value}
                        aria-label={c.name}
                        aria-pressed={design.color === c.value}
                        className={`color-option ${design.color === c.value ? "selected" : ""}`}
                        onClick={() => update({ color: c.value })}
                      >
                        <span style={{ background: c.value }}>
                          {design.color === c.value && <Check size={19} />}
                        </span>
                        <small>{c.name}</small>
                      </button>
                    ))}
                  </div>
                </fieldset>
                <fieldset>
                  <legend>Họa tiết trên hộp</legend>
                  <div className="pattern-options">
                    {patterns.map((p, i) => (
                      <button
                        key={p}
                        className={design.pattern === p ? "selected" : ""}
                        aria-pressed={design.pattern === p}
                        onClick={() => update({ pattern: p })}
                      >
                        <span className={`pattern-swatch swatch-${i}`} />
                        {p}
                        {design.pattern === p && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <div className="design-tip">
                  <Leaf size={19} />
                  <p>
                    Màu giấy và họa tiết giúp món quà kể một câu chuyện thật
                    riêng. Bạn có thể đổi lại bất cứ lúc nào.
                  </p>
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="step-content">
                <div className="step-heading">
                  <h2 tabIndex={-1}>Điều muốn nói, gửi cùng A Sỉn</h2>
                  <p>Một lời nhắn nhỏ khiến món quà thêm đáng nhớ.</p>
                </div>
                <label className="field-label" htmlFor="recipient">
                  Món quà dành tặng
                </label>
                <input
                  id="recipient"
                  value={design.recipient}
                  onChange={(e) => update({ recipient: e.target.value })}
                  maxLength={30}
                  placeholder="Tên người nhận"
                />
                <label className="field-label" htmlFor="gift-message">
                  Lời nhắn trên thiệp <span>{design.message.length}/90</span>
                </label>
                <textarea
                  id="gift-message"
                  rows={3}
                  maxLength={90}
                  value={design.message}
                  onChange={(e) => update({ message: e.target.value })}
                  placeholder="Viết một lời thương…"
                />
                <div className="message-suggestions">
                  {[
                    "Một chút bình yên, dành riêng cho bạn.",
                    "Cảm ơn vì luôn ở bên.",
                    "Gói chút an lành, gửi người thương.",
                  ].map((m) => (
                    <button key={m} onClick={() => update({ message: m })}>
                      {m}
                    </button>
                  ))}
                </div>
                <div className="gift-summary">
                  <h3>Trong món quà của bạn</h3>
                  {products
                    .filter((p) => design.productIds.includes(p.id))
                    .map((p) => (
                      <div key={p.id}>
                        <span>{p.name}</span>
                        <b>{money(p.price)}</b>
                      </div>
                    ))}
                  <div>
                    <span>Hộp, ruy băng & thiệp</span>
                    <b>{money(BOX_PRICE)}</b>
                  </div>
                </div>
              </div>
            )}
            <div className="design-bottom">
              <div className="design-price">
                <span>
                  Tổng hộp quà{" "}
                  <small>{design.productIds.length} sản vật đã chọn</small>
                </span>
                <strong>{money(giftPrice(design, products))}</strong>
              </div>
              {design.productIds.length === 0 && (
                <p className="field-error">
                  Chọn ít nhất một sản vật để hoàn thiện hộp quà.
                </p>
              )}
              <div className="step-actions">
                {step > 0 && (
                  <button
                    className="button button-outline back-step"
                    onClick={() => goToStep(step - 1)}
                    aria-label="Bước trước"
                  >
                    <ArrowLeft size={18} />
                  </button>
                )}
                {step < 2 ? (
                  <button
                    className="button button-green"
                    disabled={!ready || !design.productIds.length}
                    onClick={() => goToStep(step + 1)}
                  >
                    Tiếp tục <ArrowRight size={18} />
                  </button>
                ) : (
                  <button
                    className="button button-green"
                    disabled={!ready || !design.productIds.length}
                    onClick={() => addGift(design)}
                  >
                    <ShoppingBag size={18} /> Thêm hộp quà vào giỏ
                  </button>
                )}
              </div>
              <div className="design-tools">
                <button
                  onClick={() => {
                    const saved = saveLocal("moc-design-v1", design);
                    notify(
                      saved
                        ? "Đã lưu thiết kế trên thiết bị này."
                        : "Trình duyệt không cho phép lưu. Thiết kế vẫn dùng được trong phiên này.",
                    );
                  }}
                >
                  <Save size={14} /> Lưu thiết kế
                </button>
                <button
                  onClick={() => {
                    setDesign(cleanDesign(defaultDesign, products));
                    goToStep(0);
                    notify("Đã trở về mẫu thiết kế ban đầu.");
                  }}
                >
                  <RotateCcw size={14} /> Bắt đầu lại
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
