/**
 * Dữ liệu prerender chuyển từ server sang client để tránh nháy nội dung và
 * giữ HTML/schema/client dùng cùng nguồn (B01/B17). Payload nằm trong một
 * script JSON an toàn; client chỉ đọc để khởi tạo rồi vẫn revalidate sau.
 */

import type { Product } from "../catalog.ts";
import type { PublishedArticle } from "../content/article.ts";
import type { ProductRecord } from "./content.ts";
import { serializeJsonLd } from "./head.ts";

export type BootstrapRoute =
  | "home"
  | "products"
  | "product"
  | "category"
  | "news"
  | "article"
  | "gift"
  | "about"
  | "contact";

export type BootstrapPayload = {
  route: BootstrapRoute;
  generatedAt: string;
  article?: PublishedArticle;
  articles?: PublishedArticle[];
  articleTotal?: number;
  articlePage?: number;
  topicSlug?: string;
  product?: Product;
  products?: Product[];
  /** true khi `products` là toàn bộ danh mục đang bán (trang chủ/danh sách/danh mục). */
  productsComplete?: boolean;
  categories?: string[];
};

export function productRecordToClientProduct(record: ProductRecord): Product {
  return {
    id: record.slug,
    name: record.name,
    category: record.categoryName ?? "Sản vật khác",
    categorySlug: record.categorySlug,
    origin: record.origin,
    weight: record.weight,
    price: record.price,
    image: record.image,
    tag: record.tag ?? "",
    description: record.description,
    modelUrl: record.modelUrl,
    inStock: record.inStock,
  };
}

export function serializeBootstrap(payload: BootstrapPayload): string {
  return serializeJsonLd(payload);
}

declare global {
  interface Window {
    __ASIN_BOOTSTRAP__?: BootstrapPayload;
  }
}

export function readBootstrap(): BootstrapPayload | null {
  if (typeof window === "undefined") return null;
  const payload = window.__ASIN_BOOTSTRAP__;
  if (!payload || typeof payload !== "object" || typeof payload.route !== "string") return null;
  return payload;
}

export function bootstrapScriptTag(payload: BootstrapPayload): string {
  return `<script>window.__ASIN_BOOTSTRAP__=${serializeBootstrap(payload)};</script>`;
}
