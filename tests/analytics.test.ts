import { test } from "node:test";
import type { TestContext } from "node:test";
import assert from "node:assert/strict";
import { cartAnalyticsItems, ecommerceParams, purchaseAnalyticsParams } from "../src/analyticsItems.ts";
import { defaultDesign, products } from "../src/catalog.ts";

let moduleVersion = 0;
async function harness(t: TestContext, url = "https://asintaybac.com/", storage = new Map<string, string>()) {
  const windowBefore = Object.getOwnPropertyDescriptor(globalThis, "window");
  const documentBefore = Object.getOwnPropertyDescriptor(globalThis, "document");
  const idBefore = process.env.VITE_GA4_ID;
  process.env.VITE_GA4_ID = "G-TEST123";
  const scripts: unknown[] = [];
  const fakeWindow = { location: new URL(url), dataLayer: [] as unknown[][], localStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) } };
  Object.defineProperty(globalThis, "window", { configurable: true, value: fakeWindow });
  Object.defineProperty(globalThis, "document", { configurable: true, value: { title: "Sản phẩm", referrer: "", createElement: () => ({}), head: { appendChild: (script: unknown) => scripts.push(script) } } });
  t.after(() => {
    if (windowBefore) Object.defineProperty(globalThis, "window", windowBefore); else Reflect.deleteProperty(globalThis, "window");
    if (documentBefore) Object.defineProperty(globalThis, "document", documentBefore); else Reflect.deleteProperty(globalThis, "document");
    if (idBefore === undefined) delete process.env.VITE_GA4_ID; else process.env.VITE_GA4_ID = idBefore;
  });
  const api = await import(`../src/analytics.ts?test=${++moduleVersion}`);
  return { api, fakeWindow, scripts, storage, events: () => fakeWindow.dataLayer.filter(entry => entry[0] === "event") };
}

test("cart payload supports products and gift boxes without gift recipient/message", () => {
  const design = { ...defaultDesign, recipient: "Private Recipient", message: "private@example.com" };
  const items = cartAnalyticsItems([{ key: "tea", productId: "tea", quantity: 2 }, { key: JSON.stringify(design), design, quantity: 1 }], products);
  assert.equal(items.length, 2);
  assert.equal(items[0].quantity, 2);
  assert.equal(items[1].item_id, "gift-box");
  assert.equal(items[1].price, 495000);
  assert.doesNotMatch(JSON.stringify(items), /Private Recipient|private@example|recipient|message/);
  assert.equal(ecommerceParams(items).value, 855000);
  const purchase = purchaseAnalyticsParams(items, 885000, 30000)!;
  assert.equal(purchase.value, 855000);
  assert.equal(purchase.shipping, 30000);
  assert.equal(purchaseAnalyticsParams(items, 800000, 30000), null);
});

test("pageviews deduplicate StrictMode repeats but count a return visit", async t => {
  const { api, fakeWindow, scripts, events } = await harness(t);
  api.trackPageView(fakeWindow.location.href);
  api.trackPageView(fakeWindow.location.href);
  assert.equal(scripts.length, 1);
  assert.equal(events().length, 1);
  fakeWindow.location = new URL("https://asintaybac.com/san-pham");
  api.trackPageView(fakeWindow.location.href);
  fakeWindow.location = new URL("https://asintaybac.com/");
  api.trackPageView(fakeWindow.location.href);
  assert.equal(events().length, 3);
});

test("admin navigation blocks every event, returning to storefront enables tracking", async t => {
  const { api, fakeWindow, events } = await harness(t);
  api.trackPageView(fakeWindow.location.href);
  fakeWindow.location = new URL("https://asintaybac.com/admin/tin-tuc");
  api.trackPageView(fakeWindow.location.href);
  assert.equal(api.trackEvent("generate_lead", { topic: "test" }), false);
  api.trackPurchaseOnce("order-private", { value: 1 });
  assert.equal(events().length, 1);
  fakeWindow.location = new URL("https://asintaybac.com/san-pham");
  assert.equal(api.trackEvent("view_item", { items: cartAnalyticsItems([{ key: "tea", productId: "tea", quantity: 1 }], products) }), true);
  assert.equal(events().length, 2);
});

test("starting on admin or preview does not load GA4, navigation to public can initialize", async t => {
  const { api, fakeWindow, scripts } = await harness(t, "https://asintaybac.com/admin/dang-nhap");
  api.initAnalytics();
  assert.equal(scripts.length, 0);
  fakeWindow.location = new URL("https://website3dtaybac.vercel.app/");
  assert.equal(api.trackEvent("page_view"), false);
  fakeWindow.location = new URL("http://localhost:5199/");
  assert.equal(api.trackEvent("page_view"), false);
  fakeWindow.location = new URL("https://asintaybac.com/");
  api.trackPageView(fakeWindow.location.href);
  assert.equal(scripts.length, 1);
});

test("events preserve ecommerce arrays, exclude contact data and sanitize URLs", async t => {
  const { api, fakeWindow, events } = await harness(t, "https://asintaybac.com/san-pham?utm_source=fb&email=private%40example.com&q=0901234567&token=secret");
  api.trackEvent("begin_checkout", { ...ecommerceParams(cartAnalyticsItems([{ key: "tea", productId: "tea", quantity: 2 }], products)), customer_email: "private@example.com" });
  const payload = events()[0][2] as Record<string, unknown>;
  assert.equal((payload.items as unknown[]).length, 1);
  assert.equal(payload.page_location, "https://asintaybac.com/san-pham?utm_source=fb");
  assert.doesNotMatch(JSON.stringify(fakeWindow.dataLayer), /private|0901234567|secret/);
});

test("purchase retry uses stable transaction id and persisted browser deduplication", async t => {
  const storage = new Map<string, string>([["asin:ga4:purchase:old-order", "1"]]);
  const { api, events } = await harness(t, undefined, storage);
  const params = ecommerceParams(cartAnalyticsItems([{ key: "tea", productId: "tea", quantity: 1 }], products));
  api.trackPurchaseOnce("old-order", params);
  api.trackPurchaseOnce("new-order", params);
  api.trackPurchaseOnce("new-order", params);
  assert.equal(events().length, 1);
  assert.equal((events()[0][2] as Record<string, unknown>).transaction_id, "new-order");
  assert.equal(storage.get("asin:ga4:purchase:new-order"), "1");
});
