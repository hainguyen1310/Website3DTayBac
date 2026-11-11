import { useEffect, useRef } from "react";
import type { KeyboardEvent } from "react";
import { CommerceIcon } from "../icons";
import { fmt } from "../format";
import type { SiteProduct } from "../data";
import { CHOOSABLE_SLOTS, DEFAULT_CARD_MESSAGE, GIFT_SIZES, GIFT_SLOT_NAMES, GIFT_VARIANTS } from "./variants";
import type { ChoosableSlot } from "./variants";
import { MESSAGE_MAX, RECIPIENT_MAX, giftReady, slotProducts } from "./giftStore";
import type { GiftBuilderState } from "./giftStore";

type Update = (changes: Partial<GiftBuilderState>) => void;

/** Phím mũi tên/Home/End trong nhóm radio (bindRadioKeys của commerce.js). */
export function radioKeys(event: KeyboardEvent<HTMLElement>) {
  const group = event.currentTarget.parentElement;
  if (!group) return;
  const buttons = [...group.querySelectorAll<HTMLButtonElement>(":scope > button")];
  const index = buttons.indexOf(event.currentTarget as HTMLButtonElement);
  let next: number | undefined;
  if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % buttons.length;
  else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + buttons.length) % buttons.length;
  else if (event.key === "Home") next = 0;
  else if (event.key === "End") next = buttons.length - 1;
  if (next === undefined) return;
  event.preventDefault();
  buttons[next].focus({ preventScroll: true });
  buttons[next].click();
}

function StepOne({ state, update }: { state: GiftBuilderState; update: Update }) {
  return (
    <>
      <span className="eyebrow">01 / CHỌN HỘP</span>
      <h2>Một món quà, vừa lời gửi gắm.</h2>
      <p className="gift-step-intro">Chọn cỡ hộp trước khi phối đặc sản.</p>
      <div className="gift-sizes" role="radiogroup" aria-label="Chọn kích thước hộp">
        {GIFT_SIZES.map((size) => {
          const variant = GIFT_VARIANTS[size];
          const selected = state.size === size;
          return (
            <button key={size} type="button" role="radio" aria-checked={selected} tabIndex={selected ? 0 : -1} className={`gift-size${selected ? " selected" : ""}`} onClick={() => update({ size })} onKeyDown={radioKeys}>
              <span className="size-radio" />
              <span className="size-content">
                <strong>{variant.name}</strong>
                <small>{variant.dimensions} · {variant.finish}</small>
                <small>3 món tự chọn + chẩm chéo{size === "large" ? " + rượu ngô" : ""}</small>
              </span>
              <span className="size-price">{fmt(variant.price)}<small>trọn hộp</small></span>
            </button>
          );
        })}
      </div>
      <p className="gift-price-note">Giá trọn hộp đã gồm món, thiệp và món gói sẵn. Phí giao hàng tính khi đặt hàng.</p>
    </>
  );
}

function ProductOptions({ state, products, slot, update }: { state: GiftBuilderState; products: SiteProduct[]; slot: ChoosableSlot; update: Update }) {
  const options = slotProducts(products, slot);
  const chosen = state.items[slot];
  return (
    <div className="gift-product-list" role="radiogroup" aria-label={GIFT_SLOT_NAMES[slot]}>
      {options.map((product, index) => {
        const selected = chosen === product.slug;
        return (
          <button
            key={product.slug}
            type="button"
            className={`gift-product-option${selected ? " selected" : ""}`}
            data-slot={slot}
            role="radio"
            aria-checked={selected}
            tabIndex={selected || (!chosen && index === 0) ? 0 : -1}
            onClick={() => { if (!selected) update({ items: { ...state.items, [slot]: product.slug } }); }}
            onKeyDown={radioKeys}
          >
            <img src={product.image} alt={product.name} />
            <span><strong>{product.name}</strong><small>{product.weight || "Đặc sản Tây Bắc"}</small></span>
            <i><CommerceIcon name={selected ? "check" : "plus"} size={18} /></i>
          </button>
        );
      })}
    </div>
  );
}

function StepTwo({ state, products, update }: { state: GiftBuilderState; products: SiteProduct[]; update: Update }) {
  return (
    <>
      <span className="eyebrow">02 / CHỌN HƯƠNG VỊ</span>
      <h2>Gói những món<br />người thương thích.</h2>
      <p className="gift-step-intro">Chọn hai túi đặc sản và một hũ thịt xé. Chẩm chéo được gói sẵn{state.size === "large" ? " cùng rượu ngô Bản Phố" : ""}.</p>
      <div className="gift-slot-tabs" role="group" aria-label="Vị trí sản phẩm">
        {CHOOSABLE_SLOTS.map((slot, index) => {
          const active = slot === state.activeSlot;
          return (
            <button key={slot} type="button" aria-pressed={active} aria-controls="gift-product-options" className={active ? "active" : undefined} onClick={() => { if (!active) update({ activeSlot: slot }); }}>
              <span>0{index + 1}</span>{slot === "jar" ? "Hũ thịt xé" : `Túi ${index + 1}`}<i>{state.items[slot] ? <CommerceIcon name="check" size={14} /> : null}</i>
            </button>
          );
        })}
      </div>
      <div id="gift-product-options"><ProductOptions state={state} products={products} slot={state.activeSlot} update={update} /></div>
    </>
  );
}

function StepThree({ state, update }: { state: GiftBuilderState; update: Update }) {
  return (
    <>
      <span className="eyebrow">03 / VIẾT MỘT LỜI THƯƠNG</span>
      <h2>Có những điều,<br />một tấm thiệp nói hộ.</h2>
      <p className="gift-step-intro">Một lời nhắn riêng, để món quà mang dấu ấn của bạn.</p>
      <div className="form-field">
        <label htmlFor="gift-recipient">Gửi đến</label>
        <input id="gift-recipient" type="text" maxLength={RECIPIENT_MAX} value={state.recipient} placeholder="Tên người nhận" onChange={(event) => update({ recipient: event.target.value })} />
      </div>
      <div className="form-field">
        <label htmlFor="gift-message">Lời chúc <span id="gift-char-count">{state.message.length}/{MESSAGE_MAX}</span></label>
        <textarea id="gift-message" rows={4} maxLength={MESSAGE_MAX} value={state.message} placeholder="Chúc những ngày thật ấm, như một bếp lửa luôn chờ..." onChange={(event) => update({ message: event.target.value })} />
      </div>
      <div className="gift-card-preview">
        <span>A SỈN · MỘT LỜI GỬI GẮM</span>
        <p id="gift-card-to">{state.recipient ? `Gửi ${state.recipient}` : "Gửi người thương,"}</p>
        <blockquote id="gift-card-message">{state.message || DEFAULT_CARD_MESSAGE}</blockquote>
        <small>Từ miền núi, bằng cả tấm lòng.</small>
      </div>
    </>
  );
}

type Props = {
  state: GiftBuilderState;
  products: SiteProduct[];
  update: Update;
  changeStep: (step: number) => void;
  onAdd: () => void;
};

const STEP_NAMES = ["Size hộp", "Sản phẩm", "Thiệp chúc"];

/** Cột cấu hình 3 bước (giftConfigContent). */
export function GiftConfig({ state, products, update, changeStep, onAdd }: Props) {
  const ready = giftReady(state, products);
  const heading = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  // Đổi bước: đưa tiêu đề bước mới vào tầm nhìn và nhận focus như bản gốc.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const title = heading.current?.querySelector<HTMLElement>(".gift-step-content h2");
    if (!title) return;
    title.tabIndex = -1;
    title.focus({ preventScroll: true });
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches || document.body.classList.contains("motion-paused");
    heading.current?.scrollIntoView({ block: "start", behavior: reduce ? "instant" : "smooth" });
  }, [state.step]);

  return (
    <div className="gift-config" id="gift-configuration" ref={heading}>
      <nav className="gift-steps" aria-label="Các bước tạo hộp quà">
        {STEP_NAMES.map((name, index) => {
          const step = index + 1;
          const active = state.step === step;
          return (
            <button key={name} type="button" className={`${active ? "active" : ""} ${state.step > step ? "completed" : ""}`.trim() || undefined} aria-current={active ? "step" : "false"} onClick={() => changeStep(step)}>
              <span>{state.step > step ? <CommerceIcon name="check" size={14} /> : `0${step}`}</span>{name}
            </button>
          );
        })}
      </nav>
      <div className="gift-step-content">
        {state.step === 1 ? <StepOne state={state} update={update} /> : state.step === 2 ? <StepTwo state={state} products={products} update={update} /> : <StepThree state={state} update={update} />}
      </div>
      <div className="gift-step-actions">
        <button type="button" className="commerce-text-link" disabled={state.step === 1} onClick={() => changeStep(state.step - 1)}>← Quay lại</button>
        {state.step < 3 ? (
          <button type="button" className="btn dark" disabled={state.step === 2 && !ready} onClick={() => changeStep(state.step + 1)}>
            {state.step === 1 ? "Chọn hương vị" : "Viết thiệp"} <CommerceIcon name="arrow" />
          </button>
        ) : (
          <button type="button" className="btn dark" disabled={!ready} onClick={onAdd}>Gói vào giỏ hàng <CommerceIcon name="bag" size={18} /></button>
        )}
      </div>
    </div>
  );
}
