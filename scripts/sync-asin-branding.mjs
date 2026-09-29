/** Upload the approved reference assets, then update only branding/media fields.
 * Dry run: node --experimental-strip-types scripts/sync-asin-branding.mjs
 * Apply:   node --experimental-strip-types scripts/sync-asin-branding.mjs --env .env.admin.local --apply
 * The private env must provide SUPABASE_SERVICE_ROLE_KEY for the .env project.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { ASIN_CONTENT, SIGNATURE_PRODUCTS } from "../src/asinContent.ts";

function readEnv(file) {
  return Object.fromEntries(
    readFileSync(file, "utf8")
      .split(/\r?\n/)
      .filter((line) => /^[A-Z][A-Z0-9_]*=/.test(line))
      .map((line) => {
        const index = line.indexOf("=");
        return [
          line.slice(0, index),
          line
            .slice(index + 1)
            .trim()
            .replace(/^['"]|['"]$/g, ""),
        ];
      }),
  );
}
const args = process.argv.slice(2);
const apply = args.includes("--apply");
const envIndex = args.indexOf("--env");
if (envIndex >= 0 && !args[envIndex + 1])
  throw new Error("Missing private env filename.");
const projectEnv = readEnv(".env");
const privateEnv = envIndex >= 0 ? readEnv(args[envIndex + 1]) : {};
const config = { ...projectEnv, ...process.env, ...privateEnv };
const target = config.SUPABASE_URL || projectEnv.VITE_SUPABASE_URL;
if (new URL(target).origin !== new URL(projectEnv.VITE_SUPABASE_URL).origin)
  throw new Error(
    "Target differs from the storefront project. No changes made.",
  );
const manifest = JSON.parse(
  readFileSync("docs/asin-image-prompts.json", "utf8"),
);
const assets = manifest.map((asset) => ({
  ...asset,
  bytes: readFileSync(asset.output),
}));
const productIds = SIGNATURE_PRODUCTS.map((product) => product.id);
console.log(
  JSON.stringify(
    {
      mode: apply ? "apply" : "dry-run",
      target: new URL(target).host,
      images: assets.map((asset) => asset.output),
      products: productIds,
      fields: ["image_url", "website_content"],
      preserves: [
        "prices",
        "weights",
        "inventory",
        "orders",
        "customers",
        "active",
      ],
    },
    null,
    2,
  ),
);
if (!apply) process.exit(0);
if (!config.SUPABASE_SERVICE_ROLE_KEY)
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY is required server-side. Never prefix it with VITE_.",
  );
const db = createClient(target, config.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const [products, settings] = await Promise.all([
  db
    .from("products")
    .select("id,slug,image_url,model_url,price_vnd,weight_label,active")
    .in("slug", productIds),
  db
    .from("site_settings")
    .select("key,value,is_public")
    .eq("key", "website_content")
    .maybeSingle(),
]);
if (products.error || settings.error)
  throw new Error(products.error?.message || settings.error?.message);
const missing = productIds.filter(
  (slug) => !products.data.some((product) => product.slug === slug),
);
if (missing.length)
  throw new Error(
    `Apply 20260926000000_asin_product_previews.sql first. Missing: ${missing.join(", ")}`,
  );
mkdirSync("test-results", { recursive: true });
const backup = resolve(
  "test-results",
  `asin-branding-before-${Date.now()}.json`,
);
writeFileSync(
  backup,
  JSON.stringify({ products: products.data, settings: settings.data }, null, 2),
);
console.log(`Backup: ${backup}`);

// Upload all assets before making any of their URLs visible to the storefront.
const urls = new Map();
const prefix = `asin-${Date.now()}`;
for (const asset of assets) {
  const key = `${prefix}/${asset.name}.webp`;
  const { error } = await db.storage
    .from("site-images")
    .upload(key, asset.bytes, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: false,
    });
  if (error)
    throw new Error(
      `Upload ${asset.name}: ${error.message}. Database branding has not been changed.`,
    );
  const url = db.storage.from("site-images").getPublicUrl(key).data.publicUrl;
  const response = await fetch(url, { method: "HEAD" });
  if (!response.ok)
    throw new Error(`Uploaded image is not publicly readable: ${asset.name}`);
  urls.set("/" + asset.output.replace(/^public\//, ""), url);
}
for (const product of SIGNATURE_PRODUCTS) {
  const imageUrl = urls.get(product.image);
  if (!imageUrl) throw new Error(`No uploaded image for ${product.id}`);
  const { data, error } = await db
    .from("products")
    .update({ image_url: imageUrl })
    .eq("slug", product.id)
    .select("slug,image_url");
  if (error || data?.length !== 1)
    throw new Error(
      `Product ${product.id}: ${error?.message || "not updated"}. Backup: ${backup}`,
    );
}
const content = {
  ...(settings.data?.value || {}),
  ...ASIN_CONTENT,
  __designVersion: "asin-2026",
};
for (const [key, value] of Object.entries(content))
  if (urls.has(value)) content[key] = urls.get(value);
const update = await db
  .from("site_settings")
  .upsert(
    { key: "website_content", value: content, is_public: true },
    { onConflict: "key" },
  )
  .select("key");
if (update.error || update.data?.length !== 1)
  throw new Error(
    `CMS update failed: ${update.error?.message || "no affected row"}. Backup: ${backup}`,
  );
const verified = await db
  .from("products")
  .select("slug,image_url,price_vnd,weight_label,active")
  .in("slug", productIds);
if (verified.error) throw verified.error;
for (const before of products.data) {
  const after = verified.data.find((product) => product.slug === before.slug);
  if (
    !after ||
    after.price_vnd !== before.price_vnd ||
    after.weight_label !== before.weight_label ||
    after.active !== before.active
  )
    throw new Error(
      "Commerce fields changed during synchronization. Review the backup before continuing.",
    );
}
console.log(
  `Verified ${verified.data.length} product images and website content. Prices, weights and publishing states preserved.`,
);
