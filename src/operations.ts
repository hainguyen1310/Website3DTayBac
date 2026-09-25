export const CONTACT_TOPICS = {
  product: "Tư vấn sản phẩm",
  order: "Đơn hàng & giao nhận",
  gift: "Quà tặng doanh nghiệp",
  partnership: "Hợp tác",
  other: "Góp ý / hỗ trợ khác",
  newsletter: "Đăng ký nhận tin",
} as const;
export type ContactTopic = keyof typeof CONTACT_TOPICS;
export const PRIORITIES = {
  low: "Thấp",
  normal: "Bình thường",
  high: "Cao",
  urgent: "Khẩn cấp",
} as const;
export const CUSTOMER_STAGES = {
  lead: "Khách tiềm năng",
  active: "Đã mua hàng",
  vip: "Khách thân thiết",
  inactive: "Tạm ngưng chăm sóc",
} as const;
export const CUSTOMER_SOURCES = {
  checkout: "Đặt hàng",
  contact: "Form liên hệ",
  newsletter: "Đăng ký nhận tin",
  email: "Email",
  manual: "Nhân viên tạo",
  legacy: "Dữ liệu trước đây",
} as const;
export const DELIVERY_LABELS = {
  received: "Đã nhận",
  queued: "Chờ gửi",
  sending: "Đang gửi",
  sent: "SMTP đã nhận thư",
  delivered: "Đã giao email",
  failed: "Gửi thất bại",
  bounced: "Email bị trả lại",
  internal: "Ghi chú nội bộ",
  uncertain: "Cần kiểm tra kết quả gửi",
} as const;
export type StaffScope = "operations" | "marketing";
export function vietnamDay(value: string | Date | number) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}
export function canAccess(
  role: string | undefined,
  scope: StaffScope | undefined,
  area: string,
) {
  if (role === "admin") return true;
  if (role !== "staff") return false;
  if (scope === "marketing")
    return ["products", "promotions", "content", "website"].includes(area);
  return [
    "dashboard",
    "orders",
    "products",
    "customers",
    "messages",
    "reports",
  ].includes(area);
}
export function normalizePhone(value: string) {
  const clean = value.replace(/[\s().-]/g, "");
  return clean.startsWith("+84") ? `0${clean.slice(3)}` : clean;
}
export function localDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
export function csvCell(value: string | number) {
  const text = String(value ?? "");
  const safe = /^[\s]*[=+@\-\t\r]/.test(text) ? `'${text}` : text;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}
export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
