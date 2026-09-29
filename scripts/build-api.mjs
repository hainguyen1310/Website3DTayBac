import { build } from "esbuild";
import { mkdir, readdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const apiDir = resolve(root, "api");
const serverApiDir = resolve(root, "server/api");

await mkdir(apiDir, { recursive: true });

// Remove any existing .ts files in api/ to avoid duplicate function collision on Vercel
const existingFiles = await readdir(apiDir);
for (const file of existingFiles) {
  if (file.endsWith(".ts")) {
    await rm(resolve(apiDir, file), { force: true });
  }
}

const entries = [
  "contact-reply",
  "mail-sync",
  "staff-invite",
  "render",
  "seo",
];

for (const name of entries) {
  const entryFile = resolve(serverApiDir, `${name}.ts`);
  const outFile = resolve(apiDir, `${name}.js`);
  await build({
    entryPoints: [entryFile],
    outfile: outFile,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node20",
    packages: "external",
    sourcemap: false,
  });
  console.log(`✓ Built api/${name}.js`);
}

console.log("All Vercel Serverless Functions built successfully.");
