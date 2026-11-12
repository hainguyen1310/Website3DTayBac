import type { ProductVariant } from "./catalog.ts";

/** Dòng product_variants đọc kèm sản phẩm. */
export type VariantRow = { id: string; label: string; price_vnd: number; is_default: boolean; sort_order: number };

/** Quy cách theo thứ tự hiển thị; bỏ dòng giá không hợp lệ. Không có quy cách nào thì undefined. */
export function toVariants(rows: VariantRow[] | null | undefined): ProductVariant[] | undefined {
  const variants = [...(rows ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((row) => ({ id: row.id, label: row.label, price: Number(row.price_vnd), isDefault: row.is_default }))
    .filter((variant) => variant.label && Number.isFinite(variant.price) && variant.price > 0);
  return variants.length ? variants : undefined;
}
