import { useDocumentSeo } from "../../hooks/useDocumentSeo";
import { privatePageMeta } from "../../seo/meta";
import { useSiteCart } from "./useSiteCart";
import { CartContent, CartLines, CartSummary } from "./CartLines";

/** Trang giỏ hàng đầy đủ (renderCartPage của commerce.js). */
export function CartPage() {
  useDocumentSeo((ctx) => privatePageMeta(ctx, "cart"), []);
  const { lines } = useSiteCart();
  return (
    <section className="commerce-page wrap">
      <div className="commerce-title">
        <span className="eyebrow">TỪ BẾP LỬA ĐẾN NHÀ BẠN</span>
        <h1 className="display">Giỏ hàng của bạn.</h1>
      </div>
      <div id="cart-page-content" className="cart-page-grid">
        {lines.length ? (
          <>
            <div className="cart-page-lines">
              <CartLines lines={lines} />
              <a href="/san-pham" className="commerce-text-link">← Tiếp tục chọn đặc sản</a>
            </div>
            <aside className="cart-page-aside">
              <span className="eyebrow">MỘT CHÚT TÂY BẮC</span>
              <h2>Gói ghém<br />cho bạn.</h2>
              <CartSummary />
              <p className="commerce-prototype-note">Không cần tài khoản · Thanh toán khi nhận hàng.</p>
            </aside>
          </>
        ) : (
          <div className="cart-page-empty"><CartContent /></div>
        )}
      </div>
    </section>
  );
}
