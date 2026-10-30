import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, Search, ShoppingBag, Gift, X } from "lucide-react";
import { useShop } from "../ShopContext";
import { useWebsite } from "../WebsiteContext";
import { MEDIA } from "./content";
import { NewsletterForm } from "./ui";

export const NAV_ITEMS = [
  { to: "/", label: "Trang chủ" },
  { to: "/san-pham", label: "Sản phẩm" },
  { to: "/thiet-ke", label: "Hộp quà 3D" },
  { to: "/nguon-goc", label: "Nguồn gốc" },
  { to: "/gioi-thieu", label: "Về chúng tôi" },
  { to: "/tin-tuc", label: "Tin tức" },
];

const isActive = (pathname: string, to: string) =>
  to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`);

export function SiteHeader({ onSearch }: { onSearch: (query: string) => void }) {
  const { cart, setCartOpen } = useShop();
  const { pathname } = useLocation();
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const count = cart.reduce((sum, line) => sum + line.quantity, 0);

  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [menuOpen]);

  return (
    <header className="sf-header">
      <div className="sf-container sf-header-inner">
        <Link to="/" className="sf-logo" aria-label="A SỈN — Đặc sản Tây Bắc">
          <img src={MEDIA.logo} alt="" width={96} height={57} />
        </Link>
        <nav id="sf-nav" className={`sf-nav${menuOpen ? " is-open" : ""}`} aria-label="Điều hướng chính">
          {NAV_ITEMS.map((item) => (
            <Link key={item.to} to={item.to} aria-current={isActive(pathname, item.to) ? "page" : undefined}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="sf-header-actions">
          <form
            className="sf-search"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              onSearch(query);
            }}
          >
            <Search size={13} strokeWidth={1.8} aria-hidden="true" />
            <input aria-label="Tìm đặc sản" placeholder="Tìm đặc sản..." value={query} onChange={(event) => setQuery(event.target.value)} />
          </form>
          <Link to="/thiet-ke" className="sf-icon-button" aria-label="Tạo hộp quà 3D">
            <Gift size={19} strokeWidth={1.5} />
          </Link>
          <button type="button" className="sf-icon-button" aria-label={`Giỏ hàng (${count})`} onClick={() => setCartOpen(true)}>
            <ShoppingBag size={19} strokeWidth={1.5} />
            {count > 0 && <span className="sf-cart-count">{count}</span>}
          </button>
          <button
            type="button"
            className="sf-icon-button sf-menu-button"
            aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
            aria-expanded={menuOpen}
            aria-controls="sf-nav"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter({ onPolicy }: { onPolicy: () => void }) {
  const { content: c } = useWebsite();
  const contact = {
    address: c["contact.address"] || "Hà Nội, Việt Nam",
    phone: c["contact.phone"] || "0987 654 321",
    email: c["contact.email"] || "hello@asin.vn",
    hours: c["contact.hours"] || "Thứ 2 – Chủ nhật, 8:00 – 21:00",
  };
  const socials = [
    { key: "facebook", label: "Facebook", glyph: "ⓕ" },
    { key: "instagram", label: "Instagram", glyph: "◎" },
    { key: "youtube", label: "YouTube", glyph: "▶" },
  ];
  return (
    <footer className="sf-footer">
      <div className="sf-container sf-footer-grid">
        <div className="sf-footer-brand">
          <img src={MEDIA.logoLight} alt="A SỈN — Đặc sản Tây Bắc" width={122} height={67} loading="lazy" />
          <p>Đặc sản vùng cao, tuyển chọn và gói ghém như một món quà quý.</p>
          <div className="sf-socials">
            {socials.map(({ key, label, glyph }) =>
              c[`social.${key}`] ? (
                <a key={key} href={c[`social.${key}`]} target="_blank" rel="noopener noreferrer" aria-label={label}>{glyph}</a>
              ) : (
                <span key={key} role="img" aria-label={`${label} — đang cập nhật`} title={`${label} — đang cập nhật`}>{glyph}</span>
              ),
            )}
          </div>
        </div>
        <div>
          <h2>Liên kết nhanh</h2>
          <ul>
            {NAV_ITEMS.map((item) => <li key={item.to}><Link to={item.to}>{item.label}</Link></li>)}
          </ul>
        </div>
        <div>
          <h2>Liên hệ</h2>
          <ul className="sf-footer-contact">
            <li><span aria-hidden="true">⌖</span>{contact.address}</li>
            <li><span aria-hidden="true">☎</span><a href={`tel:${contact.phone.replace(/\s/g, "")}`}>{contact.phone}</a></li>
            <li><span aria-hidden="true">✉</span><a href={`mailto:${contact.email}`}>{contact.email}</a></li>
            <li><span aria-hidden="true">◷</span>{contact.hours}</li>
          </ul>
        </div>
        <div className="sf-footer-news">
          <h2>Nhận tin từ A SỈN</h2>
          <p>Nhận tin về mùa vụ mới, hộp quà giới hạn và ưu đãi dành cho khách quen.</p>
          <NewsletterForm variant="footer" />
        </div>
      </div>
      <div className="sf-container sf-footer-bottom">
        <span>© {new Date().getFullYear()} A SỈN. Bảo lưu mọi quyền.</span>
        <nav aria-label="Chính sách">
          <Link to="/nguon-goc">Cam kết đặc sản đúng vùng nguyên liệu</Link>
          <button type="button" onClick={onPolicy}>Chính sách bảo mật</button>
          <button type="button" onClick={onPolicy}>Chính sách đổi trả</button>
        </nav>
      </div>
    </footer>
  );
}
