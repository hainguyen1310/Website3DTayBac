#!/usr/bin/env node
/**
 * Kiểm tra phát hành SEO (B20): chạy sau deploy hoặc trên dev server.
 *
 *   node scripts/seo-check.mjs https://asintaybac.com
 *   node scripts/seo-check.mjs http://localhost:5199 --offline
 *
 * `--offline` bỏ qua các trang cần Supabase (môi trường không có dữ liệu).
 * Thoát mã 1 nếu có lỗi chặn; in bảng kết quả để lưu bằng chứng.
 */

const args = process.argv.slice(2);
const base = (args.find((arg) => !arg.startsWith("--")) ?? "http://localhost:5173").replace(/\/+$/, "");
const offline = args.includes("--offline");

const results = [];

async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, { redirect: "manual", signal: AbortSignal.timeout(20000), ...options });
  const body = await response.text();
  return { response, body };
}

function report(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  ${detail}`);
}

function expect(name, condition, detail) {
  report(name, Boolean(condition), detail);
}

async function checkRobots() {
  const { response, body } = await request("/robots.txt");
  expect("robots.txt trả 200 text", response.status === 200 && /text\/plain/.test(response.headers.get("content-type") ?? ""), `status=${response.status}`);
  expect("robots.txt có User-agent", /User-agent: \*/.test(body), body.split("\n")[0] ?? "");
}

async function checkSitemap() {
  const { response, body } = await request("/sitemap.xml");
  expect("sitemap.xml trả 200 XML", response.status === 200 && /application\/xml/.test(response.headers.get("content-type") ?? ""), `status=${response.status}`);
  expect("sitemap.xml parse được", /<urlset[\s>]/.test(body) && body.trim().endsWith("</urlset>"), `${body.length} bytes`);
}

async function checkHtml(path, { canonical, requireContent = true } = {}) {
  const { response, body } = await request(path);
  const titleCount = (body.match(/<title/g) ?? []).length;
  expect(`${path} trả 200 HTML`, response.status === 200 && /text\/html/.test(response.headers.get("content-type") ?? ""), `status=${response.status}`);
  expect(`${path} có đúng một <title>`, titleCount === 1, `titles=${titleCount}`);
  expect(`${path} có canonical`, /<link rel="canonical" href="https?:\/\//.test(body), canonical ?? "");
  if (canonical) expect(`${path} canonical đúng`, body.includes(`rel="canonical" href="${canonical}"`), canonical);
  if (requireContent) expect(`${path} có nội dung prerender`, /id="asin-prerender"/.test(body), `${body.length} bytes`);
}

async function checkTrailingSlash() {
  const { response } = await request("/san-pham/");
  expect("/san-pham/ chuyển hướng bỏ slash cuối", response.status === 301 || response.status === 308, `status=${response.status}`);
}

async function checkRegressionRoutes() {
  const product = await request("/san-pham?product=honey&utm_source=seo-check&gclid=probe");
  expect("URL sản phẩm cũ giữ attribution", product.response.status === 308 && product.response.headers.get("location") === "/san-pham/honey?utm_source=seo-check&gclid=probe", product.response.headers.get("location") ?? "");
  const deal = await request("/deal-hoi?utm_source=seo-check");
  expect("URL ưu đãi cũ chuyển hướng có UTM", deal.response.status === 308 && deal.response.headers.get("location") === "/?utm_source=seo-check#deal-hoi", deal.response.headers.get("location") ?? "");
  if (offline) return;
  for (const path of ["/tin-tuc?page=999", "/tin-tuc/chu-de/chu-de-khong-ton-tai-seo-check", "/tin-tuc/bai-khong-ton-tai-seo-check"]) {
    const { response, body } = await request(path);
    expect(`${path} trả 404 và noindex`, response.status === 404 && /name="robots" content="noindex/.test(body), `status=${response.status}`);
  }
  const sitemap = await request("/sitemap.xml");
  const locations = [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  const canonicalHost = new URL(base).hostname === "asintaybac.com";
  if (canonicalHost && !args.includes("--noindex")) expect("Sitemap production đã mở index và có URL", locations.length > 0, `${locations.length} URL`);
  expect("Sitemap không lặp URL", new Set(locations).size === locations.length, `${locations.length} URL`);
}

async function main() {
  console.log(`Kiểm tra SEO tại ${base}${offline ? " (offline)" : ""}\n`);
  await checkRobots();
  await checkSitemap();
  await checkHtml("/", { canonical: undefined });
  await checkHtml("/gioi-thieu");
  await checkTrailingSlash();

  const { response: notFound } = await request("/khong-ton-tai-a-sin-xyz");
  expect("URL không tồn tại trả 404", notFound.status === 404, `status=${notFound.status}`);

  if (!offline) {
    await checkHtml("/san-pham");
    await checkHtml("/tin-tuc");
  }
  await checkRegressionRoutes();

  const failures = results.filter((result) => !result.ok);
  console.log(`\n${results.length - failures.length}/${results.length} kiểm tra đạt.`);
  if (failures.length) {
    console.error(`\n${failures.length} kiểm tra cần xử lý trước khi phát hành.`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`Không chạy được kiểm tra: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
