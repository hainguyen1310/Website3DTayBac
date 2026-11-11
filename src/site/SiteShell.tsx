import { useEffect, useRef } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import "./styles/index.css";
import { useShop } from "../ShopContext";
import SupportWidget from "../SupportWidget";
import UnsubscribePage from "../Unsubscribe";
import { SiteUiProvider } from "./chrome/SiteUiContext";
import { SiteHeader } from "./chrome/SiteHeader";
import { HomeFooter, SiteFooter } from "./chrome/SiteFooter";
import { NewsletterDialog, PolicyDialog, SearchPanel } from "./chrome/Overlays";
import { CartDrawer } from "./commerce/CartDrawer";
import { CartPage } from "./commerce/CartPage";
import { CheckoutPage } from "./commerce/CheckoutPage";
import { GiftPage } from "./gift/GiftPage";
import { HomePage } from "./pages/home/HomePage";
import { CatalogPage } from "./pages/catalog/CatalogPage";
import { ProductPage } from "./pages/catalog/ProductPage";
import { NewsPage } from "./pages/news/NewsPage";
import { ArticlePage } from "./pages/news/ArticlePage";
import { CampaignPage } from "./pages/campaign/CampaignPage";
import { OriginPage } from "./pages/origin/OriginPage";
import { AboutPage } from "./pages/about/AboutPage";
import { ContactPage } from "./pages/contact/ContactPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { initInnerMotion, destroyInnerMotion, updateInnerMotion } from "./motion/innerMotion";
import { destroyHeritageBoundaries, initHeritageBoundaries, updateHeritageBoundaries } from "./motion/heritageBoundaries";
import { motionAllowed } from "./motion/preference";
import { useScrollFrame } from "./motion/useScrollFrame";

type NavigationState = { hashScroll?: "smooth" } | null;

const samePath = (a: string, b: string) => (a.replace(/\/$/, "") || "/") === (b.replace(/\/$/, "") || "/");

/**
 * Liên kết nội bộ dạng <a href="/..."> (như bản khách duyệt) được chuyển thành điều hướng
 * của React Router; liên kết neo trong cùng trang thì cuộn mượt.
 */
function useInternalLinks() {
  const navigate = useNavigate();
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a");
      const href = anchor?.getAttribute("href");
      if (!anchor || !href?.startsWith("/") || href.startsWith("//") || anchor.target || anchor.hasAttribute("download")) return;
      if (href.startsWith("/api/")) return;
      event.preventDefault();
      const url = new URL(href, location.origin);
      const target = `${url.pathname}${url.search}${url.hash}`;
      const sameDocument = samePath(url.pathname, location.pathname) && url.search === location.search;
      if (sameDocument && url.hash) navigate(target, { state: { hashScroll: "smooth" } });
      else navigate(target);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [navigate]);
}

/** Cuộn về đầu trang hoặc tới neo sau mỗi lần điều hướng (app.js render). */
function useRouteScroll() {
  const location = useLocation();
  useEffect(() => {
    const state = location.state as NavigationState;
    const frame = requestAnimationFrame(() => {
      if (location.hash) {
        let id = location.hash.slice(1);
        try {
          id = decodeURIComponent(id);
        } catch {
          /* Giữ nguyên neo không giải mã được. */
        }
        const smooth = state?.hashScroll === "smooth" && motionAllowed();
        document.getElementById(id)?.scrollIntoView({ behavior: smooth ? "smooth" : "instant" });
      } else {
        window.scrollTo({ top: 0, behavior: "instant" });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [location.key]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Mờ nhẹ phần nội dung khi sang trang mới (page-transitions.js). */
function usePageTransition(main: React.RefObject<HTMLElement | null>, pathname: string) {
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const element = main.current;
    if (!element?.animate || !motionAllowed() || document.visibilityState === "hidden") return;
    const animation = element.animate([{ opacity: 0.72 }, { opacity: 1 }], { duration: 320, easing: "cubic-bezier(.22,.7,.25,1)" });
    return () => animation.cancel();
  }, [pathname, main]);
}

function Shell() {
  const location = useLocation();
  const navigate = useNavigate();
  const main = useRef<HTMLElement>(null);
  const { cartOpen, notification } = useShop();
  const path = location.pathname.replace(/\/$/, "") || "/";

  useInternalLinks();
  useRouteScroll();
  usePageTransition(main, path);

  useEffect(() => {
    document.body.classList.add("unified-site");
    return () => document.body.classList.remove("unified-site", "inner-page", "uh-motion-ready", "motion-paused");
  }, []);

  // Giữ đường dẫn liên hệ cũ sau khi biểu mẫu chuyển sang trang riêng.
  useEffect(() => {
    if (path === "/" && location.hash === "#lien-he") navigate("/lien-he", { replace: true });
  }, [path, location.hash, navigate]);

  // Hiệu ứng dùng chung của mọi trang: chạy sau khi trang mới đã gắn vào #main.
  useEffect(() => {
    initInnerMotion(main.current);
    initHeritageBoundaries(main.current);
    return () => {
      destroyHeritageBoundaries();
      destroyInnerMotion();
    };
  }, [path]);

  useScrollFrame(() => {
    updateInnerMotion();
    updateHeritageBoundaries();
  });

  return (
    <>
      <a className="skip-link" href="#main" onClick={(event) => { event.preventDefault(); main.current?.focus(); }}>Đến nội dung chính</a>
      <SiteHeader />
      <main id="main" tabIndex={-1} ref={main}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/san-pham" element={<CatalogPage />} />
          <Route path="/danh-muc/:categorySlug" element={<CatalogPage />} />
          <Route path="/san-pham/:slug" element={<ProductPage />} />
          <Route path="/thiet-ke" element={<GiftPage />} />
          <Route path="/chuong-trinh" element={<CampaignPage />} />
          <Route path="/nguon-goc" element={<OriginPage />} />
          <Route path="/gioi-thieu" element={<AboutPage />} />
          <Route path="/tin-tuc" element={<NewsPage />} />
          <Route path="/tin-tuc/chu-de/:topicSlug" element={<NewsPage />} />
          <Route path="/tin-tuc/:slug" element={<ArticlePage />} />
          <Route path="/lien-he" element={<ContactPage />} />
          <Route path="/gio-hang" element={<CartPage />} />
          <Route path="/thanh-toan" element={<CheckoutPage />} />
          <Route path="/huy-nhan-tin" element={<UnsubscribePage />} />
          <Route path="/deal-hoi" element={<Navigate to="/san-pham" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      {path === "/" ? <HomeFooter /> : <SiteFooter />}
      <div id="overlay-root" />
      <div id="toast" className={`toast${notification ? " show" : ""}`} role="status" aria-live="polite">{notification}</div>
      <CartDrawer />
      <SearchPanel />
      <PolicyDialog />
      <NewsletterDialog />
      <SupportWidget hidden={cartOpen} />
    </>
  );
}

/** Giao diện cửa hàng theo bản trải nghiệm A SỈN khách đã duyệt. */
export default function SiteShell() {
  return (
    <SiteUiProvider>
      <Shell />
    </SiteUiProvider>
  );
}
