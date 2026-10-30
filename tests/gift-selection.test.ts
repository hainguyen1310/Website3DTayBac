import test from "node:test";
import assert from "node:assert/strict";
import { cleanDesign, defaultDesign, giftPrice, products } from "../src/catalog.ts";
import { giftComponents, giftSlotProducts } from "../src/giftSelection.ts";

const slotCatalog = ["trau-gac-bep-tay-bac", "lap-xuong-gac-bep", "thit-lon-gac-bep", "thit-lon-xe", "cham-cheo", "ruou-ngo-ban-pho", "ba-chi-gac-bep", "combo-thit-gac-bep", "thit-trau-xe"].map(id => ({ ...products[0], id }));

test("each gift slot excludes only its specified products", () => {
  const bagIds = ["trau-gac-bep-tay-bac", "lap-xuong-gac-bep", "thit-lon-gac-bep", "thit-lon-xe", "ruou-ngo-ban-pho", "ba-chi-gac-bep", "thit-trau-xe"];
  assert.deepEqual(giftSlotProducts(slotCatalog, "bagA").map(p => p.id), bagIds);
  assert.deepEqual(giftSlotProducts(slotCatalog, "bagB").map(p => p.id), bagIds);
  assert.deepEqual(giftSlotProducts(slotCatalog, "jar").map(p => p.id), ["thit-lon-xe", "ruou-ngo-ban-pho", "thit-trau-xe"]);
});

test("restored slot selections discard excluded products and preserve allowed choices", () => {
  const invalid = cleanDesign({ ...defaultDesign, slots: { bagA: "cham-cheo", bagB: "combo-thit-gac-bep", jar: "ba-chi-gac-bep" } }, slotCatalog);
  assert.deepEqual(invalid.slots, {});
  assert.deepEqual(invalid.productIds, []);
  const valid = cleanDesign({ ...defaultDesign, slots: { bagA: "thit-trau-xe", bagB: "ruou-ngo-ban-pho", jar: "thit-lon-xe" } }, slotCatalog);
  assert.deepEqual(valid.productIds, ["thit-trau-xe", "ruou-ngo-ban-pho", "thit-lon-xe"]);
});

test("custom gifts exclude ready-made boxes and repair saved selections without changing personalization", () => {
  const catalog = [...products,
    { ...products[0], id: "gift-new-name", categorySlug: "hop-qua", category: "Quà biếu" },
    { ...products[0], id: "legacy-gift", category: "Hộp quà & combo" },
  ];
  const available = giftComponents(catalog);
  const repaired = cleanDesign({ ...defaultDesign, includeCard: true, productIds: ["tea", "gift-new-name", "legacy-gift", "honey"], recipient: "Mẹ", message: "Thương mẹ." }, available);
  assert.deepEqual(available.map(product => product.id), products.map(product => product.id));
  assert.deepEqual(repaired.productIds, ["tea", "honey"]);
  assert.equal(repaired.recipient, "Mẹ");
  assert.equal(repaired.message, "Thương mẹ.");
  assert.equal(giftPrice(repaired, available), 300000);
});
