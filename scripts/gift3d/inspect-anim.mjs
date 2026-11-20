// In ra các clip animation của một GLB: kênh, số khoá, khoảng thời gian, giá trị đầu/cuối.
// Chạy: node scripts/gift3d/inspect-anim.mjs <file.glb>
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";

await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder });
const doc = await io.read(process.argv[2]);
const r = (v) => Math.round(v * 1000) / 1000;
const root = doc.getRoot();
console.log("nodes:", root.listNodes().map((n) => `${n.getName()}${n.getMesh() ? "*" : ""}`).join(", "));
for (const animation of root.listAnimations()) {
  console.log(`ANIM ${JSON.stringify(animation.getName())} channels=${animation.listChannels().length}`);
  for (const channel of animation.listChannels()) {
    const sampler = channel.getSampler();
    const input = sampler.getInput().getArray();
    const output = sampler.getOutput();
    const size = output.getElementSize();
    const first = Array.from(output.getArray().slice(0, size)).map(r);
    const last = Array.from(output.getArray().slice(-size)).map(r);
    console.log(`  ${channel.getTargetNode()?.getName()}.${channel.getTargetPath()} ${sampler.getInterpolation()} keys=${input.length} t=[${r(input[0])}..${r(input[input.length - 1])}] first=${first} last=${last}`);
  }
}
