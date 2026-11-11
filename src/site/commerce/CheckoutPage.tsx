import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useDocumentSeo } from "../../hooks/useDocumentSeo";
import { privatePageMeta } from "../../seo/meta";
import { useShop } from "../../ShopContext";
import { useWebsite } from "../../WebsiteContext";
import { createCheckoutOrder } from "../../services/storeApi";
import { trackEvent, trackPurchaseOnce } from "../../analytics";
import { cartAnalyticsItems, ecommerceParams, purchaseAnalyticsParams } from "../../analyticsItems";
import { CommerceIcon } from "../icons";
import { fmt } from "../format";
import { useSiteCart } from "./useSiteCart";
import type { CartView } from "./useSiteCart";
import { orderRequestText, readCheckoutFields, shippingAddress, shippingFor } from "./checkoutOrder";
import { OrderSuccess } from "./OrderSuccess";
import type { PlacedOrder } from "./OrderSuccess";

function CheckoutSummary({ lines, subtotal, shipping }: { lines: CartView[]; subtotal: number; shipping: number }) {
  return (
    <aside className="checkout-summary" aria-labelledby="cj-summary-title">
      <h2 id="cj-summary-title">Trong giỏ của bạn</h2>
      <p className="cj-price-reference">Giá đã gồm món và thiệp trong hộp quà</p>
      <div className="checkout-items">
        {lines.map((item) => (
          <div className="checkout-item" key={item.key}>
            <img src={item.image} alt={item.name} />
            <div><strong>{item.name}</strong><small>{item.weight} · {item.quantity} món</small></div>
            <span>{fmt(item.total)}</span>
          </div>
        ))}
      </div>
      <div className="cart-total-row"><span>Tạm tính</span><strong>{fmt(subtotal)}</strong></div>
      <div className="cart-total-row"><span>Phí giao hàng</span><strong>{shipping ? fmt(shipping) : "Miễn phí"}</strong></div>
      <div className="cart-total-row"><span>Tổng thanh toán</span><strong>{fmt(subtotal + shipping)}</strong></div>
      <p className="cart-shipping-note">Thanh toán khi nhận hàng (COD).</p>
      <div className="checkout-assurance"><CommerceIcon name="gift" size={25} /><p>Một món ăn ngon.<br />Một lời gửi gắm chân thành.</p></div>
    </aside>
  );
}

/** Sao chép danh sách món (giữ từ bản khách duyệt) để khách gửi qua điện thoại/Zalo khi cần. */
function CopyOrderList({ lines, subtotal }: { lines: CartView[]; subtotal: number }) {
  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState(false);
  const [fallback, setFallback] = useState<string | null>(null);
  const fallbackInput = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (fallback === null) return;
    fallbackInput.current?.focus();
    fallbackInput.current?.select();
  }, [fallback]);
  const copy = async () => {
    const text = orderRequestText(lines, subtotal);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setFallback(null);
      setStatus("Đã sao chép danh sách. Bạn có thể dán khi trao đổi với A SỈN.");
    } catch {
      setFallback(text);
      setStatus("Trình duyệt chưa cho phép sao chép tự động. Hãy sao chép nội dung đã được chọn bên dưới.");
    }
  };
  return (
    <>
      <div className="cj-handoff-actions">
        <button type="button" className="btn outline" onClick={() => void copy()} disabled={!lines.length}>
          {copied ? "Đã sao chép danh sách" : "Sao chép danh sách"} <CommerceIcon name="check" />
        </button>
        <a className="btn dark" href="#checkout-form">Điền thông tin nhận hàng <CommerceIcon name="arrow" /></a>
      </div>
      <p className="cj-handoff-note">Đặt hàng không cần tài khoản. A SỈN gọi điện xác nhận đơn trước khi giao.</p>
      <p className="cj-copy-status" role="status" aria-live="polite">{status}</p>
      <div className="cj-copy-fallback" hidden={fallback === null}>
        <label htmlFor="cj-order-copy">Sao chép danh sách bằng tay</label>
        <textarea id="cj-order-copy" ref={fallbackInput} readOnly rows={8} aria-describedby="cj-copy-help" value={fallback ?? ""} />
        <p id="cj-copy-help">Nội dung đã được chọn. Dùng Ctrl+C hoặc thao tác Sao chép trên thiết bị của bạn.</p>
      </div>
    </>
  );
}

/** Trang đặt hàng (renderCheckout): bố cục bản khách duyệt, gửi đơn COD thật qua Supabase. */
export function CheckoutPage() {
  useDocumentSeo((ctx) => privatePageMeta(ctx, "checkout"), []);
  const { cart, products, clearCart } = useShop();
  const { commerce } = useWebsite();
  const { lines, subtotal, hasUnavailable } = useSiteCart();
  const [requestId] = useState(() => crypto.randomUUID());
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);
  const shipping = shippingFor(subtotal, commerce);
  const began = useRef(false);

  useEffect(() => {
    if (began.current || !cart.length) return;
    began.current = true;
    trackEvent("begin_checkout", ecommerceParams(cartAnalyticsItems(cart, products)));
  }, [cart, products]);

  if (placed) return <OrderSuccess order={placed} />;

  if (!lines.length) {
    return (
      <section className="commerce-page wrap">
        <div className="commerce-title"><span className="eyebrow">XEM LẠI LỰA CHỌN</span><h1 className="display">Chọn một chút<br />hương vị trước nhé.</h1></div>
        <a href="/san-pham" className="btn dark">Khám phá đặc sản <CommerceIcon name="arrow" /></a>
      </section>
    );
  }
  if (hasUnavailable) {
    return (
      <section className="commerce-page wrap">
        <div className="commerce-title"><h1 className="display">Xem lại giỏ hàng.</h1><p>Có món đã lưu không còn trong danh mục hiện tại. Hãy xóa món đó để tiếp tục.</p></div>
        <a href="/gio-hang" className="btn dark">Về giỏ hàng <CommerceIcon name="arrow" /></a>
      </section>
    );
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity() || sending) return;
    const fields = readCheckoutFields(form);
    setSending(true);
    setError("");
    try {
      const order = await createCheckoutOrder({ name: fields.name, phone: fields.phone, address: shippingAddress(fields), email: fields.email, note: fields.note }, cart, requestId);
      const purchase = purchaseAnalyticsParams(cartAnalyticsItems(cart, products), order.totalAmountVnd, shipping);
      if (purchase) trackPurchaseOnce(order.orderId, purchase);
      setPlaced({ number: order.orderNumber, total: order.totalAmountVnd, customer: fields, items: lines });
      clearCart();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (caught) {
      setError(caught instanceof Error && caught.message ? `Chưa ghi nhận được đơn: ${caught.message}` : "Chưa ghi nhận được đơn. Vui lòng thử lại.");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="commerce-page commerce-checkout-journey wrap">
      <div className="commerce-title">
        <a href="/gio-hang" className="commerce-text-link">← Giỏ hàng</a>
        <h1 className="display">Xem lại lựa chọn.</h1>
        <p className="cj-title-copy">Giữ những món bạn thích, điền thông tin nhận hàng và A SỈN sẽ xác nhận đơn với bạn.</p>
      </div>
      <div className="checkout-grid">
        <CheckoutSummary lines={lines} subtotal={subtotal} shipping={shipping} />
        <div className="cj-main">
          <section className="cj-handoff" aria-labelledby="cj-handoff-title">
            <span className="eyebrow">BƯỚC TIẾP THEO CỦA BẠN</span>
            <h2 id="cj-handoff-title">Đặt hàng cùng A SỈN.</h2>
            <p>Xem lại các món ở phần tóm tắt, điền thông tin người nhận rồi gửi đơn. Bạn thanh toán khi nhận hàng.</p>
            <ol className="cj-steps" aria-label="Các bước đặt hàng">
              <li><span>01</span><strong>Xem lại món</strong></li>
              <li><span>02</span><strong>Điền thông tin</strong></li>
              <li><span>03</span><strong>A SỈN xác nhận</strong></li>
            </ol>
            <CopyOrderList lines={lines} subtotal={subtotal} />
          </section>
          <details className="cj-demo" open>
            <summary>Thông tin nhận hàng <span aria-hidden="true">+</span></summary>
            <div className="cj-demo-intro"><p>Thông tin chỉ dùng để xác nhận và giao đơn của bạn.</p></div>
            <form id="checkout-form" className="checkout-form" onSubmit={(event) => void submit(event)}>
              <span className="eyebrow">01 / THÔNG TIN NGƯỜI NHẬN</span>
              <div className="form-field"><label htmlFor="order-name">Họ và tên</label><input id="order-name" name="name" autoComplete="name" placeholder="Tên người nhận" required minLength={2} maxLength={80} pattern=".*\S.*" /></div>
              <div className="form-field"><label htmlFor="order-phone">Số điện thoại</label><input id="order-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0901234567" required pattern="(0[0-9]{9}|\+84[0-9]{9})" maxLength={12} title="Nhập số Việt Nam gồm 10 chữ số bắt đầu bằng 0, hoặc +84 và 9 chữ số." /></div>
              <div className="form-field"><label htmlFor="order-address">Địa chỉ nhận hàng</label><input id="order-address" name="address" autoComplete="street-address" placeholder="Số nhà, đường, phường/xã" required minLength={6} maxLength={200} /></div>
              <div className="form-field"><label htmlFor="order-city">Tỉnh / thành phố</label><input id="order-city" name="city" autoComplete="address-level1" placeholder="Tỉnh / thành phố" required maxLength={80} /></div>
              <div className="form-field"><label htmlFor="order-email">Email <span>(không bắt buộc)</span></label><input id="order-email" name="email" type="email" autoComplete="email" placeholder="Email nhận xác nhận đơn" maxLength={254} /></div>
              <div className="form-field"><label htmlFor="order-note">Lời nhắn thêm <span>(không bắt buộc)</span></label><textarea id="order-note" name="note" rows={3} maxLength={300} placeholder="Thời gian nhận, một lời dặn cho món quà của bạn..." /></div>
              <div className="checkout-method">
                <span className="eyebrow">02 / THANH TOÁN</span>
                <p>Thanh toán khi nhận hàng (COD). Phí giao hàng: {shipping ? fmt(shipping) : "miễn phí"}. Tổng thanh toán {fmt(subtotal + shipping)}.</p>
              </div>
              <button className="btn dark" type="submit" disabled={sending}>{sending ? "Đang gửi đơn…" : "Đặt hàng"} <CommerceIcon name="arrow" /></button>
              <p className="commerce-prototype-note">Không cần tài khoản. A SỈN gọi điện xác nhận trước khi giao.</p>
              <p className="cj-demo-status" role="alert">{error}</p>
            </form>
          </details>
        </div>
      </div>
    </section>
  );
}
