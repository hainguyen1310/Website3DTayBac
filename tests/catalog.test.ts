import { test } from "node:test";
import assert from "node:assert/strict";
import { checkoutItems } from "../src/checkoutItems.ts";
import {
  BOX_PRICE,
  cleanCart,
  cleanDesign,
  defaultDesign,
  giftPrice,
  linePrice,
  products,
} from "../src/catalog.ts";

test("gift pricing includes each chosen product once and the packaging fee", () => {
  assert.equal(giftPrice(defaultDesign), 495000);
  assert.equal(
    giftPrice({ ...defaultDesign, productIds: ["spice"] }),
    95000 + BOX_PRICE,
  );
  assert.equal(
    giftPrice({ ...defaultDesign, productIds: ["tea", "tea"] }),
    180000 + BOX_PRICE,
  );
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
test("saved cart discards invalid products and empty custom gifts and caps quantities", () => {
  const cart = cleanCart([
    null,
    { key: "bad", productId: "unknown" },
    { key: "empty", design: { productIds: [] } },
    { key: "tea", productId: "tea", quantity: 999, price: 1 },
    { key: "gift", design: defaultDesign, quantity: -4 },
  ]);
  assert.equal(cart.length, 2);
  assert.equal(cart[0].quantity, 20);
  assert.equal(cart[1].quantity, 1);
  assert.equal(linePrice(cart[0]), products[0].price);
  assert.equal(linePrice(cart[1]), giftPrice(defaultDesign));
  assert.deepEqual(cleanCart("invalid"), []);
});
test("cart round trip preserves exact personalization and pricing", () => {
  const design = {
    ...defaultDesign,
    includeCard: true,
    size: "large" as const,
    productIds: ["jerky", "spice"],
    recipient: "Mẹ",
    message: "Một chút bình yên.",
    color: "#315442",
    pattern: "Triền núi",
  };
  const roundTrip = cleanCart(
    JSON.parse(JSON.stringify([{ key: "gift-test", design, quantity: 2 }])),
  );
  assert.deepEqual(roundTrip[0].design, design);
  assert.equal(linePrice(roundTrip[0]) * roundTrip[0].quantity, 960000);
});

test("opting out of a gift card clears its content and keeps box size after cart restore", () => {
  const design = cleanDesign({ ...defaultDesign, size: "large", includeCard: false, message: "Old greeting", recipient: "Old recipient" });
  assert.equal(design.includeCard, false);
  assert.equal(design.message, "");
  assert.equal(design.recipient, "");
  const restored = cleanCart([{ key: "large-no-card", design, quantity: 1 }]);
  assert.deepEqual(restored[0].design, design);
  assert.equal(design.size, "large");
});

test("legacy gifts retain their cards and invalid new options use safe defaults", () => {
  const legacy = cleanDesign({ productIds: ["tea"], color: "#315442", message: "Chúc mừng", recipient: "Mẹ" });
  assert.equal(legacy.includeCard, true);
  assert.equal(legacy.message, "Chúc mừng");
  assert.equal(legacy.size, "medium");
  const invalid = cleanDesign({ size: "invalid", includeCard: "false", message: 123, recipient: {} });
  assert.equal(invalid.size, "medium");
  assert.equal(invalid.includeCard, false);
  assert.equal(invalid.message, "");
});

test("checkout carries box size and optional card text without exposing disabled card content", () => {
  const items = checkoutItems([
    { key: "with-card", quantity: 1, design: { ...defaultDesign, size: "large", includeCard: true, message: "Chúc mừng!" } },
    { key: "without-card", quantity: 2, design: { ...defaultDesign, includeCard: false, message: "Old text", recipient: "Old recipient" } },
    { key: "tea", quantity: 1, productId: "tea" },
  ]);
  assert.equal(items[0].design?.size, "large");
  assert.equal(items[0].design?.includeCard, true);
  assert.equal(items[0].design?.message, "Chúc mừng!");
  assert.equal(items[1].design?.message, "");
  assert.equal(items[1].design?.recipient, "");
  assert.deepEqual(items[2], { kind: "product", product_id: "tea", quantity: 1 });
});
