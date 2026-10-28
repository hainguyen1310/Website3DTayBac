import test from "node:test";
import assert from "node:assert/strict";
import { products } from "../src/catalog.ts";
import { mergeStorefrontProducts, STOREFRONT_PRODUCTS } from "../src/storefront/products.ts";

test("Figma lineup is always shown and keeps its order", () => {
  const merged = mergeStorefrontProducts([]);
  assert.deepEqual(merged.map((product) => product.id), STOREFRONT_PRODUCTS.map((product) => product.id));
});

test("database price and stock win for products with the same slug", () => {
  const live = { ...products[0], id: "cham-cheo", price: 99000, inStock: false };
  const merged = mergeStorefrontProducts([live]);
  const cham = merged.find((product) => product.id === "cham-cheo")!;
  assert.equal(cham.price, 99000);
  assert.equal(cham.inStock, false);
  assert.equal(cham.giftSlot, "cham");
  assert.equal(cham.name, "Chẩm chéo Tây Bắc");
});

test("database rows with no price keep the design price; unknown database products follow the lineup", () => {
  const merged = mergeStorefrontProducts([
    { ...products[0], id: "thit-lon-xe", price: 0 },
    { ...products[1], id: "admin-new-product" },
  ]);
  assert.equal(merged.find((product) => product.id === "thit-lon-xe")!.price, 220000);
  assert.equal(merged.at(-1)!.id, "admin-new-product");
  assert.deepEqual(merged.at(-1)!.filters, []);
});

test("old demo products (tea, honey…) are hidden from the storefront", () => {
  const merged = mergeStorefrontProducts([{ ...products[0], id: "tra-shan-tuyet-co-thu" }]);
  assert.equal(merged.some((product) => product.id === "tra-shan-tuyet-co-thu"), false);
});

test("every gift-capable product points to a generated 3D model", () => {
  for (const product of STOREFRONT_PRODUCTS.filter((item) => item.giftSlot)) {
    assert.match(product.giftModel ?? "", /^\/models\/gift\/.+\.glb$/, product.id);
  }
});
