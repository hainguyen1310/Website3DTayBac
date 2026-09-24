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
  ChevronLeft,
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
  Play,
  Plus,
  Search,
  ShoppingBag,
  Sprout,
  Star,
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
import { usePublishedArticles } from "./hooks/usePublishedArticles";
import { createCheckoutOrder } from "./services/storeApi";

function TikTokIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743 2.896 2.896 0 0 1 2.31-4.636c.314 0 .618.05.903.142V9.432a6.34 6.34 0 0 0-.903-.065 6.341 6.341 0 0 0-6.34 6.34 6.341 6.341 0 0 0 10.774 4.545c1.61-1.396 2.05-3.69 1.905-5.753a8.167 8.167 0 0 0 4.767 1.503V12.55a4.78 4.78 0 0 1-1-.17 4.836 4.836 0 0 1-1.93-1.04 4.76 4.76 0 0 1-1.065-1.579 4.778 4.778 0 0 1-.345-1.925l.006-.05V6.686z" />
    </svg>
  );
}

function CircularSeal({
  text = "TINH HOA TÂY BẮC • THIÊN NHIÊN THUẦN TÚY •",
  size = 118,
  className = "",
  variant = "hero",
}: {
  text?: string;
  size?: number;
  className?: string;
  variant?: "hero" | "gift" | "story";
}) {
  const pathId = `seal-path-${variant}`;
  return (
    <div className={`moc-circular-seal ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 160 160" width={size} height={size}>
        <defs>
          <path
            id={pathId}
            d="M 80, 80 m -58, 0 a 58,58 0 1,1 116,0 a 58,58 0 1,1 -116,0"
          />
        </defs>
        <circle cx="80" cy="80" r="76" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.65" />
        <circle cx="80" cy="80" r="69" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="80" cy="80" r="45" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 3" opacity="0.75" />
        <text fill="currentColor" fontSize="10.8" fontWeight="600" letterSpacing="2.8">
          <textPath href={`#${pathId}`} startOffset="0%">
            {text}
          </textPath>
        </text>
        {variant === "hero" && (
          <g transform="translate(67, 65) scale(1.1)" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round">
            <path d="M12 21v-7m0-3a5 5 0 0 1 5-5c0 3.5-2.2 7-5 9m0-9a5 5 0 0 0-5 5c0 3.5 2.2 7 5 9" />
          </g>
        )}
        {variant === "gift" && (
          <g transform="translate(68, 66) scale(1.05)" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round">
            <path d="M12 4v16m-8-8h16" />
            <circle cx="12" cy="12" r="6.5" />
          </g>
        )}
        {variant === "story" && (
          <g transform="translate(67, 68) scale(1.05)" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round">
            <path d="M2 18L10 6L16 14L20 9L26 18H2Z" />
          </g>
        )}
      </svg>
    </div>
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

function TornPaperDivider({
  fill = "#faf9f6",
  flip = false,
  shadow = true,
  className = "",
}: {
  fill?: string;
  flip?: boolean;
  shadow?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`moc-torn-divider-wrap ${flip ? "is-flipped" : ""} ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 1920 48"
        preserveAspectRatio="none"
        className="moc-torn-divider-svg"
        style={{ filter: shadow ? "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.05))" : "none" }}
      >
        <path
          d="M0,0 L0,22 C40,16 80,26 120,18 C160,25 200,14 240,23 C280,15 320,26 360,17 C400,24 440,13 480,22 C520,15 560,27 600,18 C640,25 680,14 720,24 C760,16 800,27 840,19 C880,25 920,15 960,23 C1000,16 1040,28 1080,17 C1120,24 1160,14 1200,22 C1240,15 1280,27 1320,18 C1360,26 1400,15 1440,23 C1480,16 1520,27 1560,19 C1600,25 1640,14 1680,24 C1720,16 1760,26 1800,18 C1840,25 1880,15 1920,22 L1920,0 Z"
          fill={fill}
        />
        <path
          d="M0,22 C40,16 80,26 120,18 C160,25 200,14 240,23 C280,15 320,26 360,17 C400,24 440,13 480,22 C520,15 560,27 600,18 C640,25 680,14 720,24 C760,16 800,27 840,19 C880,25 920,15 960,23 C1000,16 1040,28 1080,17 C1120,24 1160,14 1200,22 C1240,15 1280,27 1320,18 C1360,26 1400,15 1440,23 C1480,16 1520,27 1560,19 C1600,25 1640,14 1680,24 C1720,16 1760,26 1800,18 C1840,25 1880,15 1920,22"
          fill="none"
          stroke="rgba(255, 255, 255, 0.45)"
          strokeWidth="1.2"
        />
      </svg>
    </div>
  );
}

function WavyNewsletterEdge() {
  return (
    <div className="moc-newsletter-wave-wrap" aria-hidden="true">
      <svg
        viewBox="0 0 1920 60"
        preserveAspectRatio="none"
        className="moc-newsletter-wave-svg"
      >
        <path
          d="M0,50 C240,15 480,58 720,26 C960,8 1200,45 1440,22 C1680,8 1820,38 1920,24 L1920,60 L0,60 Z"
          fill="#183824"
        />
        <path
          d="M0,50 C240,15 480,58 720,26 C960,8 1200,45 1440,22 C1680,8 1820,38 1920,24"
          fill="none"
          stroke="rgba(180, 215, 190, 0.2)"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
}

function MountainWatermark() {
  return (
    <div className="moc-footer-watermark-svg" aria-hidden="true">
      <svg viewBox="0 0 600 240" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M10 230 L110 90 L180 160 L280 40 L380 170 L460 70 L590 230"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
          opacity="0.35"
        />
        <path
          d="M60 230 L160 120 L230 180 L340 70 L430 190 L520 110 L580 230"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
          opacity="0.25"
        />
        <path
          d="M110 90 L140 135 M280 40 L320 120 M460 70 L490 130"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="2 3"
          opacity="0.2"
        />
        <path
          d="M180 190 Q280 140 380 190 M200 210 Q280 170 360 210"
          stroke="currentColor"
          strokeWidth="0.8"
          strokeDasharray="3 4"
          opacity="0.18"
        />
      </svg>
    </div>
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
      <header className="moc-header">
        <div className="moc-header-inner">
          <Logo />

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
            <a href="#cau-chuyen" className="moc-nav-link">
              Câu chuyện
            </a>
            <Link
              to="/tin-tuc"
              className={`moc-nav-link ${location.pathname === "/tin-tuc" ? "active" : ""}`}
            >
              Tạp chí
            </Link>
            <a href="#lien-he" className="moc-nav-link">
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
              className="moc-action-btn"
              aria-label={`Giỏ hàng (${count})`}
              onClick={() => setCartOpen(true)}
            >
              <ShoppingBag size={19} />
              {count > 0 && <span className="moc-cart-count-badge">{count}</span>}
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
              aria-label="Mở menu"
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
            <a href="#cau-chuyen">
              Câu chuyện <ArrowRight size={16} />
            </a>
            <Link to="/tin-tuc">
              Tạp chí <ArrowRight size={16} />
            </Link>
            <a href="#lien-he">
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

function Home() {
  const { addProduct, setSelectedProduct, products } = useShop();
  const publishedArticles = usePublishedArticles();
  const [sliderIndex, setSliderIndex] = useState(0);

  // Bind to products from shop context with showcase badges & mock reviews
  const showcaseDefinitions = [
    {
      id: "tea",
      badge: "Bán chạy",
      fallbackName: "Trà Shan Tuyết cổ thụ",
      fallbackOrigin: "Hương vị thuần khiết từ đỉnh núi.",
      displayPrice: 160000,
      rating: 5,
      reviews: 120,
      fallbackImage: "/images/tea.webp",
    },
    {
      id: "honey",
      badge: "Mới",
      fallbackName: "Mật ong hoa rừng",
      fallbackOrigin: "Ngọt lành từ thiên nhiên.",
      displayPrice: 250000,
      rating: 5,
      reviews: 96,
      fallbackImage: "/images/honey.webp",
    },
    {
      id: "spice",
      badge: "Yêu thích",
      fallbackName: "Mắc khén rừng",
      fallbackOrigin: "Hương vị đặc trưng Tây Bắc.",
      displayPrice: 85000,
      rating: 5,
      reviews: 78,
      fallbackImage: "/images/spice.webp",
    },
  ];

  return (
    <main className="moc-landing">
      {/* 1. HERO SECTION (Desktop Full-Width) */}
      <section className="moc-hero">
        <img
          className="moc-hero-bg"
          src="/images/hero.webp"
          alt="Những triền ruộng bậc thang xanh giữa núi rừng và mây sớm"
          width={1920}
          height={1080}
          fetchPriority="high"
        />
        <div className="moc-hero-overlay" />

        {/* Decorative corner leaves using user's transparent PNG */}
        <div className="moc-hero-leaf-accent-top">
          <img src="/images/hero_leaves_top.png" alt="" />
        </div>

        {/* Corner torn paper overlay at bottom-left of Hero */}
        <div className="moc-hero-corner-tear-overlay">
          <img src="/images/paper_tear_hero.png" alt="" />
        </div>

        {/* Bottom leaves cluster draping over the corner tear */}
        <div className="moc-hero-leaf-bottom-cluster">
          <img src="/images/hero_leaves_bottom.png" alt="" />
        </div>

        {/* Vertical slide indicator on the far left */}
        <div className="moc-hero-slider-nav">
          <span className={sliderIndex === 0 ? "active" : ""}>01</span>
          <span className="moc-hero-slider-line" />
          <span className={sliderIndex === 1 ? "active" : ""}>02</span>
          <span className="moc-hero-slider-line" />
          <span className={sliderIndex === 2 ? "active" : ""}>03</span>
        </div>

        {/* Hero text content */}
        <div className="moc-container">
          <div className="moc-hero-content">
            <span className="moc-hero-eyebrow">— TINH HOA NÚI RỪNG VIỆT NAM —</span>
            <h1 className="moc-hero-title">
              <span>Một chút</span>
              <strong>Tây Bắc,</strong>
              <em>một trời thương nhớ.</em>
            </h1>
            <p className="moc-hero-subtitle">
              Hương vị từ núi rừng, được gìn giữ bởi những con người chân chất, và nâng niu trong từng sản phẩm.
            </p>
            <div className="moc-hero-actions">
              <Link to="/san-pham" className="moc-hero-btn-primary">
                <span>Khám phá Mộc ngay</span>
                <ArrowRight size={16} />
              </Link>
              <a href="#cau-chuyen" className="moc-hero-btn-story">
                <span className="moc-play-icon-wrap">
                  <Play size={13} fill="currentColor" />
                </span>
                <span>Xem câu chuyện thương hiệu</span>
              </a>
            </div>
          </div>
        </div>

        {/* Hero Right side circular seal badge and curved handwriting */}
        <div className="moc-hero-right-stamp">
          <span className="moc-hero-curved-text">
            Từ núi rừng<br />đến cuộc sống an lành
          </span>
          <CircularSeal
            text="TINH HOA TÂY BẮC • THIÊN NHIÊN THUẦN TÚY •"
            variant="hero"
            size={124}
            className="moc-hero-seal-badge"
          />
        </div>

        {/* Bottom Torn Paper Edge inside Hero - completely seamless, no gaps */}
        <div className="moc-hero-bottom-torn" aria-hidden="true">
          <svg viewBox="0 0 1920 40" preserveAspectRatio="none">
            <path
              d="M0,20 C40,14 80,24 120,16 C160,23 200,12 240,21 C280,13 320,24 360,15 C400,22 440,11 480,20 C520,13 560,25 600,16 C640,23 680,12 720,22 C760,14 800,25 840,17 C880,23 920,13 960,21 C1000,14 1040,26 1080,15 C1120,22 1160,12 1200,20 C1240,13 1280,25 1320,16 C1360,24 1400,13 1440,21 C1480,14 1520,25 1560,17 C1600,23 1640,12 1680,22 C1720,14 1760,24 1800,16 C1840,23 1880,13 1920,20 L1920,40 L0,40 Z"
              fill="#ffffff"
            />
          </svg>
        </div>
      </section>

      {/* 2. VALUE PROPOSITION STRIP ("Những điều thuần khiết vẫn còn đây...") */}
      <div className="moc-values-section-wrap">
        <div className="moc-old-paper-texture-bg" style={{ opacity: 0.08 }} aria-hidden="true" />
        <div className="moc-container">
          <div className="moc-values-inner">
            <div className="moc-values-script">
              Những điều thuần khiết<br />vẫn còn đây...
            </div>

            <div className="moc-value-item">
              <div className="moc-value-icon">
                <Leaf size={21} strokeWidth={1.5} />
              </div>
              <div className="moc-value-item-text">
                <b>Nguyên liệu bản địa</b>
                <small>Chọn lọc từ núi rừng</small>
              </div>
            </div>

            <div className="moc-value-item">
              <div className="moc-value-icon">
                <Mountain size={21} strokeWidth={1.5} />
              </div>
              <div className="moc-value-item-text">
                <b>Sản xuất thủ công</b>
                <small>Giữ trọn hương vị tự nhiên</small>
              </div>
            </div>

            <div className="moc-value-item">
              <div className="moc-value-icon">
                <Heart size={21} strokeWidth={1.5} />
              </div>
              <div className="moc-value-item-text">
                <b>An toàn & lành tính</b>
                <small>Vì sức khỏe bền lâu</small>
              </div>
            </div>

            <div className="moc-value-item">
              <div className="moc-value-icon">
                <Sprout size={21} strokeWidth={1.5} />
              </div>
              <div className="moc-value-item-text">
                <b>Đồng hành cùng bản làng</b>
                <small>Phát triển bền vững</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. SECTION: SẢN PHẨM NỔI BẬT ("Thích là chốt deal.") */}
      <section id="deal-hoi" className="moc-deal-section">
        <div className="moc-container">
          <div className="moc-deal-layout">
            <div className="moc-deal-left">
              <span className="moc-eyebrow">SẢN PHẨM NỔI BẬT</span>
              <h2 className="moc-deal-title">
                Thích là <br />
                <em>chốt deal</em>
                <img src="/images/single_leaf.png" className="moc-deal-leaf-inline" alt="" />
                .
              </h2>
              <p className="moc-deal-desc">
                Những hương vị thuần khiết từ núi rừng, gói trọn giá trị sức khỏe và cuộc sống an lành.
              </p>
              <Link to="/san-pham" className="moc-text-arrow-link">
                <span>Xem toàn bộ sản phẩm</span>
                <ArrowRight size={15} />
              </Link>
            </div>

            <div className="moc-deal-right">
              <div className="moc-deal-nav-row">
                <button
                  className="moc-round-nav-btn"
                  aria-label="Trước"
                  onClick={() => setSliderIndex((prev) => (prev > 0 ? prev - 1 : 2))}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  className="moc-round-nav-btn"
                  aria-label="Tiếp"
                  onClick={() => setSliderIndex((prev) => (prev < 2 ? prev + 1 : 0))}
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="moc-products-grid">
                {showcaseDefinitions.map((item) => {
                  const apiProduct = products.find((prod) => prod.id === item.id);
                  const productName = apiProduct?.name || item.fallbackName;
                  const productOrigin = apiProduct?.origin || item.fallbackOrigin;
                  const productImage = apiProduct?.image || item.fallbackImage;
                  const currentPrice = item.displayPrice;

                  const fullProduct = apiProduct || {
                    id: item.id,
                    name: productName,
                    price: currentPrice,
                    image: productImage,
                    category: "Đặc sản",
                    origin: productOrigin,
                    weight: "Hộp chuẩn",
                    tag: productOrigin,
                    description: productOrigin,
                  };

                  return (
                    <article className="moc-product-card" key={item.id}>
                      <span className="moc-badge">{item.badge}</span>
                      <div
                        className="moc-card-img-wrap"
                        onClick={() => setSelectedProduct(fullProduct)}
                      >
                        <img src={productImage} alt={productName} loading="lazy" />
                      </div>
                      <h3
                        className="moc-card-title"
                        style={{ cursor: "pointer" }}
                        onClick={() => setSelectedProduct(fullProduct)}
                      >
                        {productName}
                      </h3>
                      <p className="moc-card-origin">{productOrigin}</p>
                      <div className="moc-card-rating">
                        <div className="moc-stars">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} size={12} fill="currentColor" />
                          ))}
                        </div>
                        <span>({item.reviews})</span>
                      </div>
                      <div className="moc-card-bottom">
                        <strong className="moc-card-price">{money(currentPrice)}</strong>
                        <button
                          className="moc-card-cart-btn"
                          aria-label={`Thêm ${productName} vào giỏ`}
                          onClick={() => addProduct(item.id)}
                        >
                          <ShoppingBag size={17} />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            {/* Far right vertical note with real tea twig PNG */}
            <div className="moc-deal-far-right">
              <img src="/images/tea_twig_vertical.png" className="moc-far-right-twig-img" alt="" />
              <span className="moc-red-diamond" />
              <span className="moc-far-right-text">
                Tinh túy đất trời, trong từng sản phẩm nhỏ.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* TORN PAPER DIVIDER 2: Deal Section to Warm Gift Section */}
      <TornPaperDivider fill="#f2ece1" />

      {/* 4. SECTION: BỘ QUÀ TẶNG ("Gói hương núi. Gửi tình mình.") */}
      <section className="moc-gift-section" id="qua-tang">
        <div className="moc-old-paper-texture-bg" aria-hidden="true" />
        <div className="moc-container">
          <div className="moc-gift-grid">
            {/* Left open luxury box with pinned craft tag and seal */}
            <div className="moc-gift-left-visual">
              <div className="moc-craft-tag-pinned">
                <span className="moc-pin-head" />
                <b className="moc-tag-title">MÓN QUÀ</b>
                <span className="moc-tag-body">từ núi rừng cho những điều ý nghĩa.</span>
              </div>
              <img
                className="moc-gift-left-img"
                src="/images/gift_box_open.jpg"
                alt="Hộp quà cao cấp mộc. tinh hoa Tây Bắc mở nắp"
                loading="lazy"
              />
              <CircularSeal
                text="QUÀ TỪ TÂY BẮC • TRAO GỬI YÊU THƯƠNG •"
                variant="gift"
                size={114}
                className="moc-gift-stamp-overlay"
              />
            </div>

            {/* Center copy */}
            <div className="moc-gift-center-copy">
              <span className="moc-eyebrow">BỘ QUÀ TẶNG</span>
              <h2 className="moc-gift-title">
                Gói hương núi.<br />
                Gửi tình mình.
              </h2>
              <p className="moc-gift-desc">
                Mỗi hộp quà là một câu chuyện về con người, về thiên nhiên và những giá trị bền vững từ Tây Bắc - món quà của sự chân thành.
              </p>
              <Link to="/thiet-ke" className="moc-pill-btn-dark">
                <span>Khám phá bộ quà tặng</span>
                <ArrowRight size={15} />
              </Link>
            </div>

            {/* Right kraft wrapped parcel with washi tape polaroid card */}
            <div className="moc-gift-right-visual">
              <img
                className="moc-gift-right-img"
                src="/images/gift_box_kraft.jpg"
                alt="Gói quà thủ công bọc giấy kraft buộc dây gai"
                loading="lazy"
              />
              <div className="moc-polaroid-card">
                <span className="moc-washi-tape" />
                <span className="moc-polaroid-line1">Trao giá trị</span>
                <span className="moc-polaroid-line2">Giữ mãi những điều thuần khiết.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TORN PAPER DIVIDER 3: Gift Section to Story Section */}
      <TornPaperDivider fill="#faf9f6" />

      {/* 5. SECTION: CÂU CHUYỆN MỘC ("Đi từ những điều thật mộc.") */}
      <section id="cau-chuyen" className="moc-story-section">
        <div className="moc-container">
          <div className="moc-story-grid">
            <div className="moc-story-copy">
              <span className="moc-eyebrow">CÂU CHUYỆN MỘC</span>
              <h2 className="moc-story-title">
                Đi từ những<br />
                <em>điều thật mộc.</em>
              </h2>
              <p className="moc-story-desc">
                Từ những bản làng giữa núi rừng Tây Bắc, chúng tôi mang đến những sản phẩm thuần khiết và câu chuyện về con người, văn hóa và thiên nhiên - để những giá trị tốt đẹp được lan tỏa và tiếp nối.
              </p>
              <Link to="/gioi-thieu" className="moc-pill-btn-dark">
                <span>Xem hành trình của Mộc</span>
                <ArrowRight size={15} />
              </Link>

              <div className="moc-stats-row">
                <div className="moc-stat-item">
                  <b>3+</b>
                  <small>Năm đồng hành cùng người bản địa</small>
                </div>
                <div className="moc-stat-item">
                  <b>20+</b>
                  <small>Sản phẩm thuần khiết từ Tây Bắc</small>
                </div>
                <div className="moc-stat-item">
                  <b>100%</b>
                  <small>Nguyên liệu tự nhiên và bền vững</small>
                </div>
              </div>
            </div>

            {/* Right side torn-photo journal layout with script overlay and seal */}
            <div className="moc-story-visual-wrap moc-story-torn-photo-wrap">
              <div className="moc-story-torn-paper-edge">
                <div className="moc-story-paper-backdrop" aria-hidden="true" />
                <img
                  className="moc-story-landscape-img"
                  src="/images/story_landscape.jpg"
                  alt="Bản làng và triền núi Tây Bắc"
                  loading="lazy"
                />
              </div>
              <span className="moc-story-script-overlay">
                Nơi những giá trị bắt đầu từ con người
              </span>
              <CircularSeal
                text="VỀ TÂY BẮC ĐI • NHÀ LÀ NHÀ •"
                variant="story"
                size={118}
                className="moc-story-stamp-overlay"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 6. SECTION: TẠP CHÍ MỘC ("Đọc một chút chuyện núi rừng.") */}
      <section id="tin-tuc" className="moc-magazine-section">
        <div className="moc-container">
          <div className="moc-mag-grid">
            <div className="moc-mag-left">
              <span className="moc-eyebrow">TẠP CHÍ MỘC</span>
              <h2 className="moc-mag-title">
                Đọc một chút<br />
                <em>chuyện núi rừng.</em>
              </h2>
              <p className="moc-mag-desc">
                Những câu chuyện, hương vị và con người từ Tây Bắc - nơi thiên nhiên vẫn luôn có thể kể những điều thật đẹp.
              </p>
              <Link to="/tin-tuc" className="moc-text-arrow-link">
                <span>Xem tất cả bài viết</span>
                <ArrowRight size={15} />
              </Link>
            </div>

            <div className="moc-articles-row">
              {publishedArticles.slice(0, 3).map((story) => (
                <article className="moc-article-card" key={story.id}>
                  <div className="moc-article-img-wrap">
                    <img src={story.image} alt={story.title} loading="lazy" />
                  </div>
                  <div className="moc-article-body">
                    <h3 className="moc-article-title">{story.title}</h3>
                    <p className="moc-article-excerpt">{story.excerpt}</p>
                    <Link className="moc-article-link" to={`/tin-tuc/${story.id}`}>
                      <span>Đọc thêm</span>
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 7. SECTION: NEWSLETTER BANNER (Organic Full-Width Wavy Deep Green) */}
      <section className="moc-newsletter-section">
        <WavyNewsletterEdge />
        <div className="moc-newsletter-leaf-overlay">
          <img src="/images/newsletter_leaves.png" alt="" />
        </div>
        <div className="moc-container">
          <div className="moc-newsletter-content">
            <div className="moc-newsletter-left">
              <span className="moc-newsletter-eyebrow">CÙNG MỘC GIỮ TRỌN ĐIỀU THUẦN KHIẾT</span>
              <h2 className="moc-newsletter-title">
                Mộc luôn muốn kể cho bạn<br />
                nhiều câu <em>chuyện hơn...</em>
              </h2>
            </div>

            <div className="moc-newsletter-right">
              <div className="moc-newsletter-form-col">
                <p className="moc-newsletter-subtitle">
                  Đăng ký nhận tin để không bỏ lỡ những câu chuyện, sản phẩm mới và ưu đãi đặc biệt từ Mộc.
                </p>
                <form
                  className="moc-newsletter-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    alert("Cảm ơn bạn đã đăng ký nhận tin từ Mộc Tây Bắc!");
                  }}
                >
                  <input
                    type="email"
                    required
                    placeholder="Nhập email của bạn"
                    className="moc-newsletter-input"
                  />
                  <button type="submit" className="moc-newsletter-submit">
                    <span>Đăng ký</span>
                    <ArrowRight size={13} />
                  </button>
                </form>
              </div>

              <div className="moc-newsletter-script-col">
                Sống chậm hơn<br />
                Để cảm nhận nhiều hơn...
              </div>
            </div>
          </div>
        </div>
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
                  Giá minh họa · Chưa gồm phí giao hàng.
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
        <MountainWatermark />
        <div className="moc-container">
          <div className="moc-footer-grid">
            {/* Col 1: Brand & Slogan */}
            <div className="moc-footer-col moc-footer-brand-col">
              <Logo light />
              <span className="moc-footer-slogan">
                Từ núi rừng đến cuộc sống an lành.
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
                <li><button onClick={() => setFaqOpen(true)} style={{ color: "inherit", padding: 0, textAlign: "left" }}>Chính sách vận chuyển</button></li>
                <li><button onClick={() => setFaqOpen(true)} style={{ color: "inherit", padding: 0, textAlign: "left" }}>Chính sách đổi trả</button></li>
                <li><button onClick={() => setFaqOpen(true)} style={{ color: "inherit", padding: 0, textAlign: "left" }}>Hướng dẫn mua hàng</button></li>
                <li><a href="#lien-he">Liên hệ</a></li>
              </ul>
            </div>

            {/* Col 5: Kết nối với Mộc */}
            <div className="moc-footer-col">
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
                Những giá trị tốt đẹp<br />vẫn còn tiếp nối...
              </span>
            </div>
          </div>

          <div className="moc-footer-bottom">
            <span>© 2024 Mộc. Tinh hoa núi rừng Việt Nam.</span>
            <span>Thiết kế từ tình yêu Tây Bắc.</span>
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
        ? "Tự thiết kế hộp quà — A Sỉn"
        : location.pathname === "/admin"
          ? "Quản trị — A Sỉn"
          : "A Sỉn — Gói trọn tinh hoa núi rừng";
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
