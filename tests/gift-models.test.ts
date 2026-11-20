import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { NodeIO } from "@gltf-transform/core";
import type { Animation, Document } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";
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

test("every model the layout names has been built", () => {
  const files = [
    ...Object.values(GIFT_LAYOUT.boxes).map((box) => box.model),
    ...[...Object.keys(GIFT_LAYOUT.products), ...Object.keys(GIFT_LAYOUT.packs)].map((name) => `${name}.glb`),
  ];

  for (const file of files) assert.ok(existsSync(pathOf(file)), `public/models/gift/${file} is missing`);
});
