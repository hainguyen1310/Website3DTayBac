import { Plus, Trash2 } from "lucide-react";
import { MAX_VARIANTS, newVariantRow } from "./variantRows";
import type { VariantRow } from "./variantRows";

type Props = {
  rows: VariantRow[];
  onChange: (rows: VariantRow[]) => void;
};

/** "Quy cách & giá" trong biểu mẫu sản phẩm: 100g, 250g, 500g, 1kg, lọ, combo… mỗi quy cách một giá. */
export function ProductVariantsEditor({ rows, onChange }: Props) {
  const update = (key: string, patch: Partial<VariantRow>) =>
    onChange(rows.map((row) => (row.key === key ? { ...row, ...patch } : patch.isDefault ? { ...row, isDefault: false } : row)));
  const remove = (key: string) => {
    const next = rows.filter((row) => row.key !== key);
    // Bỏ quy cách mặc định thì quy cách đầu tiên còn lại thành mặc định.
    onChange(next.length && !next.some((row) => row.isDefault) ? next.map((row, index) => ({ ...row, isDefault: index === 0 })) : next);
  };

  return (
    <section className="admin-form-section admin-variants" aria-labelledby="admin-variants-title">
      <div className="admin-variants-head">
        <h3 id="admin-variants-title">Quy cách &amp; giá</h3>
        <small>
          Để trống nếu sản phẩm chỉ bán một quy cách. Khi có quy cách, khách chọn quy cách trên trang sản phẩm; quy cách
          mặc định hiện trên thẻ sản phẩm và dùng cho hộp quà.
        </small>
      </div>
      {rows.length > 0 && (
        <div className="admin-variant-list">
          <div className="admin-variant-row admin-variant-header" aria-hidden="true">
            <span>Quy cách</span>
            <span>Giá (VND)</span>
            <span>Mặc định</span>
            <span />
          </div>
          {rows.map((row, index) => (
            <div className="admin-variant-row" key={row.key}>
              <input
                aria-label={`Tên quy cách ${index + 1}`}
                value={row.label}
                maxLength={40}
                placeholder="Túi 250g"
                onChange={(event) => update(row.key, { label: event.target.value })}
              />
              <input
                aria-label={`Giá quy cách ${index + 1}`}
                type="number"
                min={1}
                step={500}
                value={row.price}
                placeholder="225000"
                onChange={(event) => update(row.key, { price: event.target.value })}
              />
              <label className="admin-variant-default">
                <input
                  type="radio"
                  name="admin-variant-default"
                  checked={row.isDefault}
                  onChange={() => update(row.key, { isDefault: true })}
                />
                <span className="sr-only">Quy cách mặc định</span>
              </label>
              <button type="button" className="admin-ghost danger" aria-label={`Xoá quy cách ${row.label || index + 1}`} onClick={() => remove(row.key)}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div>
        <button type="button" className="admin-ghost" disabled={rows.length >= MAX_VARIANTS} onClick={() => onChange([...rows, newVariantRow(rows.length === 0)])}>
          <Plus size={16} /> Thêm quy cách
        </button>
      </div>
    </section>
  );
}
