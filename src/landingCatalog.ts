import type { Deal, Product } from "./catalog.ts";

/** Keep database promotion order, then featured products, without duplicate cards. */
export function landingProducts(products: Product[], deals: Deal[]) {
  const byId = new Map(products.map((product) => [product.id, product]));
  const ordered = [
    ...deals.flatMap((deal) => {
      const product = byId.get(deal.productId);
      return product ? [product] : [];
    }),
    ...products.filter((product) => product.featured),
    ...products,
  ];
  return [...new Map(ordered.map((product) => [product.id, product])).values()];
}

export function productWindow(products: Product[], index: number, size = 3) {
  if (products.length <= size) return products;
  return Array.from({ length: size }, (_, offset) =>
    products[((index + offset) % products.length + products.length) % products.length],
  );
}
