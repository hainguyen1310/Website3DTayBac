import test from "node:test";
import assert from "node:assert/strict";
import { cleanDesign, defaultDesign, giftPrice, products, BOX_PRICE } from "../src/catalog.ts";
import { giftComponents } from "../src/giftSelection.ts";

test("custom gifts exclude ready-made boxes and repair saved selections without changing personalization", () => {
  const catalog = [...products,
    { ...products[0], id: "gift-new-name", categorySlug: "hop-qua", category: "Quà biếu" },
    { ...products[0], id: "legacy-gift", category: "Hộp quà & combo" },
  ];
  const available = giftComponents(catalog);
  const repaired = cleanDesign({ ...defaultDesign, productIds: ["tea", "gift-new-name", "legacy-gift", "honey"], recipient: "Mẹ", message: "Thương mẹ." }, available);
  assert.deepEqual(available.map(product => product.id), products.map(product => product.id));
  assert.deepEqual(repaired.productIds, ["tea", "honey"]);
  assert.equal(repaired.recipient, "Mẹ");
  assert.equal(repaired.message, "Thương mẹ.");
  assert.equal(giftPrice(repaired, available), BOX_PRICE + products[0].price + products[1].price);
});
