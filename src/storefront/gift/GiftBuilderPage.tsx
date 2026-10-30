import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Rotate3d, ShoppingBag } from "lucide-react";
import { choosableSlots, cleanDesign, colors, defaultDesign, giftPrice, GIFT_CAPACITY, money, sizeOf } from "../../catalog";
import type { GiftDesign, GiftSlotId } from "../../catalog";
import { useShop } from "../../ShopContext";
import { useDocumentSeo } from "../../hooks/useDocumentSeo";
import { giftMeta } from "../../seo/meta";
import type { StorefrontProduct } from "../products";
import { Eyebrow } from "../ui";
import { focusStageItems, giftStageItems, trayItems } from "./giftScene";
import { CardStep, Ornament, ProductStep, SizeStep } from "./GiftSteps";
import GiftTray from "./GiftTray";

const ModelStage = lazy(() => import("../three/ModelStage"));

const STEPS = [
  { title: "Size hộp", heading: "Chọn size hộp", text: "Lựa chọn kích thước phù hợp với nhu cầu và số lượng món quà của bạn." },
  { title: "Sản phẩm", heading: "Chọn sản phẩm", text: "Chọn bất kỳ món nào cho từng ngăn." },
  { title: "Thiệp chúc", heading: "Viết thiệp chúc", text: "Thêm vài dòng viết tay để món quà trọn vẹn hơn." },
];
const PRODUCT_STEP = 1;
const CARD_STEP = 2;
const BOX_VIEW: [number, number, number] = [0, 1.25, 1];
const FOCUS_VIEW: [number, number, number] = [0.5, 0.95, 1];
const STICKY_GAP = 16;

type StageMode = "box" | "assembled" | "focus";

export default function GiftBuilderPage() {
  useDocumentSeo((ctx) => giftMeta(ctx), []);
  const { products, addGift } = useShop();
  const giftProducts = products as StorefrontProduct[];
  const [design, setDesign] = useState<GiftDesign>(() => ({ ...defaultDesign, slots: {}, productIds: [] }));
  const [step, setStep] = useState(0);
  // Món đang được ngắm riêng trên sân khấu, và chế độ "Xem trong hộp".
  const [focusId, setFocusId] = useState<string | null>(null);
  const [assembled, setAssembled] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  const pageRef = useRef<HTMLElement>(null);
  const previewRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  // Làm sạch thiết kế đã lưu khi danh mục sẵn sàng (sản phẩm có thể đã ngừng bán).
  useEffect(() => {
    setDesign((current) => cleanDesign(current, products));
  }, [products]);
  useEffect(() => {
    setFocusId(null);
    setAssembled(step === CARD_STEP);
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  // Chiều cao header quyết định cỡ sân khấu; khung xem trước cao hơn màn hình thì dính theo
  // mép dưới để nút thêm vào giỏ luôn nằm trong tầm mắt khi cuộn.
  useLayoutEffect(() => {
    const header = document.querySelector<HTMLElement>(".sf-header");
    const page = pageRef.current;
    const preview = previewRef.current;
    if (!page) return;
    const apply = () => {
      const offset = header?.offsetHeight ?? 72;
      const bottomAligned = window.innerHeight - (preview?.offsetHeight ?? 0) - STICKY_GAP;
      page.style.setProperty("--gift-offset", `${offset}px`);
      page.style.setProperty("--preview-top", `${Math.min(offset + STICKY_GAP, bottomAligned)}px`);
    };
    apply();
    const observer = new ResizeObserver(apply);
    if (header) observer.observe(header);
    if (preview) observer.observe(preview);
    window.addEventListener("resize", apply);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", apply);
    };
  }, []);

  const update = (changes: Partial<GiftDesign>) => setDesign((current) => cleanDesign({ ...current, ...changes }, products));
  const size = sizeOf(design.size);
  const colorName = colors.find((color) => color.value === design.color)?.name ?? colors[0].name;
  const chosen = design.productIds.length;
  const total = giftPrice(design, products);
  const tray = useMemo(() => trayItems(design, giftProducts), [design, giftProducts]);
  const focusItem = focusId ? tray.find((item) => item.product.id === focusId) : undefined;
  const mode: StageMode = step < PRODUCT_STEP ? "box" : focusItem ? "focus" : assembled || step === CARD_STEP ? "assembled" : "box";
  const stageItems = useMemo(
    () => (mode === "focus" ? focusStageItems(focusItem?.product) : giftStageItems(design, giftProducts, mode === "assembled" ? "all" : "none")),
    [mode, focusItem?.product, design, giftProducts],
  );
  const fitKey = mode === "focus" ? `focus-${focusItem?.product.id}` : `box-${design.size}`;
  const missingMessage = design.includeCard && !design.message.trim();
  const blocker = !chosen ? "Chọn ít nhất một món ở bước Sản phẩm." : missingMessage ? "Viết lời chúc hoặc chọn không kèm thiệp ở bước 3." : "";

  const onPick = (_slot: GiftSlotId, productId: string | null) => {
    if (productId) {
      setFocusId(productId);
      setAssembled(false);
    } else {
      setFocusId(null);
    }
  };

  const addToCart = () => {
    if (blocker) {
      setStep(!chosen ? PRODUCT_STEP : CARD_STEP);
      return;
    }
    addGift(design);
  };

  const current = STEPS[step];
  const stageLabel = mode === "focus"
    ? `Mô hình 3D ${focusItem?.product.name}`
    : `Hộp quà ${size.name}, màu ${colorName}, ${chosen} món tự chọn${mode === "assembled" ? ", xem đủ món trong hộp" : ""}`;
  return (
    <main ref={pageRef} className="sf-page sf-gift-page" style={{ "--gift-offset": "72px" } as CSSProperties}>
      <section className="sf-hero sf-gift-hero">
        <div className="sf-gift-hero-art" aria-hidden="true" />
        <div className="sf-container">
          <Eyebrow>Hộp quà 3D</Eyebrow>
          <h1 className="sf-script-display is-xl">Tự tay chọn hộp quà của bạn</h1>
          <p className="sf-lead">Ba bước để tạo hộp quà mang dấu ấn riêng của bạn. Sinh Lộc 300.000đ, Thịnh Đỉnh 500.000đ — trọn giá món và thiệp.</p>
        </div>
      </section>

      <section className="sf-container sf-gift-builder">
        <div className="sf-gift-main">
          <nav className="sf-gift-steps" aria-label="Các bước tạo hộp quà">
            <Eyebrow>Bước {step + 1} / {STEPS.length}</Eyebrow>
            <ol className="sf-stepper">
              {STEPS.map((item, index) => (
                <li key={item.title} className={index < step ? "is-done" : undefined}>
                  <button type="button" aria-current={index === step ? "step" : undefined} onClick={() => setStep(index)}>
                    <span className="sf-step-dot" aria-hidden="true">{index + 1}</span>
                    <span className="sf-step-label">{item.title}</span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>

          <div className="sf-panel sf-config">
            <div className="sf-config-head">
              <h2 ref={headingRef} tabIndex={-1} className="sf-script-subtitle is-panel"><Ornament /> {current.heading}</h2>
              <p className="sf-body is-muted">{current.text}</p>
            </div>
            <div className="sf-config-body" key={step}>
              {step === 0 && <SizeStep design={design} update={update} />}
              {step === PRODUCT_STEP && <ProductStep design={design} update={update} products={giftProducts} onPick={onPick} />}
              {step === CARD_STEP && <CardStep design={design} update={update} />}
            </div>
            <div className="sf-config-nav">
              <button type="button" className="sf-back" disabled={step === 0} onClick={() => setStep(step - 1)}>← Quay lại</button>
              {step < STEPS.length - 1 ? (
                <button type="button" className="sf-button is-primary" onClick={() => setStep(step + 1)}>Tiếp tục <span aria-hidden="true">→</span></button>
              ) : (
                <button type="button" className="sf-button is-primary" onClick={addToCart}>Hoàn tất <span aria-hidden="true">→</span></button>
              )}
            </div>
          </div>
        </div>

        <aside ref={previewRef} className="sf-panel sf-preview" aria-label="Xem trước hộp quà">
          <h2 className="sf-script-subtitle is-panel"><Ornament /> Hộp quà của bạn</h2>
          <div className={`sf-stage-shell is-${mode}`} ref={stageRef}>
            <Suspense fallback={<div className="sf-stage"><p className="sf-stage-status">Đang chuẩn bị không gian 3D…</p></div>}>
              <ModelStage
                items={stageItems}
                boxTint={design.color === "#315442" ? null : design.color}
                fitKey={fitKey}
                label={stageLabel}
                autoRotate={mode === "focus"}
                viewDirection={mode === "focus" ? FOCUS_VIEW : BOX_VIEW}
                fitPadding={mode === "focus" ? 1.5 : 1.08}
                animateIn
              />
            </Suspense>
            {step >= PRODUCT_STEP && (
              <GiftTray
                items={tray}
                focusedId={mode === "focus" ? focusId : null}
                assembled={mode === "assembled"}
                stageRef={stageRef}
                onFocus={(item) => {
                  setFocusId(item.product.id);
                  setAssembled(false);
                }}
                onAssemble={() => {
                  setFocusId(null);
                  setAssembled(true);
                }}
              />
            )}
            {mode === "focus" && focusItem && (
              <p className="sf-stage-focus" key={focusItem.key} aria-live="polite">
                <strong>{focusItem.product.name}</strong>
                {!focusItem.included && <span>{size.slots.find((slot) => slot.id === focusItem.slotId)?.label}</span>}
              </p>
            )}
          </div>
          <div className="sf-preview-caption">
            <strong>{size.name}</strong>
            <span>{size.dimensions}</span>
          </div>
          <p className="sf-hint"><Rotate3d aria-hidden="true" /> Kéo để xoay hộp, cuộn để phóng to. Các lựa chọn của bạn cập nhật ngay lập tức.</p>
          <dl className="sf-summary">
            <div><dt>Hộp trọn giá</dt><dd>{size.name} · <span className="is-gold">{money(size.price)}</span></dd></div>
            <div><dt>Màu hộp</dt><dd>{colorName}</dd></div>
            <div><dt>Sản phẩm</dt><dd>Đã chọn {chosen}/{Math.min(GIFT_CAPACITY, choosableSlots(design.size).length)} món</dd></div>
            {design.productIds.map((id, index) => {
              const product = giftProducts.find((item) => item.id === id);
              return product ? <div key={`${id}-${index}`} className="is-sub"><dt>Món {index + 1}</dt><dd>{product.name}</dd></div> : null;
            })}
            <div><dt>Thiệp</dt><dd>{design.includeCard ? "Lời chúc viết tay" : "Không kèm thiệp"}</dd></div>
          </dl>
          <div className="sf-total-rule" aria-hidden="true"><Ornament /></div>
          <div className="sf-total">
            <span>Tổng tiền hộp quà</span>
            <strong>{money(total)}</strong>
          </div>
          <button type="button" className="sf-gold-button" onClick={addToCart}><ShoppingBag aria-hidden="true" /> Thêm hộp quà vào giỏ</button>
          {blocker && <p className="sf-blocker" role="status">{blocker}</p>}
        </aside>
      </section>
    </main>
  );
}
