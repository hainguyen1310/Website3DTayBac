import { normalizeChatText } from "./chatMatching.ts";
export { findChatReply, normalizeChatText } from "./chatMatching.ts";
export type { ChatMessage } from "./chatMatching.ts";

export const SUPPORT_SETTING_KEY = "contact_support";
export const CONTACT_KEYS = ["phone", "email", "address", "hours"] as const;
export type ContactKey = (typeof CONTACT_KEYS)[number];
export type ChatReply = {
  id: string;
  question: string;
  answer: string;
  keywords: string;
  enabled: boolean;
};
export type SupportSettings = {
  contact: Record<ContactKey, string>;
  zaloEnabled: boolean;
  zaloUrl: string;
  chatEnabled: boolean;
  title: string;
  greeting: string;
  fallback: string;
  inputPlaceholder: string;
  replies: ChatReply[];
};

export function defaultSupport(content: Record<string, string> = {}): SupportSettings {
  return {
    contact: Object.fromEntries(CONTACT_KEYS.map(key => [key, content[`contact.${key}`] || ""])) as Record<ContactKey, string>,
    zaloEnabled: false,
    zaloUrl: "",
    chatEnabled: true,
    title: "A Sỉn xin chào!",
    greeting: "Mình là trợ lý tự động của A Sỉn. Bạn cần tìm sản vật, chọn quà hay hỗ trợ đơn hàng? Chọn một câu hỏi bên dưới hoặc nhắn cho mình nhé.",
    fallback: "Mình chưa có câu trả lời phù hợp. Bạn hãy liên hệ qua Zalo hoặc gửi lời nhắn ở trang Liên hệ để A Sỉn hỗ trợ thêm nhé.",
    inputPlaceholder: "Nhập câu hỏi của bạn…",
    replies: [
      { id: "gift", question: "Mình muốn tự chọn hộp quà", answer: content["faq.design"] || "Bạn có thể vào mục Hộp quà để chọn 1–4 sản vật, màu hộp và lời nhắn trên thiệp.", keywords: "hộp quà, quà tặng, thiết kế", enabled: true },
      { id: "shipping", question: "Phí giao hàng được tính thế nào?", answer: content["faq.shipping"] || "Phí giao hàng được hiển thị ở bước kiểm tra đơn hàng. Hãy liên hệ A Sỉn để xác nhận thời gian giao theo địa chỉ nhận của bạn.", keywords: "giao hàng, vận chuyển, phí ship", enabled: true },
      { id: "payment", question: "Mình thanh toán bằng cách nào?", answer: content["faq.order"] || "Bạn thanh toán khi nhận hàng. Đơn hàng được ghi nhận sau khi xác nhận đặt hàng và nhận mã đơn.", keywords: "thanh toán, cod, đặt hàng", enabled: true },
    ],
  };
}

/** Accept only Zalo destinations; never turn arbitrary saved text into a link. */
export function resolveZaloUrl(value: string): string | null {
  const input = value.trim();
  if (/^[+\d\s().-]+$/.test(input)) {
    const digits = input.replace(/[^\d]/g, "");
    const local = digits.startsWith("84") ? `0${digits.slice(2)}` : digits;
    return /^0[35789]\d{8}$/.test(local) ? `https://zalo.me/${local}` : null;
  }
  try {
    const url = new URL(input);
    if (url.protocol !== "https:" || url.hostname !== "zalo.me" || url.username || url.password || url.port || !/^\/[A-Za-z0-9_-]+\/?$/.test(url.pathname) || url.search || url.hash) return null;
    return url.href;
  } catch { return null; }
}

const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown, fallback: string, max: number) => typeof value === "string" ? value.slice(0, max).trim() : fallback;

export function readSupport(value: unknown, content: Record<string, string> = {}): SupportSettings {
  const defaults = defaultSupport(content);
  const source = record(value);
  const contact = record(source.contact);
  const result = {
    ...defaults,
    contact: Object.fromEntries(CONTACT_KEYS.map(key => [key, text(contact[key], defaults.contact[key], 500)])) as Record<ContactKey, string>,
    zaloEnabled: source.zaloEnabled === true,
    zaloUrl: text(source.zaloUrl, "", 300),
    chatEnabled: typeof source.chatEnabled === "boolean" ? source.chatEnabled : defaults.chatEnabled,
    title: text(source.title, defaults.title, 80) || defaults.title,
    greeting: text(source.greeting, defaults.greeting, 2000) || defaults.greeting,
    fallback: text(source.fallback, defaults.fallback, 2000) || defaults.fallback,
    inputPlaceholder: text(source.inputPlaceholder, defaults.inputPlaceholder, 120) || defaults.inputPlaceholder,
    replies: defaults.replies,
  };
  if (Array.isArray(source.replies)) {
    const ids = new Set<string>();
    result.replies = source.replies.slice(0, 20).flatMap((item, index) => {
      const row = record(item);
      const question = text(row.question, "", 160);
      const answer = text(row.answer, "", 2000);
      if (!question || !answer) return [];
      let id = text(row.id, `reply-${index}`, 80);
      if (!id || ids.has(id)) id = `reply-${index}-${ids.size}`;
      ids.add(id);
      return [{ id, question, answer, keywords: text(row.keywords, "", 500), enabled: row.enabled !== false }];
    });
  }
  return result;
}

export function validateSupport(value: SupportSettings): string | null {
  if (value.zaloUrl.trim() && !resolveZaloUrl(value.zaloUrl)) return "Nhập số di động Việt Nam hoặc đường dẫn https://zalo.me/… hợp lệ (không có tham số).";
  if (value.zaloEnabled && !resolveZaloUrl(value.zaloUrl)) return "Hãy nhập số Zalo hoặc đường dẫn Zalo trước khi bật nút liên hệ.";
  if (value.contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.contact.email.trim())) return "Email liên hệ không hợp lệ.";
  if (value.contact.phone && !/^\+?\d{8,15}$/.test(value.contact.phone.replace(/[\s().-]/g, ""))) return "Số điện thoại liên hệ không hợp lệ.";
  for (const [field, max] of [["title", 80], ["greeting", 2000], ["fallback", 2000], ["inputPlaceholder", 120]] as const) {
    if (!value[field].trim() || value[field].length > max) return "Vui lòng điền đủ tên hộp chat, lời chào, câu trả lời mặc định và gợi ý ô nhập trong giới hạn ký tự.";
  }
  if (CONTACT_KEYS.some(key => value.contact[key].length > 500)) return "Thông tin liên hệ không được quá 500 ký tự mỗi mục.";
  if (value.replies.length > 20) return "Tối đa 20 câu hỏi/trả lời.";
  const questions = new Set<string>();
  for (const [index, reply] of value.replies.entries()) {
    if (!reply.question.trim() || !reply.answer.trim() || reply.question.length > 160 || reply.answer.length > 2000 || reply.keywords.length > 500) return `Câu ${index + 1}: điền đủ câu hỏi và câu trả lời trong giới hạn ký tự.`;
    const question = normalizeChatText(reply.question);
    if (questions.has(question)) return `Câu ${index + 1} trùng câu hỏi với một mục trước đó.`;
    questions.add(question);
  }
  return null;
}

