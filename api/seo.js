// server/http.ts
function nodeHandler(handler2) {
  return async (req, res) => {
    try {
      const chunks = [];
      let length = 0;
      if (req.body === void 0) {
        for await (const chunk of req) {
          const buffer = Buffer.from(chunk);
          length += buffer.length;
          if (length > 65536) {
            res.statusCode = 413;
            res.end();
            return;
          }
          chunks.push(buffer);
        }
      }
      const body = req.body === void 0 ? Buffer.concat(chunks).toString() : typeof req.body === "string" ? req.body : JSON.stringify(req.body);
      if (body.length > 65536) {
        res.statusCode = 413;
        res.end();
        return;
      }
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value)
          headers.set(key, Array.isArray(value) ? value.join(",") : value);
      }
      const request = new Request(`http://localhost${req.url ?? "/"}`, {
        method: req.method,
        headers,
        ...req.method !== "GET" && req.method !== "HEAD" ? { body } : {}
      });
      const response = await handler2(request);
      res.statusCode = response.status;
      response.headers.forEach((v, k) => res.setHeader(k, v));
      res.end(await response.text());
    } catch {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          error: "D\u1ECBch v\u1EE5 ch\u01B0a s\u1EB5n s\xE0ng. Ki\u1EC3m tra c\u1EA5u h\xECnh m\xE1y ch\u1EE7."
        })
      );
    }
  };
}

// src/seo/config.ts
var DEFAULT_SITE_ORIGIN = "https://asintaybac.com";
function readImportMetaEnv() {
  try {
    return import.meta.env ?? {};
  } catch {
    return {};
  }
}
function readProcessEnv() {
  try {
    if (typeof process === "undefined" || !process.env) return {};
    return process.env;
  } catch {
    return {};
  }
}
function readSeoEnv() {
  return { ...readImportMetaEnv(), ...readProcessEnv() };
}
function normalizeOrigin(value) {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    return `${url.protocol}//${url.host}`;
  } catch {
    return "";
  }
}
function hostWithoutPort(host) {
  return (host ?? "").trim().toLowerCase().replace(/:\d+$/, "");
}
function getSeoEnvironment(env = readSeoEnv()) {
  const canonicalOrigin = normalizeOrigin(env.SITE_URL) || normalizeOrigin(env.VITE_SITE_URL) || DEFAULT_SITE_ORIGIN;
  const canonicalHost = hostWithoutPort(new URL(canonicalOrigin).host);
  const alternateHost = canonicalHost.startsWith("www.") ? canonicalHost.slice(4) : `www.${canonicalHost}`;
  const extraHosts = (env.ASIN_SEO_INDEX_HOSTS ?? env.VITE_SEO_INDEX_HOSTS ?? "").split(",").map((host) => hostWithoutPort(host)).filter(Boolean);
  const indexableHosts = [.../* @__PURE__ */ new Set([canonicalHost, alternateHost, ...extraHosts])];
  return {
    canonicalOrigin,
    canonicalHost,
    indexableHosts,
    // Mở index chủ động sau khi duyệt nội dung. Cùng một biến build/runtime.
    indexingEnabled: env.VITE_SEO_INDEX_ENABLED === "true",
    supabaseUrl: (env.SUPABASE_URL || env.VITE_SUPABASE_URL || "").trim().replace(/\/+$/, ""),
    supabasePublicKey: env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || ""
  };
}
function isIndexableHost(host, env = getSeoEnvironment()) {
  return env.indexingEnabled && isProductionHost(host, env);
}
function isProductionHost(host, env = getSeoEnvironment()) {
  const clean = hostWithoutPort(host);
  if (!clean || clean === "localhost" || clean === "127.0.0.1" || clean.endsWith(".local") || clean.endsWith(".vercel.app")) return false;
  return env.indexableHosts.includes(clean);
}
function hasSiteDataConfig(env = getSeoEnvironment()) {
  return Boolean(env.supabaseUrl && env.supabasePublicKey);
}

// src/seo/robots.ts
function buildRobotsTxt(host, env = getSeoEnvironment()) {
  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /api/",
    "",
    ...isIndexableHost(host, env) ? [`Sitemap: ${env.canonicalOrigin}/sitemap.xml`] : [],
    ""
  ].join("\n");
}

// src/seo/head.ts
function escapeHtmlText(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// src/content/blocks.ts
var MAX_BLOCKS = 200;
var MAX_TEXT = 4e3;
var MAX_ITEMS = 30;
function cleanText(value, max = MAX_TEXT) {
  if (typeof value !== "string") return "";
  return value.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, max);
}
function isSafeHref(value) {
  const href = value.trim();
  if (!href) return false;
  if (href.startsWith("//")) return false;
  if (href.startsWith("/")) return !href.includes("\\") && !/^\/\s*\//.test(href);
  if (/^https:\/\//i.test(href)) return true;
  if (/^mailto:[^\s]+@[^\s]+$/i.test(href)) return true;
  if (/^tel:\+?[0-9\s().-]{6,20}$/i.test(href)) return true;
  return false;
}
function normalizeImageUrl(value) {
  const url = cleanText(value, 500);
  if (!url) return "";
  if (/^https:\/\//i.test(url)) return url;
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  return "";
}
function normalizeBlock(value) {
  if (!value || typeof value !== "object") return null;
  const block = value;
  switch (block.type) {
    case "paragraph": {
      const text = cleanText(block.text);
      return text ? { type: "paragraph", text } : null;
    }
    case "heading": {
      const text = cleanText(block.text, 300);
      const level = block.level === 3 ? 3 : 2;
      return text ? { type: "heading", level, text } : null;
    }
    case "list": {
      const items = Array.isArray(block.items) ? block.items.map((item) => cleanText(item, 500)).filter(Boolean).slice(0, MAX_ITEMS) : [];
      if (!items.length) return null;
      return { type: "list", ordered: block.ordered === true, items };
    }
    case "quote": {
      const text = cleanText(block.text);
      return text ? { type: "quote", text } : null;
    }
    case "image": {
      const url = normalizeImageUrl(block.url);
      if (!url) return null;
      return {
        type: "image",
        url,
        alt: cleanText(block.alt, 300),
        caption: cleanText(block.caption, 300)
      };
    }
    case "cta": {
      const label = cleanText(block.label, 120);
      const href = cleanText(block.href, 500);
      if (!label || !isSafeHref(href)) return null;
      return { type: "cta", label, href, productId: cleanText(block.productId, 120) };
    }
    case "divider":
      return { type: "divider" };
    default:
      return null;
  }
}
function parseArticleBody(value) {
  if (!Array.isArray(value)) return [];
  const body = [];
  for (const entry of value.slice(0, MAX_BLOCKS)) {
    if (typeof entry === "string") {
      const text = cleanText(entry);
      if (text) body.push(text);
      continue;
    }
    const block = normalizeBlock(entry);
    if (block) body.push(block);
  }
  return body;
}

// src/operations.ts
function slugify(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// src/content/article.ts
function formatVietnameseDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh"
  }).format(date).replaceAll("/", ".");
}
var ARTICLE_PUBLIC_COLUMNS = "id, slug, tag, tag_slug, title, excerpt, image_url, read_time_minutes, body, published, published_at, first_published_at, scheduled_at, content_modified_at, author_name, source_name, source_url, seo_title, seo_description, social_image_url, social_title, social_description, canonical_path, related_product_slugs, related_article_slugs";
var stringArray = (value) => Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
function articleFromRow(row) {
  const effectivePublishedAt = row.first_published_at ?? row.published_at;
  const products = stringArray(row.related_product_slugs);
  return {
    id: row.slug,
    slug: row.slug,
    tag: row.tag,
    tagSlug: row.tag_slug || slugify(row.tag),
    date: formatVietnameseDate(effectivePublishedAt),
    dateIso: effectivePublishedAt ? new Date(effectivePublishedAt).toISOString() : null,
    publishedAt: effectivePublishedAt,
    modifiedAt: row.content_modified_at ?? null,
    title: row.title,
    excerpt: row.excerpt,
    image: row.image_url,
    imageAlt: row.title,
    readTime: `${row.read_time_minutes} ph\xFAt \u0111\u1ECDc`,
    readMinutes: Number(row.read_time_minutes) || 1,
    body: parseArticleBody(row.body),
    authorName: row.author_name ?? null,
    seoTitle: row.seo_title ?? null,
    seoDescription: row.seo_description ?? null,
    socialImageUrl: row.social_image_url ?? null,
    socialTitle: row.social_title ?? null,
    socialDescription: row.social_description ?? null,
    relatedProductSlugs: products,
    relatedArticleSlugs: stringArray(row.related_article_slugs),
    sourceName: row.source_name ?? null,
    sourceUrl: row.source_url ?? null,
    canonicalPath: row.canonical_path ?? null
  };
}

// src/pricing.ts
function effectivePrice(productId, basePrice, deals) {
  return deals.filter((deal) => deal.productId === productId).reduce((price, deal) => {
    if (!Number.isFinite(deal.originalPrice) || deal.originalPrice < 0 || !Number.isFinite(deal.discount) || deal.discount < 0 || deal.discount > 100) return price;
    return Math.min(price, Math.round(deal.originalPrice * (100 - deal.discount) / 100));
  }, basePrice);
}

// src/seo/content.ts
var ContentUnavailableError = class extends Error {
};
function timeoutSignal() {
  return typeof AbortSignal !== "undefined" && "timeout" in AbortSignal ? AbortSignal.timeout(9e3) : void 0;
}
var SupabaseRest = class {
  env;
  constructor(env = getSeoEnvironment()) {
    this.env = env;
  }
  get enabled() {
    return hasSiteDataConfig(this.env);
  }
  headers(preferCount = false) {
    return {
      apikey: this.env.supabasePublicKey,
      Authorization: `Bearer ${this.env.supabasePublicKey}`,
      Accept: "application/json",
      ...preferCount ? { Prefer: "count=exact" } : {}
    };
  }
  async select(table, query, preferCount = false) {
    if (!this.enabled) throw new ContentUnavailableError("Ch\u01B0a c\u1EA5u h\xECnh Supabase cho renderer.");
    const url = `${this.env.supabaseUrl}/rest/v1/${table}?${query}`;
    const response = await fetch(url, { headers: this.headers(preferCount), signal: timeoutSignal() });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const range2 = response.headers.get("content-range");
      const total2 = range2 ? Number.parseInt(range2.split("/")[1] ?? "", 10) : NaN;
      if (response.status === 416 && error.code === "PGRST103" && Number.isFinite(total2)) {
        return { rows: [], total: total2 };
      }
      throw new ContentUnavailableError(`Supabase ${table} tr\u1EA3 v\u1EC1 ${response.status}.`);
    }
    const rows = await response.json();
    let total = null;
    const range = response.headers.get("content-range");
    if (range && range.includes("/")) {
      const parsed = Number.parseInt(range.split("/")[1] ?? "", 10);
      if (Number.isFinite(parsed)) total = parsed;
    }
    return { rows, total };
  }
  async rpc(fn, body = {}) {
    if (!this.enabled) throw new ContentUnavailableError("Ch\u01B0a c\u1EA5u h\xECnh Supabase cho renderer.");
    const response = await fetch(`${this.env.supabaseUrl}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: { ...this.headers(), "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: timeoutSignal()
    });
    if (!response.ok) throw new ContentUnavailableError(`RPC ${fn} tr\u1EA3 v\u1EC1 ${response.status}.`);
    return await response.json();
  }
};
async function selectAll(client, table, query) {
  const result = [];
  while (true) {
    const { rows, total } = await client.select(table, `${query}&offset=${result.length}&limit=500`, true);
    result.push(...rows);
    if (total !== null && result.length >= total) return result;
    if (!rows.length) {
      if (total !== null && result.length < total) throw new ContentUnavailableError(`Thi\u1EBFu d\u1EEF li\u1EC7u ${table}.`);
      return result;
    }
    if (total === null && rows.length < 500) return result;
  }
}
async function loadAllPublishedArticles(client) {
  return (await selectAll(client, "articles", `select=${ARTICLE_PUBLIC_COLUMNS}&published=eq.true&order=published_at.desc,id.asc`)).map(articleFromRow);
}
var PRODUCT_SELECT = "*, product_categories(name, slug)";
var first = (value) => Array.isArray(value) ? value[0] ?? null : value ?? null;
function toProductRecord(row, stock, deals) {
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
    modelUrl: row.model_url ?? void 0
  };
}
async function loadProducts(client) {
  const rows = await selectAll(
    client,
    "products",
    `select=${PRODUCT_SELECT}&active=eq.true&order=sort_order,name,id`
  );
  const [stock, deals] = await Promise.all([loadStockMap(client), loadProductDeals(client)]);
  return rows.map((row) => toProductRecord(row, stock, deals));
}
async function loadProductDeals(client) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const rows = await selectAll(
    client,
    "promotion_products",
    `select=promotion_id,product_id,original_price_vnd,discount_percent,products!inner(slug),promotions!inner(is_active,starts_at,ends_at)&products.active=eq.true&promotions.is_active=eq.true&promotions.or=(starts_at.is.null,starts_at.lte.${now})&promotions.or=(ends_at.is.null,ends_at.gt.${now})&order=promotion_id,product_id`
  );
  return rows.flatMap((row) => {
    const product = first(row.products);
    return product ? [{ id: `${row.promotion_id}:${row.product_id}`, productId: product.slug, originalPrice: Number(row.original_price_vnd), discount: Number(row.discount_percent), label: "", ending: "", color: "" }] : [];
  });
}
async function loadStockMap(client) {
  try {
    const rows = await client.rpc("public_product_stock");
    return new Map(rows.map((row) => [row.slug, row.in_stock]));
  } catch {
    return /* @__PURE__ */ new Map();
  }
}
async function loadCategories(client) {
  const rows = await selectAll(
    client,
    "product_categories",
    "select=id, slug, name, sort_order&order=sort_order,name,id"
  );
  return rows.map((row) => ({ id: row.id, slug: row.slug, name: row.name, sortOrder: Number(row.sort_order) }));
}
async function loadRedirects(client) {
  const rows = await selectAll(client, "url_redirects", "select=from_path,to_path,status&order=from_path");
  return rows.map((row) => ({ fromPath: row.from_path, toPath: row.to_path, status: row.status === 301 ? 301 : 308 }));
}

// src/seo/paths.ts
function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
function splitPages(pathname) {
  return safeDecode(pathname).split("/").filter((segment) => segment.length > 0);
}
var SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function matchSiteRoute(pathname, search) {
  const segments = splitPages(pathname);
  const canonicalSearch2 = new URLSearchParams(search);
  if (segments.length === 0) return { kind: "home" };
  const [first2, second, third] = segments;
  if (first2 === "admin") return { kind: "admin" };
  if (first2 === "san-pham") {
    if (segments.length === 1) {
      const productSlug = canonicalSearch2.get("product") ?? void 0;
      return { kind: "products", productSlug: productSlug && SLUG_PATTERN.test(productSlug) ? productSlug : void 0 };
    }
    if (segments.length === 2 && SLUG_PATTERN.test(second)) return { kind: "product", slug: second };
    return { kind: "notFound" };
  }
  if (first2 === "danh-muc") {
    if (segments.length === 2 && SLUG_PATTERN.test(second)) return { kind: "category", slug: second };
    return { kind: "notFound" };
  }
  if (first2 === "thiet-ke" && segments.length === 1) return { kind: "gift" };
  if (first2 === "gioi-thieu" && segments.length === 1) return { kind: "about" };
  if (first2 === "lien-he" && segments.length === 1) return { kind: "contact" };
  if (first2 === "huy-nhan-tin" && segments.length === 1) return { kind: "unsubscribe" };
  if (first2 === "tin-tuc") {
    const pageParam = Number.parseInt(canonicalSearch2.get("page") ?? "1", 10);
    const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.min(1e3, pageParam) : 1;
    if (segments.length === 1) {
      const topic = canonicalSearch2.get("chu-de") ?? void 0;
      return { kind: "news", page, topic: topic && SLUG_PATTERN.test(topic) ? topic : void 0 };
    }
    if (segments.length === 2 && SLUG_PATTERN.test(second)) return { kind: "article", slug: second };
    if (segments.length === 3 && second === "chu-de" && SLUG_PATTERN.test(third)) {
      return { kind: "news", page, topic: third };
    }
    return { kind: "notFound" };
  }
  return { kind: "notFound" };
}
function normalizePathname(pathname) {
  const decoded = safeDecode(pathname);
  const collapsed = decoded.replace(/\/{2,}/g, "/");
  const lower = collapsed.toLowerCase();
  let normalized = lower;
  if (normalized.length > 1 && normalized.endsWith("/")) normalized = normalized.replace(/\/+$/, "");
  if (normalized.length === 0) normalized = "/";
  if (normalized !== decoded) return { pathname: normalized, search: "", redirectTo: normalized };
  return { pathname: normalized, search: "" };
}
function articleCanonicalPath(article) {
  const candidate = article.canonicalPath?.trim();
  if (!candidate || !/^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*\/?)*$/.test(candidate)) return `/tin-tuc/${article.slug}`;
  const path = normalizePathname(candidate).pathname;
  const route = matchSiteRoute(path, new URLSearchParams());
  return ["notFound", "admin", "unsubscribe"].includes(route.kind) ? `/tin-tuc/${article.slug}` : path;
}

// src/seo/sitemap.ts
var STATIC_PAGES = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/san-pham", changefreq: "weekly", priority: "0.9" },
  { path: "/thiet-ke", changefreq: "monthly", priority: "0.8" },
  { path: "/gioi-thieu", changefreq: "monthly", priority: "0.6" },
  { path: "/tin-tuc", changefreq: "weekly", priority: "0.7" },
  { path: "/lien-he", changefreq: "yearly", priority: "0.5" }
];
function urlTag(entry) {
  return [
    "<url>",
    `<loc>${escapeHtmlText(entry.loc)}</loc>`,
    entry.lastmod ? `<lastmod>${escapeHtmlText(entry.lastmod)}</lastmod>` : "",
    entry.changefreq ? `<changefreq>${entry.changefreq}</changefreq>` : "",
    entry.priority ? `<priority>${entry.priority}</priority>` : "",
    "</url>"
  ].filter(Boolean).join("");
}
function renderSitemapXml(entries) {
  if (entries.length > 5e4) throw new Error("C\u1EA7n chia sitemap tr\u01B0\u1EDBc khi v\u01B0\u1EE3t 50.000 URL.");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(urlTag).join("\n")}
</urlset>
`;
}
function keepIndexable(origin, pathname, redirects, seen) {
  if (redirects.has(pathname)) return false;
  const route = matchSiteRoute(pathname, new URLSearchParams());
  if (route.kind === "notFound" || route.kind === "admin" || route.kind === "unsubscribe") return false;
  if (seen.has(pathname)) return false;
  seen.add(pathname);
  return pathname.startsWith("/") && !pathname.startsWith("//") && origin.startsWith("http");
}
async function buildSitemapEntries(host, env = getSeoEnvironment(), client = new SupabaseRest(env)) {
  if (!isIndexableHost(host, env)) return [];
  const origin = env.canonicalOrigin;
  const entries = [];
  const redirects = new Set((await loadRedirects(client)).map((rule) => rule.fromPath));
  const seen = /* @__PURE__ */ new Set();
  for (const page of STATIC_PAGES) {
    if (keepIndexable(origin, page.path, redirects, seen)) {
      entries.push({ loc: `${origin}${page.path}`, changefreq: page.changefreq, priority: page.priority });
    }
  }
  const [categories, products, articles] = await Promise.all([
    loadCategories(client),
    loadProducts(client),
    loadAllPublishedArticles(client)
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
      entries.push({ loc: `${origin}${path}`, lastmod: article.modifiedAt ?? article.publishedAt ?? void 0 });
    }
    if (article.tagSlug) {
      const topicPath = `/tin-tuc/chu-de/${article.tagSlug}`;
      if (keepIndexable(origin, topicPath, redirects, seen)) entries.push({ loc: `${origin}${topicPath}` });
    }
  }
  return entries;
}
async function buildSitemapXml(host, env = getSeoEnvironment()) {
  return renderSitemapXml(await buildSitemapEntries(host, env));
}

// src/seo/cachePolicy.ts
var PUBLIC_CONTENT_CACHE = "public, max-age=0, s-maxage=60, must-revalidate";

// server/seo/handler.ts
function htmlResponse(html, status, cacheControl, extra = {}) {
  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": cacheControl,
      "X-Content-Type-Options": "nosniff",
      ...extra
    }
  });
}
async function handleSeoAsset(asset, host, envInput) {
  const env = envInput ?? getSeoEnvironment();
  if (asset === "robots") {
    return new Response(buildRobotsTxt(host, env), {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": PUBLIC_CONTENT_CACHE
      }
    });
  }
  let xml;
  try {
    xml = await buildSitemapXml(host, env);
  } catch {
    console.error("[seo/sitemap] Kh\xF4ng \u0111\u1ECDc \u0111\u1EE7 ngu\u1ED3n d\u1EEF li\u1EC7u c\xF4ng khai.");
    return new Response("Sitemap temporarily unavailable. Retry later.\n", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "Retry-After": "60", "X-Robots-Tag": "noindex" } });
  }
  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": PUBLIC_CONTENT_CACHE,
      ...!isIndexableHost(host, env) ? { "X-Robots-Tag": "noindex" } : {}
    }
  });
}
function renderUnavailableResponse() {
  return htmlResponse(
    `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>A S\u1EC9n t\u1EA1m th\u1EDDi gi\xE1n \u0111o\u1EA1n</title><meta name="robots" content="noindex"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><h1>A S\u1EC9n \u0111ang b\u1EA3o tr\xEC ng\u1EAFn.</h1><p>Vui l\xF2ng th\u1EED l\u1EA1i sau \xEDt ph\xFAt.</p></body></html>`,
    503,
    "no-store",
    { "Retry-After": "120" }
  );
}

// server/api/seo.ts
async function handler(request) {
  const url = new URL(request.url);
  const asset = url.searchParams.get("asset") === "sitemap" ? "sitemap" : "robots";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  try {
    return await handleSeoAsset(asset, host);
  } catch (error) {
    console.error("[api/seo]", asset, error);
    return renderUnavailableResponse();
  }
}
var seo_default = nodeHandler(handler);
export {
  seo_default as default
};
