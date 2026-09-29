import type { Product } from "./catalog.ts";
import type { ChatReply, SupportSettings } from "./support.ts";
import { chatTopics, findChatReply, normalizeChatText, searchChatText } from "./chatMatching.ts";
import type { ChatAction, ChatMessage } from "./chatMatching.ts";

export type SupportCatalog = { products: Product[]; loading: boolean; error: boolean };
/** URL sản phẩm có thể crawl; chatbox luôn trỏ tới trang chi tiết chính thức (B05). */
export const productChatLink = (id: string) => `/san-pham/${encodeURIComponent(id)}`;
const catalogAction: ChatAction = { label: "Xem tất cả sản phẩm", to: "/san-pham#danh-muc" };
const giftAction: ChatAction = { label: "Thiết kế hộp quà", to: "/thiet-ke" };
const contactAction: ChatAction = { label: "Liên hệ tư vấn", to: "/lien-he" };
const productAction = (product: Product): ChatAction => ({ label: `Xem ${product.name}`, to: productChatLink(product.id) });
const contains = (value: string, phrase: string) => ` ${value} `.includes(` ${phrase} `);
const productText = (value: string) => normalizeChatText(value).replace(/\bheo\b/g, "lon").replace(/\bche\b/g, "tra").replace(/\blap suon\b/g, "lap xuong");
const genericNameWords = new Set("thit dac san tay bac gac bep hoa rung a sin hop tui chai hu nguyen chat".split(" "));
const questionWords = new Set("toi minh em anh chi ban shop cua hang ben muon can cho hoi xin tu van xem mua dat chon tim ve co con ban khong a oi nhe nha voi va hay hoac san pham san vat dac san gia bao nhieu tien xuat xu quy cach trong luong mo ta nhu the nao gi tu dau den o duoc thi sao mot loai mon".split(" "));
const followUpWords = new Set("gia bao nhieu tien xuat xu quy cach trong luong mo ta cai do nay loai san pham cho xem mua no thi sao con vay the a nhe voi shop oi toi minh em hoi co tu dau den o nhu nao duoc khong".split(" "));
const catalogQueryWords = new Set([...questionWords, ..."biet cac nhung hien tai dang giup them it hang sam danh muc products".split(" ")]);
const giftWords = new Set("qua gift tang bieu hop".split(" "));
const isProductFollowUp = (query: string) => /\b(?:gia|bao nhieu|xuat xu|quy cach|trong luong|mo ta|cai do|cai nay|loai do|san pham do|cho xem|mua no|mua cai nay|mua cai do)\b/.test(query)
  && query.split(" ").every(word => followUpWords.has(word));

/** Match the live names, not a fixed list of sample products or text from descriptions. */
export function mentionedProducts(message: string, products: Product[]): Product[] {
  const query = productText(searchChatText(message));
  if (!query) return [];
  // Rank within each requested item, so a full name excludes its sibling variants.
  const clauses = query.split(/\b(?:va|hoac)\b/).map(clause => clause.trim()).filter(Boolean);
  const matches = clauses.flatMap(clause => rankProducts(clause, products));
  return [...new Map(matches.map(product => [product.id, product])).values()];
}

function rankProducts(query: string, products: Product[]): Product[] {
  const words = query.split(" ");
  const distinctQuery = words.filter(word => !questionWords.has(word) && !genericNameWords.has(word));
  const ranked = products.map(product => {
    const name = productText(product.name);
    const nameWords = name.split(" ");
    const core = nameWords.filter(word => !genericNameWords.has(word));
    const shared = [...new Set(core.filter(word => distinctQuery.includes(word)))];
    const exact = contains(query, name);
    // Do not turn a request for shredded meat into a different smoked-meat SKU.
    const variants = ["xe", "gac bep", "say", "tuoi"];
    const hasVariant = variants.some(variant => contains(name, variant));
    const wrongVariant = hasVariant && variants.some(variant => contains(query, variant) && !contains(name, variant));
    if (!exact && wrongVariant) return { product, score: 0 };
    const uniqueSingle = shared.length === 1 && shared[0].length >= 3 && (core.length === 1 || (distinctQuery.length === 1 && distinctQuery[0] === shared[0]));
    const distinctivePhrase = core.length >= 2 && core.some((word, index) => index < core.length - 1 && contains(query, `${word} ${core[index + 1]}`));
    const score = exact ? 1000 + name.length : distinctivePhrase || uniqueSingle ? shared.length * 20 + shared.length / Math.max(1, core.length) : 0;
    return { product, score };
  }).filter(item => item.score > 0).sort((a, b) => b.score - a.score);
  const exact = ranked.filter(item => item.score >= 1000);
  return (exact.length ? exact : ranked).map(item => item.product);
}

function productSummary(product: Product) {
  const price = Number.isFinite(product.price) ? new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(product.price) : "Xem giá tại trang sản phẩm";
  const description = product.description.trim();
  return `${product.name} — ${price}${product.weight ? ` / ${product.weight}` : ""}${product.origin ? `\nXuất xứ: ${product.origin}.` : ""}${description ? `\n${description.length > 240 ? `${description.slice(0, 237).trimEnd()}…` : description}` : ""}`;
}

function describeProducts(products: Product[], prefix = "Thông tin sản phẩm trong danh mục hiện tại:"): ChatMessage {
  const shown = products.slice(0, 3);
  return {
    role: "bot", topic: "product", productIds: shown.map(product => product.id),
    text: `${prefix}\n\n${shown.map(productSummary).join("\n\n")}${products.length > 3 ? "\n\nBạn có thể xem thêm các sản phẩm liên quan trong danh mục." : ""}`,
    actions: [...shown.map(productAction), ...(products.length > 3 ? [catalogAction] : [])],
  };
}

/** Answers are either configured copy or facts from the same catalog/prices as the shop. */
export function answerSupportMessage(message: string, settings: SupportSettings, catalog: SupportCatalog, history: ChatMessage[] = [], selected?: ChatReply): ChatMessage {
  const query = searchChatText(message);
  const topics = chatTopics(message);
  const known = selected || findChatReply(message, settings.replies, history);
  const activeCatalog = !catalog.loading && !catalog.error;
  const named = activeCatalog ? mentionedProducts(message, catalog.products) : [];
  const last = history.filter(turn => turn.role === "bot").at(-1);
  const purchase = /\b(?:mua|dat mua|dat hang|ban gi|co gi|danh muc|san pham|san vat|dac san|products)\b/.test(query);
  const service = topics.some(topic => ["shipping", "payment", "returns", "contact"].includes(topic));
  const gift = !service && (topics.includes("gift") || (!topics.length && !named.length && last?.topic === "gift" && isProductFollowUp(query)));
  const inherited = activeCatalog && !named.length && !service && !gift && last?.topic === "product" && isProductFollowUp(query)
    ? catalog.products.filter(product => last.productIds?.includes(product.id)) : [];
  const candidates = named.length ? named : inherited;

  const configuredAnswer = (reply: ChatReply): ChatMessage => {
    const replyTopics = chatTopics(`${reply.question} ${reply.keywords}`);
    const replyGift = gift || (!service && replyTopics.includes("gift"));
    return { role: "bot", text: reply.answer, replyId: reply.id,
      topic: service ? "service" : replyGift ? "gift" : candidates.length ? "product" : "catalog",
      productIds: service ? undefined : candidates.map(product => product.id),
      actions: replyGift ? [giftAction, ...candidates.filter(product => !chatTopics(product.name).includes("gift")).slice(0, 2).map(productAction)] : candidates.length ? candidates.slice(0, 3).map(productAction) : purchase || replyTopics.includes("product") || replyTopics.includes("payment") ? [catalogAction] : undefined,
    };
  };
  if (selected || (known && normalizeChatText(known.question) === normalizeChatText(message))) return configuredAnswer(known!);
  if (service) {
    if (known) return configuredAnswer(known);
    if (!purchase) return { role: "bot", text: settings.fallback, actions: [contactAction], topic: "service" };
  }
  if (gift) {
    const specificGift = named.some(product => chatTopics(product.name).includes("gift"))
      && query.split(" ").some(word => !questionWords.has(word) && !genericNameWords.has(word) && !giftWords.has(word));
    if (specificGift) {
      const reply = describeProducts(named);
      reply.actions!.push(giftAction);
      return reply;
    }
    return known ? configuredAnswer(known) : {
      role: "bot", topic: "gift", text: "Bạn có thể tự chọn sản vật, màu hộp và lời nhắn tại trang thiết kế hộp quà. Giá hộp quà được hiển thị theo lựa chọn của bạn.", actions: [giftAction, ...named.filter(product => !chatTopics(product.name).includes("gift")).slice(0, 2).map(productAction)],
    };
  }
  if (candidates.length) {
    // Specific configured guidance (e.g. storage) wins over a generic description.
    if (known && !/\b(?:gia|bao nhieu|quy cach|trong luong|xuat xu|mo ta)\b/.test(query)) return configuredAnswer(known);
    return describeProducts(candidates);
  }
  if (known) return configuredAnswer(known);
  if (purchase || topics.includes("product")) {
    if (!activeCatalog) return { role: "bot", topic: "catalog", text: catalog.loading ? "Danh mục sản phẩm đang được tải. Bạn có thể mở trang sản phẩm để xem và chọn mua." : "Mình chưa tải được danh mục và giá sản phẩm lúc này. Bạn có thể thử lại tại trang sản phẩm hoặc liên hệ A Sỉn để được hỗ trợ.", actions: [catalogAction, contactAction] };
    if (!catalog.products.length) return { role: "bot", topic: "catalog", text: "Danh mục hiện chưa có sản phẩm đang mở bán. Bạn có thể liên hệ A Sỉn để được tư vấn.", actions: [catalogAction, contactAction] };
    const generic = query.split(" ").every(word => catalogQueryWords.has(word));
    return { role: "bot", topic: "catalog", text: generic
      ? `Bạn có thể xem sản phẩm, chọn số lượng rồi thêm vào giỏ để đặt hàng. Danh mục hiện có ${catalog.products.slice(0, 4).map(product => product.name).join(", ")}${catalog.products.length > 4 ? " và các sản phẩm khác" : ""}.`
      : "Mình chưa tìm thấy sản phẩm khớp rõ với mô tả của bạn trong danh mục đang bán. Bạn có thể xem danh mục hoặc gửi yêu cầu để A Sỉn tư vấn thêm.", actions: generic ? [catalogAction] : [catalogAction, contactAction] };
  }
  return { role: "bot", text: settings.fallback, actions: [catalogAction, contactAction] };
}
