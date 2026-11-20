// Băm từng thuộc tính lưới (toạ độ, pháp tuyến, UV, chỉ số) và ghi phép biến đổi nghỉ của mọi nút trong một GLB.
// Dùng để chứng minh một lần sửa script dựng rig không làm đổi hình học/UV ngoài ý muốn:
//
//   node scripts/gift3d/hash-meshes.mjs assets-src/3Dfile/rigs/box-large.rig.glb > truoc.json
//   ... sửa script, dựng lại rig ...
//   node scripts/gift3d/hash-meshes.mjs assets-src/3Dfile/rigs/box-large.rig.glb | diff truoc.json -
//
// Lệnh dựng rig cho kết quả lặp lại được, nên không có khác biệt nghĩa là lưới giữ nguyên từng byte.
import crypto from "node:crypto";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";

await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder });
const doc = await io.read(process.argv[2]);

const hashOf = (accessor) => {
  const array = accessor.getArray();
  return crypto.createHash("sha1").update(Buffer.from(array.buffer, array.byteOffset, array.byteLength)).digest("hex").slice(0, 12);
};
const rounded = (values) => values.map((value) => Math.round(value * 1e5) / 1e5).join(",");

const report = {};
for (const mesh of doc.getRoot().listMeshes()) {
  mesh.listPrimitives().forEach((primitive, index) => {
    const entry = { indices: primitive.getIndices() ? hashOf(primitive.getIndices()) : "-" };
    for (const semantic of primitive.listSemantics()) entry[semantic] = hashOf(primitive.getAttribute(semantic));
    report[`${mesh.getName()}#${index}`] = entry;
  });
}
for (const node of doc.getRoot().listNodes()) {
  report[`node:${node.getName()}`] = [node.getTranslation(), node.getRotation(), node.getScale()].map(rounded).join(" | ");
}
console.log(JSON.stringify(report, null, 1));
