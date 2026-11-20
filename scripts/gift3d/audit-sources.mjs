// Đối chiếu các file combo 3D gốc: mỗi phần (vỏ hộp, túi, hũ, tem…) có giống nhau giữa các file không.
// Chạy: node scripts/gift3d/audit-sources.mjs "<thư mục sản phẩm>" [out.json]
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { getBounds } from "@gltf-transform/functions";

const root = process.argv[2];
const out = process.argv[3];
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const sha = (buffers) => {
  const hash = crypto.createHash("sha1");
  for (const buffer of buffers) hash.update(buffer);
  return hash.digest("hex").slice(0, 10);
};
const round = (v) => Math.round(v * 100) / 100;

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else if (entry.name.toLowerCase().endsWith(".glb")) files.push(full);
  }
  return files.sort();
}

const report = [];
for (const file of await walk(root)) {
  const doc = await io.read(file);
  const nodes = [];
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const prims = mesh.listPrimitives();
    const geometry = sha(prims.map((p) => Buffer.from(p.getAttribute("POSITION").getArray().buffer)));
    const textures = prims.map((p) => {
      const material = p.getMaterial();
      const texture = material?.getBaseColorTexture();
      return `${material?.getName()}=${texture ? sha([Buffer.from(texture.getImage())]) + ":" + (texture.getSize() ?? []).join("x") : "-"}`;
    });
    const bounds = getBounds(node);
    nodes.push({
      name: node.getName(),
      geometry,
      tris: prims.reduce((n, p) => n + (p.getIndices()?.getCount() ?? p.getAttribute("POSITION").getCount()) / 3, 0),
      textures,
      min: bounds.min.map(round),
      max: bounds.max.map(round),
      transform: { t: node.getTranslation().map(round), r: node.getRotation().map(round), s: node.getScale().map(round) },
    });
  }
  report.push({ file: path.relative(root, file).replaceAll("\\", "/"), nodes });
  console.error("read", path.basename(file));
}
if (out) await fs.writeFile(out, JSON.stringify(report, null, 1));

// Gom theo hình học: cùng mã băm = cùng một lưới.
const groups = new Map();
for (const { file, nodes } of report) for (const node of nodes) {
  const key = node.geometry;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push({ file, ...node });
}
for (const [key, items] of [...groups].sort((a, b) => b[1].length - a[1].length)) {
  const names = [...new Set(items.map((i) => i.name))].join(" | ");
  const boxes = [...new Set(items.map((i) => `[${i.min}]..[${i.max}]`))];
  const textures = [...new Set(items.map((i) => i.textures.join(";")))];
  console.log(`\n## geo ${key} tris=${items[0].tris} uses=${items.length} files=${new Set(items.map((i) => i.file)).size}\n   names: ${names}`);
  for (const b of boxes) console.log(`   bounds ${b} ×${items.filter((i) => `[${i.min}]..[${i.max}]` === b).length}`);
  for (const t of textures) console.log(`   tex ${t} ×${items.filter((i) => i.textures.join(";") === t).length}`);
}
