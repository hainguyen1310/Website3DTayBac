import { test } from "node:test";
import assert from "node:assert/strict";
import { landingProducts, productWindow } from "../src/landingCatalog.ts";
import { cleanCart, cleanDesign, defaultDesign } from "../src/catalog.ts";
import type { Deal, Product } from "../src/catalog.ts";

const product = (id: string, featured = false): Product => ({
  id, featured, name: id, category: "Trà", origin: "Tây Bắc", weight: "100g",
  price: 219000, image: "/database-image.jpg", tag: "", description: "",
});
const deal = (productId: string): Deal => ({
  id: productId, productId, label: "Ưu đãi", originalPrice: 250000,
  discount: 12, ending: "", color: "",
});

test("live promotions precede featured products, missing and duplicate IDs never create cards", () => {
  const products = [product("regular"), product("featured", true), product("sale")];
  const result = landingProducts(products, [deal("sale"), deal("missing"), deal("sale")]);
  assert.deepEqual(result.map((p) => p.id), ["sale", "featured", "regular"]);
  assert.equal(result[0], products[2]);
  assert.equal(result[0].price, 219000);
  assert.equal(result[0].image, "/database-image.jpg");
});

test("carousel wraps the actual live catalog, including catalogs smaller than one page", () => {
  const products = ["one", "two", "three", "four"].map((id) => product(id));
  assert.deepEqual(productWindow(products, 3).map((p) => p.id), ["four", "one", "two"]);
  assert.deepEqual(productWindow(products, -1).map((p) => p.id), ["four", "one", "two"]);
  assert.deepEqual(productWindow(products.slice(0, 2), 10), products.slice(0, 2));
  assert.deepEqual(landingProducts([], [deal("tea")]), []);
  assert.deepEqual(productWindow([], 3), []);
});

test("restoring against the fetched catalog preserves database-only saved products and gift choices", () => {
  const products = [product("database-only")];
  const cart = cleanCart([{ key: "database-only", productId: "database-only", quantity: 2 }], products);
  assert.equal(cart.length, 1);
  assert.equal(cart[0].productId, "database-only");
  const design = cleanDesign({ ...defaultDesign, productIds: ["database-only"] }, products);
  assert.deepEqual(design.productIds, ["database-only"]);
});
