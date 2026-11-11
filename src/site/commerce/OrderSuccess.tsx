import { CommerceIcon } from "../icons";
import { fmt } from "../format";
import type { CartView } from "./useSiteCart";
import type { CheckoutFields } from "./checkoutOrder";

export type PlacedOrder = { number: string; total: number; customer: CheckoutFields; items: CartView[] };

/** Tải thông tin đơn dạng JSON để khách lưu lại. */
function downloadOrder(order: PlacedOrder) {
  const summary = {
    orderNumber: order.number,
    total: order.total,
    payment: "COD — thanh toán khi nhận hàng",
    customer: order.customer,
    items: order.items.map((item) => ({ name: item.name, quantity: item.quantity, total: item.total, giftItems: item.giftItems })),
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(summary, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `a-sin-don-${order.number}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Màn hình đặt hàng thành công (order-success của bản khách duyệt). */
export function OrderSuccess({ order }: { order: PlacedOrder }) {
  return (
    <section className="order-success wrap">
      <div className="order-success-icon"><CommerceIcon name="check" size={36} /></div>
      <span className="eyebrow">ĐÃ NHẬN ĐƠN HÀNG</span>
      <h1 className="display">Cảm ơn một lời<br />hẹn với Tây Bắc.</h1>
      <p>Đơn hàng <strong>{order.number}</strong> đã được ghi nhận. A SỈN sẽ gọi điện xác nhận trước khi giao.</p>
      <div className="order-demo-notice">Thanh toán khi nhận hàng (COD).<br />Tổng thanh toán: {fmt(order.total)}</div>
      <a href="/san-pham" className="btn dark">Tiếp tục khám phá <CommerceIcon name="arrow" /></a>
      <button type="button" className="commerce-text-link" onClick={() => downloadOrder(order)}>Tải thông tin đơn ↓</button>
    </section>
  );
}
