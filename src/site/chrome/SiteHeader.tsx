import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Icon } from "../icons";
import { ASSETS } from "../data";
import { useSiteCart } from "../commerce/useSiteCart";
import { useSiteUi } from "./SiteUiContext";

export const ROUTES: [path: string, label: string][] = [
  ["/", "Trang chủ"],
  ["/san-pham", "Sản phẩm"],
  ["/thiet-ke", "Hộp quà 3D"],
  ["/chuong-trinh", "Chương trình"],
  ["/nguon-goc", "Nguồn gốc"],
  ["/gioi-thieu", "Về chúng tôi"],
  ["/tin-tuc", "Tin tức"],
];

const isActive = (path: string, route: string) => (route === "/" ? path === "/" : path.startsWith(route));

export function SiteHeader() {
  const { pathname } = useLocation();
  const path = pathname.replace(/\/$/, "") || "/";
  const { count, open: openCart } = useSiteCart();
  const { setSearchOpen } = useSiteUi();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.classList.toggle("menu-open", menuOpen);
    if (!menuOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [menuOpen]);

  useEffect(() => () => document.body.classList.remove("menu-open"), []);

  return (
    <div id="site-header">
      <div className="announcement">GÓI GHÉM HƯƠNG VỊ VÙNG CAO · GỬI TRAO CHÚT TÌNH TÂY BẮC</div>
      <header className="site-header">
        <div className="wrap header-inner">
          <a className="brand" href="/" aria-label="A SỈN — Trang chủ">
            <img className="brand-logo-default" src={ASSETS.logo} alt="A SỈN" />
            <img className="brand-logo-home" src={ASSETS.logoLight} alt="" aria-hidden="true" />
            <span className="brand-caption">Đặc sản Tây Bắc<br />Từ bếp lửa, bằng tấm lòng</span>
          </a>
          <nav className={`nav${menuOpen ? " open" : ""}`} id="primary-nav" aria-label="Điều hướng chính">
            {ROUTES.map(([route, label]) => {
              const active = isActive(path, route);
              return (
                <a key={route} href={route} data-route={route} className={active ? "active" : undefined} aria-current={active ? "page" : undefined}>
                  {label}
                </a>
              );
            })}
          </nav>
          <div className="header-tools">
            <button className="icon-button" type="button" data-search aria-label="Tìm đặc sản" onClick={() => { setMenuOpen(false); setSearchOpen(true); }}>
              <Icon name="search" />
            </button>
            <a className="icon-button" href="/chuong-trinh/#cp-account" aria-label="Tài khoản và tiến độ mảnh ghép">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="12" cy="8" r="3.5" /><path d="M4.5 21v-2a7.5 7.5 0 0 1 15 0v2" /></svg>
            </a>
            <button className="icon-button" type="button" data-cart-open aria-label="Mở giỏ hàng" onClick={openCart}>
              <Icon name="bag" />
              <span className="cart-count">{count}</span>
            </button>
            <button
              className="icon-button menu-toggle"
              type="button"
              aria-controls="primary-nav"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <Icon name="menu" />
            </button>
          </div>
        </div>
      </header>
    </div>
  );
}
