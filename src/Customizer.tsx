import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Gift, RotateCcw, Save, ShoppingBag, X } from "lucide-react";
import { boxSizes, cleanDesign, colors, defaultDesign, GIFT_CAPACITY, giftPrice, money, readSaved, saveLocal, BOX_PRICE } from "./catalog";
import type { GiftDesign } from "./catalog";
import { useCatalog } from "./CatalogContext";
import { useShop } from "./ShopContext";
import GiftPreview from "./GiftPreview";
import { PageHero } from "./PageElements";
import { giftComponents } from "./giftSelection";
import { useDocumentSeo } from "./hooks/useDocumentSeo";
import { giftMeta } from "./seo/meta";

const steps = ["Chọn size hộp", "Chọn màu hộp", "Chọn sản phẩm", "Chọn thiệp"];
const freshDesign: GiftDesign = { ...defaultDesign, productIds: [] };

export default function Customizer() {
  useDocumentSeo((ctx) => giftMeta(ctx), []);
  const { products: catalogProducts, loading, error, reload, source } = useCatalog();
  const products = useMemo(() => giftComponents(catalogProducts), [catalogProducts]);
  const [design, setDesign] = useState<GiftDesign>(freshDesign);
  const [restored, setRestored] = useState(false);
  const [step, setStep] = useState(0);
  const [rotation, setRotation] = useState(-18);
  const panelRef = useRef<HTMLElement>(null);
  const { addGift, notify } = useShop();
  const selectedProducts = products.filter(product => design.productIds.includes(product.id));
  const ready = restored && !loading && !error;
  const hasProducts = selectedProducts.length > 0;
  const cardValid = !design.includeCard || Boolean(design.message.trim());
  const hasUnavailable = selectedProducts.some(product => product.inStock === false);
  const goToStep = (next: number) => {
    if (step === next || (next === 3 && !hasProducts)) return;
    setStep(next);
    requestAnimationFrame(() => {
      panelRef.current?.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
      panelRef.current?.querySelector<HTMLElement>(".step-heading h2")?.focus({ preventScroll: true });
    });
  };
  const update = (change: Partial<GiftDesign>) => setDesign(current => ({ ...current, ...change }));
  useEffect(() => { if (restored) saveLocal("moc-design-v1", design); }, [design, restored]);
  useEffect(() => {
    if (loading || source !== "database") return;
    if (!restored) {
      setDesign(cleanDesign(readSaved("moc-design-v1") ?? freshDesign, products));
      setRestored(true);
      return;
    }
    setDesign(current => cleanDesign(current, products));
  }, [products, loading, source, restored]);
  const toggleProduct = (id: string) => setDesign(current => ({
    ...current,
    productIds: current.productIds.includes(id)
      ? current.productIds.filter(item => item !== id)
      : current.productIds.length < GIFT_CAPACITY ? [...current.productIds, id] : current.productIds,
  }));
  const sizeName = boxSizes.find(item => item.value === design.size)?.name;
  const colorName = colors.find(item => item.value === design.color)?.name;

  return <main className="customizer-page asin-customizer-page moc-page">
    <PageHero current="Hộp quà 3D" eyebrow="HỘP QUÀ 3D CÁ NHÂN HÓA" title={"Chọn từng sản vật.\nGói món quà của riêng bạn."} description="Chọn size hộp, màu hộp, sản phẩm bên trong và quyết định có viết thiệp hay không." image="/images/asin/gift-reference.webp" alt="Hộp quà đặc sản A Sỉn"><a className="asin-read-link" href="#thiet-ke-hop-qua">Bắt đầu chọn hộp quà <ArrowRight size={17}/></a></PageHero>
    <div className="container" id="thiet-ke-hop-qua">
      <div className="customizer-grid">
        <section className="preview-panel" aria-label="Xem trước hộp quà">
          <div className="preview-top"><span><span className="live-dot" /> XEM TRƯỚC HỘP QUÀ</span><span>{sizeName}</span></div>
          <GiftPreview design={design} products={products} showProducts rotation={rotation} />
          <div className="gift-rotation-control"><label htmlFor="gift-rotation">Xoay hộp quà</label><input id="gift-rotation" type="range" min={-45} max={45} value={rotation} onChange={event => setRotation(Number(event.target.value))}/><button aria-label="Đặt lại góc xoay" onClick={() => setRotation(-18)}><RotateCcw size={18}/></button></div>
          <div className="gift-design-recap" aria-live="polite"><span>{sizeName} · {colorName}</span><span>{selectedProducts.length} sản phẩm · {design.includeCard ? "Có viết thiệp" : "Không viết thiệp"}</span></div>
        </section>
        <section ref={panelRef} className="design-panel" aria-label="Tùy chỉnh hộp quà">
          <div className="stepper" aria-label="Các bước thiết kế">
            {steps.map((title, index) => <button key={title} className={step === index ? "active" : ""} onClick={() => goToStep(index)} disabled={index === 3 && !hasProducts} aria-current={step === index ? "step" : undefined}><span>{index < step ? <Check size={14}/> : `0${index + 1}`}</span><b>{title}</b></button>)}
          </div>
          {step === 0 && <div className="step-content">
            <div className="step-heading"><h2 tabIndex={-1}>B1. Chọn size hộp</h2><p>Chọn kích thước hộp quà phù hợp với món quà của bạn.</p></div>
            <div className="gift-option-grid" role="group" aria-label="Size hộp quà">
              {boxSizes.map(size => <button key={size.value} className={`gift-size-option ${design.size === size.value ? "selected" : ""}`} aria-pressed={design.size === size.value} onClick={() => update({ size: size.value })}><Gift size={size.value === "large" ? 42 : 32} strokeWidth={1.3}/><strong>{size.name}</strong>{design.size === size.value && <Check size={18}/>}</button>)}
            </div>
            <div className="packaging-note"><Gift size={18}/><span>Phí hộp quà và ruy băng hiện tại: <b>{money(BOX_PRICE)}</b></span></div>
          </div>}
          {step === 1 && <div className="step-content">
            <div className="step-heading"><h2 tabIndex={-1}>B2. Chọn màu hộp</h2><p>Hai sắc màu dành cho hộp quà A Sỉn: xanh và đỏ đô.</p></div>
            <fieldset><legend>Màu hộp <span>{colorName}</span></legend><div className="color-options">
              {colors.map(color => <button key={color.value} aria-label={color.name} aria-pressed={design.color === color.value} className={`color-option ${design.color === color.value ? "selected" : ""}`} onClick={() => update({ color: color.value })}><span style={{ background: color.value }}>{design.color === color.value && <Check size={19}/>}</span><small>{color.name}</small></button>)}
            </div></fieldset>
          </div>}
          {step === 2 && <div className="step-content">
            <div className="step-heading"><h2 tabIndex={-1}>B3. Chọn sản phẩm bên trong hộp</h2><p>Chọn từ 1 đến {GIFT_CAPACITY} sản phẩm. Bản xem trước cập nhật theo lựa chọn của bạn.</p></div>
            <div className="gift-selection-summary">
              <div className="gift-selection-summary-heading"><h3>Trong hộp của bạn</h3><span>{selectedProducts.length} / {GIFT_CAPACITY} món</span></div>
              {hasProducts && <ul className="gift-selected-items" aria-label="Sản phẩm đã chọn">{selectedProducts.map(product => <li key={product.id}><img src={product.image} alt=""/><span>{product.name}</span><button aria-label={`Bỏ ${product.name} khỏi hộp`} onClick={() => toggleProduct(product.id)}><X size={15}/></button></li>)}</ul>}
              <p id="gift-selection-help" className="asin-selection-count" aria-live="polite">{selectedProducts.length === GIFT_CAPACITY ? `Hộp đã đủ ${GIFT_CAPACITY} món. Bỏ một món bên trên để chọn món khác.` : hasProducts ? `Bạn có thể chọn thêm ${GIFT_CAPACITY - selectedProducts.length} món.` : "Chọn sản phẩm bên dưới để bắt đầu."}</p>
            </div>
            {(loading || error || !products.length) && <div className="asin-builder-state" role={error ? "alert" : "status"}><p>{loading ? "Đang tải sản phẩm…" : error ? "Chưa tải được sản phẩm. Hãy thử lại để tiếp tục." : "A Sỉn đang chuẩn bị danh mục quà tặng."}</p>{error && <button className="asin-button" onClick={() => void reload()}>Thử lại</button>}</div>}
            <div className="product-choices">{products.map(product => <button key={product.id} className={`product-choice ${design.productIds.includes(product.id) ? "selected" : ""}`} aria-pressed={design.productIds.includes(product.id)} aria-label={`${design.productIds.includes(product.id) ? "Bỏ chọn" : "Chọn"} ${product.name}`} aria-describedby="gift-selection-help" disabled={!ready || (!design.productIds.includes(product.id) && (selectedProducts.length >= GIFT_CAPACITY || product.inStock === false))} onClick={() => toggleProduct(product.id)}><img src={product.image} alt=""/><span><strong>{product.name}</strong><small>{product.inStock === false ? "Tạm hết hàng" : product.weight}</small><b>{money(product.price)}</b></span><span className="selection-check">{design.productIds.includes(product.id) && <Check size={14}/>}</span></button>)}</div>
          </div>}
          {step === 3 && <div className="step-content">
            <div className="step-heading"><h2 tabIndex={-1}>B4. Chọn viết thiệp hoặc không</h2><p>Thêm lời chúc của bạn để gửi cùng món quà.</p></div>
            <div className="gift-option-grid gift-card-options" role="group" aria-label="Lựa chọn thiệp">
              <button className={design.includeCard ? "selected" : ""} aria-pressed={design.includeCard} onClick={() => update({ includeCard: true })}>Viết thiệp {design.includeCard && <Check size={17}/>}</button>
              <button className={!design.includeCard ? "selected" : ""} aria-pressed={!design.includeCard} onClick={() => update({ includeCard: false, message: "", recipient: "" })}>Không viết thiệp {!design.includeCard && <Check size={17}/>}</button>
            </div>
            {design.includeCard && <div className="gift-card-editor">
              <label className="field-label" htmlFor="gift-message">Ghi chú lời chúc <span>{design.message.length}/90</span></label>
              <textarea id="gift-message" rows={4} maxLength={90} required value={design.message} onChange={event => update({ message: event.target.value })} placeholder="Viết lời chúc bạn muốn ghi trên thiệp…" aria-describedby="gift-card-help" aria-invalid={!cardValid}/>
              <p id="gift-card-help" className={!cardValid ? "field-error" : "gift-card-help"}>{!cardValid ? "Hãy viết lời chúc hoặc chọn Không viết thiệp." : "A Sỉn sẽ ghi lời chúc này lên thiệp gửi cùng hộp quà."}</p>
            </div>}
            <div className="gift-summary"><h3>Hộp quà của bạn</h3><div><span>{sizeName} · {colorName}</span><b>{money(BOX_PRICE)}</b></div>{selectedProducts.map(product => <div key={product.id}><span>{product.name}</span><b>{money(product.price)}</b></div>)}<div><span>{design.includeCard ? "Có viết thiệp" : "Không viết thiệp"}</span></div></div>
          </div>}
          <div className="design-bottom">
            <div className="design-price"><span>Tổng hộp quà <small>{selectedProducts.length} sản phẩm đã chọn</small></span><strong>{money(giftPrice(design, products))}</strong></div>
            {step >= 2 && !hasProducts && <p className="field-error">Chọn ít nhất một sản phẩm để hoàn thiện hộp quà.</p>}
            {hasUnavailable && <p className="field-error">Hộp có sản phẩm tạm hết hàng. Quay lại bước 3 để bỏ hoặc thay sản phẩm.</p>}
            <div className="step-actions">
              {step > 0 && <button className="button button-outline back-step" onClick={() => goToStep(step - 1)} aria-label="Bước trước"><ArrowLeft size={18}/></button>}
              {step < 3 ? <button className="button button-green" disabled={step === 2 && (!ready || !hasProducts || hasUnavailable)} onClick={() => goToStep(step + 1)}>Tiếp tục <ArrowRight size={18}/></button> : <button className="button button-green" disabled={!ready || !hasProducts || !cardValid || hasUnavailable} onClick={() => addGift(design)}><ShoppingBag size={18}/> Thêm hộp quà vào giỏ</button>}
            </div>
            <div className="design-tools"><button onClick={() => notify(saveLocal("moc-design-v1", design) ? "Đã lưu thiết kế trên thiết bị này." : "Trình duyệt không cho phép lưu thiết kế.")}><Save size={14}/> Lưu thiết kế</button><button onClick={() => { setDesign(freshDesign); setRotation(-18); goToStep(0); notify("Đã bắt đầu một hộp quà mới."); }}><RotateCcw size={14}/> Bắt đầu lại</button></div>
          </div>
        </section>
      </div>
    </div>
  </main>;
}
