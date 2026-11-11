import { CommerceIcon } from "../icons";
import { fmt } from "../format";
import { MAX_LINE_QUANTITY, useSiteCart } from "./useSiteCart";
import type { CartView } from "./useSiteCart";

/** Các dòng giỏ hàng (lineItems của commerce.js), dùng chung cho ngăn kéo và trang giỏ. */
export function CartLines({ lines }: { lines: CartView[] }) {
  const { setQuantity, remove } = useSiteCart();
  return (
    <>
      {lines.map((item) => (
        <article className="cart-line" key={item.key}>
          <a className="cart-line-image" href={item.href}><img src={item.image} alt={item.name} loading="lazy" /></a>
          <div className="cart-line-info">
            <div className="cart-line-top">
              <a href={item.href}>{item.name}</a>
              <button type="button" className="icon-button cart-remove" aria-label={`Xóa ${item.name}`} onClick={() => remove(item.key)}>
                <CommerceIcon name="close" size={16} />
              </button>
            </div>
            <small>{item.weight}</small>
            {item.isGift && <small className="cart-gift-note">{item.giftItems.join(" · ")}</small>}
            <div className="cart-line-bottom">
              <div className="qty-control">
                <button type="button" aria-label={`Giảm số lượng ${item.name}`} onClick={() => setQuantity(item.key, item.quantity - 1)}>
                  <CommerceIcon name="minus" size={14} />
                </button>
                <span>{item.quantity}</span>
                <button type="button" aria-label={`Tăng số lượng ${item.name}`} disabled={item.quantity >= MAX_LINE_QUANTITY} onClick={() => setQuantity(item.key, item.quantity + 1)}>
                  <CommerceIcon name="plus" size={14} />
                </button>
              </div>
              <strong>{fmt(item.total)}</strong>
            </div>
            {item.isUnavailable && <p className="cart-line-status">Món không còn trong danh mục hiện tại. Hãy xóa để tiếp tục.</p>}
          </div>
        </article>
      ))}
    </>
  );
}

/** Tạm tính + nút xem lại (cartSummary). `onNavigate` đóng ngăn kéo khi chuyển trang. */
export function CartSummary({ withAction = true, onNavigate }: { withAction?: boolean; onNavigate?: () => void }) {
  const { subtotal, hasUnavailable } = useSiteCart();
  return (
    <>
      <div className="cart-total-row"><span>Tạm tính</span><strong>{fmt(subtotal)}</strong></div>
      <p className="cart-shipping-note">Phí giao hàng được tính ở bước đặt hàng.</p>
      {withAction && (hasUnavailable
        ? <p className="cart-line-status">Hãy xóa món không còn trong danh mục để tiếp tục.</p>
        : <a className="btn dark cart-checkout" href="/thanh-toan" onClick={onNavigate}>Đặt hàng <CommerceIcon name="arrow" /></a>)}
    </>
  );
}

/** Nội dung giỏ: danh sách + tóm tắt, hoặc trạng thái trống (cartContent). */
export function CartContent({ onNavigate }: { onNavigate?: () => void }) {
  const { lines } = useSiteCart();
  if (!lines.length) {
    return (
      <div className="cart-empty">
        <CommerceIcon name="bag" size={48} />
        <h3>Giỏ còn trống.<br />Hương vị đang chờ.</h3>
        <p>Chọn một món từ núi rừng để bắt đầu câu chuyện của bạn.</p>
        <a className="btn dark" href="/san-pham" onClick={onNavigate}>Khám phá đặc sản <CommerceIcon name="arrow" /></a>
      </div>
    );
  }
  return (
    <>
      <div className="cart-lines"><CartLines lines={lines} /></div>
      <div className="cart-drawer-summary">
        <CartSummary onNavigate={onNavigate} />
        <a className="commerce-text-link cart-view-link" href="/gio-hang" onClick={onNavigate}>Mở giỏ hàng đầy đủ <CommerceIcon name="arrow" size={14} /></a>
      </div>
    </>
  );
}
