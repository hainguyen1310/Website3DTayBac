/**
 * Sitemap XML cho URL canonical đang index (B04/B17):
 * - chỉ trang nội dung, danh mục/sản phẩm, bài đã đăng và đến hạn;
 * - loại nháp, noindex, URL redirect và 404;
 * - `lastmod` lấy từ ngày sửa nội dung thật khi có.
 */

import { escapeHtmlText } from "./head.ts";
import { getSeoEnvironment, isIndexableHost } from "./config.ts";
import type { SeoEnvironment } from "./config.ts";
import { loadAllPublishedArticles, loadCategories, loadProducts, SupabaseRest } from "./content.ts";
import { loadRedirects } from "./content.ts";
import { articleCanonicalPath, matchSiteRoute } from "./paths.ts";

const STATIC_PAGES: Array<{ path: string; changefreq: string; priority: string }> = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/san-pham", changefreq: "weekly", priority: "0.9" },
  { path: "/thiet-ke", changefreq: "monthly", priority: "0.8" },
  { path: "/gioi-thieu", changefreq: "monthly", priority: "0.6" },
  { path: "/tin-tuc", changefreq: "weekly", priority: "0.7" },
  { path: "/lien-he", changefreq: "yearly", priority: "0.5" },
];

type Entry = { loc: string; lastmod?: string; changefreq?: string; priority?: string };

function urlTag(entry: Entry): string {
  return [
    "<url>",
    `<loc>${escapeHtmlText(entry.loc)}</loc>`,
    entry.lastmod ? `<lastmod>${escapeHtmlText(entry.lastmod)}</lastmod>` : "",
    entry.changefreq ? `<changefreq>${entry.changefreq}</changefreq>` : "",
    entry.priority ? `<priority>${entry.priority}</priority>` : "",
    "</url>",
  ]
    .filter(Boolean)
    .join("");
}

export function renderSitemapXml(entries: Entry[]): string {
  if (entries.length > 50_000) throw new Error("Cần chia sitemap trước khi vượt 50.000 URL.");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries
    .map(urlTag)
    .join("\n")}\n</urlset>\n`;
}

/** URL luôn được kiểm lại bằng bộ match route để không phát tán URL không tồn tại. */
function keepIndexable(origin: string, pathname: string, redirects: Set<string>, seen: Set<string>): boolean {
  if (redirects.has(pathname)) return false;
  const route = matchSiteRoute(pathname, new URLSearchParams());
  if (route.kind === "notFound" || route.kind === "admin" || route.kind === "unsubscribe") return false;
  if (seen.has(pathname)) return false;
  seen.add(pathname);
  return pathname.startsWith("/") && !pathname.startsWith("//") && origin.startsWith("http");
}

export async function buildSitemapEntries(
  host: string | undefined,
  env: SeoEnvironment = getSeoEnvironment(),
  client: SupabaseRest = new SupabaseRest(env),
): Promise<Entry[]> {
  if (!isIndexableHost(host, env)) return [];
  const origin = env.canonicalOrigin;
  const entries: Entry[] = [];
  const redirects = new Set((await loadRedirects(client)).map((rule) => rule.fromPath));
  const seen = new Set<string>();

  for (const page of STATIC_PAGES) {
    if (keepIndexable(origin, page.path, redirects, seen)) {
      entries.push({ loc: `${origin}${page.path}`, changefreq: page.changefreq, priority: page.priority });
    }
  }

  // Chỉ xuất sitemap khi đọc được đầy đủ nguồn; lỗi được handler trả 503/no-store.
  const [categories, products, articles] = await Promise.all([
    loadCategories(client), loadProducts(client), loadAllPublishedArticles(client),
  ]);
  for (const category of categories) {
    const path = `/danh-muc/${category.slug}`;
    if (keepIndexable(origin, path, redirects, seen)) entries.push({ loc: `${origin}${path}` });
  }
  for (const product of products) {
    const path = `/san-pham/${product.slug}`;
    if (keepIndexable(origin, path, redirects, seen)) entries.push({ loc: `${origin}${path}` });
  }
  for (const article of articles) {
    const path = `/tin-tuc/${article.slug}`;
    if (articleCanonicalPath(article) === path && keepIndexable(origin, path, redirects, seen)) {
      entries.push({ loc: `${origin}${path}`, lastmod: article.modifiedAt ?? article.publishedAt ?? undefined });
    }
    if (article.tagSlug) {
      const topicPath = `/tin-tuc/chu-de/${article.tagSlug}`;
      if (keepIndexable(origin, topicPath, redirects, seen)) entries.push({ loc: `${origin}${topicPath}` });
    }
  }

  return entries;
}

export async function buildSitemapXml(host: string | undefined, env: SeoEnvironment = getSeoEnvironment()): Promise<string> {
  return renderSitemapXml(await buildSitemapEntries(host, env));
}
