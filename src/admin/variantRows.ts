import type { AdminVariant } from "../services/adminApi";

/** Một dòng quy cách trong biểu mẫu sản phẩm (giá giữ dạng chữ khi đang gõ). */
export type VariantRow = {
  /** Khoá React ổn định cho dòng (id trong cơ sở dữ liệu hoặc khoá tạm). */
  key: string;
  id?: string;
  label: string;
  price: string;
  isDefault: boolean;
};

export const MAX_VARIANTS = 8;

let draftCounter = 0;
export const newVariantRow = (isDefault: boolean): VariantRow => ({ key: `new-${++draftCounter}`, label: "", price: "", isDefault });

export const toVariantRows = (variants: AdminVariant[]): VariantRow[] =>
  variants.map((variant) => ({ key: variant.id ?? `new-${++draftCounter}`, id: variant.id, label: variant.label, price: String(variant.priceVnd), isDefault: variant.isDefault }));

/** Lỗi đầu tiên của danh sách quy cách, hoặc null khi hợp lệ (rỗng = sản phẩm một quy cách). */
export function variantRowsError(rows: VariantRow[]): string | null {
  if (!rows.length) return null;
  if (rows.length > MAX_VARIANTS) return `Mỗi sản phẩm có tối đa ${MAX_VARIANTS} quy cách.`;
  if (rows.some((row) => !row.label.trim() || row.label.trim().length > 40)) return "Tên quy cách dài từ 1 đến 40 ký tự.";
  if (rows.some((row) => !/^\d{1,10}$/.test(row.price.trim()) || Number(row.price) <= 0)) return "Giá của mỗi quy cách phải là số nguyên dương.";
  if (new Set(rows.map((row) => row.label.trim().toLocaleLowerCase("vi"))).size !== rows.length) return "Tên quy cách bị trùng.";
  if (rows.filter((row) => row.isDefault).length !== 1) return "Hãy chọn đúng một quy cách mặc định.";
  return null;
}

export const toAdminVariants = (rows: VariantRow[]): AdminVariant[] =>
  rows.map((row) => ({ ...(row.id ? { id: row.id } : {}), label: row.label.trim(), priceVnd: Number(row.price), isDefault: row.isDefault }));

/** Quy cách mặc định quyết định giá và nhãn quy cách của sản phẩm. */
export const defaultVariantRow = (rows: VariantRow[]): VariantRow | undefined => rows.find((row) => row.isDefault) ?? rows[0];
