import { test } from "node:test";
import assert from "node:assert/strict";
import { checkoutItems } from "../src/checkoutItems.ts";
import {
  CARD_PRICE,
  boxSizes,
  cleanCart,
  cleanDesign,
  defaultDesign,
  giftPrice,
  linePrice,
  products,
} from "../src/catalog.ts";

const LARGE = boxSizes[1].price;

test("gift prices are all-inclusive regardless of products, duplicates or card", () => {
  assert.equal(giftPrice(defaultDesign), 300000);
  assert.equal(giftPrice({ ...defaultDesign, includeCard: false, productIds: ["spice"] }), 300000);
  assert.equal(giftPrice({ ...defaultDesign, productIds: ["tea", "tea"] }), 300000);
  assert.equal(giftPrice({ ...defaultDesign, size: "large", includeCard: false, productIds: [] }), LARGE);
});

test("corrupt saved design is repaired without accepting unknown products or colors", () => {
  const design = cleanDesign({
    productIds: ["tea", "tea", "unknown", "honey"],
    color: "invalid",
    pattern: "invalid",
    message: "a".repeat(100),
    recipient: "b".repeat(40),
  });
  assert.deepEqual(design.productIds, ["tea", "honey"]);
  assert.equal(design.color, defaultDesign.color);
  assert.equal(design.pattern, defaultDesign.pattern);
  assert.equal(design.message.length, 90);
  assert.equal(design.recipient.length, 30);
});

test("slots accept any product type and derive the chosen list in slot order", () => {
  const catalog = [
    { ...products[0], id: "bag-item", giftSlot: "bag" as const },
    { ...products[1], id: "jar-item", giftSlot: "jar" as const },
  ];
  const design = cleanDesign(
    { ...defaultDesign, slots: { bagA: "jar-item", bagB: "bag-item", jar: "jar-item", bottle: "bag-item" } },
    catalog,
  );
  assert.deepEqual(design.slots, { bagA: "jar-item", bagB: "bag-item", jar: "jar-item" });
  assert.deepEqual(design.productIds, ["jar-item", "bag-item", "jar-item"]);
});

test("the same product may fill both bag slots", () => {
  const design = cleanDesign({ ...defaultDesign, slots: { bagA: "jerky", bagB: "jerky" } });
  assert.deepEqual(design.productIds, ["jerky", "jerky"]);
  assert.equal(giftPrice(design), 300000);
});

test("saved cart discards invalid products and empty custom gifts and caps quantities", () => {
  const gift = cleanDesign({ ...defaultDesign, slots: { bagA: "tea" } });
  const cart = cleanCart([
    null,
    { key: "bad", productId: "unknown" },
    { key: "empty", design: { productIds: [] } },
    { key: "tea", productId: "tea", quantity: 999, price: 1 },
    { key: "gift", design: gift, quantity: -4 },
  ]);
  assert.equal(cart.length, 2);
  assert.equal(cart[0].quantity, 20);
  assert.equal(cart[1].quantity, 1);
  assert.equal(linePrice(cart[0]), products[0].price);
  assert.equal(linePrice(cart[1]), giftPrice(gift));
  assert.deepEqual(cleanCart("invalid"), []);
});

test("cart round trip preserves exact personalization and pricing", () => {
  const design = {
    ...defaultDesign,
    includeCard: true,
    size: "large" as const,
    slots: { bagA: "jerky", bagB: "jerky", jar: "spice" },
    productIds: ["jerky", "jerky", "spice"],
    recipient: "Mẹ",
    message: "Một chút bình yên.",
    color: "#681b22",
    pattern: "Triền núi",
  };
  const roundTrip = cleanCart(
    JSON.parse(JSON.stringify([{ key: "gift-test", design, quantity: 2 }])),
  );
  assert.deepEqual(roundTrip[0].design, design);
  assert.equal(linePrice(roundTrip[0]) * roundTrip[0].quantity, 1000000);
});

test("opting out of a gift card clears its content and keeps box size after cart restore", () => {
  const design = cleanDesign({ ...defaultDesign, size: "large", slots: { bagA: "tea" }, includeCard: false, message: "Old greeting", recipient: "Old recipient" });
  assert.equal(design.includeCard, false);
  assert.equal(design.message, "");
  assert.equal(design.recipient, "");
  const restored = cleanCart([{ key: "large-no-card", design, quantity: 1 }]);
  assert.deepEqual(restored[0].design, design);
  assert.equal(design.size, "large");
});

test("legacy gifts retain their cards and invalid new options use safe defaults", () => {
  const legacy = cleanDesign({ productIds: ["tea"], color: "#681b22", message: "Chúc mừng", recipient: "Mẹ" });
  assert.equal(legacy.includeCard, true);
  assert.equal(legacy.message, "Chúc mừng");
  assert.equal(legacy.size, "medium");
  assert.deepEqual(legacy.productIds, ["tea"]);
  const invalid = cleanDesign({ size: "invalid", includeCard: "false", message: 123, recipient: {} });
  assert.equal(invalid.size, "medium");
  assert.equal(invalid.includeCard, false);
  assert.equal(invalid.message, "");
});

test("checkout carries box size, slots, included items and optional card text", () => {
  const items = checkoutItems([
    { key: "with-card", quantity: 1, design: { ...defaultDesign, size: "large", slots: { jar: "spice" }, productIds: ["spice"], includeCard: true, message: "Chúc mừng!" } },
    { key: "without-card", quantity: 2, design: { ...defaultDesign, includeCard: false, message: "Old text", recipient: "Old recipient" } },
    { key: "tea", quantity: 1, productId: "tea" },
  ]);
  assert.equal(items[0].design?.size, "large");
  assert.equal(items[0].design?.includeCard, true);
  assert.equal(items[0].design?.message, "Chúc mừng!");
  assert.deepEqual(items[0].design?.slots, { jar: "spice" });
  assert.deepEqual(items[0].design?.included, ["cham-cheo", "ruou-ngo-ban-pho"]);
  assert.deepEqual(items[1].design?.included, ["cham-cheo"]);
  assert.equal(items[1].design?.message, "");
  assert.equal(items[1].design?.recipient, "");
  assert.deepEqual(items[2], { kind: "product", product_id: "tea", quantity: 1 });
});

test("box colors are fixed by size, including restored designs", () => {
  assert.equal(cleanDesign({ ...defaultDesign, color: "#681b22" }).color, "#315442");
  assert.equal(cleanDesign({ ...defaultDesign, size: "large", color: "#315442" }).color, "#681b22");
  assert.equal(boxSizes[0].price, 300000);
  assert.equal(boxSizes[1].price, 500000);
  assert.equal(CARD_PRICE, 0);
  assert.deepEqual(cleanDesign(defaultDesign).productIds, []);
});
