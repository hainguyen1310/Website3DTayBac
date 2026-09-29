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

// server/seo/handler.ts
import { readFile } from "node:fs/promises";
import { join } from "node:path";

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

// src/seo/head.ts
function escapeHtmlAttribute(value) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeHtmlText(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function serializeJsonLd(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}
function tag(name, attrs, selfClosing = true) {
  const body = Object.entries({ ...attrs, "data-asin-seo": attrs.name || attrs.property || attrs.rel }).filter(([, value]) => value !== void 0 && value !== "").map(([key, value]) => `${key}="${escapeHtmlAttribute(String(value))}"`).join(" ");
  return selfClosing ? `<${name}${body ? ` ${body}` : ""}>` : `<${name}${body ? ` ${body}` : ""}></${name}>`;
}
var SEO_HEAD_MARKER_START = "<!--seo:head:start-->";
var SEO_HEAD_MARKER_END = "<!--seo:head:end-->";
function renderHeadTags(meta2) {
  const tags = [
    `<title>${escapeHtmlText(meta2.title)}</title>`,
    tag("meta", { name: "description", content: meta2.description }),
    tag("meta", { name: "robots", content: meta2.robots }),
    tag("link", { rel: "canonical", href: meta2.canonical }),
    tag("meta", { property: "og:type", content: meta2.ogType }),
    tag("meta", { property: "og:site_name", content: "A S\u1EC9n T\xE2y B\u1EAFc" }),
    tag("meta", { property: "og:locale", content: "vi_VN" }),
    tag("meta", { property: "og:title", content: meta2.ogTitle }),
    tag("meta", { property: "og:description", content: meta2.ogDescription }),
    tag("meta", { property: "og:url", content: meta2.canonical }),
    tag("meta", { property: "og:image", content: meta2.ogImage.url }),
    tag("meta", { name: "twitter:card", content: meta2.twitterCard }),
    tag("meta", { name: "twitter:title", content: meta2.ogTitle }),
    tag("meta", { name: "twitter:description", content: meta2.ogDescription }),
    tag("meta", { name: "twitter:image", content: meta2.ogImage.url })
  ];
  if (meta2.ogImage.alt) tags.push(tag("meta", { property: "og:image:alt", content: meta2.ogImage.alt }));
  if (meta2.ogImage.width) tags.push(tag("meta", { property: "og:image:width", content: String(meta2.ogImage.width) }));
  if (meta2.ogImage.height) tags.push(tag("meta", { property: "og:image:height", content: String(meta2.ogImage.height) }));
  if (meta2.article?.publishedTime) tags.push(tag("meta", { property: "article:published_time", content: meta2.article.publishedTime }));
  if (meta2.article?.modifiedTime) tags.push(tag("meta", { property: "article:modified_time", content: meta2.article.modifiedTime }));
  if (meta2.article?.author) tags.push(tag("meta", { property: "article:author", content: meta2.article.author }));
  if (meta2.article?.section) tags.push(tag("meta", { property: "article:section", content: meta2.article.section }));
  for (const node of meta2.jsonLd) {
    tags.push(
      `<script type="application/ld+json" data-asin-seo-jsonld="">${serializeJsonLd(node)}</script>`
    );
  }
  return tags.join("\n    ");
}
function injectSeoIntoHtml(template, headHtml, rootHtml, htmlAttributes) {
  let output = template;
  const headBlock = `${SEO_HEAD_MARKER_START}
    ${headHtml}
    ${SEO_HEAD_MARKER_END}`;
  if (output.includes(SEO_HEAD_MARKER_START)) {
    output = output.replace(
      new RegExp(`${SEO_HEAD_MARKER_START}[\\s\\S]*?${SEO_HEAD_MARKER_END}`),
      headBlock
    );
  } else {
    output = output.replace("</head>", `    ${headBlock}
  </head>`);
  }
  if (!output.includes(SEO_HEAD_MARKER_START)) {
    output = output.replace(/<title>[\s\S]*?<\/title>\s*/i, "");
  }
  output = output.replace(
    /<div id="root">[\s\S]*?<\/div>/i,
    `<div id="root">${rootHtml}</div>`
  );
  if (htmlAttributes) {
    output = output.replace(/<html\b[^>]*>/i, (match) => {
      let next = match;
      for (const [key, value] of Object.entries(htmlAttributes)) {
        const pattern = new RegExp(`\\s${key}="[^"]*"`, "i");
        if (pattern.test(next)) next = next.replace(pattern, ` ${key}="${escapeHtmlAttribute(value)}"`);
        else next = next.replace(/>$/, ` ${key}="${escapeHtmlAttribute(value)}">`);
      }
      return next;
    });
  }
  return output;
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
function toBlocks(body) {
  return body.map(
    (entry) => typeof entry === "string" ? { type: "paragraph", text: entry } : entry
  );
}
function escapeHtml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function renderInline(text) {
  let output = escapeHtml(text);
  output = output.replace(/\[([^\]]{1,200})\]\(([^()\s]{1,500})\)/g, (match, label, href) => {
    const decodedHref = href.replace(/&amp;/g, "&");
    if (!isSafeHref(decodedHref)) return match;
    const rel = /^https:\/\//i.test(decodedHref) ? ' rel="noopener noreferrer" target="_blank"' : "";
    return `<a href="${escapeHtml(decodedHref)}"${rel}>${label}</a>`;
  });
  output = output.replace(/\*\*([^*]{1,300})\*\*/g, "<strong>$1</strong>");
  return output;
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
function encodeValue(value) {
  return encodeURIComponent(value);
}
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
async function loadArticleBySlug(client, slug) {
  const filter = `&slug=eq.${encodeValue(slug)}&published=eq.true&limit=1`;
  const { rows } = await client.select("articles", `select=${ARTICLE_PUBLIC_COLUMNS}${filter}`);
  return rows[0] ? articleFromRow(rows[0]) : null;
}
async function loadArticlesBySlugs(client, slugs) {
  const clean = slugs.filter((slug) => /^[a-z0-9-]+$/.test(slug)).slice(0, 6);
  if (!clean.length) return [];
  try {
    const { rows } = await client.select(
      "articles",
      `select=${ARTICLE_PUBLIC_COLUMNS}&published=eq.true&slug=in.(${clean.map(encodeValue).join(",")})`
    );
    return rows.map(articleFromRow);
  } catch {
    return [];
  }
}
async function loadArticleList(client, options = {}) {
  const offset = Math.max(0, options.offset ?? 0);
  const limit = Math.min(50, Math.max(1, options.limit ?? 9));
  const filters = ["published=eq.true"];
  if (options.topicSlug) filters.push(`tag_slug=eq.${encodeValue(options.topicSlug)}`);
  const query = `select=${ARTICLE_PUBLIC_COLUMNS}&${filters.join("&")}&order=published_at.desc,id.asc&offset=${offset}&limit=${limit}`;
  const { rows, total } = await client.select("articles", query, true);
  return { items: rows.map(articleFromRow), total: total ?? rows.length };
}
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
async function loadProductBySlug(client, slug) {
  const { rows } = await client.select(
    "products",
    `select=${PRODUCT_SELECT}&active=eq.true&slug=eq.${encodeValue(slug)}&limit=1`
  );
  const row = rows[0];
  if (!row) return null;
  const [stock, deals] = await Promise.all([loadStockMap(client), loadProductDeals(client)]);
  return toProductRecord(row, stock, deals);
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
async function loadRedirect(client, fromPath) {
  if (!client.enabled) return null;
  let current = fromPath;
  let status = 308;
  const visited = /* @__PURE__ */ new Set([fromPath]);
  for (let hop = 0; hop < 10; hop++) {
    const { rows } = await client.select(
      "url_redirects",
      `select=from_path,to_path,status&from_path=eq.${encodeValue(current)}&limit=1`
    );
    const row = rows[0];
    if (!row) return current === fromPath ? null : { fromPath, toPath: current, status };
    if (!row.to_path.startsWith("/") || row.to_path.startsWith("//") || visited.has(row.to_path)) throw new ContentUnavailableError("Redirect kh\xF4ng h\u1EE3p l\u1EC7.");
    current = row.to_path;
    visited.add(current);
    if (row.status === 301) status = 301;
  }
  throw new ContentUnavailableError("Chu\u1ED7i redirect qu\xE1 d\xE0i.");
}
function readStringRecord(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const output = {};
  for (const [key, item] of Object.entries(source)) if (typeof item === "string") output[key] = item;
  return output;
}
async function loadSiteSettings(client) {
  const empty = { content: {}, support: {} };
  if (!client.enabled) return empty;
  try {
    const { rows } = await client.select(
      "site_settings",
      "select=key, value&is_public=eq.true&key=in.(website_content,contact_support)"
    );
    const contentValue = rows.find((row) => row.key === "website_content")?.value;
    const supportValue = rows.find((row) => row.key === "contact_support")?.value;
    const supportSource = supportValue && typeof supportValue === "object" && !Array.isArray(supportValue) ? supportValue : {};
    return {
      content: readStringRecord(contentValue),
      support: {
        zaloUrl: typeof supportSource.zaloUrl === "string" ? supportSource.zaloUrl : void 0,
        zaloEnabled: supportSource.zaloEnabled === true,
        contact: readStringRecord(supportSource.contact)
      }
    };
  } catch {
    return empty;
  }
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
function absoluteUrl(origin, pathname, query = "") {
  const base = origin.replace(/\/+$/, "");
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return query ? `${base}${path}?${query}` : `${base}${path}`;
}
function articleCanonicalPath(article) {
  const candidate = article.canonicalPath?.trim();
  if (!candidate || !/^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*\/?)*$/.test(candidate)) return `/tin-tuc/${article.slug}`;
  const path = normalizePathname(candidate).pathname;
  const route = matchSiteRoute(path, new URLSearchParams());
  return ["notFound", "admin", "unsubscribe"].includes(route.kind) ? `/tin-tuc/${article.slug}` : path;
}
function routePath(route) {
  switch (route.kind) {
    case "home":
      return "/";
    case "products":
      return route.productSlug ? `/san-pham/${route.productSlug}` : "/san-pham";
    case "product":
      return `/san-pham/${route.slug}`;
    case "category":
      return `/danh-muc/${route.slug}`;
    case "gift":
      return "/thiet-ke";
    case "about":
      return "/gioi-thieu";
    case "news": {
      if (route.topic) return `/tin-tuc/chu-de/${route.topic}`;
      return "/tin-tuc";
    }
    case "article":
      return `/tin-tuc/${route.slug}`;
    case "contact":
      return "/lien-he";
    case "unsubscribe":
      return "/huy-nhan-tin";
    case "admin":
      return "/admin";
    default:
      return "/";
  }
}

// src/seo/bootstrap.ts
function productRecordToClientProduct(record) {
  return {
    id: record.slug,
    name: record.name,
    category: record.categoryName ?? "S\u1EA3n v\u1EADt kh\xE1c",
    categorySlug: record.categorySlug,
    origin: record.origin,
    weight: record.weight,
    price: record.price,
    image: record.image,
    tag: record.tag ?? "",
    description: record.description,
    modelUrl: record.modelUrl,
    inStock: record.inStock
  };
}
function serializeBootstrap(payload) {
  return serializeJsonLd(payload);
}
function bootstrapScriptTag(payload) {
  return `<script>window.__ASIN_BOOTSTRAP__=${serializeBootstrap(payload)};</script>`;
}

// src/seo/cachePolicy.ts
var PUBLIC_CONTENT_CACHE = "public, max-age=0, s-maxage=60, must-revalidate";

// src/seo/types.ts
function noindexRobots() {
  return "noindex, nofollow";
}
function indexRobots() {
  return "index, follow, max-image-preview:large, max-snippet:-1";
}

// src/seo/meta.ts
function absolute(origin, value) {
  const raw = (value ?? "").trim();
  if (!raw) return absoluteUrl(origin, "/favicon.svg");
  if (/^https?:\/\//i.test(raw)) return raw;
  return absoluteUrl(origin, raw.startsWith("/") ? raw : `/${raw}`);
}
function image(url, alt, origin, fallback) {
  const src = (url ?? "").trim();
  if (!src) return fallback;
  return { url: absolute(origin, src), alt };
}
function trimDescription(value, max = 165) {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}\u2026`;
}
function trimTitle(value, max = 65) {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}\u2026`;
}
function meta(input) {
  const { ctx } = input;
  const canonical = absoluteUrl(ctx.origin, input.canonicalPath, input.canonicalQuery ?? "");
  const ogImage = input.image ?? ctx.defaultImage;
  const robots = input.robots ?? (ctx.indexable ? indexRobots() : noindexRobots());
  return {
    title: input.title,
    description: trimDescription(input.description),
    canonical,
    robots,
    ogType: input.ogType ?? "website",
    ogImage,
    ogTitle: input.ogTitle ?? input.title,
    ogDescription: trimDescription(input.ogDescription ?? input.description),
    twitterCard: ogImage.width && ogImage.width < 700 ? "summary" : "summary_large_image",
    article: input.article,
    jsonLd: input.jsonLd ?? []
  };
}
function organizationJsonLd(ctx) {
  const node = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: ctx.brand.name,
    url: ctx.origin,
    logo: ctx.logoUrl,
    description: ctx.brand.description
  };
  if (ctx.contact.phone) node.telephone = ctx.contact.phone;
  if (ctx.contact.email) node.email = ctx.contact.email;
  if (ctx.contact.address) {
    node.address = { "@type": "PostalAddress", addressCountry: "VN", streetAddress: ctx.contact.address };
  }
  if (ctx.social.length) node.sameAs = ctx.social;
  return node;
}
function websiteJsonLd(ctx) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: ctx.brand.name,
    url: ctx.origin,
    inLanguage: "vi-VN",
    publisher: { "@type": "Organization", name: ctx.brand.name, url: ctx.origin }
  };
}
function breadcrumbJsonLd(ctx, items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(ctx.origin, item.path)
    }))
  };
}
function articleJsonLd(ctx, article) {
  const title = article.seoTitle?.trim() || article.title;
  const node = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: trimTitle(title, 110),
    description: trimDescription(article.seoDescription?.trim() || article.excerpt),
    mainEntityOfPage: { "@type": "WebPage", "@id": absoluteUrl(ctx.origin, articleCanonicalPath(article)) },
    image: [image(article.socialImageUrl || article.image, article.imageAlt || title, ctx.origin, ctx.defaultImage).url],
    inLanguage: "vi-VN",
    publisher: { "@type": "Organization", name: ctx.brand.name, url: ctx.origin, logo: ctx.logoUrl }
  };
  if (article.publishedAt) node.datePublished = article.publishedAt;
  if (article.modifiedAt) node.dateModified = article.modifiedAt;
  node.author = article.authorName?.trim() ? { "@type": "Person", name: article.authorName.trim() } : { "@type": "Organization", name: ctx.brand.name, url: ctx.origin };
  if (article.tag) node.articleSection = article.tag;
  return node;
}
function productJsonLd(ctx, product) {
  const offer = {
    "@type": "Offer",
    url: absoluteUrl(ctx.origin, `/san-pham/${product.slug}`),
    priceCurrency: "VND",
    price: String(product.price),
    ...typeof product.inStock === "boolean" ? { availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" } : {}
  };
  const node = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: trimDescription(product.description || product.tag || product.name, 300),
    image: [image(product.image, product.imageAlt || product.name, ctx.origin, ctx.defaultImage).url],
    url: absoluteUrl(ctx.origin, `/san-pham/${product.slug}`),
    offers: offer
  };
  if (product.sku) node.sku = product.sku;
  if (product.categoryName) node.category = product.categoryName;
  return node;
}
function itemListJsonLd(ctx, name, products) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: products.length,
    itemListElement: products.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(ctx.origin, `/san-pham/${product.slug}`),
      name: product.name
    }))
  };
}
function homeMeta(ctx) {
  return meta({
    ctx,
    route: { kind: "home" },
    title: `A S\u1EC9n \u2014 Tinh hoa T\xE2y B\u1EAFc trong m\u1ED9t m\xF3n qu\xE0`,
    description: "\u0110\u1EB7c s\u1EA3n g\xE1c b\u1EBFp, gia v\u1ECB n\xFAi r\u1EEBng v\xE0 nh\u1EEFng m\xF3n qu\xE0 mang d\u1EA5u \u1EA5n T\xE2y B\u1EAFc t\u1EEB A S\u1EC9n. Kh\xE1m ph\xE1 s\u1EA3n v\u1EADt, t\u1EF1 thi\u1EBFt k\u1EBF h\u1ED9p qu\xE0 v\xE0 \u0111\u1EB7t h\xE0ng thanh to\xE1n khi nh\u1EADn h\xE0ng.",
    canonicalPath: "/",
    jsonLd: [
      organizationJsonLd(ctx),
      websiteJsonLd(ctx),
      breadcrumbJsonLd(ctx, [{ name: "Trang ch\u1EE7", path: "/" }])
    ]
  });
}
function productsMeta(ctx, products) {
  return meta({
    ctx,
    route: { kind: "products" },
    title: "S\u1EA3n v\u1EADt & \u0111\u1EB7c s\u1EA3n T\xE2y B\u1EAFc \u2014 A S\u1EC9n",
    description: "Kh\xE1m ph\xE1 s\u1EA3n v\u1EADt A S\u1EC9n: tr\xE0 Shan Tuy\u1EBFt, m\u1EADt ong hoa r\u1EEBng, th\u1ECBt g\xE1c b\u1EBFp v\xE0 gia v\u1ECB n\xFAi r\u1EEBng. Ch\u1ECDn h\u01B0\u01A1ng v\u1ECB b\u1EA1n y\xEAu v\xE0 \u0111\u1EB7t h\xE0ng thanh to\xE1n khi nh\u1EADn h\xE0ng.",
    canonicalPath: "/san-pham",
    image: ctx.defaultImage,
    jsonLd: [
      breadcrumbJsonLd(ctx, [
        { name: "Trang ch\u1EE7", path: "/" },
        { name: "S\u1EA3n ph\u1EA9m", path: "/san-pham" }
      ]),
      itemListJsonLd(ctx, "S\u1EA3n v\u1EADt A S\u1EC9n", products)
    ]
  });
}
function productMeta(ctx, product) {
  const title = `${product.name} \u2014 A S\u1EC9n`;
  return meta({
    ctx,
    route: { kind: "product", slug: product.slug },
    title: trimTitle(title),
    description: product.description || product.tag || `S\u1EA3n v\u1EADt ${product.name} t\u1EEB A S\u1EC9n.`,
    canonicalPath: `/san-pham/${product.slug}`,
    ogType: "product",
    image: image(product.image, product.imageAlt || product.name, ctx.origin, ctx.defaultImage),
    jsonLd: [
      breadcrumbJsonLd(ctx, [
        { name: "Trang ch\u1EE7", path: "/" },
        { name: "S\u1EA3n ph\u1EA9m", path: "/san-pham" },
        { name: product.name, path: `/san-pham/${product.slug}` }
      ]),
      productJsonLd(ctx, product)
    ]
  });
}
function categoryMeta(ctx, category) {
  const description = category.description?.trim() || `C\xE1c s\u1EA3n v\u1EADt ${category.name} c\u1EE7a A S\u1EC9n: ngu\u1ED3n g\u1ED1c r\xF5 r\xE0ng, giao to\xE0n qu\u1ED1c v\xE0 thanh to\xE1n khi nh\u1EADn h\xE0ng.`;
  return meta({
    ctx,
    route: { kind: "category", slug: category.slug },
    title: trimTitle(`${category.name} \u2014 S\u1EA3n v\u1EADt A S\u1EC9n`),
    description,
    canonicalPath: `/danh-muc/${category.slug}`,
    image: image(category.image, category.name, ctx.origin, ctx.defaultImage),
    jsonLd: [
      breadcrumbJsonLd(ctx, [
        { name: "Trang ch\u1EE7", path: "/" },
        { name: "S\u1EA3n ph\u1EA9m", path: "/san-pham" },
        { name: category.name, path: `/danh-muc/${category.slug}` }
      ]),
      itemListJsonLd(ctx, category.name, category.products)
    ]
  });
}
function giftMeta(ctx) {
  return meta({
    ctx,
    route: { kind: "gift" },
    title: "T\u1EF1 thi\u1EBFt k\u1EBF h\u1ED9p qu\xE0 T\xE2y B\u1EAFc \u2014 A S\u1EC9n",
    description: "T\u1EF1 ch\u1ECDn s\u1EA3n v\u1EADt, m\xE0u h\u1ED9p v\xE0 l\u1EDDi nh\u1EAFn \u0111\u1EC3 t\u1EA1o m\u1ED9t m\xF3n qu\xE0 mang d\u1EA5u \u1EA5n ri\xEAng. H\u1ED9p qu\xE0 A S\u1EC9n ph\xF9 h\u1EE3p bi\u1EBFu t\u1EB7ng gia \u0111\xECnh, \u0111\u1ED1i t\xE1c v\xE0 d\u1ECBp l\u1EC5.",
    canonicalPath: "/thiet-ke",
    jsonLd: [
      breadcrumbJsonLd(ctx, [
        { name: "Trang ch\u1EE7", path: "/" },
        { name: "H\u1ED9p qu\xE0", path: "/thiet-ke" }
      ])
    ]
  });
}
function aboutMeta(ctx) {
  return meta({
    ctx,
    route: { kind: "about" },
    title: "C\xE2u chuy\u1EC7n A S\u1EC9n \u2014 T\u1EEB n\xFAi r\u1EEBng T\xE2y B\u1EAFc",
    description: "T\u1EEB con ng\u01B0\u1EDDi v\xF9ng cao \u0111\u1EBFn m\u1ED9t m\xF3n qu\xE0 ch\xE2n th\xE0nh. Kh\xE1m ph\xE1 c\xE2u chuy\u1EC7n, ngu\u1ED3n g\u1ED1c s\u1EA3n v\u1EADt v\xE0 nh\u1EEFng gi\xE1 tr\u1ECB A S\u1EC9n tr\xE2n qu\xFD.",
    canonicalPath: "/gioi-thieu",
    jsonLd: [
      breadcrumbJsonLd(ctx, [
        { name: "Trang ch\u1EE7", path: "/" },
        { name: "V\u1EC1 A S\u1EC9n", path: "/gioi-thieu" }
      ])
    ]
  });
}
function newsMeta(ctx, options = {}) {
  const page = options.page && options.page > 1 ? options.page : 1;
  const topicPath = options.topicSlug ? `/tin-tuc/chu-de/${options.topicSlug}` : "/tin-tuc";
  const title = options.topicName ? `${options.topicName} \u2014 T\u1EA1p ch\xED A S\u1EC9n${page > 1 ? ` (trang ${page})` : ""}` : `T\u1EA1p ch\xED \xB7 Chuy\u1EC7n n\xFAi r\u1EEBng \u2014 A S\u1EC9n${page > 1 ? ` (trang ${page})` : ""}`;
  return meta({
    ctx,
    route: { kind: "news", page, topic: options.topicSlug },
    title: trimTitle(title),
    description: "Nh\u1EEFng c\xE2u chuy\u1EC7n v\u1EC1 h\u01B0\u01A1ng v\u1ECB, con ng\u01B0\u1EDDi v\xE0 mi\u1EC1n \u0111\u1EA5t T\xE2y B\u1EAFc t\u1EEB t\u1EA1p ch\xED A S\u1EC9n. \u0110\u1ECDc \u0111\u1EC3 hi\u1EC3u h\u01A1n v\u1EC1 s\u1EA3n v\u1EADt v\xE0 c\xE1ch ch\u1ECDn qu\xE0.",
    canonicalPath: topicPath,
    canonicalQuery: page > 1 ? `page=${page}` : "",
    image: image("/images/asin/journey-panorama.webp", "Ru\u1ED9ng b\u1EADc thang T\xE2y B\u1EAFc", ctx.origin, ctx.defaultImage),
    jsonLd: [
      breadcrumbJsonLd(ctx, [
        { name: "Trang ch\u1EE7", path: "/" },
        { name: "Tin t\u1EE9c", path: "/tin-tuc" },
        ...options.topicSlug && options.topicName ? [{ name: options.topicName, path: topicPath }] : []
      ])
    ]
  });
}
function articleMeta(ctx, article) {
  const title = article.seoTitle?.trim() || `${article.title} \u2014 T\u1EA1p ch\xED A S\u1EC9n`;
  const description = article.seoDescription?.trim() || article.excerpt;
  const socialTitle = article.socialTitle?.trim() || title;
  return meta({
    ctx,
    route: { kind: "article", slug: article.slug },
    title: trimTitle(title),
    description,
    canonicalPath: articleCanonicalPath(article),
    ogType: "article",
    image: image(article.socialImageUrl || article.image, article.imageAlt || article.title, ctx.origin, ctx.defaultImage),
    ogTitle: trimTitle(socialTitle, 90),
    ogDescription: article.socialDescription?.trim() || description,
    article: {
      publishedTime: article.publishedAt ?? void 0,
      modifiedTime: article.modifiedAt ?? void 0,
      author: article.authorName ?? void 0,
      section: article.tag || void 0
    },
    jsonLd: [
      breadcrumbJsonLd(ctx, [
        { name: "Trang ch\u1EE7", path: "/" },
        { name: "Tin t\u1EE9c", path: "/tin-tuc" },
        { name: article.tag || "B\xE0i vi\u1EBFt", path: `/tin-tuc/chu-de/${article.tagSlug}` },
        { name: article.title, path: `/tin-tuc/${article.slug}` }
      ]),
      articleJsonLd(ctx, article)
    ]
  });
}
function contactMeta(ctx) {
  return meta({
    ctx,
    route: { kind: "contact" },
    title: "Li\xEAn h\u1EC7 & h\u1ED7 tr\u1EE3 mua h\xE0ng \u2014 A S\u1EC9n",
    description: "Li\xEAn h\u1EC7 A S\u1EC9n \u0111\u1EC3 t\u01B0 v\u1EA5n s\u1EA3n ph\u1EA9m, qu\xE0 t\u1EB7ng ho\u1EB7c h\u1ED7 tr\u1EE3 \u0111\u01A1n h\xE0ng, giao h\xE0ng v\xE0 \u0111\u1ED5i tr\u1EA3. A S\u1EC9n ph\u1EA3n h\u1ED3i trong gi\u1EDD l\xE0m vi\u1EC7c.",
    canonicalPath: "/lien-he",
    jsonLd: [
      breadcrumbJsonLd(ctx, [
        { name: "Trang ch\u1EE7", path: "/" },
        { name: "Li\xEAn h\u1EC7", path: "/lien-he" }
      ])
    ]
  });
}
function noindexMeta(ctx, title = "Kh\xF4ng t\xECm th\u1EA5y trang \u2014 A S\u1EC9n") {
  return meta({
    ctx,
    route: { kind: "notFound" },
    title,
    description: "Trang b\u1EA1n t\xECm kh\xF4ng c\xF2n t\u1ED3n t\u1EA1i. Kh\xE1m ph\xE1 s\u1EA3n v\u1EADt v\xE0 c\xE2u chuy\u1EC7n kh\xE1c t\u1EEB A S\u1EC9n.",
    canonicalPath: "/",
    robots: noindexRobots(),
    jsonLd: []
  });
}

// src/seo/renderSite.ts
var PRERENDER_OPEN = '<div id="asin-prerender" class="asin-prerender">';
var PRERENDER_CLOSE = "</div>";
function h(value) {
  return escapeHtml((value ?? "").trim());
}
function link(path, label, className = "") {
  const classAttr = className ? ` class="${className}"` : "";
  return `<a href="${h(path)}"${classAttr}>${h(label)}</a>`;
}
function navHtml() {
  return `<nav aria-label="\u0110i\u1EC1u h\u01B0\u1EDBng">
      <ul>
        <li>${link("/", "Trang ch\u1EE7")}</li>
        <li>${link("/san-pham", "S\u1EA3n ph\u1EA9m")}</li>
        <li>${link("/thiet-ke", "H\u1ED9p qu\xE0")}</li>
        <li>${link("/gioi-thieu", "V\u1EC1 A S\u1EC9n")}</li>
        <li>${link("/tin-tuc", "Tin t\u1EE9c")}</li>
        <li>${link("/lien-he", "Li\xEAn h\u1EC7")}</li>
      </ul>
    </nav>`;
}
function money(value) {
  return `${new Intl.NumberFormat("vi-VN").format(Math.max(0, Math.round(value)))}\u20AB`;
}
function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}
function timeTag(value, label) {
  if (!value) return `<span>${h(label)}</span>`;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return `<span>${h(label)}</span>`;
  return `<time datetime="${h(date.toISOString())}">${h(label)}</time>`;
}
function blockToHtml(block) {
  switch (block.type) {
    case "heading":
      return `<h${block.level}>${renderInline(block.text)}</h${block.level}>`;
    case "paragraph":
      return `<p>${renderInline(block.text)}</p>`;
    case "list": {
      const tag2 = block.ordered ? "ol" : "ul";
      return `<${tag2}>${block.items.map((item) => `<li>${renderInline(item)}</li>`).join("")}</${tag2}>`;
    }
    case "quote":
      return `<blockquote><p>${renderInline(block.text)}</p></blockquote>`;
    case "image":
      return `<figure><img src="${h(block.url)}" alt="${h(block.alt)}" loading="lazy" decoding="async">${block.caption ? `<figcaption>${h(block.caption)}</figcaption>` : ""}</figure>`;
    case "cta":
      return `<p class="asin-prerender-cta">${link(block.href, block.label)}</p>`;
    case "divider":
      return "<hr>";
    default:
      return "";
  }
}
function articleBodyToHtml(article) {
  return toBlocks(article.body).map(blockToHtml).join("\n");
}
function productCard(product) {
  const inStock = product.inStock;
  return `<li>
    <a href="/san-pham/${h(product.slug)}">
      <img src="${h(product.image)}" alt="${h(product.imageAlt || product.name)}" loading="lazy" decoding="async" width="480" height="480">
      <strong>${h(product.name)}</strong>
    </a>
    <span>${h(money(product.price))}${inStock === false ? " \u2014 T\u1EA1m h\u1EBFt h\xE0ng" : inStock === void 0 ? " \u2014 Li\xEAn h\u1EC7 x\xE1c nh\u1EADn t\u1ED3n kho" : ""}</span>
  </li>`;
}
function articleCard(article) {
  return `<li>
    <a href="/tin-tuc/${h(article.slug)}">
      <img src="${h(article.image)}" alt="${h(article.title)}" loading="lazy" decoding="async" width="600" height="430">
      <strong>${h(article.title)}</strong>
    </a>
    <p>${h(article.excerpt)}</p>
    <p>${timeTag(article.publishedAt, formatDate(article.publishedAt))}</p>
  </li>`;
}
function prerenderWrap(content) {
  return `${PRERENDER_OPEN}${content}${PRERENDER_CLOSE}`;
}
function footerHtml(settings) {
  const contact = settings.support.contact ?? {};
  const parts = [];
  if (contact.phone) parts.push(`<li>\u0110i\u1EC7n tho\u1EA1i: <a href="tel:${h(contact.phone.replace(/[^\d+]/g, ""))}">${h(contact.phone)}</a></li>`);
  if (contact.email) parts.push(`<li>Email: <a href="mailto:${h(contact.email)}">${h(contact.email)}</a></li>`);
  if (contact.address) parts.push(`<li>\u0110\u1ECBa ch\u1EC9: ${h(contact.address)}</li>`);
  if (contact.hours) parts.push(`<li>Gi\u1EDD h\u1ED7 tr\u1EE3: ${h(contact.hours)}</li>`);
  return `<footer>
    <p>\xA9 ${(/* @__PURE__ */ new Date()).getFullYear()} A S\u1EC9n \u2014 Tinh hoa T\xE2y B\u1EAFc trong m\u1ED9t m\xF3n qu\xE0.</p>
    ${parts.length ? `<ul>${parts.join("")}</ul>` : ""}
  </footer>`;
}
function buildSeoContext(settings, env, requestHost) {
  const contact = {
    phone: settings.support.contact?.phone || settings.content["contact.phone"] || void 0,
    email: settings.support.contact?.email || settings.content["contact.email"] || void 0,
    address: settings.support.contact?.address || settings.content["contact.address"] || void 0,
    zaloUrl: settings.support.zaloUrl || void 0
  };
  const social = ["facebook", "tiktok", "instagram", "youtube"].map((key) => settings.content[`social.${key}`]).filter((value) => Boolean(value && /^https?:\/\//i.test(value)));
  return {
    origin: env.canonicalOrigin,
    indexable: isIndexableHost(requestHost, env),
    brand: {
      name: "A S\u1EC9n",
      description: "\u0110\u1EB7c s\u1EA3n g\xE1c b\u1EBFp, gia v\u1ECB n\xFAi r\u1EEBng v\xE0 nh\u1EEFng m\xF3n qu\xE0 mang d\u1EA5u \u1EA5n T\xE2y B\u1EAFc."
    },
    contact,
    social,
    logoUrl: absoluteUrl(env.canonicalOrigin, "/favicon.svg"),
    defaultImage: {
      url: absoluteUrl(env.canonicalOrigin, settings.content["hero.image"] || "/images/asin/journey-panorama.webp"),
      alt: "A S\u1EC9n \u2014 Tinh hoa T\xE2y B\u1EAFc"
    }
  };
}
function notFoundPage(ctx, pathname = "/") {
  const body = prerenderWrap(`<main>
      <h1>H\xECnh nh\u01B0 b\u1EA1n \u0111\xE3 l\u1EA1c \u0111\u01B0\u1EDDng.</h1>
      <p>Trang b\u1EA1n t\xECm kh\xF4ng c\xF2n t\u1ED3n t\u1EA1i ho\u1EB7c ch\u01B0a \u0111\u01B0\u1EE3c xu\u1EA5t b\u1EA3n.</p>
      <p>${link("/san-pham", "Kh\xE1m ph\xE1 s\u1EA3n v\u1EADt")} \xB7 ${link("/tin-tuc", "\u0110\u1ECDc c\xE2u chuy\u1EC7n")} \xB7 ${link("/lien-he", "Li\xEAn h\u1EC7 h\u1ED7 tr\u1EE3")}</p>
    </main>`);
  const seo = noindexMeta(ctx);
  seo.canonical = absoluteUrl(ctx.origin, pathname);
  return {
    status: 404,
    seo,
    bodyHtml: body,
    cacheControl: PUBLIC_CONTENT_CACHE
  };
}
function serviceUnavailablePage(ctx, route) {
  const body = prerenderWrap(`<main>
      <h1>A S\u1EC9n \u0111ang b\u1EADn chu\u1EA9n b\u1ECB n\u1ED9i dung.</h1>
      <p>D\u1EEF li\u1EC7u ch\u01B0a t\u1EA3i \u0111\u01B0\u1EE3c v\xE0o l\xFAc n\xE0y. Vui l\xF2ng th\u1EED l\u1EA1i sau \xEDt ph\xFAt.</p>
      <p>${link(routePath(route), "T\u1EA3i l\u1EA1i trang")} \xB7 ${link("/lien-he", "Li\xEAn h\u1EC7 A S\u1EC9n")}</p>
    </main>`);
  return {
    status: 503,
    seo: noindexMeta(ctx, "T\u1EA1m th\u1EDDi ch\u01B0a t\u1EA3i \u0111\u01B0\u1EE3c trang \u2014 A S\u1EC9n"),
    bodyHtml: body,
    cacheControl: "no-store",
    retryAfterSeconds: 120
  };
}
async function renderHome(ctx, client) {
  let products = [];
  let articles = [];
  try {
    [products, articles] = await Promise.all([loadProducts(client), loadArticleList(client, { limit: 3 }).then((page) => page.items)]);
  } catch {
    products = [];
    articles = [];
  }
  const body = prerenderWrap(`<main>
      <h1>A S\u1EC9n \u2014 Tinh hoa T\xE2y B\u1EAFc trong m\u1ED9t m\xF3n qu\xE0</h1>
      <p>\u0110\u1EB7c s\u1EA3n g\xE1c b\u1EBFp, gia v\u1ECB n\xFAi r\u1EEBng v\xE0 nh\u1EEFng m\xF3n qu\xE0 mang d\u1EA5u \u1EA5n T\xE2y B\u1EAFc. ${link("/gioi-thieu", "T\xECm hi\u1EC3u c\xE2u chuy\u1EC7n A S\u1EC9n")} ho\u1EB7c ${link("/thiet-ke", "t\u1EF1 thi\u1EBFt k\u1EBF h\u1ED9p qu\xE0")}.</p>
      ${products.length ? `<section aria-labelledby="seo-home-products"><h2 id="seo-home-products">S\u1EA3n v\u1EADt n\u1ED5i b\u1EADt</h2><ul>${products.slice(0, 6).map(productCard).join("")}</ul><p>${link("/san-pham", "Xem t\u1EA5t c\u1EA3 s\u1EA3n ph\u1EA9m")}</p></section>` : `<p>${link("/san-pham", "Xem s\u1EA3n ph\u1EA9m")}</p>`}
      ${articles.length ? `<section aria-labelledby="seo-home-news"><h2 id="seo-home-news">C\xE2u chuy\u1EC7n m\u1EDBi</h2><ul>${articles.map(articleCard).join("")}</ul><p>${link("/tin-tuc", "\u0110\u1ECDc t\u1EA1p ch\xED A S\u1EC9n")}</p></section>` : ""}
      ${navHtml()}
    </main>
    ${footerHtml({ content: {}, support: { contact: ctx.contact } })}`);
  return {
    status: 200,
    seo: homeMeta(ctx),
    bodyHtml: body,
    cacheControl: PUBLIC_CONTENT_CACHE,
    bootstrap: {
      route: "home",
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      products: products.map(productRecordToClientProduct),
      productsComplete: true,
      articles,
      categories: [...new Set(products.map((product) => product.categoryName).filter((name) => Boolean(name)))]
    }
  };
}
async function renderProducts(ctx, client) {
  let products;
  try {
    products = await loadProducts(client);
  } catch {
    return serviceUnavailablePage(ctx, { kind: "products" });
  }
  const body = prerenderWrap(`<main>
      <h1>S\u1EA3n v\u1EADt & \u0111\u1EB7c s\u1EA3n T\xE2y B\u1EAFc</h1>
      <p>Ch\u1ECDn h\u01B0\u01A1ng v\u1ECB b\u1EA1n y\xEAu v\xE0 \u0111\u1EB7t h\xE0ng thanh to\xE1n khi nh\u1EADn h\xE0ng. ${link("/thiet-ke", "G\xF3i th\xE0nh h\u1ED9p qu\xE0")} \u0111\u1EC3 g\u1EEDi t\u1EB7ng.</p>
      <ul>${products.map(productCard).join("")}</ul>
      ${productCategoryLinks(products)}
      ${navHtml()}
    </main>
    ${footerHtml({ content: {}, support: { contact: ctx.contact } })}`);
  return {
    status: 200,
    seo: productsMeta(ctx, products),
    bodyHtml: body,
    cacheControl: PUBLIC_CONTENT_CACHE,
    bootstrap: {
      route: "products",
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      products: products.map(productRecordToClientProduct),
      productsComplete: true,
      categories: [...new Set(products.map((product) => product.categoryName).filter((name) => Boolean(name)))]
    }
  };
}
function productCategoryLinks(products) {
  const categories = /* @__PURE__ */ new Map();
  for (const product of products) {
    if (product.categorySlug && product.categoryName) categories.set(product.categorySlug, product.categoryName);
  }
  if (!categories.size) return "";
  return `<section aria-labelledby="seo-categories"><h2 id="seo-categories">Danh m\u1EE5c s\u1EA3n v\u1EADt</h2><ul>${[...categories.entries()].map(([slug, name]) => `<li>${link(`/danh-muc/${slug}`, name)}</li>`).join("")}</ul></section>`;
}
async function renderProduct(ctx, client, slug) {
  let product;
  let related = [];
  try {
    product = await loadProductBySlug(client, slug);
    if (product) {
      const all = await loadProducts(client);
      related = all.filter((item) => item.slug !== slug && item.categorySlug && item.categorySlug === product.categorySlug).slice(0, 4);
    }
  } catch {
    return serviceUnavailablePage(ctx, { kind: "product", slug });
  }
  if (!product) return notFoundPage(ctx, `/san-pham/${slug}`);
  const body = prerenderWrap(`<main>
      <nav aria-label="Breadcrumb"><p>${link("/", "Trang ch\u1EE7")} \u203A ${link("/san-pham", "S\u1EA3n ph\u1EA9m")} \u203A <span>${h(product.name)}</span></p></nav>
      <h1>${h(product.name)}</h1>
      <img src="${h(product.image)}" alt="${h(product.imageAlt || product.name)}" width="720" height="720" fetchpriority="high" decoding="async">
      <p>${h(product.origin)}${product.weight ? ` \xB7 ${h(product.weight)}` : ""}${product.categoryName ? ` \xB7 ${h(product.categoryName)}` : ""}</p>
      <p>${h(product.description)}</p>
      <p><strong>${h(money(product.price))}</strong> \u2014 ${product.inStock === true ? "C\xF2n h\xE0ng" : product.inStock === false ? "T\u1EA1m h\u1EBFt h\xE0ng, vui l\xF2ng ch\u1ECDn s\u1EA3n v\u1EADt thay th\u1EBF ho\u1EB7c li\xEAn h\u1EC7 A S\u1EC9n." : "Li\xEAn h\u1EC7 A S\u1EC9n \u0111\u1EC3 x\xE1c nh\u1EADn t\u1ED3n kho."}</p>
      <p>${link("/thiet-ke", "G\xF3i s\u1EA3n v\u1EADt th\xE0nh h\u1ED9p qu\xE0")} \xB7 ${link("/lien-he", "H\u1ECFi A S\u1EC9n v\u1EC1 s\u1EA3n ph\u1EA9m n\xE0y")}</p>
      ${related.length ? `<section aria-labelledby="seo-related"><h2 id="seo-related">S\u1EA3n v\u1EADt c\xF9ng nh\xF3m</h2><ul>${related.map(productCard).join("")}</ul></section>` : ""}
      ${navHtml()}
    </main>
    ${footerHtml({ content: {}, support: { contact: ctx.contact } })}`);
  return {
    status: 200,
    seo: productMeta(ctx, product),
    bodyHtml: body,
    cacheControl: PUBLIC_CONTENT_CACHE,
    bootstrap: {
      route: "product",
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      product: productRecordToClientProduct(product),
      products: [productRecordToClientProduct(product), ...related.map(productRecordToClientProduct)],
      productsComplete: false
    }
  };
}
async function renderCategory(ctx, client, slug) {
  let categories;
  let products;
  try {
    [categories, products] = await Promise.all([loadCategories(client), loadProducts(client)]);
  } catch {
    return serviceUnavailablePage(ctx, { kind: "category", slug });
  }
  const category = categories.find((item) => item.slug === slug);
  if (!category) return notFoundPage(ctx, `/danh-muc/${slug}`);
  const items = products.filter((product) => product.categorySlug === slug);
  const body = prerenderWrap(`<main>
      <nav aria-label="Breadcrumb"><p>${link("/", "Trang ch\u1EE7")} \u203A ${link("/san-pham", "S\u1EA3n ph\u1EA9m")} \u203A <span>${h(category.name)}</span></p></nav>
      <h1>${h(category.name)}</h1>
      <p>C\xE1c s\u1EA3n v\u1EADt ${h(category.name)} c\u1EE7a A S\u1EC9n \u2014 ngu\u1ED3n g\u1ED1c r\xF5 r\xE0ng, giao to\xE0n qu\u1ED1c v\xE0 thanh to\xE1n khi nh\u1EADn h\xE0ng.</p>
      ${items.length ? `<ul>${items.map(productCard).join("")}</ul>` : `<p>A S\u1EC9n \u0111ang chu\u1EA9n b\u1ECB th\xEAm s\u1EA3n v\u1EADt cho nh\xF3m n\xE0y. ${link("/san-pham", "Xem t\u1EA5t c\u1EA3 s\u1EA3n ph\u1EA9m")}</p>`}
      ${navHtml()}
    </main>
    ${footerHtml({ content: {}, support: { contact: ctx.contact } })}`);
  return {
    status: 200,
    seo: categoryMeta(ctx, { slug: category.slug, name: category.name, products: items }),
    bodyHtml: body,
    cacheControl: PUBLIC_CONTENT_CACHE,
    bootstrap: {
      route: "category",
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      products: products.map(productRecordToClientProduct),
      productsComplete: true,
      categories: [category.name, ...new Set(products.map((product) => product.categoryName).filter((name) => Boolean(name)))]
    }
  };
}
async function renderNews(ctx, client, route, search) {
  const pageSize = 9;
  let page;
  try {
    page = await loadArticleList(client, { limit: pageSize, offset: (route.page - 1) * pageSize, topicSlug: route.topic });
  } catch {
    return serviceUnavailablePage(ctx, route);
  }
  const hasNext = route.page * pageSize < page.total;
  if (!page.items.length && (route.topic || route.page > 1)) return notFoundPage(ctx, topicBase(route));
  const topicName = route.topic ? page.items[0]?.tag : void 0;
  const searching = search.has("q");
  const body = prerenderWrap(`<main>
      <nav aria-label="Breadcrumb"><p>${link("/", "Trang ch\u1EE7")} \u203A ${link("/tin-tuc", "Tin t\u1EE9c")}${route.topic ? ` \u203A <span>${h(topicName || route.topic)}</span>` : ""}</p></nav>
      <h1>${topicName ? h(`${topicName} \u2014 T\u1EA1p ch\xED A S\u1EC9n`) : "T\u1EA1p ch\xED \xB7 Chuy\u1EC7n n\xFAi r\u1EEBng"}</h1>
      <p>Nh\u1EEFng c\xE2u chuy\u1EC7n v\u1EC1 h\u01B0\u01A1ng v\u1ECB, con ng\u01B0\u1EDDi v\xE0 mi\u1EC1n \u0111\u1EA5t T\xE2y B\u1EAFc.</p>
      ${page.items.length ? `<ul>${page.items.map(articleCard).join("")}</ul>` : "<p>Ch\u01B0a c\xF3 b\xE0i vi\u1EBFt n\xE0o \u0111\u01B0\u1EE3c xu\u1EA5t b\u1EA3n.</p>"}
      <nav aria-label="Ph\xE2n trang">
        ${route.page > 1 ? link(`${topicBase(route)}?page=${route.page - 1}`, "Trang tr\u01B0\u1EDBc") : ""}
        <span>Trang ${route.page}</span>
        ${hasNext ? link(`${topicBase(route)}?page=${route.page + 1}`, "Trang ti\u1EBFp theo") : ""}
      </nav>
      ${navHtml()}
    </main>
    ${footerHtml({ content: {}, support: { contact: ctx.contact } })}`);
  const seo = newsMeta(ctx, { page: route.page, topicName, topicSlug: route.topic, articles: page.items });
  if (searching) {
    seo.robots = "noindex, follow";
  }
  return {
    status: 200,
    seo,
    bodyHtml: body,
    cacheControl: PUBLIC_CONTENT_CACHE,
    bootstrap: {
      route: "news",
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      articles: page.items,
      articleTotal: page.total,
      topicSlug: route.topic,
      articlePage: route.page
    }
  };
}
function topicBase(route) {
  return route.topic ? `/tin-tuc/chu-de/${route.topic}` : "/tin-tuc";
}
async function renderArticle(ctx, client, slug) {
  let article;
  let related = [];
  let relatedProducts = [];
  try {
    article = await loadArticleBySlug(client, slug);
    if (article) {
      related = article.relatedArticleSlugs.length ? (await loadArticlesBySlugs(client, article.relatedArticleSlugs)).filter((item) => item.slug !== slug).slice(0, 3) : [];
      if (!related.length) {
        const list = await loadArticleList(client, { limit: 4 });
        related = list.items.filter((item) => item.slug !== slug).slice(0, 3);
      }
      if (article.relatedProductSlugs.length) {
        const all = await loadProducts(client).catch(() => []);
        relatedProducts = all.filter((product) => article.relatedProductSlugs.includes(product.slug));
      }
    }
  } catch {
    return serviceUnavailablePage(ctx, { kind: "article", slug });
  }
  if (!article) return notFoundPage(ctx, `/tin-tuc/${slug}`);
  const body = prerenderWrap(`<main>
      <nav aria-label="Breadcrumb"><p>${link("/", "Trang ch\u1EE7")} \u203A ${link("/tin-tuc", "Tin t\u1EE9c")} \u203A <span>${h(article.title)}</span></p></nav>
      <article>
        <h1>${h(article.title)}</h1>
        <p>${h(article.excerpt)}</p>
        <p>${article.authorName ? `${h(article.authorName)} \xB7 ` : "A S\u1EC9n \xB7 T\u1EA1p ch\xED \xB7 "}${timeTag(article.publishedAt, formatDate(article.publishedAt))} \xB7 ${h(String(article.readMinutes))} ph\xFAt \u0111\u1ECDc</p>
        <img src="${h(article.image)}" alt="${h(article.imageAlt || article.title)}" width="1280" height="700" fetchpriority="high" decoding="async">
        ${articleBodyToHtml(article)}
        ${relatedProducts.length ? `<section aria-labelledby="seo-article-products"><h2 id="seo-article-products">S\u1EA3n v\u1EADt trong b\xE0i</h2><ul>${relatedProducts.map((product) => `<li>${link(`/san-pham/${product.slug}`, product.name)} \u2014 ${h(money(product.price))}</li>`).join("")}</ul></section>` : ""}
      </article>
      ${related.length ? `<section aria-labelledby="seo-related-articles"><h2 id="seo-related-articles">C\xE2u chuy\u1EC7n c\xF2n ti\u1EBFp</h2><ul>${related.map(articleCard).join("")}</ul></section>` : ""}
      ${navHtml()}
    </main>
    ${footerHtml({ content: {}, support: { contact: ctx.contact } })}`);
  return {
    status: 200,
    seo: articleMeta(ctx, article),
    bodyHtml: body,
    cacheControl: PUBLIC_CONTENT_CACHE,
    bootstrap: {
      route: "article",
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      article,
      articles: related
    }
  };
}
function staticPage(ctx, route, title, intro) {
  const body = prerenderWrap(`<main>
      <h1>${h(title)}</h1>
      <p>${h(intro)}</p>
      <p>${link("/san-pham", "S\u1EA3n ph\u1EA9m")} \xB7 ${link("/thiet-ke", "H\u1ED9p qu\xE0")} \xB7 ${link("/tin-tuc", "Tin t\u1EE9c")} \xB7 ${link("/lien-he", "Li\xEAn h\u1EC7")}</p>
      ${navHtml()}
    </main>
    ${footerHtml({ content: {}, support: { contact: ctx.contact } })}`);
  const seo = route.kind === "gift" ? giftMeta(ctx) : route.kind === "about" ? aboutMeta(ctx) : route.kind === "contact" ? contactMeta(ctx) : homeMeta(ctx);
  return { status: 200, seo, bodyHtml: body, cacheControl: PUBLIC_CONTENT_CACHE };
}
async function renderSitePage(input) {
  const env = input.env ?? getSeoEnvironment();
  const client = input.client ?? new SupabaseRest(env);
  const search = input.search ?? new URLSearchParams();
  const pathname = input.pathname;
  let settings = { content: {}, support: {} };
  try {
    settings = await loadSiteSettings(client);
  } catch {
    settings = { content: {}, support: {} };
  }
  const ctx = buildSeoContext(settings, env, input.requestHost);
  const route = matchSiteRoute(pathname, search);
  if (pathname === "/deal-hoi") {
    return { status: 308, seo: noindexMeta(ctx), bodyHtml: "", redirect: { toPath: "/#deal-hoi", search: search.toString(), status: 308 }, cacheControl: PUBLIC_CONTENT_CACHE };
  }
  if (["notFound", "article", "product", "category"].includes(route.kind)) {
    let redirect;
    try {
      redirect = await loadRedirect(client, pathname);
    } catch {
      return serviceUnavailablePage(ctx, route);
    }
    if (redirect) {
      return {
        status: 0,
        seo: noindexMeta(ctx),
        bodyHtml: "",
        redirect: { toPath: redirect.toPath, search: search.toString(), status: redirect.status },
        cacheControl: PUBLIC_CONTENT_CACHE
      };
    }
    if (route.kind === "notFound") return notFoundPage(ctx, pathname);
  }
  if (route.kind === "admin" || route.kind === "unsubscribe") {
    return {
      status: 200,
      seo: noindexMeta(ctx, route.kind === "admin" ? "Khu v\u1EF1c qu\u1EA3n tr\u1ECB \u2014 A S\u1EC9n" : "H\u1EE7y nh\u1EADn tin \u2014 A S\u1EC9n"),
      bodyHtml: "",
      cacheControl: "no-store"
    };
  }
  switch (route.kind) {
    case "home":
      return renderHome(ctx, client);
    case "products":
      if (route.productSlug) {
        return {
          status: 0,
          seo: noindexMeta(ctx),
          bodyHtml: "",
          redirect: { toPath: `/san-pham/${route.productSlug}`, search: (() => {
            const query = new URLSearchParams(search);
            query.delete("product");
            return query.toString();
          })(), status: 308 },
          cacheControl: PUBLIC_CONTENT_CACHE
        };
      }
      return renderProducts(ctx, client);
    case "product":
      return renderProduct(ctx, client, route.slug);
    case "category":
      return renderCategory(ctx, client, route.slug);
    case "news":
      return renderNews(ctx, client, route, search);
    case "article":
      return renderArticle(ctx, client, route.slug);
    case "gift":
      return staticPage(
        ctx,
        route,
        "T\u1EF1 thi\u1EBFt k\u1EBF h\u1ED9p qu\xE0 T\xE2y B\u1EAFc",
        "T\u1EF1 ch\u1ECDn s\u1EA3n v\u1EADt, m\xE0u h\u1ED9p v\xE0 l\u1EDDi nh\u1EAFn \u0111\u1EC3 t\u1EA1o m\u1ED9t m\xF3n qu\xE0 mang d\u1EA5u \u1EA5n ri\xEAng c\xF9ng A S\u1EC9n."
      );
    case "about":
      return staticPage(
        ctx,
        route,
        "C\xE2u chuy\u1EC7n A S\u1EC9n",
        "T\u1EEB con ng\u01B0\u1EDDi v\xF9ng cao \u0111\u1EBFn m\u1ED9t m\xF3n qu\xE0 ch\xE2n th\xE0nh. Kh\xE1m ph\xE1 c\xE2u chuy\u1EC7n v\xE0 nh\u1EEFng gi\xE1 tr\u1ECB A S\u1EC9n tr\xE2n qu\xFD."
      );
    case "contact": {
      const contact = ctx.contact;
      const detail = [];
      if (contact.phone) detail.push(`\u0110i\u1EC7n tho\u1EA1i: <a href="tel:${h(contact.phone.replace(/[^\d+]/g, ""))}">${h(contact.phone)}</a>`);
      if (contact.email) detail.push(`Email: <a href="mailto:${h(contact.email)}">${h(contact.email)}</a>`);
      if (contact.address) detail.push(`\u0110\u1ECBa ch\u1EC9: ${h(contact.address)}`);
      const body = prerenderWrap(`<main>
          <h1>Li\xEAn h\u1EC7 & h\u1ED7 tr\u1EE3 mua h\xE0ng</h1>
          <p>Li\xEAn h\u1EC7 A S\u1EC9n \u0111\u1EC3 t\u01B0 v\u1EA5n s\u1EA3n ph\u1EA9m, qu\xE0 t\u1EB7ng ho\u1EB7c h\u1ED7 tr\u1EE3 \u0111\u01A1n h\xE0ng, giao h\xE0ng v\xE0 \u0111\u1ED5i tr\u1EA3.</p>
          ${detail.length ? `<ul>${detail.map((item) => `<li>${item}</li>`).join("")}</ul>` : ""}
          <p>${link("/san-pham", "S\u1EA3n ph\u1EA9m")} \xB7 ${link("/thiet-ke", "H\u1ED9p qu\xE0")} \xB7 ${link("/tin-tuc", "Tin t\u1EE9c")}</p>
          ${navHtml()}
        </main>
        ${footerHtml(settings)}`);
      return { status: 200, seo: contactMeta(ctx), bodyHtml: body, cacheControl: PUBLIC_CONTENT_CACHE };
    }
    default:
      return notFoundPage(ctx, pathname);
  }
}

// server/seo/handler.ts
import { fileURLToPath } from "node:url";
var cachedShell = null;
async function loadShellTemplate() {
  if (cachedShell) return cachedShell;
  let moduleDir = "";
  try {
    moduleDir = fileURLToPath(new URL(".", import.meta.url));
  } catch {
  }
  const candidates = [
    join(process.cwd(), "dist", "seo-shell.html"),
    join(process.cwd(), "seo-shell.html"),
    join(process.cwd(), "index.html"),
    join(process.cwd(), "api", "dist", "seo-shell.html"),
    ...moduleDir ? [
      join(moduleDir, "..", "dist", "seo-shell.html"),
      join(moduleDir, "dist", "seo-shell.html"),
      join(moduleDir, "seo-shell.html"),
      join(moduleDir, "..", "seo-shell.html")
    ] : []
  ];
  for (const candidate of candidates) {
    try {
      cachedShell = await readFile(candidate, "utf8");
      return cachedShell;
    } catch {
    }
  }
  throw new Error("Kh\xF4ng t\xECm th\u1EA5y template seo-shell.html trong deployment.");
}
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
function redirectResponse(location, status) {
  return new Response(null, {
    status,
    headers: {
      Location: location,
      "Cache-Control": PUBLIC_CONTENT_CACHE
    }
  });
}
async function handleSiteRequest(input) {
  const env = input.env ?? getSeoEnvironment();
  const search = input.search ?? new URLSearchParams();
  const normalized = normalizePathname(input.pathname);
  if (normalized.redirectTo) {
    const query = search.toString();
    return redirectResponse(`${normalized.redirectTo}${query ? `?${query}` : ""}`, 308);
  }
  const { pathname } = normalized;
  const host = hostWithoutPort(input.host);
  const canonicalHost = env.canonicalHost;
  if (host && host !== canonicalHost && env.indexableHosts.includes(host)) {
    const query = search.toString();
    return redirectResponse(`${absoluteUrl(env.canonicalOrigin, pathname)}${query ? `?${query}` : ""}`, 308);
  }
  const client = new SupabaseRest(env);
  const page = await renderSitePage({ pathname, search, requestHost: input.host, env, client });
  if (page.redirect) {
    const query = page.redirect.search ?? "";
    const destination = new URL(page.redirect.toPath, env.canonicalOrigin);
    for (const [key, value] of new URLSearchParams(query)) if (!destination.searchParams.has(key)) destination.searchParams.append(key, value);
    return redirectResponse(`${destination.pathname}${destination.search}${destination.hash}`, page.redirect.status);
  }
  const rawTemplate = input.loadTemplate ? await input.loadTemplate() : await loadShellTemplate();
  const template = input.transformTemplate ? await input.transformTemplate(rawTemplate) : rawTemplate;
  const head = renderHeadTags(page.seo);
  const bootstrap = page.bootstrap ? bootstrapScriptTag(page.bootstrap) : "";
  const root = `${page.bodyHtml}${bootstrap}`;
  const html = injectSeoIntoHtml(template, head, root, { lang: "vi" });
  const extra = {};
  if (page.seo.robots.includes("noindex")) extra["X-Robots-Tag"] = page.seo.robots;
  if (page.retryAfterSeconds) extra["Retry-After"] = String(page.retryAfterSeconds);
  return htmlResponse(html, page.status, page.cacheControl, extra);
}
function renderUnavailableResponse() {
  return htmlResponse(
    `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>A S\u1EC9n t\u1EA1m th\u1EDDi gi\xE1n \u0111o\u1EA1n</title><meta name="robots" content="noindex"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><h1>A S\u1EC9n \u0111ang b\u1EA3o tr\xEC ng\u1EAFn.</h1><p>Vui l\xF2ng th\u1EED l\u1EA1i sau \xEDt ph\xFAt.</p></body></html>`,
    503,
    "no-store",
    { "Retry-After": "120" }
  );
}

// server/api/render.ts
async function handler(request) {
  const url = new URL(request.url);
  const rawPath = url.searchParams.get("asin_path");
  const search = new URLSearchParams(url.searchParams);
  search.delete("asin_path");
  const pathname = `/${rawPath ?? ""}`.replace(/^\/+/, "/");
  try {
    return await handleSiteRequest({
      pathname,
      search,
      host: request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host,
      method: request.method
    });
  } catch (error) {
    console.error("[api/render]", pathname, error);
    return renderUnavailableResponse();
  }
}
var render_default = nodeHandler(handler);
export {
  render_default as default
};
