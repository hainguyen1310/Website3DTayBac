import type { Deal, Product } from "../catalog";
import { supabase } from "../utils/supabase";
import { cached } from "./cache";
import { brandCopy } from "../branding";

type ProductRow = {
  slug: string;
  name: string;
  origin: string;
  weight_label: string;
  price_vnd: number;
  image_url: string;
  tag: string;
  description: string;
  featured: boolean;
  model_url?: string | null;
  product_categories: { name: string; slug: string } | { name: string; slug: string }[] | null;
};

type StockRow = { slug: string; in_stock: boolean };

/** Lỗi nguồn tồn kho giữ trạng thái chưa biết, không khẳng định còn hàng. */
async function loadStock(): Promise<Map<string, boolean>> {
  try {
    const { data, error } = await supabase.rpc("public_product_stock");
    if (error) return new Map();
    return new Map(((data ?? []) as StockRow[]).map((row) => [row.slug, row.in_stock]));
  } catch {
    return new Map();
  }
}

function toProduct(row: ProductRow, stock: Map<string, boolean>): Product {
  return {
    id: row.slug,
    name: brandCopy(row.name),
    category: brandCopy(first(row.product_categories)?.name ?? "Sản vật khác"),
    categorySlug: first(row.product_categories)?.slug,
    origin: row.origin,
    weight: row.weight_label,
    price: Number(row.price_vnd),
    // Migrate the bundled legacy preview while the remote media sync is pending.
    // Uploaded/customized DB image URLs continue to take precedence.
    image:
      row.slug === "jerky" && row.image_url === "/images/jerky.webp"
        ? "/images/products/buffalo.webp"
        : row.image_url,
    tag: brandCopy(row.tag),
    description: brandCopy(row.description),
    featured: row.featured,
    modelUrl: row.model_url || undefined,
    inStock: stock.get(row.slug),
  };
}

type DealRow = {
  promotion_id: string;
  product_id: string;
  original_price_vnd: number;
  discount_percent: number;
  display_label: string;
  display_ending: string;
  accent: string;
  products: { slug: string } | { slug: string }[] | null;
};

const first = <T>(value: T | T[] | null): T | null =>
  Array.isArray(value) ? (value[0] ?? null) : value;

/** Sản phẩm đang bán, đọc công khai qua policy RLS `active = true`. */
export function listStorefrontProducts(): Promise<Product[]> {
  return cached(
    "store:products",
    async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_categories(name, slug)")
        .eq("active", true)
        .order("sort_order")
        .order("name");

      if (error) throw error;
      const stock = await loadStock();
      return ((data ?? []) as ProductRow[]).map((row) => toProduct(row, stock));
    },
    60_000,
  );
}

/** Chi tiết sản phẩm cho URL riêng `/san-pham/:slug` (B05). */
export function getStorefrontProduct(slug: string): Promise<Product | null> {
  const normalized = slug.trim().toLowerCase();
  if (!/^[a-z0-9-]+$/.test(normalized)) return Promise.resolve(null);
  return listStorefrontProducts().then(
    (products) => products.find((product) => product.id === normalized) ?? null,
  );
}

export type StorefrontCategory = {
  slug: string;
  name: string;
  sortOrder: number;
};

export function listStorefrontCategoryRecords(): Promise<StorefrontCategory[]> {
  return cached(
    "store:category-records",
    async () => {
      const { data, error } = await supabase
        .from("product_categories")
        .select("slug, name, sort_order")
        .order("sort_order")
        .order("name");

      if (error) throw error;
      return (data ?? []).map((row) => ({
        slug: String(row.slug),
        name: brandCopy(String(row.name)),
        sortOrder: Number(row.sort_order),
      }));
    },
    60_000,
  );
}

export function listStorefrontCategories(): Promise<string[]> {
  return cached(
    "store:categories",
    async () => {
      const { data, error } = await supabase
        .from("product_categories")
        .select("name, sort_order")
        .order("sort_order");

      if (error) throw error;
      return (data ?? []).map((row) => brandCopy(row.name as string));
    },
    60_000,
  );
}

/**
 * Ưu đãi đang chạy. Policy RLS đã lọc promotion đang bật và trong thời gian
 * hiệu lực, nên chỉ cần đọc bảng nối.
 */
export function listStorefrontDeals(): Promise<Deal[]> {
  return cached(
    "store:deals",
    async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("promotion_products")
        .select(
          "promotion_id, product_id, original_price_vnd, discount_percent, display_label, display_ending, accent, sort_order, products!inner(slug), promotions!inner(is_active, starts_at, ends_at)",
        )
        .eq("products.active", true)
        .eq("promotions.is_active", true)
        .or(`starts_at.is.null,starts_at.lte.${now}`, {
          referencedTable: "promotions",
        })
        .or(`ends_at.is.null,ends_at.gt.${now}`, {
          referencedTable: "promotions",
        })
        .order("sort_order");

      if (error) throw error;
      return ((data ?? []) as DealRow[]).flatMap((row) => {
        const product = first(row.products);
        if (!product) return [];
        return [
          {
            id: `${row.promotion_id}:${row.product_id}`,
            productId: product.slug,
            label: brandCopy(row.display_label),
            originalPrice: Number(row.original_price_vnd),
            discount: Number(row.discount_percent),
            ending: row.display_ending,
            color: row.accent,
          },
        ];
      });
    },
    60_000,
  );
}

/** Câu thông báo trên thanh announcement, lấy từ site_settings công khai. */
export function getStorefrontNotice(): Promise<string | null> {
  return cached(
    "store:notice",
    async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "storefront_notice")
        .maybeSingle();

      if (error) throw error;
      const value = data?.value as { text?: unknown } | null | undefined;
      return typeof value?.text === "string" && value.text.trim()
        ? brandCopy(value.text.trim())
        : null;
    },
    60_000,
  );
}
