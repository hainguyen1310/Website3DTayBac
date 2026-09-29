import test from "node:test";
import assert from "node:assert/strict";
import type { Product } from "../src/catalog.ts";
import type { ChatMessage } from "../src/chatMatching.ts";
import { defaultSupport } from "../src/support.ts";
import { answerSupportMessage, mentionedProducts, productChatLink } from "../src/supportConversation.ts";

const product = (id: string, name: string, price: number): Product => ({ id, name, price, weight: "250g", origin: "Tây Bắc", description: `Mô tả ${name} từ cửa hàng.`, image: "", tag: "", category: "Đặc sản" });
const products = [product("tra-shan", "Trà Shan Tuyết cổ thụ", 180000), product("mat-ong", "Mật ong hoa rừng", 220000), product("trau-gac-bep", "Trâu gác bếp Tây Bắc", 345000), product("mac-khen", "Mắc khén rừng", 70000)];
const catalog = { products, loading: false, error: false };
const settings = defaultSupport();
const answer = (text: string, history: ChatMessage[] = []) => answerSupportMessage(text, settings, catalog, history);
const destinations = (message: ChatMessage) => message.actions?.map(action => action.to) ?? [];

test("product and buying questions offer the current catalog and a shopping link", () => {
  for (const query of ["sản phẩm", "mua hàng", "Tôi muốn mua hàng", "đặt hàng", "cần xem sản phẩm", "shop bán gì?", "đặc sản", "mua", "shop có những sản phẩm nào?", "muốn biết các loại sản phẩm của cửa hàng"]) {
    const reply = answer(query);
    assert.ok(destinations(reply).includes("/san-pham#danh-muc"), query);
    assert.notEqual(reply.text, settings.fallback, query);
    assert.doesNotMatch(reply.text, /chưa tìm thấy/, query);
  }
  assert.match(answer("sản phẩm").text, /Trà Shan Tuyết/);
});

test("names, short product names and unaccented questions retrieve live catalog records", () => {
  for (const [query, id] of [["mật ong", "mat-ong"], ["TRA SHAN TUYET", "tra-shan"], ["có trà không?", "tra-shan"], ["trâu", "trau-gac-bep"], ["thịt trâu", "trau-gac-bep"], ["giá mắc khén?", "mac-khen"]]) {
    assert.deepEqual(mentionedProducts(query, products).map(item => item.id), [id], query);
    assert.deepEqual(destinations(answer(query)), [productChatLink(id)], query);
  }
  for (const item of products) assert.ok(destinations(answer(item.name)).includes(productChatLink(item.id)));
});

test("newly added product names work without adding code or FAQ entries", () => {
  const rice = product("gao seng cu/1", "Gạo Séng Cù", 65000);
  const reply = answerSupportMessage("Tư vấn Gạo Séng Cù", settings, { ...catalog, products: [...products, rice] });
  assert.deepEqual(destinations(reply), ["/san-pham/gao%20seng%20cu%2F1"]);
  assert.match(reply.text, /65\.000/);
});

test("product replies use current prices, packaging, origin and description", () => {
  const current = { ...products[1], price: 176000, weight: "500ml", origin: "Sơn La", description: "Thông tin thật được quản trị viên cập nhật." };
  const reply = answerSupportMessage("mật ong giá bao nhiêu?", settings, { ...catalog, products: [current] });
  assert.match(reply.text, /176\.000/);
  assert.match(reply.text, /500ml/);
  assert.match(reply.text, /Sơn La/);
  assert.match(reply.text, /Thông tin thật/);
  assert.doesNotMatch(reply.text, /220\.000/);
});

test("multiple products retain individual destination links", () => {
  const reply = answer("mật ong và trâu gác bếp");
  assert.deepEqual(new Set(destinations(reply)), new Set([productChatLink("mat-ong"), productChatLink("trau-gac-bep")]));
});

test("a full product name selects that variant, while a family name can show several", () => {
  const variants = [products[1], product("honey-mint", "Mật ong bạc hà", 285000), product("honey-kudzu", "Mật ong sắn dây", 195000)];
  assert.equal(mentionedProducts("mật ong", variants).length, 3);
  for (const item of variants) assert.deepEqual(mentionedProducts(`giá ${item.name}?`, variants).map(p => p.id), [item.id]);
  assert.deepEqual(new Set(mentionedProducts("Mật ong bạc hà và trâu", [...products, ...variants]).map(p => p.id)), new Set(["honey-mint", "trau-gac-bep"]));
});

test("gift replies link to the gift designer, including selected configured questions", () => {
  for (const query of ["Quà:", "mua quà", "tặng mẹ", "giá hộp quà?"]) assert.ok(destinations(answer(query)).includes("/thiet-ke"), query);
  const selected = settings.replies.find(reply => reply.id === "gift")!;
  const reply = answerSupportMessage(selected.question, settings, catalog, [], selected);
  assert.equal(reply.text, selected.answer);
  assert.deepEqual(destinations(reply), ["/thiet-ke"]);
  assert.ok(destinations(answer("mật ong làm quà")).includes(productChatLink("mat-ong")));
});

test("a named ready-made gift uses its catalog facts rather than only a generic gift introduction", () => {
  const gift = product("hop-mua-thu", "Hộp quà mùa thu", 650000);
  const withGift = { ...catalog, products: [...products, gift] };
  for (const query of ["Hộp quà mùa thu", "giá quà mùa thu"]) {
    const reply = answerSupportMessage(query, settings, withGift);
    assert.match(reply.text, /650\.000/);
    assert.ok(destinations(reply).includes(productChatLink(gift.id)));
  }
  assert.ok(destinations(answerSupportMessage("Quà:", settings, withGift)).includes("/thiet-ke"));
});

test("short follow-up questions refer to the previous product and explicit new topics win", () => {
  const previous = answer("mật ong");
  for (const query of ["giá?", "bao nhiêu?", "xuất xứ ở đâu?", "quy cách thì sao?", "cho xem"]) assert.deepEqual(destinations(answer(query, [previous])), [productChatLink("mat-ong")], query);
  assert.deepEqual(destinations(answer("mắc khén", [previous])), [productChatLink("mac-khen")]);
  assert.deepEqual(destinations(answer("quà", [previous])), ["/thiet-ke"]);
  assert.deepEqual(destinations(answer("bao nhiêu?", [answer("quà")])), ["/thiet-ke"]);
  assert.equal(answer("ship", [previous]).replyId, "shipping");
  assert.ok(!destinations(answer("giá táo mèo", [previous])).includes(productChatLink("mat-ong")));
  assert.ok(!destinations(answer("bao nhiêu?", [previous, answer("thời tiết hôm nay")])).includes(productChatLink("mat-ong")));
});

test("unavailable products and unknown variants do not borrow another product's facts", () => {
  for (const query of ["mua táo mèo", "mua thịt trâu xé", "mua chẩm chéo"]) {
    const reply = answer(query);
    assert.match(reply.text, /chưa tìm thấy/);
    assert.ok(destinations(reply).includes("/san-pham#danh-muc"));
    assert.ok(!destinations(reply).some(path => path.includes("?product=")));
  }
  for (const query of ["mật khẩu", "hôm qua", "không muốn mua trâu", "hoa rừng", "Tây Bắc"]) assert.deepEqual(mentionedProducts(query, products), [], query);
  assert.notEqual(answer("giá táo mèo", [answer("ship")]).replyId, "shipping");
});

test("loading, failed and empty catalogs never answer with stale or sample product facts", () => {
  for (const state of [{ ...catalog, loading: true }, { ...catalog, error: true }, { ...catalog, products: [] }]) {
    const reply = answerSupportMessage("mua mật ong", settings, state);
    assert.ok(destinations(reply).includes("/san-pham#danh-muc"));
    assert.doesNotMatch(reply.text, /220\.000/);
    assert.ok(!destinations(reply).some(path => path.includes("?product=")));
  }
});

test("configured product guidance is retained with a product link and service topic takes precedence", () => {
  const storage = { id: "honey-storage", question: "Bảo quản mật ong như thế nào?", keywords: "bảo quản mật ong", answer: "Hướng dẫn do cửa hàng soạn.", enabled: true };
  const configured = { ...settings, replies: [...settings.replies, storage] };
  const reply = answerSupportMessage(storage.question, configured, catalog);
  assert.equal(reply.text, storage.answer);
  assert.deepEqual(destinations(reply), [productChatLink("mat-ong")]);
  assert.equal(answer("ship mật ong bao nhiêu?").replyId, "shipping");
  assert.notEqual(answerSupportMessage(storage.question, { ...settings, replies: [{ ...storage, enabled: false }] }, catalog).text, storage.answer);
});
