import { boxSizes, CARD_PRICE, choosableSlots, colors, findProduct, money, sizeOf } from "../../catalog";
import type { GiftDesign, GiftSlotId } from "../../catalog";
import type { StorefrontProduct } from "../products";

type StepProps = {
  design: GiftDesign;
  update: (changes: Partial<GiftDesign>) => void;
};

export function SizeStep({ design, update }: StepProps) {
  return (
    <div className="sf-options" role="radiogroup" aria-label="Size hộp">
      {boxSizes.map((size) => {
        const selected = design.size === size.value;
        return (
          <button key={size.value} type="button" role="radio" aria-checked={selected} className="sf-option" onClick={() => update({ size: size.value })}>
            <span className="sf-option-radio" aria-hidden="true">{selected ? "●" : "○"}</span>
            <strong>{size.name}</strong>
            <span>{size.description}</span>
            <em>{size.dimensions} · {money(size.price)}</em>
          </button>
        );
      })}
      <p className="sf-option-note"><span aria-hidden="true">♧</span> Hộp phủ vải, lót giấy dó và dây gai buộc tay. Giá vỏ đã gồm {sizeOf(design.size).slots.filter((slot) => "fixed" in slot).length === 2 ? "chẩm chéo và rượu ngô Bản Phố" : "một hũ chẩm chéo"}.</p>
    </div>
  );
}

export function ColorStep({ design, update }: StepProps) {
  return (
    <div className="sf-swatches" role="radiogroup" aria-label="Màu hộp">
      {colors.map((color) => {
        const selected = design.color === color.value;
        return (
          <button key={color.value} type="button" role="radio" aria-checked={selected} className="sf-swatch" onClick={() => update({ color: color.value })}>
            <span style={{ background: color.value }} aria-hidden="true" />
            <strong>{color.name}</strong>
            <small>{selected ? "Đang chọn" : "Chọn màu này"}</small>
          </button>
        );
      })}
      <p className="sf-option-note"><span aria-hidden="true">⟲</span> Màu vỏ hộp đổi ngay trên mô hình 3D. Họa tiết núi và chữ vàng được giữ nguyên.</p>
    </div>
  );
}

export function ProductStep({ design, update, products }: StepProps & { products: StorefrontProduct[] }) {
  const setSlot = (slot: GiftSlotId, productId: string | null) => {
    const slots = { ...design.slots };
    if (productId) slots[slot] = productId;
    else delete slots[slot];
    const productIds = choosableSlots(design.size).flatMap((item) => (slots[item.id] ? [slots[item.id]!] : []));
    update({ slots, productIds });
  };
  const fixed = sizeOf(design.size).slots.filter((slot) => "fixed" in slot && slot.fixed);
  return (
    <div className="sf-slot-list">
      {choosableSlots(design.size).map((slot) => {
        const options = products.filter((product) => product.giftSlot === slot.type && product.giftModel);
        return (
          <fieldset key={slot.id} className="sf-slot">
            <legend>{slot.label}</legend>
            <div className="sf-slot-options">
              {options.map((product) => {
                const selected = design.slots[slot.id] === product.id;
                const soldOut = product.inStock === false;
                return (
                  <button key={product.id} type="button" className="sf-slot-option" aria-pressed={selected} disabled={soldOut && !selected} onClick={() => setSlot(slot.id, selected ? null : product.id)}>
                    <img src={product.image} alt="" loading="lazy" width={96} height={96} />
                    <span>
                      <strong>{product.name}</strong>
                      <small>{soldOut ? "Tạm hết hàng" : `+ ${money(product.price)}`}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}
      <div className="sf-slot-fixed">
        {fixed.map((slot) => {
          const product = "fixed" in slot ? findProduct(products, slot.fixed) : undefined;
          return product ? <p key={slot.id}><span aria-hidden="true">✓</span> {product.name} — đã gồm trong giá vỏ hộp</p> : null;
        })}
      </div>
    </div>
  );
}

export function CardStep({ design, update }: StepProps) {
  return (
    <div className="sf-card-step">
      <div className="sf-options is-inline" role="radiogroup" aria-label="Thiệp chúc">
        {[
          { value: true, title: "Lời chúc viết tay", text: `Thiệp giấy dó, viết tay · ${money(CARD_PRICE)}` },
          { value: false, title: "Không kèm thiệp", text: "Hộp quà gửi đi không kèm thiệp" },
        ].map((option) => (
          <button key={String(option.value)} type="button" role="radio" aria-checked={design.includeCard === option.value} className="sf-option is-compact" onClick={() => update(option.value ? { includeCard: true } : { includeCard: false, message: "", recipient: "" })}>
            <span className="sf-option-radio" aria-hidden="true">{design.includeCard === option.value ? "●" : "○"}</span>
            <strong>{option.title}</strong>
            <span>{option.text}</span>
          </button>
        ))}
      </div>
      {design.includeCard && (
        <div className="sf-fields">
          <label>
            Gửi tới
            <input value={design.recipient} maxLength={30} placeholder="Ví dụ: Bố mẹ yêu quý" onChange={(event) => update({ recipient: event.target.value })} />
          </label>
          <label>
            Lời chúc <small>{design.message.length}/90</small>
            <textarea value={design.message} maxLength={90} rows={3} required placeholder="Chúc gia đình một năm an khang, sum vầy." onChange={(event) => update({ message: event.target.value })} />
          </label>
        </div>
      )}
    </div>
  );
}
