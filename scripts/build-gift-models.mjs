// Tách hộp quà và từng sản phẩm từ các file combo 3D gốc thành GLB nhỏ, đã nén.
// Chạy: node scripts/build-gift-models.mjs  → public/models/gift/*.glb + layout.json
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { MeshoptEncoder } from "meshoptimizer";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { cloneDocument, dedup, getBounds, meshopt, prune, textureCompress } from "@gltf-transform/functions";

const SOURCE = "assets-src/3Dfile/sản phẩm";
const OUT = "public/models/gift";
const TEXTURE_SIZE = 1024;
// Lớp dưới cùng chứa đủ mọi biến thể; các bản sao xếp chồng (.001/.002…) nằm cao hơn.
const BASE_LAYER_MAX_Y = 3.2;

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.encoder": MeshoptEncoder });

const normalize = (name) => name.trim().replace(/\s*\.\d+$/, "").trim();

function rootOf(node) {
  let current = node;
  while (current.getParentNode()) current = current.getParentNode();
  return current;
}

function meshNodes(doc) {
  return doc.getRoot().listNodes().filter((node) => node.getMesh()).map((node) => {
    const box = getBounds(node);
    return {
      node,
      root: normalize(rootOf(node).getName()),
      rootRaw: rootOf(node).getName().trim(),
      min: box.min,
      max: box.max,
      cx: (box.min[0] + box.max[0]) / 2,
      cz: (box.min[2] + box.max[2]) / 2,
    };
  });
}

function boundsOf(items) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const item of items) for (let i = 0; i < 3; i++) {
    min[i] = Math.min(min[i], item.min[i]);
    max[i] = Math.max(max[i], item.max[i]);
  }
  return { min, max, center: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2], size: max.map((v, i) => v - min[i]) };
}

const round = (value) => Math.round(value * 1000) / 1000;

/** Giữ lại đúng các node mesh được chọn, đưa tâm X/Z về 0 và đáy về Y=0. */
async function exportPart(doc, items, file, { normalizePosition = true } = {}) {
  const keep = new Set(items.map((item) => item.node.getName() + "|" + item.min.join(",")));
  const clone = cloneDocument(doc);
  for (const node of clone.getRoot().listNodes()) {
    if (!node.getMesh()) continue;
    const box = getBounds(node);
    if (!keep.has(node.getName() + "|" + box.min.join(","))) node.setMesh(null);
  }
  const bounds = boundsOf(items);
  if (normalizePosition) {
    const scene = clone.getRoot().getDefaultScene() ?? clone.getRoot().listScenes()[0];
    const wrapper = clone.createNode("part").setTranslation([-bounds.center[0], -bounds.min[1], -bounds.center[2]]);
    for (const child of scene.listChildren()) {
      scene.removeChild(child);
      wrapper.addChild(child);
    }
    scene.addChild(wrapper);
  }
  await clone.transform(
    prune({ keepLeaves: false }),
    dedup(),
    textureCompress({ encoder: sharp, targetFormat: "webp", resize: [TEXTURE_SIZE, TEXTURE_SIZE], quality: 82 }),
    meshopt({ encoder: MeshoptEncoder, level: "medium" }),
  );
  await io.write(path.join(OUT, file), clone);
  const stat = await fs.stat(path.join(OUT, file));
  console.log(`${file.padEnd(28)} ${(stat.size / 1e6).toFixed(2)} MB`);
  return { size: bounds.size.map(round) };
}

function slotOf(items) {
  const b = boundsOf(items);
  return { x: round(b.center[0]), z: round(b.center[2]), floor: round(b.min[1]), size: b.size.map(round) };
}

await fs.mkdir(OUT, { recursive: true });

// Hộp nhỏ: bt1 chứa đủ biến thể túi (2 ngăn), hũ xé và chẩm chéo.
const small = await io.read(path.join(SOURCE, "hop nho/bt1.glb"));
const smallItems = meshNodes(small);
const base = smallItems.filter((item) => item.root !== "hop" && item.min[1] < BASE_LAYER_MAX_Y);
const bagA = base.filter((item) => item.cx < -6);
const bagB = base.filter((item) => item.cx >= -6 && item.cx < 11);
const jar = base.filter((item) => item.cx >= 11 && item.cz < 3.5);
const cham = base.filter((item) => item.root === "cham cheo");

const products = {};
const BAG_FILES = { "thit trau": "bag-thit-trau.glb", "ba chi": "bag-ba-chi.glb", "lap suon": "bag-lap-xuong.glb", "lon say": "bag-lon-say.glb" };
for (const [root, file] of Object.entries(BAG_FILES)) {
  products[file.replace(".glb", "")] = await exportPart(small, bagA.filter((item) => item.root === root), file);
}
products["jar-lon-xe"] = await exportPart(small, smallItems.filter((item) => item.root === "hop thit lon"), "jar-lon-xe.glb");
products["jar-cham-cheo"] = await exportPart(small, cham, "jar-cham-cheo.glb");
await exportPart(small, smallItems.filter((item) => item.root === "hop"), "box-small.glb", { normalizePosition: false });

// Hộp lớn: sp2 cho vị trí ngăn và bình rượu.
const big = await io.read(path.join(SOURCE, "hop lon/sp2.glb"));
const bigItems = meshNodes(big);
const ruou = bigItems.filter((item) => item.root === "ruou");
products["bottle-ruou-ngo"] = await exportPart(big, ruou, "bottle-ruou-ngo.glb");
// Hũ trâu xé chỉ có trong combo hộp lớn.
products["jar-trau-xe"] = await exportPart(big, bigItems.filter((item) => item.root === "thit trau hop"), "jar-trau-xe.glb");
await exportPart(big, bigItems.filter((item) => item.root === "box"), "box-large.glb", { normalizePosition: false });

const bigBagA = bigItems.filter((item) => item.rootRaw === "ba chi");
const bigBagB = bigItems.filter((item) => item.rootRaw === "ba chi .001");
const bigJar = bigItems.filter((item) => item.root === "thit trau hop");
const bigCham = bigItems.filter((item) => item.root === "cham cheo");
const smallBaChi = bagA.filter((item) => item.root === "ba chi");
const scaleOf = (a, b) => round(boundsOf(a).size[0] / boundsOf(b).size[0]);

const layout = {
  generatedFrom: ["hop nho/bt1.glb", "hop lon/sp2.glb"],
  products,
  boxes: {
    small: {
      model: "box-small.glb",
      bounds: boundsOf(smallItems.filter((item) => item.root === "hop")),
      slots: { bagA: slotOf(bagA), bagB: slotOf(bagB), jar: slotOf(jar), cham: slotOf(cham) },
      scale: 1,
    },
    large: {
      model: "box-large.glb",
      bounds: boundsOf(bigItems.filter((item) => item.root === "box")),
      slots: { bagA: slotOf(bigBagA), bagB: slotOf(bigBagB), jar: slotOf(bigJar), cham: slotOf(bigCham), bottle: slotOf(ruou) },
      scale: scaleOf(bigBagA, smallBaChi),
    },
  },
};
await fs.writeFile(path.join(OUT, "layout.json"), JSON.stringify(layout, null, 2));
const roundBounds = (b) => ({ min: b.min.map(round), max: b.max.map(round) });
const typed = {
  products: layout.products,
  boxes: Object.fromEntries(Object.entries(layout.boxes).map(([key, box]) => [key, { ...box, bounds: roundBounds(box.bounds) }])),
};
await fs.writeFile(
  "src/storefront/gift/layout.generated.ts",
  `// Sinh tự động bởi scripts/build-gift-models.mjs — không sửa tay.\nexport const GIFT_LAYOUT = ${JSON.stringify(typed, null, 2)} as const;\n`,
);
console.log(JSON.stringify(layout.boxes, null, 1));
