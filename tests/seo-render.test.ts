import { test } from "node:test";
import assert from "node:assert/strict";
import { renderSitePage } from "../src/seo/renderSite.ts";
import { handleSeoAsset } from "../server/seo/handler.ts";
import type { SeoEnvironment } from "../src/seo/config.ts";

/** Môi trường tách biệt: không có Supabase nên trang tĩnh vẫn render, trang cần dữ liệu trả 503. */
const offlineEnv: SeoEnvironment = {
  canonicalOrigin: "https://asintaybac.com",
  canonicalHost: "asintaybac.com",
  indexableHosts: ["asintaybac.com", "www.asintaybac.com"],
  indexingEnabled: true,
  supabaseUrl: "",
  supabasePublicKey: "",
};

test("home renders content, canonical and internal links without data", async () => {
  const page = await renderSitePage({ pathname: "/", search: new URLSearchParams(), requestHost: "asintaybac.com", env: offlineEnv });
  assert.equal(page.status, 200);
  assert.match(page.bodyHtml, /Tinh hoa Tây Bắc/);
  assert.match(page.bodyHtml, /\/san-pham/);
  assert.equal(page.seo.canonical, "https://asintaybac.com/");
  assert.match(page.seo.robots, /index/);
});

test("static pages render and unknown URLs return 404", async () => {
  const gift = await renderSitePage({ pathname: "/thiet-ke", search: new URLSearchParams(), requestHost: "asintaybac.com", env: offlineEnv });
  assert.equal(gift.status, 200);
  assert.match(gift.bodyHtml, /hộp quà/i);

  const missing = await renderSitePage({ pathname: "/khong-ton-tai", search: new URLSearchParams(), requestHost: "asintaybac.com", env: offlineEnv });
  assert.equal(missing.status, 404);
  assert.match(missing.seo.robots, /noindex/);
});

test("data-backed pages degrade to 503 instead of a fake 200", async () => {
  const products = await renderSitePage({ pathname: "/san-pham", search: new URLSearchParams(), requestHost: "asintaybac.com", env: offlineEnv });
  assert.equal(products.status, 503);
  assert.equal(products.cacheControl, "no-store");

  const article = await renderSitePage({ pathname: "/tin-tuc/bai-viet", search: new URLSearchParams(), requestHost: "asintaybac.com", env: offlineEnv });
  assert.equal(article.status, 503);
});

test("admin and unsubscribe are noindex and never cached publicly", async () => {
  const admin = await renderSitePage({ pathname: "/admin", search: new URLSearchParams(), requestHost: "asintaybac.com", env: offlineEnv });
  assert.equal(admin.status, 200);
  assert.match(admin.seo.robots, /noindex/);
  assert.equal(admin.cacheControl, "no-store");

  const unsubscribe = await renderSitePage({ pathname: "/huy-nhan-tin", search: new URLSearchParams(), requestHost: "asintaybac.com", env: offlineEnv });
  assert.match(unsubscribe.seo.robots, /noindex/);
});

test("preview hosts receive noindex meta", async () => {
  const page = await renderSitePage({ pathname: "/gioi-thieu", search: new URLSearchParams(), requestHost: "website3dtaybac.vercel.app", env: offlineEnv });
  assert.equal(page.status, 200);
  assert.match(page.seo.robots, /noindex/);
  assert.equal(page.seo.canonical, "https://asintaybac.com/gioi-thieu");
});

test("robots and sitemap assets respond with correct types", async () => {
  const robots = await handleSeoAsset("robots", "asintaybac.com", offlineEnv);
  assert.equal(robots.status, 200);
  assert.match(robots.headers.get("content-type") ?? "", /text\/plain/);
  assert.match(await robots.text(), /Sitemap: https:\/\/asintaybac\.com\/sitemap\.xml/);

  const sitemap = await handleSeoAsset("sitemap", "asintaybac.com", offlineEnv);
  assert.equal(sitemap.status, 503);
  assert.equal(sitemap.headers.get("cache-control"), "no-store");

  const previewRobots = await handleSeoAsset("robots", "localhost:5173", offlineEnv);
  assert.match(await previewRobots.text(), /Allow: \/$/m);
  const previewSitemap = await handleSeoAsset("sitemap", "localhost:5173", offlineEnv);
  assert.equal(previewSitemap.status, 200);
  assert.doesNotMatch(await previewSitemap.text(), /<loc>/);
});
