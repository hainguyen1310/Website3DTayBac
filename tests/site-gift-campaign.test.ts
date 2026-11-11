import test from "node:test";
import assert from "node:assert/strict";
import { INITIAL_GIFT_STATE, applyGiftPrefill, giftReady, slotProducts } from "../src/site/gift/giftStore.ts";
import type { GiftBuilderState } from "../src/site/gift/giftStore.ts";
import { GIFT_DRAFT_KEY, GIFT_VARIANTS } from "../src/site/gift/variants.ts";
import { initialState, nextDemoCode, normalizeState, unlockPiece, validateCode, cancelPending, PIECE_COUNT } from "../src/site/campaign/state.ts";
import { shippingAddress, shippingFor } from "../src/site/commerce/checkoutOrder.ts";
import type { SiteProduct } from "../src/site/data.ts";

const product = (slug: string, giftSlot: SiteProduct["giftSlot"], inStock = true) =>
  ({ id: slug, slug, name: slug, category: "", origin: "", weight: "", price: 1, image: "", tag: "", description: "", filters: [], gallery: [], giftSlot, inStock }) as SiteProduct;

const catalog = [
  product("trau-gac-bep-tay-bac", "bag"),
  product("lap-xuong-gac-bep", "bag"),
  product("ba-chi-gac-bep", "bag", false),
  product("thit-trau-xe", "jar"),
  product("cham-cheo", "cham"),
];

test("gift slots offer only in-stock products of the matching compartment type", () => {
  assert.deepEqual(slotProducts(catalog, "bagA").map((item) => item.slug), ["trau-gac-bep-tay-bac", "lap-xuong-gac-bep"]);
  assert.deepEqual(slotProducts(catalog, "jar").map((item) => item.slug), ["thit-trau-xe"]);
});

test("a gift is ready only when both bags and the jar hold valid products", () => {
  const partial: GiftBuilderState = { ...INITIAL_GIFT_STATE, items: { bagA: "trau-gac-bep-tay-bac", bagB: "", jar: "thit-trau-xe" } };
  assert.equal(giftReady(partial, catalog), false);
  assert.equal(giftReady({ ...partial, items: { ...partial.items, bagB: "lap-xuong-gac-bep" } }, catalog), true);
  assert.equal(giftReady({ ...partial, items: { ...partial.items, bagB: "ba-chi-gac-bep" } }, catalog), false, "out-of-stock products cannot fill a slot");
});

test("product page prefill places a bag or jar product and jumps to the flavour step", () => {
  const bag = applyGiftPrefill(INITIAL_GIFT_STATE, "?san-pham=lap-xuong-gac-bep", catalog);
  assert.equal(bag.items.bagA, "lap-xuong-gac-bep");
  assert.equal(bag.step, 2);
  const jar = applyGiftPrefill(INITIAL_GIFT_STATE, "?san-pham=thit-trau-xe", catalog);
  assert.equal(jar.items.jar, "thit-trau-xe");
  assert.equal(jar.activeSlot, "jar");
  assert.equal(applyGiftPrefill(INITIAL_GIFT_STATE, "?san-pham=cham-cheo", catalog), INITIAL_GIFT_STATE, "fixed items are not choosable");
});

test("home page draft selects the box size and card text, then is consumed", () => {
  const store = new Map<string, string>([[GIFT_DRAFT_KEY, JSON.stringify({ size: "large", recipient: "Mẹ", message: "Chúc mẹ khỏe" })]]);
  (globalThis as { sessionStorage?: unknown }).sessionStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    removeItem: (key: string) => store.delete(key),
  };
  const next = applyGiftPrefill(INITIAL_GIFT_STATE, "?nguon=trang-chu", catalog);
  assert.equal(next.size, "large");
  assert.equal(next.recipient, "Mẹ");
  assert.equal(next.message, "Chúc mẹ khỏe");
  assert.equal(store.has(GIFT_DRAFT_KEY), false);
  delete (globalThis as { sessionStorage?: unknown }).sessionStorage;
});

test("gift variants follow the shop's fixed box prices and finishes", () => {
  assert.equal(GIFT_VARIANTS.medium.name, "Sinh Lộc");
  assert.equal(GIFT_VARIANTS.medium.price, 300000);
  assert.equal(GIFT_VARIANTS.large.price, 500000);
  assert.equal(GIFT_VARIANTS.large.artKey, "large");
});

test("campaign demo: a code must be confirmed before a locked piece opens, and each code opens one piece", () => {
  let state = initialState();
  assert.equal(unlockPiece(state, 3).ok, false);
  const code = nextDemoCode(state);
  assert.equal(code, "ASIN-DEMO-0001");
  const validated = validateCode(state, " asin-demo-0001 ");
  assert.ok(validated.ok);
  state = validated.state;
  assert.equal(state.pendingCode, "ASIN-DEMO-0001");
  assert.equal(validateCode(state, "ASIN-DEMO-0002").ok, false, "only one pending code at a time");
  const opened = unlockPiece(state, 3);
  assert.ok(opened.ok);
  state = opened.state;
  assert.deepEqual(state.unlocked, [3]);
  assert.equal(validateCode(state, "ASIN-DEMO-0001").ok, false, "used codes are rejected");
  assert.equal(unlockPiece(state, 3).ok, false);
});

test("campaign demo: unknown codes, cancel and tampered storage are handled", () => {
  assert.equal(validateCode(initialState(), "ASIN-0001").ok, false);
  const pending = validateCode(initialState(), "ASIN-DEMO-0005");
  assert.ok(pending.ok);
  assert.equal(cancelPending(pending.state).pendingCode, null);
  const tampered = normalizeState({ version: 1, unlocked: [0, 1, 2, 99], usedCodes: ["ASIN-DEMO-0001"], pendingCode: "x" });
  assert.deepEqual(tampered.unlocked, [0], "cannot hold more pieces than used codes");
  assert.equal(tampered.pendingCode, null);
  assert.deepEqual(normalizeState("broken"), initialState());
  assert.equal(PIECE_COUNT, 24);
});

test("checkout: shipping becomes free from the configured threshold and city joins the address", () => {
  const commerce = { shippingFee: 30000, freeShippingFrom: 500000 };
  assert.equal(shippingFor(499000, commerce), 30000);
  assert.equal(shippingFor(500000, commerce), 0);
  assert.equal(shippingAddress({ name: "", phone: "", address: "12 Hàng Bông", city: "Hà Nội", email: "", note: "" }), "12 Hàng Bông, Hà Nội");
});
