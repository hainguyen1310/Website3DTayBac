import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const bundle = fs.existsSync(".reference/kage-source.json")
  ? JSON.parse(fs.readFileSync(".reference/kage-source.json", "utf8"))
  : {
      files: JSON.parse(fs.readFileSync("docs/threeui-manifest.json", "utf8")),
      assets: [],
    };
const manifest = [];
for (const file of [...bundle.files, ...bundle.assets]) {
  if (!file.path.startsWith("public/")) continue;
  const source = path.join(
    "node_modules/@designcodeio/threeui/lib-dist/assets",
    file.path.slice(7),
  );
  const bytes = fs.readFileSync(source);
  const actual = crypto.createHash("sha256").update(bytes).digest("hex");
  if (actual !== file.sha256)
    throw new Error(`Source revision mismatch: ${file.path}`);
  fs.mkdirSync(path.dirname(file.path), { recursive: true });
  fs.writeFileSync(file.path, bytes);
  manifest.push({ path: file.path, sha256: file.sha256, bytes: bytes.length });
}
fs.mkdirSync("docs", { recursive: true });
fs.writeFileSync(
  "docs/threeui-manifest.json",
  JSON.stringify(manifest, null, 2) + "\n",
);
for (const name of [
  "LICENSE",
  "ASSET-LICENSES.md",
  "FONT-LICENSES.md",
  "THIRD_PARTY_NOTICES.md",
]) {
  fs.copyFileSync(
    `node_modules/@designcodeio/threeui/${name}`,
    `docs/THREEUI-${name}`,
  );
}
console.log(`Copied and verified ${manifest.length} byte-exact ThreeUI files.`);
