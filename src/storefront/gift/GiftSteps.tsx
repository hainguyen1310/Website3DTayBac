import { Check, Gift } from "lucide-react";
import { boxSizes, choosableSlots, colors, findProduct, money, sizeOf } from "../../catalog";
import { giftSlotProducts } from "../../giftSelection";
import type { GiftDesign, GiftSlotId } from "../../catalog";
import type { StorefrontProduct } from "../products";

/** Hoa văn hình thoi dùng cho tiêu đề khung và đường kẻ tổng tiền. */
export function Ornament() {
  return (
    <svg className="sf-ornament" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 1 15 8 8 15 1 8Z" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M8 5 11 8 8 11 5 8Z" fill="currentColor" />
    </svg>
  );
}

function Radio({ checked }: { checked: boolean }) {
  return <span className="sf-option-radio" aria-hidden="true">{checked && <Check strokeWidth={3} />}</span>;
}

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
            <Radio checked={selected} />
            <strong>{size.name}</strong>
            <span>{size.description}</span>
            <em>{colors.find((color) => color.value === size.color)?.name} · {money(size.price)} trọn hộp</em>
          </button>
        );
      })}
      <p className="sf-option-note"><Gift aria-hidden="true" /> Giá trọn hộp gồm các món tự chọn, thiệp và {sizeOf(design.size).slots.filter((slot) => "fixed" in slot).length === 2 ? "chẩm chéo, rượu ngô Bản Phố" : "một hũ chẩm chéo"}. Không cộng thêm tiền món.</p>
    </div>
  );
}

type ProductStepProps = StepProps & {
  products: StorefrontProduct[];
  /** Gọi khi khách chọn (id) hoặc bỏ chọn (null) một món ở một ngăn. */
  onPick?: (slot: GiftSlotId, productId: string | null) => void;
};

export function ProductStep({ design, update, products, onPick }: ProductStepProps) {
  const setSlot = (slot: GiftSlotId, productId: string | null) => {
    const slots = { ...design.slots };
    if (productId) slots[slot] = productId;
    else delete slots[slot];
    const productIds = choosableSlots(design.size).flatMap((item) => (slots[item.id] ? [slots[item.id]!] : []));
    update({ slots, productIds });
    onPick?.(slot, productId);
  };
  const fixed = sizeOf(design.size).slots.filter((slot) => "fixed" in slot && slot.fixed);
  return (
    <div className="sf-slot-list">
      {choosableSlots(design.size).map((slot) => {
        const options = giftSlotProducts(products, slot.id);
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
                      {soldOut && <small>Tạm hết hàng</small>}
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
          return product ? <p key={slot.id}><span aria-hidden="true">✓</span> {product.name}</p> : null;
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
          { value: true, title: "Lời chúc viết tay", text: "Thiệp giấy dó, viết tay" },
          { value: false, title: "Không kèm thiệp", text: "Hộp quà gửi đi không kèm thiệp" },
        ].map((option) => (
          <button key={String(option.value)} type="button" role="radio" aria-checked={design.includeCard === option.value} className="sf-option is-compact" onClick={() => update(option.value ? { includeCard: true } : { includeCard: false, message: "", recipient: "" })}>
            <Radio checked={design.includeCard === option.value} />
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
