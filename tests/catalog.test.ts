import { test } from "node:test";
import assert from "node:assert/strict";
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
    productIds: ["jerky", "spice"],
    recipient: "Mẹ",
    message: "Một chút bình yên.",
    color: "#964f3e",
    pattern: "Triền núi",
  };
  const roundTrip = cleanCart(
    JSON.parse(JSON.stringify([{ key: "gift-test", design, quantity: 2 }])),
  );
  assert.deepEqual(roundTrip[0].design, design);
  assert.equal(linePrice(roundTrip[0]) * roundTrip[0].quantity, 960000);
});
