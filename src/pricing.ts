import type { Deal, Product } from "./catalog.ts";

export function effectivePrice(productId: string, basePrice: number, deals: Deal[]): number {
  return deals.filter(deal => deal.productId === productId).reduce((price, deal) => {
    if (!Number.isFinite(deal.originalPrice) || deal.originalPrice < 0 || !Number.isFinite(deal.discount) || deal.discount < 0 || deal.discount > 100) return price;
    return Math.min(price, Math.round(deal.originalPrice * (100 - deal.discount) / 100));
  }, basePrice);
}

export function applyPromotions(products: Product[], deals: Deal[]): Product[] {
  return products.map((product) => ({
    ...product,
    price: effectivePrice(product.id, product.price, deals),
  }));
}
