import { test } from "node:test";
import assert from "node:assert/strict";
import { getSeoEnvironment, isIndexableHost, isProductionHost } from "../src/seo/config.ts";
import { SupabaseRest, loadArticleList, loadAllPublishedArticles, loadProductBySlug } from "../src/seo/content.ts";
import { handleSeoAsset, handleSiteRequest } from "../server/seo/handler.ts";
import { buildSitemapEntries } from "../src/seo/sitemap.ts";
import { articleMeta, productMeta } from "../src/seo/meta.ts";
import { buildSeoContext } from "../src/seo/renderSite.ts";
import { articleFromRow } from "../src/content/article.ts";
import { effectivePrice } from "../src/pricing.ts";

const env = getSeoEnvironment({ SITE_URL: "https://asintaybac.com", VITE_SEO_INDEX_ENABLED: "true", VITE_SUPABASE_URL: "https://data.example.test", VITE_SUPABASE_PUBLISHABLE_KEY: "test-public-key" });
const shell = async () => '<html><head><!--seo:head:start--><!--seo:head:end--></head><body><div id="root"></div></body></html>';
const row = (index: number) => ({ id: String(index), slug: `bai-${index}`, tag: "Trà", tag_slug: "tra", title: `Bài ${index}`, excerpt: "Nội dung thật", image_url: "/tea.webp", read_time_minutes: 1, body: ["Nội dung"], published: true, published_at: "2026-09-01T00:00:00Z" });
const context = buildSeoContext({ content: {}, support: {} }, env, "asintaybac.com");

test("news offset outside data is 404, empty first page is 200, empty topic is 404", async t => {
  t.mock.method(globalThis, "fetch", async (input: string) => {
    const url = new URL(input);
    if (!url.pathname.endsWith("/articles")) return Response.json([]);
    if (Number(url.searchParams.get("offset")) > 0) return Response.json({ code: "PGRST103" }, { status: 416, headers: { "content-range": "*/4" } });
    return Response.json([], { headers: { "content-range": "*/0" } });
  });
  const page2 = await handleSiteRequest({ pathname: "/tin-tuc", search: new URLSearchParams("page=2"), host: "asintaybac.com", env, loadTemplate: shell });
  assert.equal(page2.status, 404);
  assert.match(page2.headers.get("x-robots-tag")!, /noindex/);
  const empty = await handleSiteRequest({ pathname: "/tin-tuc", host: "asintaybac.com", env, loadTemplate: shell });
  assert.equal(empty.status, 200);
  const topic = await handleSiteRequest({ pathname: "/tin-tuc/chu-de/khong-co", host: "asintaybac.com", env, loadTemplate: shell });
  assert.equal(topic.status, 404);
});

test("source errors stay errors and never remove topic filters", async t => {
  const requests: string[] = [];
  t.mock.method(globalThis, "fetch", async (input: string) => { requests.push(input); return Response.json({ code: "42703" }, { status: 400 }); });
  await assert.rejects(loadArticleList(new SupabaseRest(env), { topicSlug: "tra" }));
  assert.equal(requests.length, 1);
  assert.match(requests[0], /tag_slug=eq.tra/);
  const res = await handleSiteRequest({ pathname: "/tin-tuc", host: "asintaybac.com", env, loadTemplate: shell });
  assert.equal(res.status, 503);
  assert.equal(res.headers.get("cache-control"), "no-store");
});

test("sitemap reads more than 1000 articles and excludes redirected/noncanonical URLs", async t => {
  const articles = Array.from({ length: 1107 }, (_, i) => ({ ...row(i), canonical_path: i === 3 ? "/tin-tuc/bai-4" : null }));
  t.mock.method(globalThis, "fetch", async (input: string) => {
    const url = new URL(input);
    const offset = Number(url.searchParams.get("offset") || 0);
    const limit = Number(url.searchParams.get("limit") || 500);
    if (url.pathname.endsWith("/articles")) return Response.json(articles.slice(offset, offset + limit), { headers: { "content-range": `${offset}-${Math.min(offset + limit, articles.length) - 1}/${articles.length}` } });
    if (url.pathname.endsWith("/url_redirects")) return Response.json([{ from_path: "/tin-tuc/bai-2", to_path: "/tin-tuc/bai-1", status: 308 }], { headers: { "content-range": "0-0/1" } });
    return Response.json([], { headers: { "content-range": "*/0" } });
  });
  assert.equal((await loadAllPublishedArticles(new SupabaseRest(env))).length, 1107);
  const entries = await buildSitemapEntries("asintaybac.com", env);
  assert.ok(entries.some(entry => entry.loc.endsWith("/tin-tuc/bai-1106")));
  assert.ok(!entries.some(entry => entry.loc.endsWith("/tin-tuc/bai-3")));
  assert.ok(!entries.some(entry => entry.loc.endsWith("/tin-tuc/bai-2")));
  assert.equal(new Set(entries.map(entry => entry.loc)).size, entries.length);
});

test("a failed sitemap source returns 503 with retry and cannot cache incomplete XML", async t => {
  t.mock.method(globalThis, "fetch", async (input: string) => new URL(input).pathname.endsWith("/articles") ? new Response("unavailable", { status: 503 }) : Response.json([], { headers: { "content-range": "*/0" } }));
  const res = await handleSeoAsset("sitemap", "asintaybac.com", env);
  assert.equal(res.status, 503);
  assert.equal(res.headers.get("cache-control"), "no-store");
  assert.equal(res.headers.get("retry-after"), "60");
  assert.doesNotMatch(await res.text(), /<urlset/);
});

test("legacy product, promotion and stored slug redirects preserve attribution", async t => {
  t.mock.method(globalThis, "fetch", async (input: string) => {
    const url = new URL(input);
    if (url.pathname.endsWith("/url_redirects") && url.searchParams.get("from_path") === "eq./tin-tuc/bai-cu") return Response.json([{ from_path: "/tin-tuc/bai-cu", to_path: "/tin-tuc/bai-moi", status: 301 }]);
    return Response.json([]);
  });
  const opts = { host: "asintaybac.com", env, loadTemplate: shell };
  const product = await handleSiteRequest({ ...opts, pathname: "/san-pham", search: new URLSearchParams("product=honey&utm_source=facebook&gclid=abc") });
  assert.equal(product.status, 308);
  assert.equal(product.headers.get("location"), "/san-pham/honey?utm_source=facebook&gclid=abc");
  const promo = await handleSiteRequest({ ...opts, pathname: "/deal-hoi", search: new URLSearchParams("utm_source=facebook") });
  assert.equal(promo.headers.get("location"), "/?utm_source=facebook#deal-hoi");
  const slug = await handleSiteRequest({ ...opts, pathname: "/tin-tuc/bai-cu", search: new URLSearchParams("utm_campaign=tet") });
  assert.equal(slug.status, 301);
  assert.equal(slug.headers.get("location"), "/tin-tuc/bai-moi?utm_campaign=tet");
  const www = await handleSiteRequest({ ...opts, host: "www.asintaybac.com", pathname: "/tin-tuc", search: new URLSearchParams("utm_source=fb") });
  assert.equal(www.headers.get("location"), "https://asintaybac.com/tin-tuc?utm_source=fb");
});

test("launch switch defaults to noindex without disabling production analytics", async t => {
  const closed = getSeoEnvironment({ SITE_URL: "https://asintaybac.com" });
  assert.equal(isIndexableHost("asintaybac.com", closed), false);
  assert.equal(isProductionHost("asintaybac.com", closed), true);
  assert.equal(isProductionHost("localhost", { ...env, indexableHosts: ["localhost"] }), false);
  t.mock.method(globalThis, "fetch", async () => Response.json([]));
  const res = await handleSiteRequest({ pathname: "/gioi-thieu", host: "asintaybac.com", env: closed, loadTemplate: shell });
  assert.match(await res.text(), /content="noindex, nofollow"/);
  assert.match(res.headers.get("x-robots-tag")!, /noindex/);
  assert.doesNotMatch(await (await handleSeoAsset("sitemap", "asintaybac.com", closed)).text(), /<loc>/);
});

test("canonical override is identical in article metadata and schema", () => {
  const article = articleFromRow({ ...row(1), canonical_path: "/tin-tuc/bai-2" });
  const meta = articleMeta(context, article);
  assert.equal(meta.canonical, "https://asintaybac.com/tin-tuc/bai-2");
  assert.equal((meta.jsonLd.find(node => node["@type"] === "BlogPosting")!.mainEntityOfPage as { "@id": string })["@id"], meta.canonical);
  assert.equal(articleMeta(context, { ...article, canonicalPath: "//attacker.example" }).canonical, "https://asintaybac.com/tin-tuc/bai-1");
});

test("server price follows the shared promotion rule and unknown stock is not InStock", async t => {
  t.mock.method(globalThis, "fetch", async (input: string) => {
    const url = new URL(input);
    if (url.pathname.endsWith("/products")) return Response.json([{ id: "id-tea", slug: "tea", name: "Trà", price_vnd: 100000, description: "Trà ngon", image_url: "/tea.webp", product_categories: null }]);
    if (url.pathname.endsWith("/promotion_products")) return Response.json([{ promotion_id: "p1", product_id: "id-tea", original_price_vnd: 100000, discount_percent: 20, products: { slug: "tea" } }], { headers: { "content-range": "0-0/1" } });
    if (url.pathname.includes("/rpc/")) return new Response("unavailable", { status: 503 });
    return Response.json([]);
  });
  const product = (await loadProductBySlug(new SupabaseRest(env), "tea"))!;
  assert.equal(product.price, 80000);
  assert.equal(product.inStock, undefined);
  const offer = productMeta(context, product).jsonLd.find(node => node["@type"] === "Product")!.offers as Record<string, unknown>;
  assert.equal(offer.price, "80000");
  assert.ok(!("availability" in offer));
  assert.equal(effectivePrice("tea", 75000, [{ productId: "tea", originalPrice: 100000, discount: 20 } as never]), 75000);
});
