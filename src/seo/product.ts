import type { Deal, Product } from "../catalog";
import type { SeoProductInput } from "./types";

/** Dùng chung cho Product/Offer JSON-LD ở client và server (B02/B05). */
export function toSeoProductInput(product: Product, deal?: Deal): SeoProductInput {
  return {
    slug: product.id,
    name: product.name,
    description: product.description,
    tag: product.tag,
    image: product.image,
    imageAlt: product.name,
    price: product.price,
    originalPrice: deal && deal.originalPrice > product.price ? deal.originalPrice : null,
    inStock: product.inStock,
    categoryName: product.category,
    categorySlug: product.categorySlug,
  };
}
