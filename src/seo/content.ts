/**
 * Đọc nội dung công khai cho renderer server (B01/B04/B17).
 * Chỉ dùng publishable/anon key nên RLS quyết định dữ liệu nào được trả về;
 * không dùng service-role ở đây.
 */

import { getSeoEnvironment, hasSiteDataConfig } from "./config.ts";
import type { SeoEnvironment } from "./config.ts";
import { articleFromRow, ARTICLE_PUBLIC_COLUMNS } from "../content/article.ts";
import type { ArticleRow, PublishedArticle } from "../content/article.ts";
import type { SeoArticleInput, SeoCategoryInput, SeoProductInput } from "./types.ts";
import type { RedirectRule } from "./paths.ts";
import { effectivePrice } from "../pricing.ts";
import type { Deal } from "../catalog.ts";

export type ArticleRecord = PublishedArticle;

export type ProductRecord = SeoProductInput & {
  id: string;
  origin: string;
  weight: string;
  modelUrl?: string;
};

export type CategoryRecord = {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
  description?: string;
};

export type SiteSettings = {
  content: Record<string, string>;
  support: {
    zaloUrl?: string;
    zaloEnabled?: boolean;
    contact?: Record<string, string>;
  };
};

export class ContentUnavailableError extends Error {}

type QueryResult<T> = { rows: T[]; total: number | null };

function encodeValue(value: string): string {
  return encodeURIComponent(value);
}

function timeoutSignal(): AbortSignal | undefined {
  return typeof AbortSignal !== "undefined" && "timeout" in AbortSignal ? AbortSignal.timeout(9000) : undefined;
}

export class SupabaseRest {
  private readonly env: SeoEnvironment;

  constructor(env: SeoEnvironment = getSeoEnvironment()) {
    this.env = env;
  }

  get enabled(): boolean {
    return hasSiteDataConfig(this.env);
  }

  private headers(preferCount = false): HeadersInit {
    return {
      apikey: this.env.supabasePublicKey,
      Authorization: `Bearer ${this.env.supabasePublicKey}`,
      Accept: "application/json",
      ...(preferCount ? { Prefer: "count=exact" } : {}),
    };
  }

  async select<T>(table: string, query: string, preferCount = false): Promise<QueryResult<T>> {
    if (!this.enabled) throw new ContentUnavailableError("Chưa cấu hình Supabase cho renderer.");
    const url = `${this.env.supabaseUrl}/rest/v1/${table}?${query}`;
    const response = await fetch(url, { headers: this.headers(preferCount), signal: timeoutSignal() });
    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as { code?: string };
      // PostgREST trả 416 cho offset vượt tổng số dòng: hết trang, không phải outage.
      const range = response.headers.get("content-range");
      const total = range ? Number.parseInt(range.split("/")[1] ?? "", 10) : NaN;
      if (response.status === 416 && error.code === "PGRST103" && Number.isFinite(total)) {
        return { rows: [], total };
      }
      throw new ContentUnavailableError(`Supabase ${table} trả về ${response.status}.`);
    }
    const rows = (await response.json()) as T[];
    let total: number | null = null;
    const range = response.headers.get("content-range");
    if (range && range.includes("/")) {
      const parsed = Number.parseInt(range.split("/")[1] ?? "", 10);
      if (Number.isFinite(parsed)) total = parsed;
    }
    return { rows, total };
  }

  async rpc<T>(fn: string, body: Record<string, unknown> = {}): Promise<T[]> {
    if (!this.enabled) throw new ContentUnavailableError("Chưa cấu hình Supabase cho renderer.");
    const response = await fetch(`${this.env.supabaseUrl}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: { ...this.headers(), "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: timeoutSignal(),
    });
    if (!response.ok) throw new ContentUnavailableError(`RPC ${fn} trả về ${response.status}.`);
    return (await response.json()) as T[];
  }
}

export type ArticlePage = {
  items: ArticleRecord[];
  total: number;
};

/** Bài đã đăng và đến hạn; RLS đã lọc bài nháp/hẹn giờ tương lai. */
export async function loadArticleBySlug(client: SupabaseRest, slug: string): Promise<ArticleRecord | null> {
  const filter = `&slug=eq.${encodeValue(slug)}&published=eq.true&limit=1`;
  const { rows } = await client.select<ArticleRow>("articles", `select=${ARTICLE_PUBLIC_COLUMNS}${filter}`);
  return rows[0] ? articleFromRow(rows[0]) : null;
}

export async function loadArticlesBySlugs(client: SupabaseRest, slugs: string[]): Promise<ArticleRecord[]> {
  const clean = slugs.filter((slug) => /^[a-z0-9-]+$/.test(slug)).slice(0, 6);
  if (!clean.length) return [];
  try {
    const { rows } = await client.select<ArticleRow>(
      "articles",
      `select=${ARTICLE_PUBLIC_COLUMNS}&published=eq.true&slug=in.(${clean.map(encodeValue).join(",")})`,
    );
    return rows.map(articleFromRow);
  } catch {
    return [];
  }
}

export async function loadArticleList(
  client: SupabaseRest,
  options: { offset?: number; limit?: number; topicSlug?: string } = {},
): Promise<ArticlePage> {
  const offset = Math.max(0, options.offset ?? 0);
  const limit = Math.min(50, Math.max(1, options.limit ?? 9));
  const filters = ["published=eq.true"];
  if (options.topicSlug) filters.push(`tag_slug=eq.${encodeValue(options.topicSlug)}`);
  const query = `select=${ARTICLE_PUBLIC_COLUMNS}&${filters.join("&")}&order=published_at.desc,id.asc&offset=${offset}&limit=${limit}`;
  // Không bỏ lọc chủ đề hoặc bỏ các trường SEO khi schema/dịch vụ lỗi.
  const { rows, total } = await client.select<ArticleRow>("articles", query, true);
  return { items: rows.map(articleFromRow), total: total ?? rows.length };
}

/** Đọc hết theo thứ tự ổn định; không bỏ im lặng bài thứ 501 hoặc redirect cũ. */
async function selectAll<T>(client: SupabaseRest, table: string, query: string): Promise<T[]> {
  const result: T[] = [];
  while (true) {
    const { rows, total } = await client.select<T>(table, `${query}&offset=${result.length}&limit=500`, true);
    result.push(...rows);
    if (total !== null && result.length >= total) return result;
    if (!rows.length) {
      if (total !== null && result.length < total) throw new ContentUnavailableError(`Thiếu dữ liệu ${table}.`);
      return result;
    }
    if (total === null && rows.length < 500) return result;
  }
}

export async function loadAllPublishedArticles(client: SupabaseRest): Promise<ArticleRecord[]> {
  return (await selectAll<ArticleRow>(client, "articles", `select=${ARTICLE_PUBLIC_COLUMNS}&published=eq.true&order=published_at.desc,id.asc`)).map(articleFromRow);
}

type ProductRow = {
  id: string;
  slug: string;
  sku: string;
  name: string;
  origin: string;
  weight_label: string;
  price_vnd: number;
  image_url: string;
  tag: string;
  description: string;
  model_url?: string | null;
  product_categories: { name: string; slug: string } | { name: string; slug: string }[] | null;
};

// `*` để không phụ thuộc cột mới (model_url) chưa được migrate trên môi trường chạy.
const PRODUCT_SELECT = "*, product_categories(name, slug)";

const first = <T,>(value: T | T[] | null | undefined): T | null =>
  Array.isArray(value) ? (value[0] ?? null) : (value ?? null);

function toProductRecord(row: ProductRow, stock: Map<string, boolean>, deals: Deal[]): ProductRecord {
  const category = first(row.product_categories);
  return {
    id: row.id,
    slug: row.slug,
    sku: row.sku,
    name: row.name,
    origin: row.origin,
    weight: row.weight_label,
    description: row.description,
    tag: row.tag,
    image: row.image_url,
    price: effectivePrice(row.slug, Number(row.price_vnd), deals),
    inStock: stock.get(row.slug),
    categoryName: category?.name,
    categorySlug: category?.slug,
    modelUrl: row.model_url ?? undefined,
  };
}

export async function loadProducts(client: SupabaseRest): Promise<ProductRecord[]> {
  const rows = await selectAll<ProductRow>(client,
    "products",
    `select=${PRODUCT_SELECT}&active=eq.true&order=sort_order,name,id`,
  );
  const [stock, deals] = await Promise.all([loadStockMap(client), loadProductDeals(client)]);
  return rows.map((row) => toProductRecord(row, stock, deals));
}

export async function loadProductBySlug(client: SupabaseRest, slug: string): Promise<ProductRecord | null> {
  const { rows } = await client.select<ProductRow>(
    "products",
    `select=${PRODUCT_SELECT}&active=eq.true&slug=eq.${encodeValue(slug)}&limit=1`,
  );
  const row = rows[0];
  if (!row) return null;
  const [stock, deals] = await Promise.all([loadStockMap(client), loadProductDeals(client)]);
  return toProductRecord(row, stock, deals);
}

type PromotionRow = { promotion_id: string; product_id: string; original_price_vnd: number; discount_percent: number; products: { slug: string } | { slug: string }[] };

async function loadProductDeals(client: SupabaseRest): Promise<Deal[]> {
  const now = new Date().toISOString();
  const rows = await selectAll<PromotionRow>(client, "promotion_products",
    `select=promotion_id,product_id,original_price_vnd,discount_percent,products!inner(slug),promotions!inner(is_active,starts_at,ends_at)&products.active=eq.true&promotions.is_active=eq.true&promotions.or=(starts_at.is.null,starts_at.lte.${now})&promotions.or=(ends_at.is.null,ends_at.gt.${now})&order=promotion_id,product_id`);
  return rows.flatMap(row => {
    const product = first(row.products);
    return product ? [{ id: `${row.promotion_id}:${row.product_id}`, productId: product.slug, originalPrice: Number(row.original_price_vnd), discount: Number(row.discount_percent), label: "", ending: "", color: "" }] : [];
  });
}

type StockRow = { slug: string; in_stock: boolean };

/** Tồn kho chỉ đọc qua RPC giới hạn (không mở bảng product_inventory). */
export async function loadStockMap(client: SupabaseRest): Promise<Map<string, boolean>> {
  try {
    const rows = await client.rpc<StockRow>("public_product_stock");
    return new Map(rows.map((row) => [row.slug, row.in_stock]));
  } catch {
    return new Map();
  }
}

type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  sort_order: number;
};

export async function loadCategories(client: SupabaseRest): Promise<CategoryRecord[]> {
  const rows = await selectAll<CategoryRow>(client,
    "product_categories",
    "select=id, slug, name, sort_order&order=sort_order,name,id",
  );
  return rows.map((row) => ({ id: row.id, slug: row.slug, name: row.name, sortOrder: Number(row.sort_order) }));
}

export async function loadRedirect(client: SupabaseRest, fromPath: string): Promise<RedirectRule | null> {
  if (!client.enabled) return null;
  let current = fromPath;
  let status: 301 | 308 = 308;
  const visited = new Set([fromPath]);
  for (let hop = 0; hop < 10; hop++) {
    const { rows } = await client.select<{ from_path: string; to_path: string; status: number }>(
      "url_redirects", `select=from_path,to_path,status&from_path=eq.${encodeValue(current)}&limit=1`);
    const row = rows[0];
    if (!row) return current === fromPath ? null : { fromPath, toPath: current, status };
    if (!row.to_path.startsWith("/") || row.to_path.startsWith("//") || visited.has(row.to_path)) throw new ContentUnavailableError("Redirect không hợp lệ.");
    current = row.to_path;
    visited.add(current);
    if (row.status === 301) status = 301;
  }
  throw new ContentUnavailableError("Chuỗi redirect quá dài.");
}

export async function loadRedirects(client: SupabaseRest): Promise<RedirectRule[]> {
  const rows = await selectAll<{ from_path: string; to_path: string; status: number }>(client, "url_redirects", "select=from_path,to_path,status&order=from_path");
  return rows.map((row) => ({ fromPath: row.from_path, toPath: row.to_path, status: row.status === 301 ? 301 : 308 }));
}

type SettingRow = { key: string; value: unknown };

function readStringRecord(value: unknown): Record<string, string> {
  const source = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  const output: Record<string, string> = {};
  for (const [key, item] of Object.entries(source)) if (typeof item === "string") output[key] = item;
  return output;
}

export async function loadSiteSettings(client: SupabaseRest): Promise<SiteSettings> {
  const empty: SiteSettings = { content: {}, support: {} };
  if (!client.enabled) return empty;
  try {
    const { rows } = await client.select<SettingRow>(
      "site_settings",
      "select=key, value&is_public=eq.true&key=in.(website_content,contact_support)",
    );
    const contentValue = rows.find((row) => row.key === "website_content")?.value;
    const supportValue = rows.find((row) => row.key === "contact_support")?.value;
    const supportSource =
      supportValue && typeof supportValue === "object" && !Array.isArray(supportValue)
        ? (supportValue as Record<string, unknown>)
        : {};
    return {
      content: readStringRecord(contentValue),
      support: {
        zaloUrl: typeof supportSource.zaloUrl === "string" ? supportSource.zaloUrl : undefined,
        zaloEnabled: supportSource.zaloEnabled === true,
        contact: readStringRecord(supportSource.contact),
      },
    };
  } catch {
    return empty;
  }
}

export function toSeoArticle(article: ArticleRecord): SeoArticleInput {
  return article;
}

export function toSeoProduct(product: ProductRecord): SeoProductInput {
  return product;
}

export function toSeoCategory(category: CategoryRecord, products: ProductRecord[]): SeoCategoryInput {
  const items = products.filter((product) => product.categorySlug === category.slug);
  return {
    slug: category.slug,
    name: category.name,
    products: items,
    image: items[0]?.image,
    description: category.description,
  };
}
