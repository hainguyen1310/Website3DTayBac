import test from "node:test";
import assert from "node:assert/strict";
import { defaultSupport, findChatReply, readSupport, resolveZaloUrl, validateSupport } from "../src/support.ts";
import { canAccess } from "../src/operations.ts";
import type { ChatMessage, ChatReply } from "../src/support.ts";

const conversation = (reply: ChatReply): ChatMessage[] => [{ role: "user", text: reply.question }, { role: "bot", text: reply.answer, replyId: reply.id }];

test("short gift requests and paraphrases work without selecting an option", () => {
  const { replies } = defaultSupport();
  for (const query of ["Quà:", "quà", "QUA", "Tôi muốn mua biếu mẹ", "cần tặng đối tác", "gift"]) assert.equal(findChatReply(query, replies)?.id, "gift", query);
  for (const query of ["ship", "van chuyen", "gửi hàng được không?", "hộp quà có giao tận nhà không?"]) assert.equal(findChatReply(query, replies)?.id, "shipping", query);
  for (const query of ["trả tiền như nào", "chuyen khoan", "COD"]) assert.equal(findChatReply(query, replies)?.id, "payment", query);
});

test("configured question wording is searchable without keywords", () => {
  const replies = [{ id: "storage", question: "Bảo quản đặc sản như thế nào?", keywords: "", answer: "Câu trả lời bảo quản do admin soạn.", enabled: true }];
  assert.equal(findChatReply("cần hướng dẫn bảo quản", replies)?.id, "storage");
  assert.equal(findChatReply("bao quan", replies)?.id, "storage");
  assert.equal(findChatReply("admin soạn", replies), undefined, "do not retrieve from answer-only words");
});

test("follow-up price questions use the previous topic and explicit intent switches topic", () => {
  const { replies } = defaultSupport();
  const giftCost = { id: "gift-cost", question: "Hộp quà giá bao nhiêu?", keywords: "giá hộp quà", answer: "Giá quà được hiển thị sau khi chọn sản vật.", enabled: true };
  const configured = [...replies, giftCost];
  assert.equal(findChatReply("giá thì sao?", configured, conversation(replies[0]))?.id, "gift-cost");
  assert.equal(findChatReply("bao nhieu?", configured, conversation(replies[1]))?.id, "shipping");
  assert.equal(findChatReply("phí giao hàng?", configured, conversation(replies[0]))?.id, "shipping");
  assert.equal(findChatReply("thanh toán?", configured, conversation(giftCost))?.id, "payment");
  assert.equal(findChatReply("ship hộp quà", configured, conversation(giftCost))?.id, "shipping");
  assert.equal(findChatReply("hướng dẫn thêm", configured, conversation(replies[0]))?.id, "gift");
});

test("uncertain, unrelated, negated and disabled topics do not fabricate a contextual match", () => {
  const { replies } = defaultSupport();
  const history = conversation(replies[0]);
  for (const query of ["đắt quá", "hôm qua", "giá bao nhiêu?", "không cần quà", "trời hôm nay có mưa không", "abc cái đó"]) assert.equal(findChatReply(query, replies, history), undefined, query);
  assert.equal(findChatReply("giá?", replies), undefined);
  assert.equal(findChatReply("không cần quà, tôi muốn hỏi giao hàng", replies)?.id, "shipping");
  assert.equal(findChatReply("quà", replies.map(reply => ({ ...reply, enabled: reply.id !== "gift" }))), undefined);
  assert.equal(findChatReply("hướng dẫn thêm", replies, [...history, { role: "bot", text: "Chưa có câu trả lời." }]), undefined);
  assert.equal(findChatReply("hướng dẫn thêm", replies, []), undefined, "starting again removes context");
});

test("quantity wording is distinct from price and exact configured negative questions still work", () => {
  const { replies } = defaultSupport();
  assert.equal(findChatReply("hộp quà chọn được bao nhiêu sản vật?", replies)?.id, "gift");
  const account = { id: "account", question: "Không cần tài khoản để mua hàng đúng không?", keywords: "", answer: "Nội dung đã cấu hình.", enabled: true };
  assert.equal(findChatReply(account.question, [...replies, account])?.id, "account");
});

test("Zalo accepts Vietnamese phone formats and official destinations only", () => {
  for (const input of ["0901 234 567", "+84 901-234-567", "84901234567"]) assert.equal(resolveZaloUrl(input), "https://zalo.me/0901234567");
  assert.equal(resolveZaloUrl("https://zalo.me/1234567890123456789"), "https://zalo.me/1234567890123456789");
  for (const input of ["", "123", "javascript:alert(1)", "http://zalo.me/123", "https://zalo.me.evil.test/123", "https://zalo.me@evil.test/123", "https://user@zalo.me/123", "https://zalo.me", "https://zalo.me/123?redirect=evil", "https://zalo.me/123#bad", "https://zalo.me:8888/123"]) assert.equal(resolveZaloUrl(input), null, input);
});

test("support safely loads defaults, legacy contact details, and deliberate empty values", () => {
  const legacy = { "contact.phone": "0901234567", "contact.email": "shop@example.com", "faq.shipping": "Chính sách hiện có" };
  assert.equal(readSupport(null, legacy).contact.phone, legacy["contact.phone"]);
  assert.equal(readSupport(null, legacy).replies[1].answer, legacy["faq.shipping"]);
  const loaded = readSupport({ contact: { phone: "", email: 12 }, chatEnabled: false, replies: [] }, legacy);
  assert.equal(loaded.contact.phone, "");
  assert.equal(loaded.contact.email, legacy["contact.email"]);
  assert.equal(loaded.chatEnabled, false);
  assert.deepEqual(loaded.replies, []);
  assert.equal(readSupport({ replies: [null, { question: "invalid" }], title: {} }).replies.length, 0);
  assert.ok(readSupport({ greeting: " " }).greeting);
});

test("Vietnamese replies match whole phrases without accents, prefer specificity, and respect disabled entries", () => {
  const config = defaultSupport();
  assert.equal(findChatReply("PHI GIAO HANG bao nhieu?", config.replies)?.id, "shipping");
  assert.equal(findChatReply(config.replies[0].question, config.replies)?.id, "gift");
  assert.equal(findChatReply("codex", config.replies), undefined);
  assert.equal(findChatReply("câu hỏi chưa cấu hình", config.replies), undefined);
  assert.equal(findChatReply("!!!", config.replies), undefined);
  const specific = { ...config.replies[0], id: "specific", keywords: "phí giao hàng" };
  assert.equal(findChatReply("phí giao hàng", [...config.replies, specific])?.id, "specific");
  assert.equal(findChatReply("phí giao hàng", [...config.replies, { ...specific, enabled: false }])?.id, "shipping");
  assert.equal(findChatReply("giao hàng", [{ ...specific, keywords: "giao hàng" }, config.replies[1]])?.id, "specific");
});

test("validation blocks enabled Zalo without a destination, bad contact info and duplicate questions", () => {
  const config = defaultSupport();
  assert.equal(validateSupport(config), null);
  assert.ok(validateSupport({ ...config, zaloEnabled: true }));
  assert.ok(validateSupport({ ...config, contact: { ...config.contact, email: "not-an-email" } }));
  assert.ok(validateSupport({ ...config, replies: [...config.replies, { ...config.replies[0], id: "duplicate" }] }));
  assert.ok(validateSupport({ ...config, replies: [{ ...config.replies[0], answer: " " }] }));
  assert.ok(validateSupport({ ...config, greeting: "x".repeat(2001) }));
  assert.equal(validateSupport({ ...config, replies: [], chatEnabled: false }), null);
});

test("only admins can enter support configuration with the existing settings RLS model", () => {
  assert.equal(canAccess("admin", "operations", "support"), true);
  for (const role of ["staff", "customer", undefined]) {
    assert.equal(canAccess(role, "marketing", "support"), false);
    assert.equal(canAccess(role, "operations", "support"), false);
  }
});
