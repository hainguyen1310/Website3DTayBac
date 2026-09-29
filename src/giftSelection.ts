import type { Product } from "./catalog.ts";

/** Ready-made gift boxes are sold separately, never nested inside a custom box. */
export function giftComponents(products: Product[]) {
  return products.filter(product => product.categorySlug !== "hop-qua" &&
    !/^hộp quà(?:\s|$)/iu.test(product.category.trim()));
}
