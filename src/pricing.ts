import type { Deal, Product, ProductVariant } from "./catalog.ts";

const validDeal = (deal: Deal) =>
  Number.isFinite(deal.originalPrice) && deal.originalPrice >= 0 && Number.isFinite(deal.discount) && deal.discount >= 0 && deal.discount <= 100;

export function effectivePrice(productId: string, basePrice: number, deals: Deal[]): number {
  return deals.filter(deal => deal.productId === productId).reduce((price, deal) => {
    if (!validDeal(deal)) return price;
    return Math.min(price, Math.round(deal.originalPrice * (100 - deal.discount) / 100));
  }, basePrice);
}

/** Giá một quy cách: áp phần trăm giảm của khuyến mãi lên giá quy cách (như product_variant_sale_price). */
export function variantPrice(productId: string, basePrice: number, deals: Deal[]): number {
  return deals.filter(deal => deal.productId === productId).reduce((price, deal) => {
    if (!validDeal(deal)) return price;
    return Math.min(price, Math.round(basePrice * (100 - deal.discount) / 100));
  }, basePrice);
}

export function applyPromotions(products: Product[], deals: Deal[]): Product[] {
  return products.map((product) => {
    if (!product.variants?.length) return { ...product, price: effectivePrice(product.id, product.price, deals) };
    const variants: ProductVariant[] = product.variants.map((variant) => ({ ...variant, price: variantPrice(product.id, variant.price, deals) }));
    // Thanh toán luôn tính theo quy cách, nên giá hiển thị của sản phẩm là giá quy cách mặc định.
    const fallback = variants.find((variant) => variant.isDefault) ?? variants[0];
    return { ...product, variants, price: fallback.price };
  });
}
