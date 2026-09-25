import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Download,
  Facebook,
  Gift,
  Heart,
  Instagram,
  Leaf,
  Menu,
  Minus,
  Mountain,
  Plus,
  Search,
  ShoppingBag,
  User,
  X,
  Youtube,
} from "lucide-react";
import { colors, linePrice, money } from "./catalog";
import type { CartLine, Product } from "./catalog";
import { CatalogProvider } from "./CatalogContext";
import { ShopProvider, useShop } from "./ShopContext";
import Customizer from "./Customizer";
import GiftPreview from "./GiftPreview";
import AdminPage from "./admin/AdminPage";
import {
  AboutPage,
  NewsDetailPage,
  NewsPage,
  ProductsPage,
} from "./CommercePages";
import Home from "./Home";
import { createCheckoutOrder } from "./services/storeApi";

function TikTokIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743 2.896 2.896 0 0 1 2.31-4.636c.314 0 .618.05.903.142V9.432a6.34 6.34 0 0 0-.903-.065 6.341 6.341 0 0 0-6.34 6.34 6.341 6.341 0 0 0 10.774 4.545c1.61-1.396 2.05-3.69 1.905-5.753a8.167 8.167 0 0 0 4.767 1.503V12.55a4.78 4.78 0 0 1-1-.17 4.836 4.836 0 0 1-1.93-1.04 4.76 4.76 0 0 1-1.065-1.579 4.778 4.778 0 0 1-.345-1.925l.006-.05V6.686z" />
    </svg>
  );
}

function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link
      to="/"
      className={`moc-logo ${light ? "logo-light" : ""}`}
      aria-label="mộc. — Tinh hoa núi rừng Tây Bắc"
    >
      <div className="moc-logo-icon">
        <svg
          viewBox="0 0 46 26"
          width="36"
          height="22"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M2 24L15 4L26 20L31 12L44 24H2Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M15 4L19 12M31 12L36 19"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="moc-logo-text">
        <span className="moc-logo-brand">
          mộc<span className="moc-logo-dot">.</span>
        </span>
        <span className="moc-logo-sub">TÂY BẮC THUẦN KHIẾT</span>
      </div>
    </Link>
  );
}



function Modal({
  title,
  children,
  onClose,
  className = "",
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const element = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    element?.showModal();
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = oldOverflow;
      previous?.focus();
    };
  }, []);
  return createPortal(
    <dialog
      ref={ref}
      className={`modal ${className}`}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onCloseRef.current();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-inner">
        <div className="modal-heading">
          <h2>{title}</h2>
          <button className="icon-button" aria-label="Đóng" onClick={onClose}>
            <X size={21} />
          </button>
        </div>
        {children}
      </div>
    </dialog>,
    document.body,
  );
}

function Header() {
  const { cart, setCartOpen, favoriteIds } = useShop();
  const [searchOpen, setSearchOpen] = useState(false);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  const isHome = location.pathname === "/";

  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isTransparent = isHome && !scrolled;
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <header className={`moc-header ${isTransparent ? "moc-header-transparent" : "moc-header-solid"}`}>
        <div className="moc-header-inner">
          <Logo light={isTransparent} />

          <nav className="moc-nav" aria-label="Điều hướng chính">
            <Link
              to="/san-pham"
              className={`moc-nav-link ${location.pathname === "/san-pham" ? "active" : ""}`}
            >
              Sản phẩm
            </Link>
            <Link
              to="/gioi-thieu"
              className={`moc-nav-link ${location.pathname === "/gioi-thieu" ? "active" : ""}`}
            >
              Về Mộc
            </Link>
            <a href="/#cau-chuyen" className="moc-nav-link">
              Câu chuyện
            </a>
            <Link
              to="/tin-tuc"
              className={`moc-nav-link ${location.pathname === "/tin-tuc" ? "active" : ""}`}
            >
              Tạp chí
            </Link>
            <a href="/#lien-he" className="moc-nav-link">
              Liên hệ
            </a>
          </nav>

          <div className="moc-header-actions">
            <button
              className="moc-action-btn"
              aria-label="Tìm sản phẩm"
              onClick={() => setSearchOpen(true)}
            >
              <Search size={19} />
            </button>
            <button
              className="moc-action-btn"
              aria-label="Tài khoản & yêu thích"
              onClick={() => setFavoritesOpen(true)}
            >
              <User size={19} />
              {favoriteIds.length > 0 && (
                <span className="moc-cart-count-badge" style={{ background: "#c04d3c" }}>
                  {favoriteIds.length}
                </span>
              )}
            </button>
            <button
              className="moc-action-btn moc-cart-icon-btn"
              aria-label={`Giỏ hàng (${count})`}
              onClick={() => setCartOpen(true)}
            >
              <ShoppingBag size={19} />
              <span className="moc-cart-count-badge">{count}</span>
            </button>
            <button
              className="moc-pill-cart-btn"
              onClick={() => setCartOpen(true)}
            >
              <span>Giỏ hàng</span>
              <ArrowRight size={14} />
            </button>
            <button
              className="moc-action-btn moc-menu-toggle"
              aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="mobile-nav" aria-label="Điều hướng điện thoại">
            <Link to="/san-pham">
              Sản phẩm <ArrowRight size={16} />
            </Link>
            <Link to="/gioi-thieu">
              Về Mộc <Mountain size={16} />
            </Link>
            <a href="/#cau-chuyen">
              Câu chuyện <ArrowRight size={16} />
            </a>
            <Link to="/tin-tuc">
              Tạp chí <ArrowRight size={16} />
            </Link>
            <a href="/#lien-he">
              Liên hệ <ArrowRight size={16} />
            </a>
            <Link to="/thiet-ke">
              Tự thiết kế quà <Gift size={16} />
            </Link>
            <button
              onClick={() => {
                setMenuOpen(false);
                setFavoritesOpen(true);
              }}
            >
              Yêu thích ({favoriteIds.length}) <Heart size={16} />
            </button>
          </nav>
        )}
      </header>
      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}
      {favoritesOpen && (
        <SearchModal favorites onClose={() => setFavoritesOpen(false)} />
      )}
    </>
  );
}

function SearchModal({
  onClose,
  favorites = false,
}: {
  onClose: () => void;
  favorites?: boolean;
}) {
  const [query, setQuery] = useState("");
  const { products, setSelectedProduct, favoriteIds } = useShop();
  const normalize = (text: string) =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .toLowerCase();
  const result = products.filter(
    (p) =>
      (!favorites || favoriteIds.includes(p.id)) &&
      normalize(`${p.name} ${p.category} ${p.origin}`).includes(
        normalize(query),
      ),
  );
  return (
    <Modal
      title={
        favorites ? "Những điều bạn thương" : "Bạn đang tìm chút hương vị nào?"
      }
      onClose={onClose}
      className="search-modal"
    >
      <div className="search-input">
        <Search size={20} />
        <input
          autoFocus
          aria-label="Từ khóa tìm kiếm"
          placeholder="Tìm trà, mật ong, gia vị…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button aria-label="Xóa từ khóa" onClick={() => setQuery("")}>
            <X size={17} />
          </button>
        )}
      </div>
      <p className="search-caption">
        {favorites
          ? "Sản vật đã lưu"
          : query
            ? "Kết quả tìm kiếm"
            : "Một vài gợi ý từ A Sỉn"}{" "}
        · {result.length}
      </p>
      <div className="search-results">
        {result.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              onClose();
              setSelectedProduct(p);
            }}
          >
            <img src={p.image} alt="" />
            <span>
              <strong>{p.name}</strong>
              <small>
                {p.weight} · {p.origin}
              </small>
            </span>
            <b>{money(p.price)}</b>
            <ChevronRight size={18} />
          </button>
        ))}
        {!result.length && (
          <div className="empty-state">
            <Leaf size={32} />
            <h3>
              {favorites && !query
                ? "Chưa có sản vật yêu thích"
                : "Chưa tìm thấy sản vật này"}
            </h3>
            <p>
              {favorites && !query
                ? "Chạm vào trái tim trên sản phẩm để lưu vào đây."
                : "Thử tìm “trà”, “mật ong” hoặc một hương vị khác nhé."}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}

function ProductModal() {
  const { selectedProduct: p, setSelectedProduct, addProduct } = useShop();
  const [quantity, setQuantity] = useState(1);
  if (!p) return null;
  return (
    <Modal
      title="Một chút tinh hoa núi rừng"
      onClose={() => setSelectedProduct(null)}
      className="product-modal"
    >
      <div className="product-detail">
        <img src={p.image} alt={p.name} />
        <div>
          <span className="eyebrow">
            {p.origin} · {p.weight}
          </span>
          <h2>{p.name}</h2>
          <p>{p.description}</p>
          <strong className="detail-price">{money(p.price)}</strong>
          <div className="detail-actions">
            <Quantity value={quantity} onChange={setQuantity} minimum={1} />
            <button
              className="button button-green"
              onClick={() => {
                addProduct(p.id, quantity);
                setSelectedProduct(null);
              }}
            >
              <ShoppingBag size={17} /> Thêm vào giỏ
            </button>
          </div>
          <Link
            className="text-link"
            to="/thiet-ke"
            onClick={() => setSelectedProduct(null)}
          >
            Gói thành quà tặng <Gift size={16} />
          </Link>
          <small className="demo-note">
            Thông tin và giá sản phẩm được cập nhật từ cửa hàng.
          </small>
        </div>
      </div>
    </Modal>
  );
}

function Quantity({
  value,
  onChange,
  minimum = 0,
}: {
  value: number;
  onChange: (value: number) => void;
  minimum?: number;
}) {
  return (
    <div className="quantity-control">
      <button
        aria-label="Giảm số lượng"
        disabled={value <= minimum}
        onClick={() => onChange(value - 1)}
      >
        <Minus size={14} />
      </button>
      <span aria-label={`Số lượng ${value}`}>{value}</span>
      <button
        aria-label="Tăng số lượng"
        disabled={value >= 20}
        onClick={() => onChange(value + 1)}
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

function lineName(line: CartLine, list: Product[]) {
  return line.design
    ? `Hộp quà gửi ${line.design.recipient || "người thương"}`
    : (list.find((p) => p.id === line.productId)?.name ?? "Sản vật");
}

type DemoOrder = {
  type: string;
  orderCode: string;
  createdAt: string;
  customer: { name: string; phone: string; address: string };
  items: Array<{ name: string; quantity: number; unitPrice: number; design?: CartLine["design"] }>;
  subtotal: number;
  shipping: string;
  currency: string;
  payment?: string;
};

function PaymentQR({
  order,
  onBack,
  onComplete,
}: {
  order: DemoOrder;
  onBack: () => void;
  onComplete: () => Promise<void>;
}) {
  const qrValue = `MOC-TAY-BAC-DEMO|${order.orderCode}|${order.subtotal}|QR-DEMO-ONLY`;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const complete = async () => {
    setSaving(true);
    setError("");
    try {
      await onComplete();
    } catch {
      setError("Chưa thể tạo đơn trong hệ thống. Vui lòng thử lại sau.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="payment-qr">
      <button className="back-link" onClick={onBack}>
        <ArrowLeft size={15} /> Sửa thông tin đơn
      </button>
      <div className="qr-demo-badge">THANH TOÁN QR · BẢN DEMO</div>
      <h3>Quét mã để thanh toán</h3>
      <p className="payment-caption">
        Mã này chỉ chứa dữ liệu mô phỏng. Không liên kết ngân hàng, ví điện tử
        hay phát sinh giao dịch thật.
      </p>
      <div className="qr-frame">
        <QRCodeSVG value={qrValue} size={190} level="M" includeMargin />
      </div>
      <div className="payment-reference">
        <span>Mã đơn mẫu</span><b>{order.orderCode}</b>
        <span>Số tiền minh họa</span><strong>{money(order.subtotal)}</strong>
      </div>
      <div className="demo-payment-methods">
        <span className="active">VietQR demo</span><span>Ví A Sỉn demo</span><span>Ngân hàng demo</span>
      </div>
      <button className="button button-green full-width" onClick={complete} disabled={saving}>
        <CheckCircle2 size={18} /> {saving ? "Đang ghi nhận…" : "Mô phỏng đã thanh toán"}
      </button>
      {error && <p className="demo-note" role="alert">{error}</p>}
      <p className="demo-note">Trong hệ thống thật, bước này phải chờ webhook xác thực từ đối tác thanh toán.</p>
    </div>
  );
}

function Cart() {
  const { cart, setQuantity, setCartOpen, clearCart, products } = useShop();
  const [checkout, setCheckout] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState<DemoOrder | null>(null);
  const [order, setOrder] = useState<DemoOrder | null>(null);
  const total = cart.reduce(
    (sum, item) => sum + linePrice(item, products) * item.quantity,
    0,
  );
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setPaymentOrder({
      type: "ĐƠN MẪU — CHƯA GỬI ĐẾN CỬA HÀNG",
      orderCode: `MOCTB-DEMO-${String(Date.now()).slice(-6)}`,
      createdAt: new Date().toISOString(),
      customer: {
        name: String(data.get("name")).trim(),
        phone: String(data.get("phone")).trim(),
        address: String(data.get("address")).trim(),
      },
      items: cart.map((line) => ({
        name: lineName(line, products),
        quantity: line.quantity,
        unitPrice: linePrice(line, products),
        design: line.design,
      })),
      subtotal: total,
      shipping: "Chưa xác định",
      currency: "VND",
    });
  };
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(order, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "moc-don-hang-mau.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <Modal
      title={order ? "Thanh toán mô phỏng hoàn tất" : paymentOrder ? "Thanh toán QR" : checkout ? "Thông tin nhận quà" : "Giỏ quà của bạn"}
      onClose={() => { setCartOpen(false); setCheckout(false); setPaymentOrder(null); }}
      className="cart-drawer"
    >
      {order ? (
        <div className="order-success">
          <CheckCircle2 size={49} strokeWidth={1.3} />
          <h3>Đơn hàng đã được ghi nhận.</h3>
          <p>
            Đơn đang chờ xác thực thanh toán QR. Hệ thống chỉ chuyển sang đã
            thanh toán sau khi nhận webhook hợp lệ từ đối tác.
          </p>
          <div className="order-total">
            <span>Tổng tiền sản phẩm</span>
            <b>{money(order.subtotal)}</b>
          </div>
          <p className="demo-note">Bạn có thể tải thông tin đơn để lưu lại. Phí giao hàng chưa được tính.</p>
          <button className="button button-green" onClick={download}>
            <Download size={18} /> Tải thông tin đơn mẫu
          </button>
          <button className="text-link" onClick={() => setCartOpen(false)}>
            Tiếp tục khám phá <ArrowRight size={17} />
          </button>
        </div>
      ) : paymentOrder ? (
        <PaymentQR
          order={paymentOrder}
          onBack={() => { setPaymentOrder(null); setCheckout(true); }}
          onComplete={async () => {
            const persisted = await createCheckoutOrder(paymentOrder.customer, cart);
            setOrder({
              ...paymentOrder,
              orderCode: persisted.orderNumber,
              subtotal: persisted.totalAmountVnd,
              payment: "QR đang chờ webhook xác thực",
            });
            setPaymentOrder(null);
            clearCart();
          }}
        />
      ) : !cart.length ? (
        <div className="empty-state cart-empty">
          <ShoppingBag size={44} strokeWidth={1.2} />
          <h3>Giỏ quà đang chờ bạn.</h3>
          <p>Thêm một chút hương rừng, một chút tâm tình.</p>
          <Link
            to="/san-pham"
            className="button button-green"
            onClick={() => setCartOpen(false)}
          >
            Khám phá sản vật <ArrowRight size={17} />
          </Link>
        </div>
      ) : (
        <>
          {checkout ? (
            <form onSubmit={submit} className="checkout-form">
              <button
                type="button"
                className="back-link"
                onClick={() => setCheckout(false)}
              >
                <ArrowLeft size={15} /> Trở lại giỏ quà
              </button>
              <p className="checkout-notice">
                Bạn đang tạo đơn mẫu trên thiết bị này. Sau bước này, bạn có thể trải nghiệm thanh toán bằng mã QR giả lập.
              </p>
              <label className="field-label" htmlFor="customer-name">
                Họ và tên
              </label>
              <input
                id="customer-name"
                name="name"
                autoComplete="name"
                required
                minLength={2}
                maxLength={80}
                pattern=".*\S.*"
                placeholder="Tên của bạn"
              />
              <label className="field-label" htmlFor="customer-phone">
                Số điện thoại
              </label>
              <input
                id="customer-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                required
                pattern="(0[0-9]{9}|\+84[0-9]{9})"
                title="Nhập số Việt Nam gồm 10 chữ số bắt đầu bằng 0, hoặc +84 và 9 chữ số."
                placeholder="0901234567"
              />
              <label className="field-label" htmlFor="customer-address">
                Địa chỉ nhận quà
              </label>
              <textarea
                id="customer-address"
                name="address"
                autoComplete="street-address"
                required
                minLength={10}
                maxLength={300}
                rows={3}
                placeholder="Số nhà, đường, phường/xã, tỉnh/thành phố"
              />
              <div className="cart-total">
                <span>Tạm tính</span>
                <strong>{money(total)}</strong>
              </div>
              <p className="demo-note">
                Phí giao hàng chưa được tính. QR ở bước sau là mô phỏng, không phải thanh toán trực tuyến thật.
              </p>
              <button className="button button-green full-width" type="submit">
                Tiếp tục đến mã QR <ArrowRight size={18} />
              </button>
            </form>
          ) : (
            <>
              <p className="cart-subtitle">
                Những món quà nhỏ, đong đầy điều thương.
              </p>
              <div className="cart-lines">
                {cart.map((item) => {
                  const p = products.find((p) => p.id === item.productId);
                  return (
                    <article className="cart-line" key={item.key}>
                      <div className="cart-thumbnail">
                        {item.design ? (
                          <GiftPreview design={item.design} products={products} compact />
                        ) : (
                          <img src={p!.image} alt={p!.name} />
                        )}
                      </div>
                      <div className="cart-line-info">
                        <h3>{lineName(item, products)}</h3>
                        {item.design ? (
                          <>
                            <small>
                              {item.design.productIds.length} sản vật ·{" "}
                              {
                                colors.find(
                                  (c) => c.value === item.design!.color,
                                )?.name
                              }{" "}
                              · {item.design.pattern}
                            </small>
                            <span className="cart-gift-note">
                              “{item.design.message}”
                            </span>
                          </>
                        ) : (
                          <small>{p!.weight}</small>
                        )}
                        <b>{money(linePrice(item, products))}</b>
                        <Quantity
                          value={item.quantity}
                          onChange={(quantity) =>
                            setQuantity(item.key, quantity)
                          }
                        />
                      </div>
                      <button
                        className="remove-line"
                        aria-label={`Xóa ${lineName(item, products)}`}
                        onClick={() => setQuantity(item.key, 0)}
                      >
                        <X size={15} />
                      </button>
                    </article>
                  );
                })}
              </div>
              <div className="cart-summary">
                <div className="cart-total">
                  <span>Tạm tính</span>
                  <strong>{money(total)}</strong>
                </div>
                <p className="demo-note">
                  Chưa gồm phí giao hàng.
                </p>
                <button
                  className="button button-green full-width"
                  onClick={() => setCheckout(true)}
                >
                  Tiếp tục đặt hàng <ArrowRight size={18} />
                </button>
                <p className="checkout-demo">
                  <Check size={13} /> Bản trải nghiệm · có luồng QR thanh toán giả lập
                </p>
              </div>
            </>
          )}
        </>
      )}
    </Modal>
  );
}

function Footer() {
  const [faqOpen, setFaqOpen] = useState(false);

  return (
    <>
      <footer className="moc-footer">
        <div className="moc-container">
          <div className="moc-footer-grid">
            {/* Col 1: Brand & Slogan */}
            <div className="moc-footer-col moc-footer-brand-col">
              <Logo light />
              <span className="moc-footer-slogan">
                Từ núi rừng<br />đến cuộc sống an lành.
              </span>
            </div>

            {/* Col 2: Về Mộc */}
            <div className="moc-footer-col">
              <h4>Về Mộc</h4>
              <ul>
                <li><Link to="/gioi-thieu">Câu chuyện thương hiệu</Link></li>
                <li><Link to="/gioi-thieu">Hành trình phát triển</Link></li>
                <li><Link to="/gioi-thieu">Con người Mộc</Link></li>
                <li><Link to="/gioi-thieu">Giá trị bền vững</Link></li>
              </ul>
            </div>

            {/* Col 3: Sản phẩm */}
            <div className="moc-footer-col">
              <h4>Sản phẩm</h4>
              <ul>
                <li><Link to="/san-pham">Trà</Link></li>
                <li><Link to="/san-pham">Mật ong</Link></li>
                <li><Link to="/san-pham">Gia vị núi rừng</Link></li>
                <li><Link to="/thiet-ke">Bộ quà tặng</Link></li>
              </ul>
            </div>

            {/* Col 4: Hỗ trợ */}
            <div className="moc-footer-col">
              <h4>Hỗ trợ</h4>
              <ul>
                <li><button onClick={() => setFaqOpen(true)} style={{ color: "inherit", padding: 0, textAlign: "left", background: "none", border: "none", cursor: "pointer", font: "inherit" }}>Chính sách vận chuyển</button></li>
                <li><button onClick={() => setFaqOpen(true)} style={{ color: "inherit", padding: 0, textAlign: "left", background: "none", border: "none", cursor: "pointer", font: "inherit" }}>Chính sách đổi trả</button></li>
                <li><button onClick={() => setFaqOpen(true)} style={{ color: "inherit", padding: 0, textAlign: "left", background: "none", border: "none", cursor: "pointer", font: "inherit" }}>Hướng dẫn mua hàng</button></li>
                <li><a href="/#lien-he">Liên hệ</a></li>
              </ul>
            </div>

            {/* Col 5: Kết nối với Mộc */}
            <div className="moc-footer-col moc-footer-social-col">
              <h4>Kết nối với Mộc</h4>
              <div className="moc-social-links">
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="moc-social-btn" aria-label="Facebook">
                  <Facebook size={16} />
                </a>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="moc-social-btn" aria-label="Instagram">
                  <Instagram size={16} />
                </a>
                <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="moc-social-btn" aria-label="YouTube">
                  <Youtube size={16} />
                </a>
                <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className="moc-social-btn" aria-label="TikTok">
                  <TikTokIcon size={16} />
                </a>
              </div>
              <span className="moc-footer-script-tag">
                Những giá trị thật đẹp<br />vẫn còn tiếp nối...
              </span>
            </div>
          </div>

          <div className="moc-footer-bottom">
            <span>© 2024 Mộc. Tinh hoa núi rừng Việt Nam.</span>
            <div className="moc-footer-bottom-right">
              <svg viewBox="0 0 46 26" width="28" height="18" fill="none" className="moc-footer-mountain-icon">
                <path d="M2 24L15 4L26 20L31 12L44 24H2Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M15 4L19 12M31 12L36 19" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>THIẾT KẾ TỪ TÌNH YÊU TÂY BẮC.</span>
            </div>
          </div>
        </div>
      </footer>
      {faqOpen && (
        <Modal title="A Sỉn giải đáp" onClose={() => setFaqOpen(false)}>
          <div className="faq-list">
            <details open>
              <summary>Tôi có thể tự thiết kế những gì?</summary>
              <p>
                Bạn có thể chọn 1–4 sản vật, màu hộp, họa tiết, người nhận và
                lời nhắn trên thiệp. Thiết kế được lưu trên trình duyệt bạn đang
                dùng.
              </p>
            </details>
            <details>
              <summary>Đơn hàng đã được gửi đi chưa?</summary>
              <p>
                Đây là bản trải nghiệm giao diện. Luồng QR là mô phỏng, không
                kết nối ngân hàng, chưa thu tiền và chưa có dịch vụ giao hàng.
                Bạn có thể tải thông tin đơn mẫu về máy.
              </p>
            </details>
            <details>
              <summary>Hình ảnh và giá có phải dữ liệu thật không?</summary>
              <p>
                Danh mục, giá và ảnh được tạo để minh họa thiết kế. Cửa hàng cần
                cập nhật sản phẩm, ảnh thực tế, chính sách giao hàng và thông
                tin liên hệ trước khi mở bán.
              </p>
            </details>
            <details>
              <summary>Có thể xem sản phẩm bằng 3D không?</summary>
              <p>
                Hộp quà hiện có bản phối 2D tương tác. Mô hình 3D của sản phẩm
                sẽ được bổ sung khi nhà cung cấp bàn giao.
              </p>
            </details>
          </div>
        </Modal>
      )}
    </>
  );
}

function Shell() {
  const location = useLocation();
  const { cartOpen, selectedProduct, notification } = useShop();
  useEffect(() => {
    document.title =
      location.pathname === "/thiet-ke"
        ? "Tự thiết kế hộp quà — Mộc Tây Bắc"
        : location.pathname === "/admin"
          ? "Quản trị — Mộc Tây Bắc"
          : "Mộc Tây Bắc — Tinh hoa núi rừng Việt Nam";
    const id = requestAnimationFrame(() => {
      if (location.hash)
        document
          .getElementById(location.hash.slice(1))
          ?.scrollIntoView({
            behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
              ? "instant"
              : "smooth",
          });
      else window.scrollTo(0, 0);
    });
    return () => cancelAnimationFrame(id);
  }, [location]);
  return (
    <>
      <a className="skip-link" href="#main-content">
        Đến nội dung chính
      </a>
      {location.pathname !== "/admin" && <Header />}
      <div id="main-content" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/san-pham" element={<ProductsPage />} />
          <Route path="/deal-hoi" element={<Navigate to="/#deal-hoi" replace />} />
          <Route path="/gioi-thieu" element={<AboutPage />} />
          <Route path="/tin-tuc" element={<NewsPage />} />
          <Route path="/tin-tuc/:storyId" element={<NewsDetailPage />} />
          <Route path="/lien-he" element={<Navigate to="/#lien-he" replace />} />
          <Route path="/thiet-ke" element={<Customizer />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route
            path="*"
            element={
              <main className="not-found">
                <Mountain size={48} />
                <h1>Hình như bạn đã lạc đường.</h1>
                <p>A Sỉn vẫn ở đây, chờ bạn ghé về.</p>
                <Link to="/" className="button button-green">
                  Về nhà A Sỉn <ArrowRight size={18} />
                </Link>
              </main>
            }
          />
        </Routes>
      </div>
      {location.pathname !== "/admin" && <Footer />}
      {location.pathname !== "/admin" && cartOpen && <Cart />}
      {location.pathname !== "/admin" && selectedProduct && <ProductModal key={selectedProduct.id} />}
      <div
        className={`toast ${notification ? "visible" : ""}`}
        role="status"
        aria-live="polite"
      >
        {notification && (
          <>
            <CheckCircle2 size={18} />
            <span>{notification}</span>
          </>
        )}
      </div>
    </>
  );
}

export default function App() {
  return (
    <CatalogProvider>
      <ShopProvider>
        <Shell />
      </ShopProvider>
    </CatalogProvider>
  );
}
