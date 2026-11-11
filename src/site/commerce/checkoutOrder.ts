import { fmt } from "../format.ts";
import type { CartView } from "./useSiteCart";

/** Phí giao hàng theo cài đặt cửa hàng (miễn phí từ một mức tạm tính). */
export function shippingFor(subtotal: number, commerce: { shippingFee: number; freeShippingFrom: number }): number {
  return subtotal >= commerce.freeShippingFrom ? 0 : commerce.shippingFee;
}

/** Danh sách món dạng chữ để khách sao chép khi cần trao đổi qua điện thoại/Zalo. */
export function orderRequestText(lines: CartView[], subtotal: number): string {
  const rows = lines.map((item, index) => {
    const chosen = item.giftItems.length ? `\n   Món trong hộp: ${item.giftItems.join(" · ")}` : "";
    return `${index + 1}. ${item.name} — ${item.weight || "Quy cách theo xác nhận của A SỈN"} — Số lượng: ${item.quantity}\n   Tạm tính: ${fmt(item.total)}${chosen}`;
  });
  return `Tôi muốn đặt các món sau tại A SỈN:\n\n${rows.join("\n\n")}\n\nTạm tính: ${fmt(subtotal)}\nNhờ A SỈN xác nhận đơn hàng và phí giao hàng giúp tôi.`;
}

export type CheckoutFields = {
  name: string;
  phone: string;
  address: string;
  city: string;
  email: string;
  note: string;
};

export function readCheckoutFields(form: HTMLFormElement): CheckoutFields {
  const data = new FormData(form);
  const value = (key: string) => String(data.get(key) ?? "").trim();
  return { name: value("name"), phone: value("phone").replace(/[\s.-]/g, ""), address: value("address"), city: value("city"), email: value("email"), note: value("note") };
}

/** Địa chỉ giao hàng gửi lên hệ thống: số nhà/đường + tỉnh/thành. */
export const shippingAddress = (fields: CheckoutFields): string => [fields.address, fields.city].filter(Boolean).join(", ");
