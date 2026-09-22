import type { Deal, Product } from "../catalog";
import { supabase } from "../utils/supabase";

type ProductRow = {
  slug: string;
  name: string;
  origin: string;
  weight_label: string;
  price_vnd: number;
  image_url: string;
  tag: string;
  description: string;
  product_categories: { name: string } | { name: string }[] | null;
};

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

const first = <T,>(value: T | T[] | null): T | null =>
  Array.isArray(value) ? (value[0] ?? null) : value;

/** Sản phẩm đang bán, đọc công khai qua policy RLS `active = true`. */
export async function listStorefrontProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select(
      "slug, name, origin, weight_label, price_vnd, image_url, tag, description, product_categories(name)",
    )
    .eq("active", true)
    .order("sort_order")
    .order("name");

  if (error) throw error;
  return ((data ?? []) as ProductRow[]).map((row) => ({
    id: row.slug,
    name: row.name,
    category: first(row.product_categories)?.name ?? "Sản vật khác",
    origin: row.origin,
    weight: row.weight_label,
    price: Number(row.price_vnd),
    image: row.image_url,
    tag: row.tag,
    description: row.description,
  }));
}

export async function listStorefrontCategories(): Promise<string[]> {
  const { data, error } = await supabase
    .from("product_categories")
    .select("name, sort_order")
    .order("sort_order");

  if (error) throw error;
  return (data ?? []).map((row) => row.name as string);
}

/**
 * Ưu đãi đang chạy. Policy RLS đã lọc promotion đang bật và trong thời gian
 * hiệu lực, nên chỉ cần đọc bảng nối.
 */
export async function listStorefrontDeals(): Promise<Deal[]> {
  const { data, error } = await supabase
    .from("promotion_products")
    .select(
      "promotion_id, product_id, original_price_vnd, discount_percent, display_label, display_ending, accent, sort_order, products(slug)",
    )
    .order("sort_order");

  if (error) throw error;
  return ((data ?? []) as DealRow[]).flatMap((row) => {
    const product = first(row.products);
    if (!product) return [];
    return [
      {
        id: `${row.promotion_id}:${row.product_id}`,
        productId: product.slug,
        label: row.display_label,
        originalPrice: Number(row.original_price_vnd),
        discount: Number(row.discount_percent),
        ending: row.display_ending,
        color: row.accent,
      },
    ];
  });
}

/** Câu thông báo trên thanh announcement, lấy từ site_settings công khai. */
export async function getStorefrontNotice(): Promise<string | null> {
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "storefront_notice")
    .maybeSingle();

  if (error) throw error;
  const value = data?.value as { text?: unknown } | null | undefined;
  return typeof value?.text === "string" && value.text.trim()
    ? value.text.trim()
    : null;
}
