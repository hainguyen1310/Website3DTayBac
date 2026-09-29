/**
 * Resolver SEO theo route (B02): title, description, canonical, robots,
 * Open Graph, Twitter Card và JSON-LD. Cùng một resolver được dùng cho HTML
 * ban đầu (server) và điều hướng client để head không lệch nhau.
 */

import { absoluteUrl, articleCanonicalPath, canonicalSearch } from "./paths.ts";
import type { SiteRoute } from "./paths.ts";
import { indexRobots, noindexRobots } from "./types.ts";
import type {
  SeoArticleInput,
  SeoCategoryInput,
  SeoContext,
  SeoImage,
  SeoMeta,
  SeoProductInput,
} from "./types.ts";

function absolute(origin: string, value: string | undefined | null): string {
  const raw = (value ?? "").trim();
  if (!raw) return absoluteUrl(origin, "/favicon.svg");
  if (/^https?:\/\//i.test(raw)) return raw;
  return absoluteUrl(origin, raw.startsWith("/") ? raw : `/${raw}`);
}

function image(url: string | undefined, alt: string | undefined, origin: string, fallback: SeoImage): SeoImage {
  const src = (url ?? "").trim();
  if (!src) return fallback;
  return { url: absolute(origin, src), alt };
}

function trimDescription(value: string, max = 165): string {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

function trimTitle(value: string, max = 65): string {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

function meta(input: {
  ctx: SeoContext;
  route: SiteRoute;
  title: string;
  description: string;
  canonicalPath: string;
  canonicalQuery?: string;
  image?: SeoImage;
  ogType?: SeoMeta["ogType"];
  robots?: string;
  ogTitle?: string;
  ogDescription?: string;
  article?: SeoMeta["article"];
  jsonLd?: Record<string, unknown>[];
}): SeoMeta {
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
    jsonLd: input.jsonLd ?? [],
  };
}

export function organizationJsonLd(ctx: SeoContext): Record<string, unknown> {
  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: ctx.brand.name,
    url: ctx.origin,
    logo: ctx.logoUrl,
    description: ctx.brand.description,
  };
  if (ctx.contact.phone) node.telephone = ctx.contact.phone;
  if (ctx.contact.email) node.email = ctx.contact.email;
  if (ctx.contact.address) {
    node.address = { "@type": "PostalAddress", addressCountry: "VN", streetAddress: ctx.contact.address };
  }
  if (ctx.social.length) node.sameAs = ctx.social;
  return node;
}

export function websiteJsonLd(ctx: SeoContext): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: ctx.brand.name,
    url: ctx.origin,
    inLanguage: "vi-VN",
    publisher: { "@type": "Organization", name: ctx.brand.name, url: ctx.origin },
  };
}

export function breadcrumbJsonLd(ctx: SeoContext, items: Array<{ name: string; path: string }>): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(ctx.origin, item.path),
    })),
  };
}

export function articleJsonLd(ctx: SeoContext, article: SeoArticleInput): Record<string, unknown> {
  const title = article.seoTitle?.trim() || article.title;
  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: trimTitle(title, 110),
    description: trimDescription(article.seoDescription?.trim() || article.excerpt),
    mainEntityOfPage: { "@type": "WebPage", "@id": absoluteUrl(ctx.origin, articleCanonicalPath(article)) },
    image: [image(article.socialImageUrl || article.image, article.imageAlt || title, ctx.origin, ctx.defaultImage).url],
    inLanguage: "vi-VN",
    publisher: { "@type": "Organization", name: ctx.brand.name, url: ctx.origin, logo: ctx.logoUrl },
  };
  if (article.publishedAt) node.datePublished = article.publishedAt;
  if (article.modifiedAt) node.dateModified = article.modifiedAt;
  node.author = article.authorName?.trim()
    ? { "@type": "Person", name: article.authorName.trim() }
    : { "@type": "Organization", name: ctx.brand.name, url: ctx.origin };
  if (article.tag) node.articleSection = article.tag;
  return node;
}

export function productJsonLd(ctx: SeoContext, product: SeoProductInput): Record<string, unknown> {
  const offer: Record<string, unknown> = {
    "@type": "Offer",
    url: absoluteUrl(ctx.origin, `/san-pham/${product.slug}`),
    priceCurrency: "VND",
    price: String(product.price),
    ...(typeof product.inStock === "boolean" ? { availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" } : {}),
  };
  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: trimDescription(product.description || product.tag || product.name, 300),
    image: [image(product.image, product.imageAlt || product.name, ctx.origin, ctx.defaultImage).url],
    url: absoluteUrl(ctx.origin, `/san-pham/${product.slug}`),
    offers: offer,
  };
  if (product.sku) node.sku = product.sku;
  if (product.categoryName) node.category = product.categoryName;
  return node;
}

function itemListJsonLd(ctx: SeoContext, name: string, products: SeoProductInput[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: products.length,
    itemListElement: products.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(ctx.origin, `/san-pham/${product.slug}`),
      name: product.name,
    })),
  };
}

/* ------------------------------------------------------------------ */
/* Builders theo route                                                 */
/* ------------------------------------------------------------------ */

export function homeMeta(ctx: SeoContext): SeoMeta {
  return meta({
    ctx,
    route: { kind: "home" },
    title: `A Sỉn — Tinh hoa Tây Bắc trong một món quà`,
    description:
      "Đặc sản gác bếp, gia vị núi rừng và những món quà mang dấu ấn Tây Bắc từ A Sỉn. Khám phá sản vật, tự thiết kế hộp quà và đặt hàng thanh toán khi nhận hàng.",
    canonicalPath: "/",
    jsonLd: [
      organizationJsonLd(ctx),
      websiteJsonLd(ctx),
      breadcrumbJsonLd(ctx, [{ name: "Trang chủ", path: "/" }]),
    ],
  });
}

export function productsMeta(ctx: SeoContext, products: SeoProductInput[]): SeoMeta {
  return meta({
    ctx,
    route: { kind: "products" },
    title: "Sản vật & đặc sản Tây Bắc — A Sỉn",
    description:
      "Khám phá sản vật A Sỉn: trà Shan Tuyết, mật ong hoa rừng, thịt gác bếp và gia vị núi rừng. Chọn hương vị bạn yêu và đặt hàng thanh toán khi nhận hàng.",
    canonicalPath: "/san-pham",
    image: ctx.defaultImage,
    jsonLd: [
      breadcrumbJsonLd(ctx, [
        { name: "Trang chủ", path: "/" },
        { name: "Sản phẩm", path: "/san-pham" },
      ]),
      itemListJsonLd(ctx, "Sản vật A Sỉn", products),
    ],
  });
}

export function productMeta(ctx: SeoContext, product: SeoProductInput): SeoMeta {
  const title = `${product.name} — A Sỉn`;
  return meta({
    ctx,
    route: { kind: "product", slug: product.slug },
    title: trimTitle(title),
    description: product.description || product.tag || `Sản vật ${product.name} từ A Sỉn.`,
    canonicalPath: `/san-pham/${product.slug}`,
    ogType: "product",
    image: image(product.image, product.imageAlt || product.name, ctx.origin, ctx.defaultImage),
    jsonLd: [
      breadcrumbJsonLd(ctx, [
        { name: "Trang chủ", path: "/" },
        { name: "Sản phẩm", path: "/san-pham" },
        { name: product.name, path: `/san-pham/${product.slug}` },
      ]),
      productJsonLd(ctx, product),
    ],
  });
}

export function categoryMeta(ctx: SeoContext, category: SeoCategoryInput): SeoMeta {
  const description =
    category.description?.trim() ||
    `Các sản vật ${category.name} của A Sỉn: nguồn gốc rõ ràng, giao toàn quốc và thanh toán khi nhận hàng.`;
  return meta({
    ctx,
    route: { kind: "category", slug: category.slug },
    title: trimTitle(`${category.name} — Sản vật A Sỉn`),
    description,
    canonicalPath: `/danh-muc/${category.slug}`,
    image: image(category.image, category.name, ctx.origin, ctx.defaultImage),
    jsonLd: [
      breadcrumbJsonLd(ctx, [
        { name: "Trang chủ", path: "/" },
        { name: "Sản phẩm", path: "/san-pham" },
        { name: category.name, path: `/danh-muc/${category.slug}` },
      ]),
      itemListJsonLd(ctx, category.name, category.products),
    ],
  });
}

export function giftMeta(ctx: SeoContext): SeoMeta {
  return meta({
    ctx,
    route: { kind: "gift" },
    title: "Tự thiết kế hộp quà Tây Bắc — A Sỉn",
    description:
      "Tự chọn sản vật, màu hộp và lời nhắn để tạo một món quà mang dấu ấn riêng. Hộp quà A Sỉn phù hợp biếu tặng gia đình, đối tác và dịp lễ.",
    canonicalPath: "/thiet-ke",
    jsonLd: [
      breadcrumbJsonLd(ctx, [
        { name: "Trang chủ", path: "/" },
        { name: "Hộp quà", path: "/thiet-ke" },
      ]),
    ],
  });
}

export function aboutMeta(ctx: SeoContext): SeoMeta {
  return meta({
    ctx,
    route: { kind: "about" },
    title: "Câu chuyện A Sỉn — Từ núi rừng Tây Bắc",
    description:
      "Từ con người vùng cao đến một món quà chân thành. Khám phá câu chuyện, nguồn gốc sản vật và những giá trị A Sỉn trân quý.",
    canonicalPath: "/gioi-thieu",
    jsonLd: [
      breadcrumbJsonLd(ctx, [
        { name: "Trang chủ", path: "/" },
        { name: "Về A Sỉn", path: "/gioi-thieu" },
      ]),
    ],
  });
}

export function newsMeta(ctx: SeoContext, options: { page?: number; topicName?: string; topicSlug?: string; articles?: SeoArticleInput[] } = {}): SeoMeta {
  const page = options.page && options.page > 1 ? options.page : 1;
  const topicPath = options.topicSlug ? `/tin-tuc/chu-de/${options.topicSlug}` : "/tin-tuc";
  const title = options.topicName
    ? `${options.topicName} — Tạp chí A Sỉn${page > 1 ? ` (trang ${page})` : ""}`
    : `Tạp chí · Chuyện núi rừng — A Sỉn${page > 1 ? ` (trang ${page})` : ""}`;
  return meta({
    ctx,
    route: { kind: "news", page, topic: options.topicSlug },
    title: trimTitle(title),
    description:
      "Những câu chuyện về hương vị, con người và miền đất Tây Bắc từ tạp chí A Sỉn. Đọc để hiểu hơn về sản vật và cách chọn quà.",
    canonicalPath: topicPath,
    canonicalQuery: page > 1 ? `page=${page}` : "",
    image: image("/images/asin/journey-panorama.webp", "Ruộng bậc thang Tây Bắc", ctx.origin, ctx.defaultImage),
    jsonLd: [
      breadcrumbJsonLd(ctx, [
        { name: "Trang chủ", path: "/" },
        { name: "Tin tức", path: "/tin-tuc" },
        ...(options.topicSlug && options.topicName ? [{ name: options.topicName, path: topicPath }] : []),
      ]),
    ],
  });
}

export function articleMeta(ctx: SeoContext, article: SeoArticleInput): SeoMeta {
  const title = article.seoTitle?.trim() || `${article.title} — Tạp chí A Sỉn`;
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
      publishedTime: article.publishedAt ?? undefined,
      modifiedTime: article.modifiedAt ?? undefined,
      author: article.authorName ?? undefined,
      section: article.tag || undefined,
    },
    jsonLd: [
      breadcrumbJsonLd(ctx, [
        { name: "Trang chủ", path: "/" },
        { name: "Tin tức", path: "/tin-tuc" },
        { name: article.tag || "Bài viết", path: `/tin-tuc/chu-de/${article.tagSlug}` },
        { name: article.title, path: `/tin-tuc/${article.slug}` },
      ]),
      articleJsonLd(ctx, article),
    ],
  });
}

export function contactMeta(ctx: SeoContext): SeoMeta {
  return meta({
    ctx,
    route: { kind: "contact" },
    title: "Liên hệ & hỗ trợ mua hàng — A Sỉn",
    description:
      "Liên hệ A Sỉn để tư vấn sản phẩm, quà tặng hoặc hỗ trợ đơn hàng, giao hàng và đổi trả. A Sỉn phản hồi trong giờ làm việc.",
    canonicalPath: "/lien-he",
    jsonLd: [
      breadcrumbJsonLd(ctx, [
        { name: "Trang chủ", path: "/" },
        { name: "Liên hệ", path: "/lien-he" },
      ]),
    ],
  });
}

export function noindexMeta(ctx: SeoContext, title = "Không tìm thấy trang — A Sỉn"): SeoMeta {
  return meta({
    ctx,
    route: { kind: "notFound" },
    title,
    description: "Trang bạn tìm không còn tồn tại. Khám phá sản vật và câu chuyện khác từ A Sỉn.",
    canonicalPath: "/",
    robots: noindexRobots(),
    jsonLd: [],
  });
}

/** Canonical cho trang có tham số: giữ `page`/`chu-de`, bỏ tracking (B03). */
export function canonicalQueryFor(search: URLSearchParams): string {
  return canonicalSearch(search);
}
