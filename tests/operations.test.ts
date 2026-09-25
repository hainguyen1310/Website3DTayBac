import test from "node:test";
import assert from "node:assert/strict";
import {
  canAccess,
  csvCell,
  normalizePhone,
  localDateTime,
} from "../src/operations.ts";
import { applyPromotions } from "../src/pricing.ts";
import { products } from "../src/catalog.ts";
import { readPages } from "../src/services/pagination.ts";

test("marketing cannot access operational customer data; operations cannot edit permissions", () => {
  for (const area of ["orders", "customers", "messages", "settings", "reports"])
    assert.equal(canAccess("staff", "marketing", area), false);
  assert.equal(canAccess("staff", "operations", "settings"), false);
  assert.equal(canAccess("staff", "operations", "orders"), true);
  assert.equal(canAccess("admin", "operations", "settings"), true);
  assert.equal(canAccess("customer", "operations", "orders"), false);
});
test("Vietnamese phone variants match and spreadsheet exports cannot execute formulas", () => {
  assert.equal(normalizePhone("+84 901-234-567"), "0901234567");
  assert.equal(csvCell('=HYPERLINK("bad")'), '"\'=HYPERLINK(""bad"")"');
  assert.equal(csvCell("hello, world"), '"hello, world"');
});
test("datetime-local preserves the actual local wall time", () => {
  const iso = "2026-09-25T10:15:00Z",
    date = new Date(iso);
  assert.equal(
    localDateTime(iso),
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`,
  );
});
test("cheapest active promotion matches server rounding and never raises the base price", () => {
  const sample = { ...products[0], price: 180000 };
  const deal = {
    id: "a",
    productId: sample.id,
    label: "",
    originalPrice: 200001,
    discount: 20,
    ending: "",
    color: "",
  };
  assert.equal(applyPromotions([sample], [deal])[0].price, 160001);
  assert.equal(
    applyPromotions([sample], [deal, { ...deal, id: "b", discount: 50 }])[0]
      .price,
    100001,
  );
  assert.equal(
    applyPromotions([sample], [{ ...deal, originalPrice: 999999 }])[0].price,
    180000,
  );
});
test("pagination reads beyond the default database cap and propagates a later-page error", async () => {
  const values = Array.from({ length: 1234 }, (_, i) => i);
  const loaded = await readPages(async (start, end) => ({
    data: values.slice(start, end + 1),
    error: null,
  }));
  assert.deepEqual(loaded, values);
  await assert.rejects(
    readPages(async (start, end) => ({
      data: start ? null : values.slice(start, end + 1),
      error: start ? { message: "page failed" } : null,
    })),
    /page failed/,
  );
});
