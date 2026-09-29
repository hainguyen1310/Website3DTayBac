/**
 * Renderer HTML phía server cho từng URL (B01/B03/B05/B06/B09/B17).
 *
 * - Nội dung chính, title/description/canonical, JSON-LD và link nội bộ có sẵn
 *   trong HTML trả về, không cần JavaScript.
 * - Người dùng và bot nhận cùng một nội dung công khai; client React thay thế
 *   phần prerender khi tải xong.
 * - Trạng thái HTTP: 200 có nội dung, 301/308 cho slug cũ, 404 cho URL không
 *   tồn tại, 503 khi nguồn dữ liệu tạm lỗi (kèm cache policy riêng).
 */

import { escapeHtml, renderInline, toBlocks } from "../content/blocks.ts";
import type { ContentBlock } from "../content/blocks.ts";
import { getSeoEnvironment, isIndexableHost } from "./config.ts";
import type { SeoEnvironment } from "./config.ts";
import { absoluteUrl, matchSiteRoute, routePath } from "./paths.ts";
import { PUBLIC_CONTENT_CACHE } from "./cachePolicy.ts";
import type { SiteRoute } from "./paths.ts";
import {
  aboutMeta,
  articleMeta,
  categoryMeta,
  contactMeta,
  giftMeta,
  homeMeta,
  newsMeta,
  noindexMeta,
  productMeta,
  productsMeta,
} from "./meta.ts";
import type { SeoContext, SeoMeta, SeoProductInput } from "./types.ts";
import {
  loadArticleBySlug,
  loadArticleList,
  loadArticlesBySlugs,
  loadCategories,
  loadProductBySlug,
  loadProducts,
  loadRedirect,
  loadSiteSettings,
  SupabaseRest,
} from "./content.ts";
import type { ArticleRecord, ProductRecord, SiteSettings } from "./content.ts";
import { productRecordToClientProduct } from "./bootstrap.ts";
import type { BootstrapPayload } from "./bootstrap.ts";

export type RenderedPage = {
  status: number;
  seo: SeoMeta;
  bodyHtml: string;
  redirect?: { toPath: string; search?: string; status: 301 | 308 };
  cacheControl: string;
  retryAfterSeconds?: number;
  bootstrap?: BootstrapPayload;
};

const PRERENDER_OPEN = '<div id="asin-prerender" class="asin-prerender">';
const PRERENDER_CLOSE = "</div>";

function h(value: string | null | undefined): string {
  return escapeHtml((value ?? "").trim());
}

function link(path: string, label: string, className = ""): string {
  const classAttr = className ? ` class="${className}"` : "";
  return `<a href="${h(path)}"${classAttr}>${h(label)}</a>`;
}

function navHtml(): string {
  return `<nav aria-label="Điều hướng">
      <ul>
        <li>${link("/", "Trang chủ")}</li>
        <li>${link("/san-pham", "Sản phẩm")}</li>
        <li>${link("/thiet-ke", "Hộp quà")}</li>
        <li>${link("/gioi-thieu", "Về A Sỉn")}</li>
        <li>${link("/tin-tuc", "Tin tức")}</li>
        <li>${link("/lien-he", "Liên hệ")}</li>
      </ul>
    </nav>`;
}

function money(value: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(Math.max(0, Math.round(value)))}₫`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function timeTag(value: string | null | undefined, label: string): string {
  if (!value) return `<span>${h(label)}</span>`;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return `<span>${h(label)}</span>`;
  return `<time datetime="${h(date.toISOString())}">${h(label)}</time>`;
}

function blockToHtml(block: ContentBlock): string {
  switch (block.type) {
    case "heading":
      return `<h${block.level}>${renderInline(block.text)}</h${block.level}>`;
    case "paragraph":
      return `<p>${renderInline(block.text)}</p>`;
    case "list": {
      const tag = block.ordered ? "ol" : "ul";
      return `<${tag}>${block.items.map((item) => `<li>${renderInline(item)}</li>`).join("")}</${tag}>`;
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

export function articleBodyToHtml(article: ArticleRecord): string {
  return toBlocks(article.body).map(blockToHtml).join("\n");
}

function productCard(product: ProductRecord | SeoProductInput): string {
  const inStock = product.inStock;
  return `<li>
    <a href="/san-pham/${h(product.slug)}">
      <img src="${h(product.image)}" alt="${h(product.imageAlt || product.name)}" loading="lazy" decoding="async" width="480" height="480">
      <strong>${h(product.name)}</strong>
    </a>
    <span>${h(money(product.price))}${inStock === false ? " — Tạm hết hàng" : inStock === undefined ? " — Liên hệ xác nhận tồn kho" : ""}</span>
  </li>`;
}

function articleCard(article: ArticleRecord): string {
  return `<li>
    <a href="/tin-tuc/${h(article.slug)}">
      <img src="${h(article.image)}" alt="${h(article.title)}" loading="lazy" decoding="async" width="600" height="430">
      <strong>${h(article.title)}</strong>
    </a>
    <p>${h(article.excerpt)}</p>
    <p>${timeTag(article.publishedAt, formatDate(article.publishedAt))}</p>
  </li>`;
}

function prerenderWrap(content: string): string {
  return `${PRERENDER_OPEN}${content}${PRERENDER_CLOSE}`;
}

function footerHtml(settings: SiteSettings): string {
  const contact = settings.support.contact ?? {};
  const parts: string[] = [];
  if (contact.phone) parts.push(`<li>Điện thoại: <a href="tel:${h(contact.phone.replace(/[^\d+]/g, ""))}">${h(contact.phone)}</a></li>`);
  if (contact.email) parts.push(`<li>Email: <a href="mailto:${h(contact.email)}">${h(contact.email)}</a></li>`);
  if (contact.address) parts.push(`<li>Địa chỉ: ${h(contact.address)}</li>`);
  if (contact.hours) parts.push(`<li>Giờ hỗ trợ: ${h(contact.hours)}</li>`);
  return `<footer>
    <p>© ${new Date().getFullYear()} A Sỉn — Tinh hoa Tây Bắc trong một món quà.</p>
    ${parts.length ? `<ul>${parts.join("")}</ul>` : ""}
  </footer>`;
}

export function buildSeoContext(settings: SiteSettings, env: SeoEnvironment, requestHost?: string): SeoContext {
  const contact = {
    phone: settings.support.contact?.phone || settings.content["contact.phone"] || undefined,
    email: settings.support.contact?.email || settings.content["contact.email"] || undefined,
    address: settings.support.contact?.address || settings.content["contact.address"] || undefined,
    zaloUrl: settings.support.zaloUrl || undefined,
  };
  const social = ["facebook", "tiktok", "instagram", "youtube"]
    .map((key) => settings.content[`social.${key}`])
    .filter((value): value is string => Boolean(value && /^https?:\/\//i.test(value)));
  return {
    origin: env.canonicalOrigin,
    indexable: isIndexableHost(requestHost, env),
    brand: {
      name: "A Sỉn",
      description: "Đặc sản gác bếp, gia vị núi rừng và những món quà mang dấu ấn Tây Bắc.",
    },
    contact,
    social,
    logoUrl: absoluteUrl(env.canonicalOrigin, "/favicon.svg"),
    defaultImage: {
      url: absoluteUrl(env.canonicalOrigin, settings.content["hero.image"] || "/images/asin/journey-panorama.webp"),
      alt: "A Sỉn — Tinh hoa Tây Bắc",
    },
  };
}

export type RenderSiteInput = {
  pathname: string;
  search: URLSearchParams;
  requestHost?: string;
  env?: SeoEnvironment;
  client?: SupabaseRest;
};

function notFoundPage(ctx: SeoContext, pathname = "/"): RenderedPage {
  const body = prerenderWrap(`<main>
      <h1>Hình như bạn đã lạc đường.</h1>
      <p>Trang bạn tìm không còn tồn tại hoặc chưa được xuất bản.</p>
      <p>${link("/san-pham", "Khám phá sản vật")} · ${link("/tin-tuc", "Đọc câu chuyện")} · ${link("/lien-he", "Liên hệ hỗ trợ")}</p>
    </main>`);
  const seo = noindexMeta(ctx);
  // 404 tự canonical về chính URL đã yêu cầu, không nhận về trang chủ.
  seo.canonical = absoluteUrl(ctx.origin, pathname);
  return {
    status: 404,
    seo,
    bodyHtml: body,
    cacheControl: PUBLIC_CONTENT_CACHE,
  };
}

function serviceUnavailablePage(ctx: SeoContext, route: SiteRoute): RenderedPage {
  const body = prerenderWrap(`<main>
      <h1>A Sỉn đang bận chuẩn bị nội dung.</h1>
      <p>Dữ liệu chưa tải được vào lúc này. Vui lòng thử lại sau ít phút.</p>
      <p>${link(routePath(route), "Tải lại trang")} · ${link("/lien-he", "Liên hệ A Sỉn")}</p>
    </main>`);
  return {
    status: 503,
    seo: noindexMeta(ctx, "Tạm thời chưa tải được trang — A Sỉn"),
    bodyHtml: body,
    cacheControl: "no-store",
    retryAfterSeconds: 120,
  };
}

async function renderHome(ctx: SeoContext, client: SupabaseRest): Promise<RenderedPage> {
  let products: ProductRecord[] = [];
  let articles: ArticleRecord[] = [];
  try {
    [products, articles] = await Promise.all([loadProducts(client), loadArticleList(client, { limit: 3 }).then((page) => page.items)]);
  } catch {
    products = [];
    articles = [];
  }
  const body = prerenderWrap(`<main>
      <h1>A Sỉn — Tinh hoa Tây Bắc trong một món quà</h1>
      <p>Đặc sản gác bếp, gia vị núi rừng và những món quà mang dấu ấn Tây Bắc. ${link("/gioi-thieu", "Tìm hiểu câu chuyện A Sỉn")} hoặc ${link("/thiet-ke", "tự thiết kế hộp quà")}.</p>
      ${products.length ? `<section aria-labelledby="seo-home-products"><h2 id="seo-home-products">Sản vật nổi bật</h2><ul>${products.slice(0, 6).map(productCard).join("")}</ul><p>${link("/san-pham", "Xem tất cả sản phẩm")}</p></section>` : `<p>${link("/san-pham", "Xem sản phẩm")}</p>`}
      ${articles.length ? `<section aria-labelledby="seo-home-news"><h2 id="seo-home-news">Câu chuyện mới</h2><ul>${articles.map(articleCard).join("")}</ul><p>${link("/tin-tuc", "Đọc tạp chí A Sỉn")}</p></section>` : ""}
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
      generatedAt: new Date().toISOString(),
      products: products.map(productRecordToClientProduct),
      productsComplete: true,
      articles,
      categories: [...new Set(products.map((product) => product.categoryName).filter((name): name is string => Boolean(name)))],
    },
  };
}

async function renderProducts(ctx: SeoContext, client: SupabaseRest): Promise<RenderedPage> {
  let products: ProductRecord[];
  try {
    products = await loadProducts(client);
  } catch {
    return serviceUnavailablePage(ctx, { kind: "products" });
  }
  const body = prerenderWrap(`<main>
      <h1>Sản vật & đặc sản Tây Bắc</h1>
      <p>Chọn hương vị bạn yêu và đặt hàng thanh toán khi nhận hàng. ${link("/thiet-ke", "Gói thành hộp quà")} để gửi tặng.</p>
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
      generatedAt: new Date().toISOString(),
      products: products.map(productRecordToClientProduct),
      productsComplete: true,
      categories: [...new Set(products.map((product) => product.categoryName).filter((name): name is string => Boolean(name)))],
    },
  };
}

function productCategoryLinks(products: ProductRecord[]): string {
  const categories = new Map<string, string>();
  for (const product of products) {
    if (product.categorySlug && product.categoryName) categories.set(product.categorySlug, product.categoryName);
  }
  if (!categories.size) return "";
  return `<section aria-labelledby="seo-categories"><h2 id="seo-categories">Danh mục sản vật</h2><ul>${[...categories.entries()]
    .map(([slug, name]) => `<li>${link(`/danh-muc/${slug}`, name)}</li>`)
    .join("")}</ul></section>`;
}

async function renderProduct(ctx: SeoContext, client: SupabaseRest, slug: string): Promise<RenderedPage> {
  let product: ProductRecord | null;
  let related: ProductRecord[] = [];
  try {
    product = await loadProductBySlug(client, slug);
    if (product) {
      const all = await loadProducts(client);
      related = all.filter((item) => item.slug !== slug && item.categorySlug && item.categorySlug === product!.categorySlug).slice(0, 4);
    }
  } catch {
    return serviceUnavailablePage(ctx, { kind: "product", slug });
  }
  if (!product) return notFoundPage(ctx, `/san-pham/${slug}`);
  const body = prerenderWrap(`<main>
      <nav aria-label="Breadcrumb"><p>${link("/", "Trang chủ")} › ${link("/san-pham", "Sản phẩm")} › <span>${h(product.name)}</span></p></nav>
      <h1>${h(product.name)}</h1>
      <img src="${h(product.image)}" alt="${h(product.imageAlt || product.name)}" width="720" height="720" fetchpriority="high" decoding="async">
      <p>${h(product.origin)}${product.weight ? ` · ${h(product.weight)}` : ""}${product.categoryName ? ` · ${h(product.categoryName)}` : ""}</p>
      <p>${h(product.description)}</p>
      <p><strong>${h(money(product.price))}</strong> — ${product.inStock === true ? "Còn hàng" : product.inStock === false ? "Tạm hết hàng, vui lòng chọn sản vật thay thế hoặc liên hệ A Sỉn." : "Liên hệ A Sỉn để xác nhận tồn kho."}</p>
      <p>${link("/thiet-ke", "Gói sản vật thành hộp quà")} · ${link("/lien-he", "Hỏi A Sỉn về sản phẩm này")}</p>
      ${related.length ? `<section aria-labelledby="seo-related"><h2 id="seo-related">Sản vật cùng nhóm</h2><ul>${related.map(productCard).join("")}</ul></section>` : ""}
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
      generatedAt: new Date().toISOString(),
      product: productRecordToClientProduct(product),
      products: [productRecordToClientProduct(product), ...related.map(productRecordToClientProduct)],
      productsComplete: false,
    },
  };
}

async function renderCategory(ctx: SeoContext, client: SupabaseRest, slug: string): Promise<RenderedPage> {
  let categories: Awaited<ReturnType<typeof loadCategories>>;
  let products: ProductRecord[];
  try {
    [categories, products] = await Promise.all([loadCategories(client), loadProducts(client)]);
  } catch {
    return serviceUnavailablePage(ctx, { kind: "category", slug });
  }
  const category = categories.find((item) => item.slug === slug);
  if (!category) return notFoundPage(ctx, `/danh-muc/${slug}`);
  const items = products.filter((product) => product.categorySlug === slug);
  const body = prerenderWrap(`<main>
      <nav aria-label="Breadcrumb"><p>${link("/", "Trang chủ")} › ${link("/san-pham", "Sản phẩm")} › <span>${h(category.name)}</span></p></nav>
      <h1>${h(category.name)}</h1>
      <p>Các sản vật ${h(category.name)} của A Sỉn — nguồn gốc rõ ràng, giao toàn quốc và thanh toán khi nhận hàng.</p>
      ${items.length ? `<ul>${items.map(productCard).join("")}</ul>` : `<p>A Sỉn đang chuẩn bị thêm sản vật cho nhóm này. ${link("/san-pham", "Xem tất cả sản phẩm")}</p>`}
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
      generatedAt: new Date().toISOString(),
      products: products.map(productRecordToClientProduct),
      productsComplete: true,
      categories: [category.name, ...new Set(products.map((product) => product.categoryName).filter((name): name is string => Boolean(name)))],
    },
  };
}

async function renderNews(
  ctx: SeoContext,
  client: SupabaseRest,
  route: Extract<SiteRoute, { kind: "news" }>,
  search: URLSearchParams,
): Promise<RenderedPage> {
  const pageSize = 9;
  let page: Awaited<ReturnType<typeof loadArticleList>>;
  try {
    page = await loadArticleList(client, { limit: pageSize, offset: (route.page - 1) * pageSize, topicSlug: route.topic });
  } catch {
    return serviceUnavailablePage(ctx, route);
  }
  const hasNext = route.page * pageSize < page.total;
  if (!page.items.length && (route.topic || route.page > 1)) return notFoundPage(ctx, topicBase(route));
  const topicName = route.topic ? page.items[0]?.tag : undefined;
  const searching = search.has("q");
  const body = prerenderWrap(`<main>
      <nav aria-label="Breadcrumb"><p>${link("/", "Trang chủ")} › ${link("/tin-tuc", "Tin tức")}${route.topic ? ` › <span>${h(topicName || route.topic)}</span>` : ""}</p></nav>
      <h1>${topicName ? h(`${topicName} — Tạp chí A Sỉn`) : "Tạp chí · Chuyện núi rừng"}</h1>
      <p>Những câu chuyện về hương vị, con người và miền đất Tây Bắc.</p>
      ${page.items.length ? `<ul>${page.items.map(articleCard).join("")}</ul>` : "<p>Chưa có bài viết nào được xuất bản.</p>"}
      <nav aria-label="Phân trang">
        ${route.page > 1 ? link(`${topicBase(route)}?page=${route.page - 1}`, "Trang trước") : ""}
        <span>Trang ${route.page}</span>
        ${hasNext ? link(`${topicBase(route)}?page=${route.page + 1}`, "Trang tiếp theo") : ""}
      </nav>
      ${navHtml()}
    </main>
    ${footerHtml({ content: {}, support: { contact: ctx.contact } })}`);
  const seo = newsMeta(ctx, { page: route.page, topicName, topicSlug: route.topic, articles: page.items });
  if (searching) {
    // Trang kết quả tìm kiếm không phải landing index (B03).
    seo.robots = "noindex, follow";
  }
  return {
    status: 200,
    seo,
    bodyHtml: body,
    cacheControl: PUBLIC_CONTENT_CACHE,
    bootstrap: {
      route: "news",
      generatedAt: new Date().toISOString(),
      articles: page.items,
      articleTotal: page.total,
      topicSlug: route.topic,
      articlePage: route.page,
    },
  };
}

function topicBase(route: Extract<SiteRoute, { kind: "news" }>): string {
  return route.topic ? `/tin-tuc/chu-de/${route.topic}` : "/tin-tuc";
}

async function renderArticle(ctx: SeoContext, client: SupabaseRest, slug: string): Promise<RenderedPage> {
  let article: ArticleRecord | null;
  let related: ArticleRecord[] = [];
  let relatedProducts: ProductRecord[] = [];
  try {
    article = await loadArticleBySlug(client, slug);
    if (article) {
      related = article.relatedArticleSlugs.length
        ? (await loadArticlesBySlugs(client, article.relatedArticleSlugs)).filter((item) => item.slug !== slug).slice(0, 3)
        : [];
      if (!related.length) {
        const list = await loadArticleList(client, { limit: 4 });
        related = list.items.filter((item) => item.slug !== slug).slice(0, 3);
      }
      if (article.relatedProductSlugs.length) {
        const all = await loadProducts(client).catch(() => []);
        relatedProducts = all.filter((product) => article!.relatedProductSlugs.includes(product.slug));
      }
    }
  } catch {
    return serviceUnavailablePage(ctx, { kind: "article", slug });
  }
  if (!article) return notFoundPage(ctx, `/tin-tuc/${slug}`);
  const body = prerenderWrap(`<main>
      <nav aria-label="Breadcrumb"><p>${link("/", "Trang chủ")} › ${link("/tin-tuc", "Tin tức")} › <span>${h(article.title)}</span></p></nav>
      <article>
        <h1>${h(article.title)}</h1>
        <p>${h(article.excerpt)}</p>
        <p>${article.authorName ? `${h(article.authorName)} · ` : "A Sỉn · Tạp chí · "}${timeTag(article.publishedAt, formatDate(article.publishedAt))} · ${h(String(article.readMinutes))} phút đọc</p>
        <img src="${h(article.image)}" alt="${h(article.imageAlt || article.title)}" width="1280" height="700" fetchpriority="high" decoding="async">
        ${articleBodyToHtml(article)}
        ${relatedProducts.length ? `<section aria-labelledby="seo-article-products"><h2 id="seo-article-products">Sản vật trong bài</h2><ul>${relatedProducts.map((product) => `<li>${link(`/san-pham/${product.slug}`, product.name)} — ${h(money(product.price))}</li>`).join("")}</ul></section>` : ""}
      </article>
      ${related.length ? `<section aria-labelledby="seo-related-articles"><h2 id="seo-related-articles">Câu chuyện còn tiếp</h2><ul>${related.map(articleCard).join("")}</ul></section>` : ""}
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
      generatedAt: new Date().toISOString(),
      article,
      articles: related,
    },
  };
}

function staticPage(ctx: SeoContext, route: SiteRoute, title: string, intro: string): RenderedPage {
  const body = prerenderWrap(`<main>
      <h1>${h(title)}</h1>
      <p>${h(intro)}</p>
      <p>${link("/san-pham", "Sản phẩm")} · ${link("/thiet-ke", "Hộp quà")} · ${link("/tin-tuc", "Tin tức")} · ${link("/lien-he", "Liên hệ")}</p>
      ${navHtml()}
    </main>
    ${footerHtml({ content: {}, support: { contact: ctx.contact } })}`);
  const seo =
    route.kind === "gift"
      ? giftMeta(ctx)
      : route.kind === "about"
        ? aboutMeta(ctx)
        : route.kind === "contact"
          ? contactMeta(ctx)
          : homeMeta(ctx);
  return { status: 200, seo, bodyHtml: body, cacheControl: PUBLIC_CONTENT_CACHE };
}

export async function renderSitePage(input: RenderSiteInput): Promise<RenderedPage> {
  const env = input.env ?? getSeoEnvironment();
  const client = input.client ?? new SupabaseRest(env);
  const search = input.search ?? new URLSearchParams();
  const pathname = input.pathname;

  let settings: SiteSettings = { content: {}, support: {} };
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
    try { redirect = await loadRedirect(client, pathname); }
    catch { return serviceUnavailablePage(ctx, route); }
    if (redirect) {
      return {
        status: 0,
        seo: noindexMeta(ctx),
        bodyHtml: "",
        redirect: { toPath: redirect.toPath, search: search.toString(), status: redirect.status },
        cacheControl: PUBLIC_CONTENT_CACHE,
      };
    }
    if (route.kind === "notFound") return notFoundPage(ctx, pathname);
  }

  if (route.kind === "admin" || route.kind === "unsubscribe") {
    return {
      status: 200,
      seo: noindexMeta(ctx, route.kind === "admin" ? "Khu vực quản trị — A Sỉn" : "Hủy nhận tin — A Sỉn"),
      bodyHtml: "",
      cacheControl: "no-store",
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
          redirect: { toPath: `/san-pham/${route.productSlug}`, search: (() => { const query = new URLSearchParams(search); query.delete("product"); return query.toString(); })(), status: 308 },
          cacheControl: PUBLIC_CONTENT_CACHE,
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
        "Tự thiết kế hộp quà Tây Bắc",
        "Tự chọn sản vật, màu hộp và lời nhắn để tạo một món quà mang dấu ấn riêng cùng A Sỉn.",
      );
    case "about":
      return staticPage(
        ctx,
        route,
        "Câu chuyện A Sỉn",
        "Từ con người vùng cao đến một món quà chân thành. Khám phá câu chuyện và những giá trị A Sỉn trân quý.",
      );
    case "contact": {
      const contact = ctx.contact;
      const detail: string[] = [];
      if (contact.phone) detail.push(`Điện thoại: <a href="tel:${h(contact.phone.replace(/[^\d+]/g, ""))}">${h(contact.phone)}</a>`);
      if (contact.email) detail.push(`Email: <a href="mailto:${h(contact.email)}">${h(contact.email)}</a>`);
      if (contact.address) detail.push(`Địa chỉ: ${h(contact.address)}`);
      const body = prerenderWrap(`<main>
          <h1>Liên hệ & hỗ trợ mua hàng</h1>
          <p>Liên hệ A Sỉn để tư vấn sản phẩm, quà tặng hoặc hỗ trợ đơn hàng, giao hàng và đổi trả.</p>
          ${detail.length ? `<ul>${detail.map((item) => `<li>${item}</li>`).join("")}</ul>` : ""}
          <p>${link("/san-pham", "Sản phẩm")} · ${link("/thiet-ke", "Hộp quà")} · ${link("/tin-tuc", "Tin tức")}</p>
          ${navHtml()}
        </main>
        ${footerHtml(settings)}`);
      return { status: 200, seo: contactMeta(ctx), bodyHtml: body, cacheControl: PUBLIC_CONTENT_CACHE };
    }
    default:
      return notFoundPage(ctx, pathname);
  }
}

export { articleCard, productCard };
