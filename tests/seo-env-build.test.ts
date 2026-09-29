import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "vite";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";

test("Vite browser build embeds public SEO, Supabase and GA4 config without Node process", async () => {
  const entry = "virtual:seo-env-check";
  const output = await build({
    configFile: false, envFile: false, logLevel: "silent",
    define: { "import.meta.env.VITE_SITE_URL": JSON.stringify("https://store.example.test"), "import.meta.env.VITE_SUPABASE_URL": JSON.stringify("https://data.example.test"), "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify("test-public"), "import.meta.env.VITE_GA4_ID": JSON.stringify("G-TEST123"), "import.meta.env.VITE_SEO_INDEX_ENABLED": JSON.stringify("true") },
    plugins: [{ name: "seo-env-check", resolveId: id => id === entry ? id : undefined, load: id => id === entry ? `import {getSeoEnvironment,readSeoEnv} from ${JSON.stringify(resolve("src/seo/config.ts").replaceAll("\\", "/"))}; globalThis.__seoResult={...getSeoEnvironment(),ga4:readSeoEnv().VITE_GA4_ID};` : undefined }],
    build: { write: false, minify: false, rollupOptions: { input: entry, output: { format: "iife" } } },
  });
  const bundles = Array.isArray(output) ? output : [output];
  const chunk = bundles.flatMap(bundle => "output" in bundle ? bundle.output : []).find(item => item.type === "chunk");
  assert.ok(chunk && chunk.type === "chunk");
  const result = runInNewContext(`${chunk.code}\n__seoResult;`, { URL });
  assert.equal(result.canonicalOrigin, "https://store.example.test");
  assert.equal(result.supabaseUrl, "https://data.example.test");
  assert.equal(result.supabasePublicKey, "test-public");
  assert.equal(result.indexingEnabled, true);
  assert.equal(result.ga4, "G-TEST123");
});
