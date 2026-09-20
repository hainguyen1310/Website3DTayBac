import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Box,
  Check,
  CheckCircle2,
  ChevronRight,
  Download,
  Gift,
  Heart,
  Leaf,
  MapPin,
  Menu,
  Minus,
  Mountain,
  PackageCheck,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Sprout,
  X,
} from "lucide-react";
import {
  categories,
  colors,
  defaultDesign,
  linePrice,
  money,
  products,
} from "./catalog";
import type { CartLine, Product } from "./catalog";
import { ShopProvider, useShop } from "./ShopContext";
import Customizer from "./Customizer";
import GiftPreview from "./GiftPreview";

const Scene = lazy(() => import("./Scene"));

function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link
      to="/"
      className={`logo ${light ? "logo-light" : ""}`}
      aria-label="Mộc Tây Bắc — Trang chủ"
    >
      <Mountain size={37} strokeWidth={1.1} />
      <span>
        <b>
          mộc<span className="logo-dot">.</span>
        </b>
        <small>TÂY BẮC</small>
      </span>
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
  const location = useLocation();
  useEffect(() => {
    setMenuOpen(false);
  }, [location]);
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  return (
    <>
      <div className="announcement">
        <span>
          <Leaf size={13} /> Từ bản làng, gửi đến bạn.
        </span>
        <Link to="/thiet-ke">
          Một món quà, ngàn lời thương <ArrowUpRight size={13} />
        </Link>
      </div>
      <header className="site-header">
        <div className="nav-inner">
          <Logo />
          <nav className="desktop-nav" aria-label="Điều hướng chính">
            <Link
              to="/#san-pham"
              className={location.pathname === "/" ? "nav-active" : ""}
            >
              Sản vật Tây Bắc
            </Link>
            <Link to="/#cau-chuyen">Câu chuyện của Mộc</Link>
            <Link
              to="/thiet-ke"
              className={location.pathname === "/thiet-ke" ? "nav-active" : ""}
            >
              Tự thiết kế quà <span className="new-label">MỚI</span>
            </Link>
          </nav>
          <div className="nav-actions">
            <button
              className="icon-button"
              aria-label="Tìm sản phẩm"
              onClick={() => setSearchOpen(true)}
            >
              <Search size={20} />
            </button>
            <button
              className="icon-button favorites-nav"
              aria-label={`Sản phẩm yêu thích (${favoriteIds.length})`}
              onClick={() => setFavoritesOpen(true)}
            >
              <Heart size={20} />
              {favoriteIds.length > 0 && <span className="favorite-dot" />}
            </button>
            <span className="nav-divider" />
            <button
              className="cart-button"
              aria-label={`Giỏ hàng (${count})`}
              onClick={() => setCartOpen(true)}
            >
              <ShoppingBag size={20} />
              <span className="cart-label">Giỏ hàng</span>
              <span className="cart-count">{count}</span>
            </button>
            <button
              className="icon-button mobile-menu"
              aria-label="Mở menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="mobile-nav" aria-label="Điều hướng điện thoại">
            <Link to="/#san-pham">
              Sản vật Tây Bắc <ArrowUpRight size={16} />
            </Link>
            <Link to="/#cau-chuyen">
              Câu chuyện của Mộc <ArrowUpRight size={16} />
            </Link>
            <Link to="/thiet-ke">
              Tự thiết kế quà <Gift size={16} />
            </Link>
            <Link to="/trai-nghiem">
              Trải nghiệm 3D <Box size={16} />
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
  const { setSelectedProduct, favoriteIds } = useShop();
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
            : "Một vài gợi ý từ Mộc"}{" "}
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

function ProductCard({ product }: { product: Product }) {
  const { setSelectedProduct, addProduct, favoriteIds, toggleFavorite } =
    useShop();
  const saved = favoriteIds.includes(product.id);
  return (
    <article className="product-card">
      <div className="product-image-wrap">
        <button
          className="product-image-button"
          onClick={() => setSelectedProduct(product)}
          aria-label={`Xem ${product.name}`}
        >
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            width={800}
            height={800}
          />
        </button>
        <span className="product-tag">{product.tag}</span>
        <button
          className={`favorite-button ${saved ? "is-favorite" : ""}`}
          onClick={() => toggleFavorite(product.id)}
          aria-pressed={saved}
          aria-label={`${saved ? "Bỏ yêu thích" : "Yêu thích"} ${product.name}`}
        >
          <Heart size={17} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="product-origin">
        <span>{product.origin}</span>
        <span>{product.weight}</span>
      </div>
      <button
        className="product-title"
        onClick={() => setSelectedProduct(product)}
      >
        <h3>{product.name}</h3>
      </button>
      <div className="product-bottom">
        <strong>{money(product.price)}</strong>
        <button
          className="add-button"
          onClick={() => addProduct(product.id)}
          aria-label={`Thêm ${product.name} vào giỏ`}
        >
          <Plus size={19} />
        </button>
      </div>
    </article>
  );
}

function Home() {
  const [category, setCategory] = useState(categories[0]);
  const filtered = products.filter(
    (p) => category === categories[0] || p.category === category,
  );
  return (
    <main>
      <section className="hero">
        <img
          className="hero-image"
          src="/images/hero.webp"
          alt="Những triền ruộng bậc thang xanh giữa núi rừng và mây sớm"
          width={1672}
          height={941}
          fetchPriority="high"
        />
        <div className="hero-shade" />
        <div className="hero-content">
          <span className="hero-eyebrow">
            <span /> TINH HOA TỪ MIỀN SƠN CƯỚC
          </span>
          <h1>
            Một chút Tây Bắc,
            <br />
            <em>một trời thương nhớ.</em>
          </h1>
          <p>
            Hương vị của núi rừng. Tấm lòng của người bản.
            <br />
            Những điều mộc mạc, gói ghém thành món quà.
          </p>
          <div className="hero-actions">
            <Link to="/#san-pham" className="button button-cream">
              Khám phá sản vật <ArrowUpRight size={19} />
            </Link>
            <Link to="/thiet-ke" className="button button-glass">
              <Gift size={18} /> Tự tay gói quà
            </Link>
          </div>
        </div>
        <div className="hero-seal">
          <Sprout size={30} strokeWidth={1} />
          <span>
            TỪ ĐẤT LÀNH
            <br />
            ĐẾN TAY BẠN
          </span>
        </div>
        <div className="hero-bottom">
          <span>
            <MapPin size={14} /> CẢM HỨNG TỪ MÙ CANG CHẢI, TÂY BẮC
          </span>
          <Link to="/#san-pham">
            Cuộn để khám phá <ArrowDown size={16} />
          </Link>
        </div>
        <div className="hero-coordinates">21°46′ N &nbsp; 104°07′ E</div>
      </section>
      <div className="values-strip container">
        <div>
          <Leaf size={25} strokeWidth={1.4} />
          <span>
            <b>Trọn vị tự nhiên</b>
            <small>Nâng niu sản vật bản địa</small>
          </span>
        </div>
        <div>
          <Mountain size={27} strokeWidth={1.3} />
          <span>
            <b>Đậm hồn Tây Bắc</b>
            <small>Mỗi sản vật, một câu chuyện</small>
          </span>
        </div>
        <div>
          <Gift size={25} strokeWidth={1.4} />
          <span>
            <b>Quà mang dấu ấn riêng</b>
            <small>Tự thiết kế theo cách của bạn</small>
          </span>
        </div>
        <div>
          <PackageCheck size={26} strokeWidth={1.4} />
          <span>
            <b>Gói bằng sự tận tâm</b>
            <small>Chỉn chu từ điều nhỏ nhất</small>
          </span>
        </div>
      </div>
      <section id="san-pham" className="products-section container">
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              <span className="tiny-diamond" /> TINH HOA ĐƯỢC CHỌN LỌC
            </span>
            <h2>
              Mang một chút <em>Tây Bắc</em> về nhà.
            </h2>
          </div>
          <Link className="text-link" to="/thiet-ke">
            Ghép thành hộp quà <ArrowUpRight size={17} />
          </Link>
        </div>
        <div
          className="category-tabs"
          role="group"
          aria-label="Lọc danh mục sản phẩm"
        >
          {categories.map((c, i) => (
            <button
              key={c}
              className={category === c ? "active" : ""}
              onClick={() => setCategory(c)}
              aria-pressed={category === c}
            >
              {i === 0 && <span className="tab-grid">✦</span>}
              {c}
            </button>
          ))}
        </div>
        <div className="product-grid">
          {filtered.map((p) => (
            <ProductCard product={p} key={p.id} />
          ))}
        </div>
        <div className="catalog-footnote">
          <span className="tiny-diamond" /> Một chút tinh hoa từ những miền đất
          lành <span className="tiny-diamond" />
        </div>
      </section>
      <section className="gift-feature container" id="qua-tang">
        <div className="gift-feature-copy">
          <span className="eyebrow">
            <Sparkles size={14} /> KHÔNG CHỈ LÀ MỘT MÓN QUÀ
          </span>
          <h2>
            Gói hương núi.
            <br />
            <em>Gửi tình mình.</em>
          </h2>
          <p>
            Có những lời thương không cần nói thành lời.
            <br />
            Chọn sản vật, phối sắc màu, viết lời nhắn —<br />
            để mỗi món quà là một phần của bạn.
          </p>
          <div className="mini-steps">
            <span>
              <b>01</b> Chọn sản vật
            </span>
            <i />
            <span>
              <b>02</b> Thêm sắc riêng
            </span>
            <i />
            <span>
              <b>03</b> Gửi lời thương
            </span>
          </div>
          <Link to="/thiet-ke" className="button button-green">
            Thiết kế hộp quà của bạn <ArrowUpRight size={18} />
          </Link>
          <small className="gift-feature-note">
            Một chút sáng tạo. Thật nhiều yêu thương.
          </small>
        </div>
        <div className="gift-feature-visual">
          <span className="handwritten">made with love ♡</span>
          <GiftPreview design={defaultDesign} compact />
          <div className="floating-label">
            <span className="tiny-diamond" /> Mang dấu ấn của riêng bạn
          </div>
          <div className="feature-color-dots">
            {colors.map((c) => (
              <span key={c.value} style={{ background: c.value }} />
            ))}
          </div>
        </div>
      </section>
      <section id="cau-chuyen" className="story-section container">
        <div className="story-visual">
          <img
            src="/images/hero.webp"
            alt="Sắc xanh của núi rừng, cảm hứng của Mộc Tây Bắc"
            loading="lazy"
          />
          <span className="story-image-caption">
            MỘT MIỀN ĐẤT. MUÔN ĐIỀU THƯƠNG.
          </span>
          <div className="story-stamp">
            <Mountain size={29} strokeWidth={1.2} />
            <span>
              MỘC MẠC
              <br />
              TỪ CỘI NGUỒN
            </span>
          </div>
        </div>
        <div className="story-copy">
          <span className="eyebrow">
            <span className="tiny-diamond" /> CÂU CHUYỆN CỦA MỘC
          </span>
          <h2>
            Đi từ những điều
            <br />
            <em>thật mộc.</em>
          </h2>
          <p>
            Chúng tôi yêu những buổi sớm mây ngang lưng núi, chén trà còn ấm và
            căn bếp thơm mùi mắc khén.
          </p>
          <p>
            Mộc bắt đầu từ mong muốn gói ghém những điều bình dị ấy. Để dù ở
            đâu, bạn cũng có thể chạm đến một chút hồn Tây Bắc — qua một hương
            vị, một món quà, một câu chuyện.
          </p>
          <div className="story-signature">
            Từ núi rừng, bằng cả tấm lòng.
            <Leaf size={22} strokeWidth={1.2} />
          </div>
        </div>
      </section>
      <section className="experience-banner container">
        <div className="experience-icon">
          <Box size={30} strokeWidth={1.1} />
        </div>
        <div>
          <span className="eyebrow">MỘT GÓC TRẢI NGHIỆM MỚI</span>
          <h3>Chậm lại một chút. Bước vào không gian 3D.</h3>
          <p>Khám phá cảnh Kage tương tác, được tạo nên bởi ThreeUI.</p>
        </div>
        <Link to="/trai-nghiem" className="text-link">
          Bắt đầu khám phá <ArrowUpRight size={19} />
        </Link>
      </section>
      <section className="closing-section">
        <span className="tiny-diamond" />
        <p>
          Món quà đẹp nhất, là món quà <em>có tâm tình.</em>
        </p>
        <Link to="/thiet-ke">
          Cùng Mộc gói một món quà <ArrowRight size={18} />
        </Link>
      </section>
    </main>
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
            Sản phẩm, hình ảnh và giá minh họa cho bản trải nghiệm.
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

function lineName(line: CartLine) {
  return line.design
    ? `Hộp quà gửi ${line.design.recipient || "người thương"}`
    : products.find((p) => p.id === line.productId)!.name;
}

function Cart() {
  const { cart, setQuantity, setCartOpen } = useShop();
  const [checkout, setCheckout] = useState(false);
  const [order, setOrder] = useState<Record<string, unknown> | null>(null);
  const total = cart.reduce(
    (sum, item) => sum + linePrice(item) * item.quantity,
    0,
  );
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setOrder({
      type: "ĐƠN MẪU — CHƯA GỬI ĐẾN CỬA HÀNG",
      createdAt: new Date().toISOString(),
      customer: {
        name: String(data.get("name")).trim(),
        phone: String(data.get("phone")).trim(),
        address: String(data.get("address")).trim(),
      },
      items: cart.map((line) => ({
        name: lineName(line),
        quantity: line.quantity,
        unitPrice: linePrice(line),
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
      title={
        order
          ? "Món quà đã được gói ghém"
          : checkout
            ? "Thông tin nhận quà"
            : "Giỏ quà của bạn"
      }
      onClose={() => setCartOpen(false)}
      className="cart-drawer"
    >
      {order ? (
        <div className="order-success">
          <CheckCircle2 size={49} strokeWidth={1.3} />
          <h3>Đơn mẫu của bạn đã sẵn sàng.</h3>
          <p>
            Đây là bản trải nghiệm. Đơn chưa được gửi đến cửa hàng và chưa phát
            sinh thanh toán.
          </p>
          <div className="order-total">
            <span>Tổng tiền sản phẩm</span>
            <b>{money(total)}</b>
          </div>
          <p className="demo-note">
            Bạn có thể tải thông tin đơn và thiết kế hộp quà để lưu lại. Phí
            giao hàng chưa được tính.
          </p>
          <button className="button button-green" onClick={download}>
            <Download size={18} /> Tải thông tin đơn mẫu
          </button>
          <button className="text-link" onClick={() => setCartOpen(false)}>
            Tiếp tục khám phá <ArrowRight size={17} />
          </button>
        </div>
      ) : !cart.length ? (
        <div className="empty-state cart-empty">
          <ShoppingBag size={44} strokeWidth={1.2} />
          <h3>Giỏ quà đang chờ bạn.</h3>
          <p>Thêm một chút hương rừng, một chút tâm tình.</p>
          <Link
            to="/#san-pham"
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
                Bạn đang tạo đơn mẫu trên thiết bị này. Thông tin không được gửi
                đến cửa hàng.
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
                Phí giao hàng chưa được tính. Chưa hỗ trợ thanh toán trực tuyến.
              </p>
              <button className="button button-green full-width" type="submit">
                Tạo đơn mẫu <ArrowRight size={18} />
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
                          <GiftPreview design={item.design} compact />
                        ) : (
                          <img src={p!.image} alt={p!.name} />
                        )}
                      </div>
                      <div className="cart-line-info">
                        <h3>{lineName(item)}</h3>
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
                        <b>{money(linePrice(item))}</b>
                        <Quantity
                          value={item.quantity}
                          onChange={(quantity) =>
                            setQuantity(item.key, quantity)
                          }
                        />
                      </div>
                      <button
                        className="remove-line"
                        aria-label={`Xóa ${lineName(item)}`}
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
                  Giá minh họa · Chưa gồm phí giao hàng.
                </p>
                <button
                  className="button button-green full-width"
                  onClick={() => setCheckout(true)}
                >
                  Tiếp tục đặt hàng <ArrowRight size={18} />
                </button>
                <p className="checkout-demo">
                  <Check size={13} /> Bản trải nghiệm, chưa phát sinh thanh toán
                </p>
              </div>
            </>
          )}
        </>
      )}
    </Modal>
  );
}

function Experience() {
  return (
    <main className="experience-page">
      <div className="experience-toolbar">
        <Link to="/" className="back-link">
          <ArrowLeft size={17} /> Về nhà Mộc
        </Link>
        <span>
          <Box size={16} /> Kage · Trải nghiệm ThreeUI nguyên bản
        </span>
        <Link to="/thiet-ke">
          Thiết kế quà <ArrowUpRight size={16} />
        </Link>
      </div>
      <Suspense
        fallback={
          <div className="scene-loading">
            <Mountain size={38} strokeWidth={1} />
            <p>Đang mở một không gian tĩnh lặng…</p>
          </div>
        }
      >
        <Scene />
      </Suspense>
    </main>
  );
}

function Footer() {
  const [faqOpen, setFaqOpen] = useState(false);
  return (
    <>
      <footer className="site-footer">
        <div className="container footer-main">
          <div className="footer-brand">
            <Logo light />
            <p>
              Gói trọn tinh hoa núi rừng.
              <br />
              Gửi trao những điều mộc mạc.
            </p>
            <span>
              ĐƯỢC LÀM BẰNG TÌNH YÊU TÂY BẮC <Heart size={12} />
            </span>
          </div>
          <div className="footer-links">
            <h3>Khám phá Mộc</h3>
            <Link to="/#san-pham">Sản vật Tây Bắc</Link>
            <Link to="/#cau-chuyen">Câu chuyện của Mộc</Link>
            <Link to="/trai-nghiem">Không gian 3D</Link>
          </div>
          <div className="footer-links">
            <h3>Một món quà riêng</h3>
            <Link to="/thiet-ke">Tự thiết kế hộp quà</Link>
            <Link to="/#qua-tang">Cảm hứng tặng quà</Link>
            <button onClick={() => setFaqOpen(true)}>Câu hỏi thường gặp</button>
          </div>
          <div className="footer-invitation">
            <span>
              <Sprout size={24} strokeWidth={1.2} />
            </span>
            <h3>
              Một chút Mộc,
              <br />
              cho ngày thêm lành.
            </h3>
            <Link to="/#san-pham">
              Ghé cửa hàng <ArrowUpRight size={18} />
            </Link>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>© 2026 Mộc Tây Bắc.</span>
          <span>Bản trải nghiệm · Hình ảnh & giá sản phẩm minh họa</span>
          <span>Thương từ những điều mộc.</span>
        </div>
      </footer>
      {faqOpen && (
        <Modal title="Mộc giải đáp" onClose={() => setFaqOpen(false)}>
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
                Đây là bản trải nghiệm giao diện. Đơn mẫu chưa được gửi đến cửa
                hàng, chưa thu tiền và chưa có dịch vụ giao hàng. Bạn có thể tải
                thông tin đơn mẫu về máy.
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
                Hộp quà hiện có bản phối 2D tương tác. Không gian Kage là bản
                trải nghiệm 3D riêng của ThreeUI. Mô hình 3D của sản phẩm sẽ
                được bổ sung khi nhà cung cấp bàn giao.
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
        : location.pathname === "/trai-nghiem"
          ? "Không gian 3D — Mộc Tây Bắc"
          : "Mộc Tây Bắc — Gói trọn tinh hoa núi rừng";
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
      <Header />
      <div id="main-content" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/thiet-ke" element={<Customizer />} />
          <Route path="/trai-nghiem" element={<Experience />} />
          <Route
            path="*"
            element={
              <main className="not-found">
                <Mountain size={48} />
                <h1>Hình như bạn đã lạc đường.</h1>
                <p>Mộc vẫn ở đây, chờ bạn ghé về.</p>
                <Link to="/" className="button button-green">
                  Về nhà Mộc <ArrowRight size={18} />
                </Link>
              </main>
            }
          />
        </Routes>
      </div>
      {location.pathname !== "/trai-nghiem" && <Footer />}
      {cartOpen && <Cart />}
      {selectedProduct && <ProductModal key={selectedProduct.id} />}
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
    <ShopProvider>
      <Shell />
    </ShopProvider>
  );
}
