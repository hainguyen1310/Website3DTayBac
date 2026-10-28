import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { choosableSlots, cleanDesign, colors, defaultDesign, giftPrice, GIFT_CAPACITY, money, readSaved, saveLocal, sizeOf } from "../../catalog";
import type { GiftDesign } from "../../catalog";
import { useShop } from "../../ShopContext";
import { useDocumentSeo } from "../../hooks/useDocumentSeo";
import { giftMeta } from "../../seo/meta";
import { MEDIA } from "../content";
import type { StorefrontProduct } from "../products";
import { Contours, Eyebrow } from "../ui";
import { giftStageItems } from "./giftScene";
import { CardStep, ColorStep, ProductStep, SizeStep } from "./GiftSteps";

const ModelStage = lazy(() => import("../three/ModelStage"));

const STORAGE_KEY = "asin-gift-design-v2";
const STEPS = [
  { title: "Size hộp", heading: "Chọn size hộp", text: "Lựa chọn kích thước phù hợp với nhu cầu và số lượng món quà của bạn." },
  { title: "Màu hộp", heading: "Chọn màu hộp", text: "Ba sắc vải bọc hộp, phù hợp từng dịp biếu tặng." },
  { title: "Sản phẩm", heading: "Chọn sản phẩm", text: "Mỗi ngăn vừa với một loại đặc sản. Chọn món cho từng ngăn trong hộp." },
  { title: "Thiệp chúc", heading: "Viết thiệp chúc", text: "Thêm vài dòng viết tay để món quà trọn vẹn hơn." },
];

export default function GiftBuilderPage() {
  useDocumentSeo((ctx) => giftMeta(ctx), []);
  const { products, addGift } = useShop();
  const giftProducts = products as StorefrontProduct[];
  const [design, setDesign] = useState<GiftDesign>(() => ({ ...defaultDesign, ...(readSaved(STORAGE_KEY) as Partial<GiftDesign> | null) }));
  const [step, setStep] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  // Làm sạch thiết kế đã lưu khi danh mục sẵn sàng (sản phẩm có thể đã ngừng bán).
  useEffect(() => {
    setDesign((current) => cleanDesign(current, products));
  }, [products]);
  useEffect(() => {
    saveLocal(STORAGE_KEY, design);
  }, [design]);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  const update = (changes: Partial<GiftDesign>) => setDesign((current) => cleanDesign({ ...current, ...changes }, products));
  const size = sizeOf(design.size);
  const colorName = colors.find((color) => color.value === design.color)?.name ?? colors[0].name;
  const chosen = design.productIds.length;
  const total = giftPrice(design, products);
  const stageItems = useMemo(() => giftStageItems(design, giftProducts), [design, giftProducts]);
  const missingMessage = design.includeCard && !design.message.trim();
  const blocker = !chosen ? "Chọn ít nhất một món ở bước Sản phẩm." : missingMessage ? "Viết lời chúc hoặc chọn không kèm thiệp ở bước 4." : "";

  const addToCart = () => {
    if (blocker) {
      setStep(!chosen ? 2 : 3);
      return;
    }
    addGift(design);
  };

  const current = STEPS[step];
  return (
    <main className="sf-page sf-gift-page">
      <section className="sf-hero sf-gift-hero">
        <Contours src={MEDIA.contours.giftHero} className="sf-hero-contours" />
        <div className="sf-container">
          <Eyebrow>Hộp quà 3D</Eyebrow>
          <h1 className="sf-script-display is-xl">Tự tay tạo ra hộp quà của riêng bạn</h1>
          <p className="sf-lead">Bốn bước để tạo hộp quà mang dấu ấn riêng của bạn.</p>
        </div>
      </section>

      <section className="sf-container sf-gift-builder">
        <Eyebrow>Bước {step + 1} / {STEPS.length}</Eyebrow>
        <ol className="sf-stepper">
          {STEPS.map((item, index) => (
            <li key={item.title}>
              <button type="button" aria-current={index === step ? "step" : undefined} className={index < step ? "is-done" : ""} onClick={() => setStep(index)}>
                <span aria-hidden="true">{"①②③④"[index]}</span> {item.title}
              </button>
            </li>
          ))}
        </ol>

        <div className="sf-gift-grid">
          <div className="sf-panel sf-config">
            <Eyebrow>Tùy chỉnh hộp quà</Eyebrow>
            <h2 ref={headingRef} tabIndex={-1} className="sf-script-subtitle is-panel">{current.heading}</h2>
            <p className="sf-body is-muted">{current.text}</p>
            {step === 0 && <SizeStep design={design} update={update} />}
            {step === 1 && <ColorStep design={design} update={update} />}
            {step === 2 && <ProductStep design={design} update={update} products={giftProducts} />}
            {step === 3 && <CardStep design={design} update={update} />}
            <div className="sf-config-nav">
              <button type="button" className="sf-back" disabled={step === 0} onClick={() => setStep(step - 1)}>← Quay lại</button>
              {step < STEPS.length - 1 ? (
                <button type="button" className="sf-button is-primary" onClick={() => setStep(step + 1)}>Tiếp tục <span aria-hidden="true">→</span></button>
              ) : (
                <button type="button" className="sf-button is-primary" onClick={addToCart}>Hoàn tất <span aria-hidden="true">→</span></button>
              )}
            </div>
          </div>

          <aside className="sf-panel sf-preview" aria-label="Xem trước hộp quà">
            <h2 className="sf-script-subtitle is-panel"><span aria-hidden="true">◇</span> Hộp quà của bạn</h2>
            <Suspense fallback={<div className="sf-stage"><p className="sf-stage-status">Đang chuẩn bị không gian 3D…</p></div>}>
              <ModelStage items={stageItems} boxTint={design.color === "#315442" ? null : design.color} fitKey={design.size} label={`Hộp quà ${size.name}, màu ${colorName}, ${chosen} món tự chọn`} />
            </Suspense>
            <div className="sf-preview-caption">
              <strong>{size.name}</strong>
              <span>{size.dimensions}</span>
            </div>
            <p className="sf-hint"><span aria-hidden="true">⟲</span> Kéo để xoay hộp, cuộn để phóng to. Các lựa chọn của bạn cập nhật ngay lập tức.</p>
            <dl className="sf-summary">
              <div><dt>Size</dt><dd className="is-wine">{size.name} · {money(size.price)}</dd></div>
              <div><dt>Màu hộp</dt><dd>{colorName}</dd></div>
              <div><dt>Sản phẩm</dt><dd>Đã chọn {chosen}/{Math.min(GIFT_CAPACITY, choosableSlots(design.size).length)} món</dd></div>
              {design.productIds.map((id, index) => {
                const product = giftProducts.find((item) => item.id === id);
                return product ? <div key={`${id}-${index}`} className="is-sub"><dt>{product.name}</dt><dd>{money(product.price)}</dd></div> : null;
              })}
              <div><dt>Thiệp</dt><dd>{design.includeCard ? "Lời chúc viết tay" : "Không kèm thiệp"}</dd></div>
            </dl>
            <div className="sf-total">
              <span>Tổng tiền hộp quà</span>
              <strong>{money(total)}</strong>
            </div>
            <button type="button" className="sf-gold-button" onClick={addToCart}>Thêm hộp quà vào giỏ</button>
            {blocker && <p className="sf-blocker" role="status">{blocker}</p>}
          </aside>
        </div>
      </section>
      <Contours src={MEDIA.contours.bottom} className="sf-page-bottom-contours" />
    </main>
  );
}
