import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { NodeIO } from "@gltf-transform/core";
import type { Animation, Document, Texture } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";
import sharp from "sharp";
import * as THREE from "three";
import { GIFT_LAYOUT } from "../src/storefront/gift/layout.generated.ts";

/**
 * Hợp đồng của các GLB hộp quà đang phát hành (docs/GIFT_BOX_RIG.md). Web tìm nút theo tên và trộn
 * hai clip theo trọng số, nên một lần xuất lại lệch hợp đồng phải làm hỏng test chứ không lặng lẽ ra web.
 */
const MODELS = new URL("../public/models/gift/", import.meta.url);
const pathOf = (file: string) => fileURLToPath(new URL(file, MODELS));
/** Sai số thời gian do bộ xuất glTF lấy mẫu theo khung hình (30 khung/giây). */
const TIME_TOLERANCE = 0.02;

await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder });
const boxes = await Promise.all(
  Object.values(GIFT_LAYOUT.boxes).map(async (layout) => ({ layout, doc: await io.read(pathOf(layout.model)) })),
);

const clipOf = (doc: Document, name: string) => doc.getRoot().listAnimations().find((animation) => animation.getName() === name);
const channelsOf = (clip: Animation) => clip.listChannels().map((channel) => `${channel.getTargetNode()?.getName()}.${channel.getTargetPath()}`).sort();
const timesOf = (clip: Animation) => clip.listSamplers().map((sampler) => Array.from(sampler.getInput()!.getArray()!));

test("each box model carries the anchor nodes its layout promises", () => {
  for (const { layout, doc } of boxes) {
    const nodes = doc.getRoot().listNodes();
    assert.ok(nodes.some((node) => node.getName() === "box"), `${layout.model} needs the root node "box"`);

    for (const slot of layout.slots) {
      const anchor = nodes.find((node) => node.getName() === `slot_${slot}`);
      assert.ok(anchor, `${layout.model} is missing slot_${slot}`);
      assert.equal(anchor.getParentNode()?.getName(), `rise_${slot}`, "bloom lifts a product through the parent of its anchor");
      assert.equal(anchor.getMesh(), null, "an anchor is an empty node");
    }
  }
});

test("both clips of a box share one timeline that starts closed", () => {
  for (const { layout, doc } of boxes) {
    for (const name of ["open", "bloom"] as const) {
      const clip = clipOf(doc, name);
      assert.ok(clip, `${layout.model} is missing the "${name}" clip`);
      const times = timesOf(clip);

      assert.ok(times.every((keys) => keys[0] === 0), "every channel is keyed at the closed pose");
      assert.ok(Math.abs(Math.max(...times.flat()) - layout.clips[name]) < TIME_TOLERANCE, `${layout.model} "${name}" should last ${layout.clips[name]} s`);
    }
  }
});

test("both clips drive the same channels, so cross-fading never drops a node to its rest pose", () => {
  for (const { layout, doc } of boxes) {
    const open = channelsOf(clipOf(doc, "open")!);

    assert.deepEqual(channelsOf(clipOf(doc, "bloom")!), open, `${layout.model}: open and bloom animate different channels`);
    for (const slot of layout.slots) {
      assert.ok(open.includes(`rise_${slot}.translation`) && open.includes(`rise_${slot}.rotation`), `rise_${slot} must be keyed in both clips`);
    }
  }
});

/** Mặt được coi là quay về một hướng khi pháp tuyến lệch hướng đó không quá chừng 25°. */
const FACING = 0.9;
/** Một tấm ngoài của vỏ gồm các mặt nằm trong khoảng này (đơn vị mô hình) tính từ mặt xa nhất theo hướng nhìn. */
const PANEL_BAND = 0.1;
/**
 * Phần diện tích vàng kim tối đa trên một tấm đỏ trơn. Dải lạc màu của file gốc chiếm 1,1–1,6% theo cách đo
 * ở đây; sau khi dọn chỉ còn vài mặt sợi chỉ ở đúng cạnh góc, nhiều nhất chừng 0,2%.
 */
const STRAY_GOLD_SHARE = 0.005;
/** Hai nửa nắp phải trải tranh với cùng tỉ lệ; lệch quá mức này là một nửa đã bị co UV riêng. */
const PICTURE_SCALE_TOLERANCE = 0.01;

const RIGHT = new THREE.Vector3(1, 0, 0);
const LEFT = new THREE.Vector3(-1, 0, 0);
const UP = new THREE.Vector3(0, 1, 0);
const FRONT = new THREE.Vector3(0, 0, 1);
const BACK = new THREE.Vector3(0, 0, -1);

type Corner = { point: THREE.Vector3; uv: THREE.Vector2 };
type Triangle = { corners: [Corner, Corner, Corner]; normal: THREE.Vector3; centre: THREE.Vector3; area: number };

/** Các tam giác của một cánh hộp lớn ở dáng đóng (khoá đầu tiên của clip `open`), xoay theo trục của hộp. */
function closedTriangles(doc: Document, wing: string): Triangle[] {
  const nodes = doc.getRoot().listNodes();
  const pivot = nodes.find((node) => node.getName() === wing);
  const meshNode = nodes.find((node) => node.getName() === `${wing}_mesh`);
  assert.ok(pivot && meshNode, `the nodes ${wing} and ${wing}_mesh must exist`);
  const mesh = meshNode.getMesh();
  assert.ok(mesh, `the node ${wing}_mesh carries no mesh`);
  const channel = clipOf(doc, "open")!.listChannels().find((item) => item.getTargetNode() === pivot && item.getTargetPath() === "rotation");
  assert.ok(channel, `the open clip must rotate ${wing}`);
  const closed = new THREE.Quaternion().fromArray(channel.getSampler()!.getOutput()!.getElement(0, [0, 0, 0, 0]));
  const toPivot = new THREE.Matrix4().fromArray(meshNode.getMatrix());

  const triangles: Triangle[] = [];
  for (const primitive of mesh.listPrimitives()) {
    const positions = primitive.getAttribute("POSITION");
    const uvs = primitive.getAttribute("TEXCOORD_0");
    const indices = primitive.getIndices();
    assert.ok(positions && uvs && indices, `${wing}_mesh: a primitive lacks positions, UVs or indices`);
    const corner = (index: number): Corner => ({
      point: new THREE.Vector3().fromArray(positions.getElement(index, [0, 0, 0])).applyMatrix4(toPivot).applyQuaternion(closed),
      uv: new THREE.Vector2().fromArray(uvs.getElement(index, [0, 0])),
    });
    for (let offset = 0; offset < indices.getCount(); offset += 3) {
      const [a, b, c] = [0, 1, 2].map((step) => corner(indices.getScalar(offset + step)));
      const normal = b.point.clone().sub(a.point).cross(c.point.clone().sub(a.point));
      const area = normal.length() / 2;
      if (area === 0) continue;
      const centre = a.point.clone().add(b.point).add(c.point).divideScalar(3);
      triangles.push({ corners: [a, b, c], normal: normal.normalize(), centre, area });
    }
  }
  return triangles;
}

/** Tấm ngoài cùng của cánh theo một hướng: các mặt quay về hướng đó và nằm xa nhất theo hướng đó. */
function outerPanel(triangles: Triangle[], direction: THREE.Vector3): Triangle[] {
  const facing = triangles.filter((triangle) => triangle.normal.dot(direction) >= FACING);
  const reach = Math.max(...facing.map((triangle) => triangle.centre.dot(direction)));
  return facing.filter((triangle) => triangle.centre.dot(direction) > reach - PANEL_BAND);
}

const areaOf = (triangles: Triangle[]) => triangles.reduce((sum, triangle) => sum + triangle.area, 0);

/**
 * Hướng tranh trên nửa nắp của một cánh hộp lớn ở dáng đóng, nhìn từ trên xuống. `right` > 0: chiều ngang
 * của ảnh (u tăng) chạy sang phải hộp (+X). `front` > 0: chiều xuống của ảnh (v của glTF tăng) chạy về mặt
 * trước hộp (+Z). `area`: diện tích nửa nắp tìm được.
 */
function lidArtAxes(doc: Document, wing: string): { right: number; front: number; area: number } {
  const roof = outerPanel(closedTriangles(doc, wing), UP);
  let right = 0;
  let front = 0;
  for (const { corners: [a, b, c], area } of roof) {
    const edge1 = b.point.clone().sub(a.point);
    const edge2 = c.point.clone().sub(a.point);
    const uv1 = b.uv.clone().sub(a.uv);
    const uv2 = c.uv.clone().sub(a.uv);
    const det = uv1.x * uv2.y - uv2.x * uv1.y;
    if (Math.abs(det) < 1e-12) continue;
    // Đạo hàm của toạ độ theo UV trên tam giác: dX/du và dZ/dv.
    right += ((edge1.x * uv2.y - edge2.x * uv1.y) / det) * area;
    front += ((edge2.z * uv1.x - edge1.z * uv2.x) / det) * area;
  }
  const area = areaOf(roof);
  return { right: right / area, front: front / area, area };
}

const largeBox = boxes.find(({ layout }) => layout.model === GIFT_LAYOUT.boxes.large.model)!;

test("the Thịnh Đỉnh lid picture reads the right way up on both halves when the box is shut", () => {
  for (const wing of ["wing_L", "wing_R"]) {
    const art = lidArtAxes(largeBox.doc, wing);

    assert.ok(art.area > 300, `${wing}: the lid half was not found in the closed pose (area ${art.area.toFixed(1)})`);
    assert.ok(art.right > 0, `${wing}: the lid picture runs right-to-left, so it is turned around`);
    assert.ok(art.front > 0, `${wing}: the lid picture is upside down (its bottom points to the back of the box)`);
  }
});

test("both halves of the Thịnh Đỉnh lid show their half of the picture at the same scale", () => {
  const left = lidArtAxes(largeBox.doc, "wing_L");
  const right = lidArtAxes(largeBox.doc, "wing_R");

  // Hai ô tranh trong atlas cùng cỡ và hai nửa nắp cùng cỡ: một nửa bị co UV riêng sẽ phóng to tranh của nửa đó.
  assert.ok(Math.abs(left.right / right.right - 1) < PICTURE_SCALE_TOLERANCE, `the halves stretch the picture differently across the lid (${left.right.toFixed(1)} vs ${right.right.toFixed(1)} units per U)`);
  assert.ok(Math.abs(left.front / right.front - 1) < PICTURE_SCALE_TOLERANCE, `the halves stretch the picture differently front to back (${left.front.toFixed(1)} vs ${right.front.toFixed(1)} units per V)`);
});

type Rgb = [number, number, number];
type ColorAt = (uv: THREE.Vector2) => Rgb;
const samplers = new Map<Texture, Promise<ColorAt>>();

/**
 * Giải nén một ảnh texture thành hàm lấy màu (sRGB 0–1) tại một toạ độ UV của glTF (gốc ở góc trên-trái).
 * UV ngoài khoảng 0–1 được cuộn lại như texture lặp, giống cách lấy mẫu trong uv_seams.py.
 */
async function decodeTexture(image: Uint8Array): Promise<ColorAt> {
  const { data, info } = await sharp(image).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const texel = (coordinate: number, size: number) => Math.min(size - 1, Math.floor((coordinate - Math.floor(coordinate)) * size));

  return (uv) => {
    const column = texel(uv.x, info.width);
    const row = texel(uv.y, info.height);
    const offset = (row * info.width + column) * info.channels;
    return [data[offset]! / 255, data[offset + 1]! / 255, data[offset + 2]! / 255];
  };
}

/** Hàm lấy màu trên ảnh màu của lưới treo dưới nút `nodeName` (mỗi ảnh chỉ giải nén một lần). */
function colorSampler(doc: Document, nodeName: string): Promise<ColorAt> {
  const mesh = doc.getRoot().listNodes().find((node) => node.getName() === nodeName)?.getMesh();
  const texture = mesh?.listPrimitives()[0]?.getMaterial()?.getBaseColorTexture();
  const image = texture?.getImage();
  assert.ok(texture && image, `${nodeName} needs a base colour texture`);
  const sampler = samplers.get(texture) ?? decodeTexture(image);
  samplers.set(texture, sampler);
  return sampler;
}

/** Vàng kim trên atlas của vỏ đỏ: cùng ngưỡng với `_color_class` trong scripts/gift3d/blender/uv_seams.py. */
const isGold = ([red, green, blue]: Rgb) => red > 0.72 && green > 0.25 && red - blue > 0.12;
const uvCentre = ({ corners: [a, b, c] }: Triangle) => a.uv.clone().add(b.uv).add(c.uv).divideScalar(3);

test("the plain red panels of the Thịnh Đỉnh shell carry no stray gold strips", async () => {
  const panels = [
    { wing: "wing_L", name: "left side", direction: LEFT },
    { wing: "wing_R", name: "right side", direction: RIGHT },
    ...["wing_L", "wing_R"].flatMap((wing) => [
      { wing, name: "front flap", direction: FRONT },
      { wing, name: "back flap", direction: BACK },
    ]),
  ];

  const stray: string[] = [];
  for (const { wing, name, direction } of panels) {
    const colorAt = await colorSampler(largeBox.doc, `${wing}_mesh`);
    const panel = outerPanel(closedTriangles(largeBox.doc, wing), direction);

    const share = areaOf(panel.filter((triangle) => isGold(colorAt(uvCentre(triangle))))) / areaOf(panel);

    assert.ok(areaOf(panel) > 200, `${wing}: the ${name} panel was not found in the closed pose`);
    if (share >= STRAY_GOLD_SHARE) stray.push(`${wing} ${name}: ${(share * 100).toFixed(1)}% gold`);
  }
  assert.deepEqual(stray, [], "these panels of the red shell should be plain red");
});

test("every model the layout names has been built", () => {
  const files = [
    ...Object.values(GIFT_LAYOUT.boxes).map((box) => box.model),
    ...[...Object.keys(GIFT_LAYOUT.products), ...Object.keys(GIFT_LAYOUT.packs)].map((name) => `${name}.glb`),
  ];

  for (const file of files) assert.ok(existsSync(pathOf(file)), `public/models/gift/${file} is missing`);
});
