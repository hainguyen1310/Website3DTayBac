import type { Deal, Product } from "./catalog.ts";

export function applyPromotions(products: Product[], deals: Deal[]): Product[] {
  return products.map((product) => ({
    ...product,
    price: deals
      .filter((deal) => deal.productId === product.id)
      .reduce(
        (price, deal) =>
          Math.min(
            price,
            Math.round((deal.originalPrice * (100 - deal.discount)) / 100),
          ),
        product.price,
      ),
  }));
}
