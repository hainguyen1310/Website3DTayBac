import { linePrice } from "./catalog.ts";
import type { CartLine, Product } from "./catalog.ts";

export type AnalyticsItem = {
  item_id: string;
  item_name: string;
  item_category?: string;
  item_variant?: string;
  price: number;
  quantity: number;
  index?: number;
};

export function productAnalyticsItem(product: Product, quantity = 1, index?: number): AnalyticsItem {
  return { item_id: product.id, item_name: product.name, item_category: product.category, price: product.price, quantity, ...(index === undefined ? {} : { index }) };
}

export function cartAnalyticsItems(lines: CartLine[], products: Product[]): AnalyticsItem[] {
  return lines.flatMap(line => {
    if (line.quantity <= 0) return [];
    if (line.design) {
      // Không gửi key giỏ hàng, người nhận hoặc lời nhắn của hộp quà.
      return [{ item_id: "gift-box", item_name: "Hộp quà tự chọn", item_category: "Hộp quà", item_variant: [...line.design.productIds].sort().join(","), price: linePrice(line, products), quantity: line.quantity }];
    }
    const product = products.find(item => item.id === line.productId);
    return product ? [productAnalyticsItem(product, line.quantity)] : [];
  });
}

export function ecommerceParams(items: AnalyticsItem[]) {
  return { currency: "VND", value: items.reduce((sum, item) => sum + item.price * item.quantity, 0), items };
}

/** Chỉ báo doanh thu item nếu snapshot giỏ + phí khớp tổng tiền DB xác nhận. */
export function purchaseAnalyticsParams(items: AnalyticsItem[], confirmedTotal: number, shipping: number) {
  const params = ecommerceParams(items);
  if (!items.length || !Number.isFinite(confirmedTotal) || shipping < 0 || params.value + shipping !== confirmedTotal) return null;
  return { ...params, shipping, payment_type: "cod" };
}
