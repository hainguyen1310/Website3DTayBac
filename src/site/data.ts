import { useMemo } from "react";
import { useCatalog } from "../CatalogContext";
import type { StorefrontProduct } from "../storefront/products";

/**
 * Sản phẩm theo hình dạng bản khách duyệt (`slug`, `gallery`, `filters`…).
 * Giá và tồn kho lấy từ Supabase qua CatalogProvider; `slug` trùng `id`.
 */
export type SiteProduct = StorefrontProduct & { slug: string };

export const toSiteProduct = (product: StorefrontProduct): SiteProduct => ({ ...product, slug: product.id });

export function useSiteProducts(): SiteProduct[] {
  const { products } = useCatalog();
  return useMemo(() => (products as StorefrontProduct[]).map(toSiteProduct), [products]);
}

export const findProduct = (products: SiteProduct[], slug: string | undefined): SiteProduct | undefined =>
  products.find((product) => product.slug === slug);

/** Ảnh và logo dùng chung (assets của bản khách duyệt nằm trong public/assets). */
export const ASSETS = {
  logo: "/assets/original/media__brand__logo.png",
  logoLight: "/assets/original/media__brand__logo-light.png",
  hero: "/assets/original/images__asin__story-smoked-meat.webp",
  mountain: "/assets/original/media__backgrounds__story-valley.webp",
  kitchen: "/assets/original/media__workshop__img-1421.webp",
  workshop: "/assets/original/media__workshop__img-1460.webp",
  macro: "/assets/original/media__workshop__img-1531.webp",
  gift: "/assets/original/media__backgrounds__gift-open.webp",
  meal: "/assets/original/media__products__trau__f8371072.webp",
  portrait: "/assets/original/images__asin__story-portrait.webp",
  spice: "/assets/original/images__spice.webp",
  landscape: "/assets/original/images__asin__journey-panorama.webp",
  handover: "/assets/original/images__asin__journey-handover.webp",
  about: "/assets/scenery/about-team.webp",
} as const;
