import type { ChatReply } from "./support.ts";

export type ChatAction = { label: string; to: string };
export type ChatMessage = {
  role: "user" | "bot";
  text: string;
  replyId?: string;
  actions?: ChatAction[];
  topic?: "product" | "catalog" | "gift" | "service";
  productIds?: string[];
};

export function normalizeChatText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

// Shared meaning between a customer's wording and the configured questions.
// These are retrieval cues, never a source of prices, policies or new answers.
const TOPICS = {
  gift: ["quà", "hộp quà", "quà tặng", "biếu", "tặng", "gift", "present"],
  shipping: ["ship", "shipper", "giao hàng", "giao tận nhà", "giao tận nơi", "giao tới", "giao đến", "vận chuyển", "gửi hàng", "nhận hàng mất", "bao lâu nhận", "khi nào nhận", "mấy ngày tới", "freeship"],
  payment: ["thanh toán", "đặt hàng", "cod", "trả tiền", "chuyển khoản", "tiền mặt", "trả trước", "trả sau", "trả lúc nhận"],
  returns: ["đổi trả", "đổi hàng", "trả hàng", "hoàn tiền", "hàng lỗi", "bị hỏng"],
  product: ["sản phẩm", "sản vật", "đặc sản", "thịt trâu", "thịt lợn", "lạp xưởng", "chẩm chéo"],
  contact: ["liên hệ", "hotline", "số điện thoại", "zalo", "địa chỉ", "giờ mở cửa"],
};
const DETAILS = {
  cost: ["giá", "phí", "bao nhiêu tiền", "bao nhiêu", "chi phí", "giá tiền", "mấy tiền", "nhiêu tiền"],
  time: ["bao lâu", "khi nào", "mấy ngày", "thời gian", "ngày nhận"],
  customize: ["thiết kế", "tự chọn", "cá nhân hóa", "viết thiệp", "lời nhắn", "ghi tên", "in tên"],
};
const STOP_WORDS = new Set(normalizeChatText("tôi mình em anh chị bạn shop cửa hàng muốn cần nhờ cho hỏi xin tư vấn hướng dẫn cách làm nào với có không được gì ạ à nhé nha này đó nó thì còn là thế về giúp biết thêm nói rõ hơn một các những bên ơi vậy của để tự chọn sao").split(" "));
const includesPhrase = (value: string, phrase: string) => ` ${value} `.includes(` ${phrase} `);
const normalizedGroups = (groups: Record<string, string[]>) => Object.entries(groups).map(([key, aliases]) => [key, aliases.map(normalizeChatText)] as const);
const topicGroups = normalizedGroups(TOPICS);
const detailGroups = normalizedGroups(DETAILS);
const concepts = (value: string, groups: typeof topicGroups) => groups.filter(([, aliases]) => aliases.some(alias => includesPhrase(value, alias))).map(([key]) => key);
const terms = (value: string) => [...new Set(value.split(" ").filter(term => term && !STOP_WORDS.has(term)))];
const intersects = (a: string[], b: string[]) => a.some(value => b.includes(value));

export function searchChatText(message: string): string {
  // "đắt quá" is not "quà". Keep unaccented "qua" usable as the gift query.
  const normalized = normalizeChatText(message.replace(/(^|[^\p{L}])quá(?=$|[^\p{L}])/giu, "$1").replace(/[,;.!?\n]/g, " separator ")).replace(/\b(?:ngay )?hom qua\b/g, "");
  return normalized.split(/\b(?:separator|nhung|ma|thay vao do)\b/)
    .map(clause => clause.trim())
    .filter(clause => !/^(?:(?:toi|minh|em|anh|chi) )?(?:khong|ko|chua) (?:can|muon|mua|chon|tim|hoi|phai|quan tam)\b/.test(clause))
    .join(" ").trim();
}

export function chatTopics(message: string): string[] {
  return concepts(searchChatText(message), topicGroups);
}

function profile(reply: ChatReply) {
  const keywords = reply.keywords.split(/[,;\n]/).map(normalizeChatText).filter(Boolean);
  const question = normalizeChatText(reply.question);
  const text = `${question} ${keywords.join(" ")}`;
  return { reply, question, keywords, terms: terms(text), topics: concepts(text, topicGroups), details: concepts(text, detailGroups) };
}

/** Retrieve an enabled, admin-authored answer using meaning, wording and the last resolved turn. */
export function findChatReply(message: string, replies: ChatReply[], history: ChatMessage[] = []): ChatReply | undefined {
  const normalized = normalizeChatText(message);
  if (!normalized) return undefined;
  const active = replies.filter(reply => reply.enabled && reply.question.trim() && reply.answer.trim()).map(profile);
  const exact = active.find(item => item.question === normalized);
  if (exact) return exact.reply;
  const query = searchChatText(message);
  if (!query) return undefined;

  const queryTerms = terms(query);
  let topics = concepts(query, topicGroups);
  // In "ship hộp quà" or "thanh toán quà", the service is the new intent.
  if (topics.some(topic => topic !== "gift" && topic !== "product")) topics = topics.filter(topic => topic !== "gift" && topic !== "product");
  const quantityQuestion = /\b(?:bao nhieu|may) (?:mon|san vat|san pham|loai|hop|nguoi)\b/.test(query);
  const details = concepts(query, detailGroups).filter(detail => detail !== "cost" || !quantityQuestion);
  const lastBot = history.filter(turn => turn.role === "bot").at(-1);
  const previous = lastBot?.replyId ? active.find(item => item.reply.id === lastBot.replyId) : undefined;
  const followUp = /\b(?:cai do|cai nay|loai do|nhu the nao|thi sao|noi ro hon|tu van them|huong dan them|chon the nao|lam sao)\b/.test(query);
  const detailWords = terms(details.flatMap(detail => detailGroups.find(([key]) => key === detail)?.[1] ?? []).join(" "));
  // Unrelated messages and a preceding fallback must not revive an old topic.
  const useContext = !topics.length && previous && ((details.length > 0 && queryTerms.every(term => detailWords.includes(term) || previous.terms.includes(term))) || (followUp && queryTerms.length === 0) || queryTerms.filter(term => previous.terms.includes(term)).length >= 2);
  const contextTopics = useContext ? previous.topics : [];
  if (!topics.length && !useContext && details.some(detail => detail === "cost" || detail === "time") && queryTerms.every(term => detailWords.includes(term))) return undefined;

  const ranked = active.flatMap(item => {
    if (topics.length && !intersects(topics, item.topics)) return [];
    if (contextTopics.length && !intersects(contextTopics, item.topics)) return [];
    // Do not answer a price/time question with a generic gift introduction.
    if (details.some(detail => !item.details.includes(detail))) return [];
    const direct = Math.max(0, ...item.keywords.filter(keyword => includesPhrase(query, keyword)).map(keyword => keyword.length));
    const sharedTerms = queryTerms.filter(term => item.terms.includes(term));
    const coverage = sharedTerms.length / Math.max(1, queryTerms.length);
    const topicMatch = intersects(topics, item.topics);
    const detailMatch = intersects(details, item.details);
    const contextMatch = contextTopics.length > 0 && intersects(contextTopics, item.topics);
    const genericFollowUp = useContext && followUp && !queryTerms.length && item === previous;
    const lexicalMatch = coverage >= 0.6 && sharedTerms.length >= 2;
    if (!direct && !topicMatch && !(detailMatch && contextMatch) && !genericFollowUp && !lexicalMatch) return [];
    // Context alone is never sufficient evidence for an unrelated new question.
    const score = (direct ? 1000 + direct * 100 : 0) + (topicMatch ? 60 : 0) + (detailMatch ? 40 : 0)
      + coverage * 30 + (contextMatch ? 35 : 0) + (genericFollowUp ? 50 : 0)
      - (direct ? 0 : item.details.filter(detail => !details.includes(detail)).length * 8);
    return [{ ...item, score }];
  }).sort((a, b) => b.score - a.score);
  if (!ranked.length) return undefined;
  // A bare "giá?" with several possible topics needs more information.
  if (!topics.length && !contextTopics.length && ranked[1] && Math.abs(ranked[0].score - ranked[1].score) < 12
    && !intersects(ranked[0].topics, ranked[1].topics)) return undefined;
  return ranked[0].reply;
}
