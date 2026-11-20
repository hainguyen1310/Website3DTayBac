// Tạo các GLB nhỏ, đã nén cho hộp quà 3D từ file gốc của hoạ sĩ (xem docs/GIFT_BOX_RIG.md).
//
//   node scripts/build-gift-models.mjs
//   GIFT3D_SOURCE="<thư mục 'sản phẩm' có 'hop lon' và 'hop nho'>" node scripts/build-gift-models.mjs
//
// - Từng món (túi, hũ, bình rượu) và hộp giấy con có tem của mỗi loại túi: tách từ file combo gốc.
// - Hai vỏ hộp: lấy từ rig đã dựng trong Blender (assets-src/3Dfile/rigs, có animation đóng/mở),
//   chỉ nén lại; tên nút, nút neo `slot_*` và hai clip phải được giữ nguyên.
// Kết quả: public/models/gift/*.glb, layout.json và src/storefront/gift/layout.generated.ts.
// Mọi thứ được dựng vào thư mục tạm trước; chỉ khi dựng xong không lỗi mới thay các file web đang dùng,
// nên một lần dựng hỏng giữa chừng (thiếu nút, rig lệch hợp đồng…) không để lại GLB mới bên cạnh layout cũ.
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { cloneDocument, dedup, getBounds, meshopt, prune, simplifyPrimitive, weld } from "@gltf-transform/functions";

/** Bản sao các file combo mà lệnh dựng cần (git bỏ qua `assets-src/`). */
const DEFAULT_SOURCE = "assets-src/3Dfile/sản phẩm 2026-11";
const SOURCE = process.env.GIFT3D_SOURCE ?? DEFAULT_SOURCE;
const RIGS = process.env.GIFT3D_RIGS ?? "assets-src/3Dfile/rigs";
const OUT = "public/models/gift";
/** Nơi dựng tạm, nằm ngoài `public/` để máy chủ dev không thấy file đang ghi dở. */
const STAGE = "node_modules/.cache/gift-models";
const LAYOUT_TS = "src/storefront/gift/layout.generated.ts";
/** Hai clip mà web phát và trộn với nhau (src/storefront/three/boxRig.ts). */
const CLIPS = ["open", "bloom"];
const TEXTURE_QUALITY = 82;
/** Tem sản phẩm là dải ảnh dọc (583×2000…): giữ cạnh dài lớn hơn để tên món còn đọc được. */
const LABEL_SIZE = 2048;
const LABEL_ASPECT = 2.5;
const SLOT_ORDER = ["bagA", "bagB", "jar", "cham", "bottle"];

const SMALL = "hop nho";
const LARGE = "hop lon";
/** File combo và nút nguồn của từng món. Mọi combo dùng chung lưới nên mỗi món chỉ cần một nguồn. */
const PRODUCTS = [
  { out: "bag-lap-xuong", file: `${SMALL}/lạp sườn + lạp sườn + hộp thịt lợn.glb`, node: "lap suon", pack: "hop.002", label: "lap suon tem" },
  { out: "bag-ba-chi", file: `${SMALL}/ba chỉ + ba chỉ + hộp thịt lợn.glb`, node: "ba chi", pack: "hop.002", label: "ba chi tem" },
  { out: "bag-lon-say", file: `${SMALL}/thịt lợn + thịt lợn + hộp thịt trâu.glb`, node: "lon xe", pack: "hop.002", label: "lon xe tem" },
  { out: "bag-thit-trau", file: `${SMALL}/thịt trâu + thịt trâu + hộp thịt lợn.glb`, node: "trau xe", pack: "hop.002", label: "trau xe tem" },
  { out: "jar-lon-xe", file: `${SMALL}/ba chỉ + ba chỉ + hộp thịt lợn.glb`, node: "hop thit lon" },
  { out: "jar-trau-xe", file: `${SMALL}/thịt lợn + thịt lợn + hộp thịt trâu.glb`, node: "hop thit trau" },
  { out: "jar-cham-cheo", file: `${SMALL}/ba chỉ + ba chỉ + hộp thịt lợn.glb`, node: "bao_bi" },
  { out: "bottle-ruou-ngo", file: `${LARGE}/lap suon + lap suon.glb`, node: "ruou" },
];
/**
 * Vỏ hộp: cạnh texture tối đa và các lưới mềm (giấy lót, lụa) được giảm tam giác. Tấm phẳng của vỏ
 * hộp giữ nguyên; atlas hộp lớn xếp các mảng rất sát nhau nên giữ 2048 để mép tấm không lem màu.
 */
const BOXES = {
  small: { rig: "box-small.rig.glb", out: "box-small.glb", texture: 1024, simplify: { nest_jar: 0.3, nest_cham: 0.25 } },
  large: { rig: "box-large.rig.glb", out: "box-large.glb", texture: 2048, detailTexture: 1024, simplify: { silk: 0.3 } },
};

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.encoder": MeshoptEncoder });
const round = (value) => Math.round(value * 1000) / 1000;
const sizeOf = (bounds) => bounds.max.map((value, axis) => round(value - bounds.min[axis]));
const centreOf = (bounds) => bounds.min.map((value, axis) => (value + bounds.max[axis]) / 2);

async function exists(target) {
  return fs.access(target).then(() => true, () => false);
}

const combos = new Map();
/** Đọc một file combo gốc (60–110 MB), mỗi file chỉ đọc một lần. */
async function readCombo(file) {
  if (!combos.has(file)) {
    const full = path.join(SOURCE, file);
    if (!(await exists(full))) throw new Error(`Không thấy file combo gốc: ${full}`);
    combos.set(file, await io.read(full));
  }
  return combos.get(file);
}

function nodeNamed(doc, name, file) {
  const node = doc.getRoot().listNodes().find((item) => item.getName() === name && item.getMesh());
  if (!node) throw new Error(`Không thấy nút "${name}" trong ${file}`);
  return node;
}

/** Bản sao chỉ còn các nút `keep`, dời sao cho tâm X/Z của `origin` về 0 và đáy của nó về Y = 0. */
function isolate(doc, keep, origin) {
  const clone = cloneDocument(doc);
  for (const node of clone.getRoot().listNodes()) if (node.getMesh() && !keep.includes(node.getName())) node.setMesh(null);
  const centre = centreOf(origin);
  const scene = clone.getRoot().getDefaultScene() ?? clone.getRoot().listScenes()[0];
  const wrapper = clone.createNode("part").setTranslation([-centre[0], -origin.min[1], -centre[2]]);
  for (const child of scene.listChildren()) {
    scene.removeChild(child);
    wrapper.addChild(child);
  }
  scene.addChild(wrapper);
  return clone;
}

/** Nén ảnh sang WebP; ảnh tem (dải dọc) được giữ cạnh dài lớn hơn các ảnh khác. */
async function compressTextures(doc, limitOf) {
  for (const texture of doc.getRoot().listTextures()) {
    const [width, height] = texture.getSize() ?? [0, 0];
    const image = texture.getImage();
    if (!image || !width) continue;
    const isLabel = Math.max(width, height) / Math.min(width, height) >= LABEL_ASPECT;
    const limit = isLabel ? LABEL_SIZE : limitOf(texture);
    const output = await sharp(image).resize({ width: limit, height: limit, fit: "inside", withoutEnlargement: true }).webp({ quality: TEXTURE_QUALITY }).toBuffer();
    texture.setImage(output).setMimeType("image/webp");
  }
}

/** Giảm tam giác của các lưới mềm theo tên; `ratios[tên lưới]` là phần tam giác giữ lại. */
async function simplifyMeshes(doc, ratios) {
  await MeshoptSimplifier.ready;
  for (const mesh of doc.getRoot().listMeshes()) {
    const ratio = ratios[mesh.getName()];
    if (!ratio) continue;
    for (const primitive of mesh.listPrimitives()) simplifyPrimitive(primitive, { simplifier: MeshoptSimplifier, ratio, error: 0.01, lockBorder: false });
  }
}

async function writeModel(doc, file, { textureLimit, simplify = {}, keepLeaves = false }) {
  await doc.transform(prune({ keepLeaves }), weld());
  await simplifyMeshes(doc, simplify);
  await compressTextures(doc, textureLimit);
  await doc.transform(dedup(), prune({ keepLeaves }), meshopt({ encoder: MeshoptEncoder, level: "medium" }));
  const target = path.join(STAGE, file);
  await io.write(target, doc);
  const triangles = doc.getRoot().listMeshes().flatMap((mesh) => mesh.listPrimitives()).reduce((sum, primitive) => sum + primitive.getIndices().getCount() / 3, 0);
  console.log(`${file.padEnd(24)} ${((await fs.stat(target)).size / 1e6).toFixed(2)} MB  ${Math.round(triangles)} tam giác`);
}

/** Một món và, với túi, hộp giấy con kèm tem của nó. Trả về các mục layout tương ứng. */
async function buildProduct({ out, file, node, pack, label }) {
  const doc = await readCombo(file);
  const bounds = getBounds(nodeNamed(doc, node, file));
  await writeModel(isolate(doc, [node], bounds), `${out}.glb`, { textureLimit: () => 1024 });
  if (!pack) return { product: { size: sizeOf(bounds), seat: [0, 0, 0] } };

  // Hộp giấy con chuẩn hoá theo riêng thân hộp; tem là lớp bọc lớn hơn một chút, giữ nguyên vị trí tương đối.
  nodeNamed(doc, label, file);
  const packBounds = getBounds(nodeNamed(doc, pack, file));
  const packName = out.replace(/^bag-/, "pack-");
  await writeModel(isolate(doc, [pack, label], packBounds), `${packName}.glb`, { textureLimit: () => 1024 });

  const bag = centreOf(bounds);
  const box = centreOf(packBounds);
  // Một túi trong file gốc thò ngang ra khỏi hộp giấy: kéo vào để nằm gọn trong bề ngang của hộp.
  const slack = Math.max(0, (packBounds.max[0] - packBounds.min[0] - (bounds.max[0] - bounds.min[0])) / 2);
  const seat = [Math.max(-slack, Math.min(slack, bag[0] - box[0])), bounds.min[1] - packBounds.min[1], bag[2] - box[2]].map(round);
  return { product: { size: sizeOf(bounds), seat, pack: packName }, packName, packLayout: { size: sizeOf(packBounds) } };
}

/** Các kênh của một clip dưới dạng "nút.thuộc tính", đã sắp xếp để so sánh. */
const channelsOf = (animation) => animation.listChannels().map((channel) => `${channel.getTargetNode()?.getName()}.${channel.getTargetPath()}`).sort();
const endOf = (animation) => round(Math.max(...animation.listSamplers().map((sampler) => sampler.getInput().getArray().at(-1))));

/**
 * Thời lượng hai clip của một vỏ hộp, sau khi kiểm hợp đồng: đủ `open` và `bloom`, dài bằng nhau và
 * điều khiển cùng một bộ kênh. Web trộn hai clip theo trọng số; nút chỉ có ở một clip sẽ giật về dáng nghỉ.
 */
function readClips(root, label) {
  const animations = new Map(root.listAnimations().map((animation) => [animation.getName(), animation]));
  const missing = CLIPS.filter((name) => !animations.has(name));
  if (missing.length) throw new Error(`${label} thiếu clip: ${missing.join(", ")}`);
  const [open, bloom] = CLIPS.map((name) => animations.get(name));
  if (endOf(open) !== endOf(bloom)) throw new Error(`${label}: clip "open" dài ${endOf(open)} giây nhưng "bloom" dài ${endOf(bloom)} giây`);
  const [openChannels, bloomChannels] = [channelsOf(open), channelsOf(bloom)];
  const uneven = [...openChannels.filter((name) => !bloomChannels.includes(name)), ...bloomChannels.filter((name) => !openChannels.includes(name))];
  if (uneven.length) throw new Error(`${label}: hai clip không cùng bộ kênh, lệch ở ${uneven.join(", ")}`);
  return Object.fromEntries(CLIPS.map((name) => [name, endOf(animations.get(name))]));
}

/** Nén rig của một vỏ hộp và đọc lại những gì web cần biết: ngăn có điểm neo và thời lượng clip. */
async function buildBox({ rig, out, texture, detailTexture = texture, simplify }) {
  const source = path.join(RIGS, rig);
  if (!(await exists(source))) throw new Error(`Không thấy rig ${source}. Chạy scripts/gift3d/blender/build_gift_rigs.py trước.`);
  const doc = await io.read(source);
  const root = doc.getRoot();
  const names = root.listNodes().map((node) => node.getName());
  const clips = readClips(root, `Rig ${rig}`);
  const slots = SLOT_ORDER.filter((slot) => names.includes(`slot_${slot}`));
  if (!slots.length) throw new Error(`Rig ${rig} không có nút neo slot_* nào`);
  // Ảnh màu của atlas giữ độ phân giải cao; normal/độ nhám của tấm phẳng không cần.
  const baseColors = new Set(root.listMaterials().map((material) => material.getBaseColorTexture()));
  await writeModel(doc, out, { textureLimit: (item) => (baseColors.has(item) ? texture : detailTexture), simplify, keepLeaves: true });

  const kept = doc.getRoot().listNodes().map((node) => node.getName());
  const lost = names.filter((name) => name && !kept.includes(name));
  if (lost.length) throw new Error(`Nén rig ${rig} làm mất nút: ${lost.join(", ")}`);
  const compressed = readClips(doc.getRoot(), `${out} (sau khi nén)`);
  if (CLIPS.some((name) => compressed[name] !== clips[name])) throw new Error(`Nén rig ${rig} làm đổi thời lượng clip`);
  return { model: out, slots, clips };
}

/** Dựng mọi mô hình vào thư mục tạm và trả về layout tương ứng. */
async function buildAll() {
  const layout = { products: {}, packs: {}, boxes: {} };
  for (const entry of PRODUCTS) {
    const { product, packName, packLayout } = await buildProduct(entry);
    layout.products[entry.out] = product;
    if (packName) layout.packs[packName] = packLayout;
  }
  for (const [key, box] of Object.entries(BOXES)) layout.boxes[key] = await buildBox(box);
  return layout;
}

/**
 * Thay các file web đang dùng bằng kết quả vừa dựng. Mọi thứ (kể cả layout.json) đã nằm sẵn trong thư
 * mục tạm, nên bước này chỉ còn chép vài chục file nhỏ rồi ghi layout cho mã nguồn. Đây không phải
 * một giao dịch: nếu chính việc chép hỏng giữa chừng (đĩa đầy, file bị khoá), hãy chạy lại lệnh.
 */
async function publish(layout) {
  const json = JSON.stringify(layout, null, 2);
  await fs.writeFile(path.join(STAGE, "layout.json"), `${json}\n`);
  await fs.mkdir(OUT, { recursive: true });
  for (const file of await fs.readdir(STAGE)) await fs.copyFile(path.join(STAGE, file), path.join(OUT, file));
  await fs.writeFile(LAYOUT_TS, `// Sinh tự động bởi scripts/build-gift-models.mjs — không sửa tay.\nexport const GIFT_LAYOUT = ${json} as const;\n`);
}

if (!(await exists(SOURCE))) {
  throw new Error(`Không thấy thư mục combo gốc "${SOURCE}" (cần có "${LARGE}" và "${SMALL}"). Đặt GIFT3D_SOURCE trỏ tới thư mục đó.`);
}
await fs.rm(STAGE, { recursive: true, force: true });
await fs.mkdir(STAGE, { recursive: true });
try {
  const layout = await buildAll();
  await publish(layout);
  console.log(JSON.stringify(layout.boxes, null, 1));
} finally {
  await fs.rm(STAGE, { recursive: true, force: true });
}
