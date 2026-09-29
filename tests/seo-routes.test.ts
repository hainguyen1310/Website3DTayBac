import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canonicalSearch,
  matchSiteRoute,
  normalizePathname,
  resolveRedirectTarget,
} from "../src/seo/paths.ts";
import { buildRobotsTxt } from "../src/seo/robots.ts";
import { renderSitemapXml } from "../src/seo/sitemap.ts";
import { articleMeta, productMeta } from "../src/seo/meta.ts";
import type { SeoContext } from "../src/seo/types.ts";
import { getSeoEnvironment, isIndexableHost } from "../src/seo/config.ts";
import { injectSeoIntoHtml, renderHeadTags, serializeJsonLd } from "../src/seo/head.ts";

const context: SeoContext = {
  origin: "https://asintaybac.com",
  indexable: true,
  brand: { name: "A Sỉn", description: "Đặc sản Tây Bắc" },
  contact: { phone: "0901234567", email: "hello@asintaybac.com" },
  social: ["https://facebook.com/asintaybac"],
  logoUrl: "https://asintaybac.com/favicon.svg",
  defaultImage: { url: "https://asintaybac.com/images/asin/journey-panorama.webp", alt: "A Sỉn" },
};

test("route matching covers products, categories, topics and articles", () => {
  assert.equal(matchSiteRoute("/", new URLSearchParams()).kind, "home");
  assert.deepEqual(matchSiteRoute("/san-pham", new URLSearchParams()), { kind: "products", productSlug: undefined });
  assert.deepEqual(matchSiteRoute("/san-pham/tra-shan-tuyet", new URLSearchParams()), { kind: "product", slug: "tra-shan-tuyet" });
  assert.deepEqual(matchSiteRoute("/danh-muc/tra-thao-moc", new URLSearchParams()), { kind: "category", slug: "tra-thao-moc" });
  assert.deepEqual(matchSiteRoute("/tin-tuc/hanh-trinh-tra", new URLSearchParams()), { kind: "article", slug: "hanh-trinh-tra" });
  assert.deepEqual(matchSiteRoute("/tin-tuc/chu-de/vi-tay-bac", new URLSearchParams()), { kind: "news", page: 1, topic: "vi-tay-bac" });
  assert.equal(matchSiteRoute("/khong-ton-tai", new URLSearchParams()).kind, "notFound");
  // Chữ hoa trong slug không hợp lệ; tầng HTTP chuẩn hoá pathname trước khi match.
  assert.equal(matchSiteRoute("/tin-tuc/Bai-Viet", new URLSearchParams()).kind, "notFound");
});

test("path normalization redirects trailing slash and uppercase", () => {
  assert.equal(normalizePathname("/tin-tuc/").redirectTo, "/tin-tuc");
  assert.equal(normalizePathname("/Tin-Tuc/ABC").redirectTo, "/tin-tuc/abc");
  assert.equal(normalizePathname("/tin-tuc/abc").redirectTo, undefined);
  assert.equal(normalizePathname("//san-pham").redirectTo, "/san-pham");
});

test("canonical query drops tracking and search, keeps pagination", () => {
  const clean = canonicalSearch(new URLSearchParams("utm_source=fb&fbclid=1&page=2&q=tra&chu-de=tra"));
  assert.equal(clean, "page=2&chu-de=tra");
  assert.equal(canonicalSearch(new URLSearchParams("page=1&product=tea")), "");
});

test("redirect resolver flattens chains and stops loops", () => {
  const rules = [
    { fromPath: "/a", toPath: "/b", status: 308 as const },
    { fromPath: "/b", toPath: "/c", status: 301 as const },
    { fromPath: "/x", toPath: "/y", status: 308 as const },
    { fromPath: "/y", toPath: "/x", status: 308 as const },
  ];
  assert.deepEqual(resolveRedirectTarget("/a", rules), { toPath: "/c", status: 301 });
  assert.equal(resolveRedirectTarget("/x", rules), null);
  assert.equal(resolveRedirectTarget("/c", rules), null);
});

test("robots lets crawlers read noindex while omitting preview sitemap", () => {
  const env = getSeoEnvironment({
    SITE_URL: "https://asintaybac.com",
    VITE_SEO_INDEX_ENABLED: "true",
    SUPABASE_URL: "",
    SUPABASE_PUBLISHABLE_KEY: "",
  } as Record<string, string>);
  const live = buildRobotsTxt("asintaybac.com", env);
  assert.match(live, /Sitemap: https:\/\/asintaybac\.com\/sitemap\.xml/);
  assert.doesNotMatch(live, /Disallow: \/admin/);
  const preview = buildRobotsTxt("website3dtaybac.vercel.app", env);
  assert.match(preview, /Allow: \/$/m);
  assert.doesNotMatch(preview, /Sitemap/);
  assert.equal(isIndexableHost("localhost:5173", env), false);
  assert.equal(isIndexableHost("www.asintaybac.com", env), true);
});

test("sitemap rendering escapes URLs", () => {
  const xml = renderSitemapXml([{ loc: "https://asintaybac.com/tin-tuc/a&b", lastmod: "2026-09-29T00:00:00Z" }]);
  assert.match(xml, /<loc>https:\/\/asintaybac\.com\/tin-tuc\/a&amp;b<\/loc>/);
  assert.match(xml, /urlset/);
});

test("article and product meta use canonical URL and schema facts", () => {
  const article = articleMeta(context, {
    slug: "hanh-trinh-tra",
    title: "Theo mây lên Suối Giàng",
    excerpt: "Một buổi sớm se lạnh.",
    image: "/images/tea.webp",
    tag: "Từ bản làng",
    tagSlug: "tu-ban-lang",
    publishedAt: "2026-09-18T00:00:00Z",
    modifiedAt: "2026-09-20T00:00:00Z",
    authorName: "A Sỉn",
    seoTitle: null,
    seoDescription: null,
    socialImageUrl: null,
    socialTitle: null,
    socialDescription: null,
  });
  assert.equal(article.canonical, "https://asintaybac.com/tin-tuc/hanh-trinh-tra");
  assert.equal(article.ogType, "article");
  assert.match(article.robots, /index/);
  const blog = article.jsonLd.find((node) => node["@type"] === "BlogPosting");
  assert.ok(blog);
  assert.equal(blog.datePublished, "2026-09-18T00:00:00Z");
  assert.equal(blog.dateModified, "2026-09-20T00:00:00Z");
  assert.deepEqual(blog.image, ["https://asintaybac.com/images/tea.webp"]);

  const product = productMeta(context, {
    slug: "tra-shan",
    name: "Trà Shan Tuyết",
    description: "Trà cổ thụ.",
    image: "/images/tea.webp",
    sku: "MOC-TEA-001",
    price: 180000,
    inStock: false,
  });
  assert.equal(product.canonical, "https://asintaybac.com/san-pham/tra-shan");
  const offer = (product.jsonLd.find((node) => node["@type"] === "Product") as Record<string, unknown>).offers as Record<string, unknown>;
  assert.equal(offer.price, "180000");
  assert.equal(offer.priceCurrency, "VND");
  assert.equal(offer.availability, "https://schema.org/OutOfStock");
});

test("head serialization is safe and replaces template markers", () => {
  const serialized = serializeJsonLd({ name: "</script><script>alert(1)</script>" });
  assert.doesNotMatch(serialized, /<\/script>/);

  const meta = articleMeta(context, {
    slug: "a", title: "T", excerpt: "E", image: "/i.webp", tag: "Tag", tagSlug: "tag",
    publishedAt: null, modifiedAt: null, authorName: null, seoTitle: null, seoDescription: null,
    socialImageUrl: null, socialTitle: null, socialDescription: null,
  });
  const head = renderHeadTags(meta);
  assert.equal((head.match(/data-asin-seo-jsonld=""/g) ?? []).length, meta.jsonLd.length);
  assert.match(head, /data-asin-seo="canonical"/);
  assert.match(head, /data-asin-seo="robots"/);
  assert.match(head, /rel="canonical" href="https:\/\/asintaybac\.com\/tin-tuc\/a"/);

  const template = `<html><head><!--seo:head:start--><title>cũ</title><!--seo:head:end--></head><body><div id="root"></div><script src="/assets/site.js"></script></body></html>`;
  const injected = injectSeoIntoHtml(template, head, "<p>Nội dung</p>");
  assert.match(injected, /<div id="root"><p>Nội dung<\/p><\/div>/);
  assert.match(injected, /rel="canonical"/);
  assert.doesNotMatch(injected, /<title>cũ<\/title>/);
  assert.match(injected, /<script src="\/assets\/site.js">/);
});
