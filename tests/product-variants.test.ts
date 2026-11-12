import test from "node:test";
import assert from "node:assert/strict";
import { cleanCart, linePrice, productLineKey, resolveVariant } from "../src/catalog.ts";
import type { CartLine, Product } from "../src/catalog.ts";
import { checkoutItems } from "../src/checkoutItems.ts";
import { applyPromotions } from "../src/pricing.ts";
import { toVariants } from "../src/productVariants.ts";
import { mergeStorefrontProducts } from "../src/storefront/products.ts";
import { cartAnalyticsItems } from "../src/analyticsItems.ts";
import { toAdminVariants, variantRowsError } from "../src/admin/variantRows.ts";
import type { VariantRow } from "../src/admin/variantRows.ts";

const trau: Product = {
  id: "trau-gac-bep-tay-bac",
  name: "Thịt trâu gác bếp",
  category: "Thịt gác bếp",
  origin: "",
  weight: "Túi 500g",
  price: 450000,
  image: "",
  tag: "",
  description: "",
  variants: [
    { id: "v100", label: "Túi 100g", price: 100000, isDefault: false },
    { id: "v250", label: "Túi 250g", price: 225000, isDefault: false },
    { id: "v500", label: "Túi 500g", price: 450000, isDefault: true },
    { id: "v1kg", label: "Túi 1kg", price: 850000, isDefault: false },
  ],
};
const cham: Product = { ...trau, id: "cham-cheo", name: "Chẩm chéo Tây Bắc", weight: "Lọ 100g", price: 28000, variants: undefined };
const list = [trau, cham];

test("each size is its own cart line priced by that size", () => {
  const lines = cleanCart([
    { key: productLineKey(trau.id, "v250"), productId: trau.id, variantId: "v250", quantity: 2 },
    { key: productLineKey(trau.id, "v1kg"), productId: trau.id, variantId: "v1kg", quantity: 1 },
  ], list);
  assert.deepEqual(lines.map((line) => [line.key, linePrice(line, list)]), [["trau-gac-bep-tay-bac::v250", 225000], ["trau-gac-bep-tay-bac::v1kg", 850000]]);
});

test("old carts without a size get the default size and merge with an existing default line", () => {
  const lines = cleanCart([
    { key: trau.id, productId: trau.id, quantity: 3 },
    { key: productLineKey(trau.id, "v500"), productId: trau.id, variantId: "v500", quantity: 2 },
  ], list);
  assert.deepEqual(lines, [{ key: "trau-gac-bep-tay-bac::v500", productId: trau.id, variantId: "v500", quantity: 5 }]);
});

test("a removed size drops the line, products without sizes keep working", () => {
  const lines = cleanCart([
    { key: productLineKey(trau.id, "gone"), productId: trau.id, variantId: "gone", quantity: 1 },
    { key: cham.id, productId: cham.id, quantity: 2 },
  ], list);
  assert.deepEqual(lines, [{ key: "cham-cheo", productId: "cham-cheo", quantity: 2 }]);
  assert.equal(linePrice(lines[0], list), 28000);
});

test("checkout sends the chosen size; lines without sizes send none", () => {
  const items = checkoutItems([
    { key: "a", productId: trau.id, variantId: "v100", quantity: 4 },
    { key: "b", productId: cham.id, quantity: 1 },
  ] as CartLine[]);
  assert.deepEqual(items, [
    { kind: "product", product_id: trau.id, variant_id: "v100", quantity: 4 },
    { kind: "product", product_id: cham.id, quantity: 1 },
  ]);
});

test("promotions apply the discount percent to every size, like the database", () => {
  const [promoted] = applyPromotions([trau], [{ id: "p", productId: trau.id, label: "", originalPrice: 450000, discount: 10, ending: "", color: "" }]);
  assert.deepEqual(promoted.variants!.map((variant) => variant.price), [90000, 202500, 405000, 765000]);
  assert.equal(promoted.price, 405000, "card price follows the default size");
  assert.equal(resolveVariant(promoted, "v250")!.price, 202500);
});

test("database rows become sizes in display order; invalid prices are ignored", () => {
  assert.deepEqual(toVariants([
    { id: "b", label: "Túi 1kg", price_vnd: 850000, is_default: false, sort_order: 3 },
    { id: "a", label: "Túi 100g", price_vnd: 100000, is_default: true, sort_order: 0 },
    { id: "c", label: "Lỗi", price_vnd: 0, is_default: false, sort_order: 1 },
  ]), [
    { id: "a", label: "Túi 100g", price: 100000, isDefault: true },
    { id: "b", label: "Túi 1kg", price: 850000, isDefault: false },
  ]);
  assert.equal(toVariants([]), undefined);
});

test("the storefront card shows the default size label from the database", () => {
  const merged = mergeStorefrontProducts([{ ...trau, weight: "ignored", variants: trau.variants!.map((variant) => ({ ...variant, isDefault: variant.id === "v250" })) }]);
  const card = merged.find((product) => product.id === trau.id)!;
  assert.equal(card.weight, "Túi 250g");
  assert.equal(card.variants!.length, 4);
});

test("analytics reports the size label and size price", () => {
  const [item] = cartAnalyticsItems([{ key: "a", productId: trau.id, variantId: "v250", quantity: 2 }], list);
  assert.equal(item.item_variant, "Túi 250g");
  assert.equal(item.price, 225000);
});

test("admin size rows are validated before saving", () => {
  const row = (label: string, price: string, isDefault: boolean): VariantRow => ({ key: label, label, price, isDefault });
  assert.equal(variantRowsError([]), null);
  assert.equal(variantRowsError([row("Túi 100g", "100000", true), row("Túi 1kg", "850000", false)]), null);
  assert.match(variantRowsError([row("Túi 100g", "100000", false)])!, /mặc định/);
  assert.match(variantRowsError([row("Túi 100g", "100000", true), row("túi 100g ", "1", false)])!, /trùng/);
  assert.match(variantRowsError([row("Túi 100g", "0", true)])!, /số nguyên dương/);
  assert.match(variantRowsError([row("", "100", true)])!, /1 đến 40/);
  assert.deepEqual(toAdminVariants([{ key: "k", id: "x", label: " Túi 250g ", price: "225000", isDefault: true }]), [{ id: "x", label: "Túi 250g", priceVnd: 225000, isDefault: true }]);
});
