import type { ProductVariant } from "../../../catalog";
import { money } from "../../format";
import { radioKeys } from "../../gift/GiftConfig";
import "./variants.css";

type Props = {
  variants: ProductVariant[];
  selectedId: string | undefined;
  onSelect: (variant: ProductVariant) => void;
};

/** Chọn quy cách (100g, 250g, 500g, 1kg, lọ, combo…) trên trang chi tiết sản phẩm. */
export function VariantPicker({ variants, selectedId, onSelect }: Props) {
  if (variants.length < 2) return null;
  return (
    <div className="detail-variants">
      <span className="detail-variants-label" id="detail-variants-label">Chọn quy cách</span>
      <div className="detail-variant-list" role="radiogroup" aria-labelledby="detail-variants-label">
        {variants.map((variant) => {
          const checked = variant.id === selectedId;
          return (
            <button
              key={variant.id}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              onClick={() => onSelect(variant)}
              onKeyDown={radioKeys}
            >
              <strong>{variant.label}</strong>
              <span>{money(variant.price)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
