// In ra cấu trúc một GLB: cây nút kèm khung bao, lưới, vật liệu, ảnh, clip.
// Chạy: node scripts/gift3d/inspect-glb.mjs <file.glb> [tree | <độ sâu>]
// Đọc được cả file gốc của hoạ sĩ lẫn GLB đã nén meshopt trong public/models/gift.
import path from "node:path";

import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { getBounds } from "@gltf-transform/functions";
import { MeshoptDecoder } from "meshoptimizer";

await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder });
const file = process.argv[2];
const mode = process.argv[3] ?? "tree";
const doc = await io.read(file);
const root = doc.getRoot();
const r = (v) => Math.round(v * 100) / 100;
const tris = (mesh) => mesh.listPrimitives().reduce((n, p) => n + (p.getIndices() ? p.getIndices().getCount() : p.getAttribute("POSITION").getCount()) / 3, 0);
console.log("FILE", path.basename(file));
console.log("generator:", root.getAsset().generator, "| extensions:", root.listExtensionsUsed().map((e) => e.extensionName).join(",") || "-");
console.log("scenes", root.listScenes().length, "nodes", root.listNodes().length, "meshes", root.listMeshes().length, "materials", root.listMaterials().length, "textures", root.listTextures().length, "animations", root.listAnimations().length, "skins", root.listSkins().length);
let total = 0;
for (const m of root.listMeshes()) total += tris(m);
console.log("total tris (unique meshes):", total);
for (const t of root.listTextures()) {
  const size = t.getSize();
  console.log("  tex", JSON.stringify(t.getName()), t.getMimeType(), size ? size.join("x") : "?", (t.getImage().byteLength / 1e6).toFixed(2) + "MB");
}
for (const m of root.listMaterials()) {
  const bc = m.getBaseColorTexture();
  console.log("  mat", JSON.stringify(m.getName()), "base", m.getBaseColorFactor().map(r).join(","), "tex", bc ? JSON.stringify(bc.getName()) : "-", "metal", r(m.getMetallicFactor()), "rough", r(m.getRoughnessFactor()), "alpha", m.getAlphaMode(), m.getDoubleSided() ? "2side" : "", m.getNormalTexture() ? "N" : "", m.getMetallicRoughnessTexture() ? "MR" : "", m.getEmissiveTexture() ? "E" : "");
}
for (const a of root.listAnimations()) console.log("  anim", JSON.stringify(a.getName()), "channels", a.listChannels().length);
const print = (node, depth) => {
  const mesh = node.getMesh();
  const b = getBounds(node);
  const t = node.getTranslation().map(r), rot = node.getRotation().map(r), s = node.getScale().map(r);
  const mats = mesh ? [...new Set(mesh.listPrimitives().map((p) => p.getMaterial()?.getName()))].join("|") : "";
  console.log(`${"  ".repeat(depth)}- ${JSON.stringify(node.getName())}${mesh ? ` [mesh ${JSON.stringify(mesh.getName())} tris=${tris(mesh)} mats=${mats}]` : ""} T=${t} R=${rot} S=${s} bounds=[${b.min.map(r)}]..[${b.max.map(r)}]`);
  if (mode === "tree") for (const c of node.listChildren()) print(c, depth + 1);
  else if (depth < Number(mode)) for (const c of node.listChildren()) print(c, depth + 1);
};
for (const scene of root.listScenes()) {
  console.log("SCENE", JSON.stringify(scene.getName()));
  for (const n of scene.listChildren()) print(n, 1);
}
