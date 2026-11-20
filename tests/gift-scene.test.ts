import test from "node:test";
import assert from "node:assert/strict";
import { boxSizes, defaultDesign, sizeOf } from "../src/catalog.ts";
import type { GiftDesign } from "../src/catalog.ts";
import { giftStageItems, undrawnItems } from "../src/storefront/gift/giftScene.ts";
import { GIFT_LAYOUT } from "../src/storefront/gift/layout.generated.ts";
import { mergeStorefrontProducts } from "../src/storefront/products.ts";

const products = mergeStorefrontProducts([]);
const FULL_SLOTS = { bagA: "trau-gac-bep-tay-bac", bagB: "lap-xuong-gac-bep", jar: "thit-lon-xe" };
const designOf = (size: GiftDesign["size"]): GiftDesign => ({ ...defaultDesign, size, slots: FULL_SLOTS });
const stem = (url: string) => url.split("/").pop()!.replace(/\.glb$/, "");

test("the small box seats two bags in their packs, a jar and the cham cheo jar", () => {
  const items = giftStageItems(designOf("medium"), products, "all");

  assert.equal(items[0].url, "/models/gift/box-small.glb");
  assert.equal(items[0].isBox, true);
  assert.deepEqual(items.slice(1).map((item) => item.anchor), ["bagA", "bagA", "bagB", "bagB", "jar", "cham"]);
});

test("the large box only shows what its model has room for: two bags and the wine jug", () => {
  const items = giftStageItems(designOf("large"), products, "all");

  assert.equal(items[0].url, "/models/gift/box-large.glb");
  assert.deepEqual(items.slice(1).map((item) => item.anchor), ["bagA", "bagA", "bagB", "bagB", "bottle"]);
  assert.ok(items.every((item) => !item.url.includes("jar-")), "the new large box has no jar or cham cheo slot");
});

test("every compartment a box sells has an anchor in its 3D model", () => {
  for (const size of boxSizes) {
    const anchors: readonly string[] = GIFT_LAYOUT.boxes[size.value === "large" ? "large" : "small"].slots;
    const missing = size.slots.map((slot) => slot.id).filter((id) => !anchors.includes(id));

    assert.deepEqual(missing, [], `${size.name} sells a compartment its model cannot show`);
  }
});

test("both boxes draw everything they hold", () => {
  assert.deepEqual(undrawnItems(designOf("medium"), products), []);
  assert.deepEqual(undrawnItems(designOf("large"), products), [], "Thịnh Đỉnh is two bags and the wine jug, all in the model");
});

test("a chosen product without a 3D model is reported instead of silently hidden", () => {
  const bare = products.map((product) => (product.id === FULL_SLOTS.bagA ? { ...product, giftModel: undefined } : product));

  const hidden = undrawnItems(designOf("large"), bare);

  assert.deepEqual(hidden.map((item) => [item.slotId, item.product.id]), [["bagA", FULL_SLOTS.bagA]]);
});

test("every item of a box is either drawn or reported as undrawn", () => {
  for (const size of ["medium", "large"] as const) {
    const design = designOf(size);
    const drawn = new Set(giftStageItems(design, products, "all").flatMap((item) => (item.anchor ? [item.anchor] : [])));
    const hidden = undrawnItems(design, products).map((item) => item.slotId);

    assert.deepEqual([...drawn, ...hidden].sort(), sizeOf(size).slots.map((slot) => slot.id).sort());
  }
});

test("a bag rides on its own labelled pack and sits at the seat measured from the source model", () => {
  const items = giftStageItems(designOf("medium"), products, "all");
  const [pack, bag] = items.filter((item) => item.anchor === "bagA");

  assert.equal(pack.url, "/models/gift/pack-thit-trau.glb");
  assert.deepEqual(pack.position, [0, 0, 0]);
  assert.equal(bag.url, "/models/gift/bag-thit-trau.glb");
  assert.deepEqual(bag.position, GIFT_LAYOUT.products["bag-thit-trau"].seat);
  assert.ok(bag.position[1] > 0, "the bag lies inside the pack, above its floor");
  assert.equal(pack.appearDelay, bag.appearDelay, "pack and bag drop in together");
});

test("changing the bag in a slot changes both the bag and its pack", () => {
  const before = giftStageItems(designOf("medium"), products, "all");
  const after = giftStageItems({ ...designOf("medium"), slots: { ...FULL_SLOTS, bagA: "ba-chi-gac-bep" } }, products, "all");
  const urlsOf = (items: typeof before) => items.filter((item) => item.anchor === "bagA").map((item) => stem(item.url));

  assert.deepEqual(urlsOf(before), ["pack-thit-trau", "bag-thit-trau"]);
  assert.deepEqual(urlsOf(after), ["pack-ba-chi", "bag-ba-chi"]);
  assert.deepEqual(before.filter((item) => item.anchor === "bagA").map((item) => item.key), after.filter((item) => item.anchor === "bagA").map((item) => item.key));
});

test("an empty shell is just the box", () => {
  const items = giftStageItems(designOf("large"), products, "none");

  assert.equal(items.length, 1);
  assert.equal(items[0].isBox, true);
});

test("the generated layout matches the rig contract", () => {
  assert.deepEqual(GIFT_LAYOUT.boxes.small.slots, ["bagA", "bagB", "jar", "cham"]);
  assert.deepEqual(GIFT_LAYOUT.boxes.large.slots, ["bagA", "bagB", "bottle"]);
  for (const box of Object.values(GIFT_LAYOUT.boxes)) {
    assert.ok(box.clips.open > 1, "the opening clip is long enough to read");
    assert.equal(box.clips.open, box.clips.bloom, "both clips share one timeline so they can be cross-faded");
  }
});

test("every gift product has a layout entry and every bag has a pack", () => {
  const layouts: Record<string, { seat: readonly number[]; pack?: string }> = GIFT_LAYOUT.products;
  const packs: Record<string, unknown> = GIFT_LAYOUT.packs;

  for (const product of products.filter((item) => item.giftModel)) {
    const layout = layouts[stem(product.giftModel!)];
    assert.ok(layout, `${product.id} has no layout entry`);
    assert.equal(layout.seat.length, 3);
    if (product.giftSlot !== "bag") continue;
    assert.ok(layout.pack && packs[layout.pack], `${product.id} needs its labelled pack`);
  }
});
