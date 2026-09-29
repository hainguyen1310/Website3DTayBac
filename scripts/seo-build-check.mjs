import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { loadEnv } from "vite";

const root = process.cwd();
const env = { ...loadEnv("production", root, ""), ...process.env };
const config = JSON.parse(await readFile(resolve(root, "vercel.json"), "utf8"));
const shell = await readFile(resolve(root, "dist/seo-shell.html"), "utf8");
assert.ok(shell.includes("<!--seo:head:start-->") && shell.includes('id="root"'), "Thiếu marker SEO trong shell build.");
assert.ok(!(await readdir(resolve(root, "dist"))).includes("index.html"), "dist/index.html sẽ bỏ qua renderer ở trang chủ.");
assert.equal(config.functions?.["api/render.ts"]?.includeFiles, "dist/seo-shell.html", "Vercel Function phải đóng gói seo-shell.html.");
for (const file of ["api/render.ts", "api/seo.ts"]) await access(resolve(root, file));
for (const asset of ["robots", "sitemap"]) assert.ok(config.rewrites.some(rule => rule.destination === `/api/seo?asset=${asset}`), `Thiếu rewrite ${asset}.`);
assert.ok(config.rewrites.some(rule => rule.destination === "/api/render?asin_path=$1"), "Thiếu rewrite HTML qua renderer.");
const jsFiles = (await readdir(resolve(root, "dist/assets"))).filter(file => file.endsWith(".js"));
const js = (await Promise.all(jsFiles.map(file => readFile(resolve(root, "dist/assets", file), "utf8")))).join("\n");
if (env.VITE_GA4_ID) {
  assert.match(env.VITE_GA4_ID.trim(), /^G-[A-Z0-9]+$/, "VITE_GA4_ID không đúng dạng G-...");
  assert.ok(js.includes(env.VITE_GA4_ID.trim()) && js.includes("googletagmanager.com/gtag"), "GA4 env/code chưa có trong JS build.");
}
assert.ok(!env.VITE_SEO_INDEX_ENABLED || ["true", "false"].includes(env.VITE_SEO_INDEX_ENABLED), "VITE_SEO_INDEX_ENABLED chỉ nhận true/false.");
console.log(`SEO build check passed: shell, Functions, rewrites${env.VITE_GA4_ID ? ", GA4 included" : ""}. Index requested: ${env.VITE_SEO_INDEX_ENABLED === "true" ? "on" : "off (noindex)"}.`);
