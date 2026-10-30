import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useSearchParams } from "react-router-dom";
import {
  BarChart3,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  LayoutDashboard,
  LayoutTemplate,
  LogOut,
  Mail,
  MessagesSquare,
  Menu,
  Newspaper,
  Package,
  Percent,
  Settings,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "../AuthContext";
import { AdminNoAccess } from "./AdminLogin";
import ContentSection from "./ContentSection";
import CustomersSection from "./CustomersSection";
import DashboardSection from "./DashboardSection";
import MessagesSection from "./MessagesSection";
import OrdersSection from "./OrdersSection";
import ProductsSection from "./ProductsSection";
import PromotionsSection from "./PromotionsSection";
import ReportsSection from "./ReportsSection";
import SettingsSection from "./SettingsSection";
import SupportSection from "./SupportSection";
import { CatalogProvider } from "../CatalogContext";
import WebsiteSection from "./WebsiteSection";
import PasswordSetup from "./PasswordSetup";
import { canAccess } from "../operations";
import { AdminLoading, useTableLabels } from "./ui";
import type { AdminSection } from "./sections";

type MenuItem = { id: AdminSection; label: string; icon: typeof LayoutDashboard };

const MENU_GROUPS: { title: string; items: MenuItem[] }[] = [
  {
    title: "Bán hàng",
    items: [
      { id: "dashboard", label: "Tổng quan", icon: LayoutDashboard },
      { id: "orders", label: "Đơn hàng", icon: ClipboardList },
      { id: "products", label: "Sản phẩm", icon: Package },
      { id: "customers", label: "Khách hàng", icon: Users },
      { id: "promotions", label: "Khuyến mãi", icon: Percent },
    ],
  },
  {
    title: "Nội dung",
    items: [
      { id: "content", label: "Bài viết & tin tức", icon: Newspaper },
      { id: "website", label: "Nội dung website", icon: LayoutTemplate },
    ],
  },
  {
    title: "Chăm sóc khách",
    items: [
      { id: "messages", label: "Hộp thư liên hệ", icon: Mail },
      { id: "support", label: "Chatbox & kênh liên hệ", icon: MessagesSquare },
    ],
  },
  {
    title: "Hệ thống",
    items: [
      { id: "reports", label: "Báo cáo", icon: BarChart3 },
      { id: "settings", label: "Cài đặt", icon: Settings },
    ],
  },
];

const ALL_ITEMS = MENU_GROUPS.flatMap((group) => group.items);

const roleLabel = (role: string | undefined, scope: string | undefined) =>
  role === "admin" ? "Quản trị viên" : scope === "marketing" ? "Marketing" : "Vận hành";

export default function AdminPage() {
  const location = useLocation();
  const { session, loading, isStaff, profile, signOut } = useAuth();
  const [params, setParams] = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const allowed = ALL_ITEMS.filter((item) => canAccess(profile?.role, profile?.staffScope, item.id));
  const requested = params.get("section") as AdminSection;
  const section = allowed.some((item) => item.id === requested) ? requested : (allowed[0]?.id ?? "dashboard");
  const active = ALL_ITEMS.find((item) => item.id === section)!;
  useTableLabels(contentRef, `${section}:${loading}:${isStaff}`);

  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setSidebarOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarOpen]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [section]);

  if (loading) {
    return (
      <main className="admin-login">
        <div className="admin-login-card">
          <AdminLoading label="Đang kiểm tra phiên đăng nhập…" />
        </div>
      </main>
    );
  }
  if (params.get("setup") === "password") return <PasswordSetup />;
  if (!session) return <Navigate to={`/admin/dang-nhap${location.search}`} replace />;
  if (!isStaff) return <AdminNoAccess />;

  const setSection = (next: AdminSection) => {
    setParams({ section: next });
    setSidebarOpen(false);
  };

  const initials = (profile?.fullName || session.user.email || "A Sỉn")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const renderSection = () => {
    switch (section) {
      case "orders":
        return <OrdersSection />;
      case "products":
        return <ProductsSection />;
      case "customers":
        return <CustomersSection />;
      case "promotions":
        return <PromotionsSection />;
      case "content":
        return <ContentSection />;
      case "messages":
        return <MessagesSection />;
      case "reports":
        return <ReportsSection />;
      case "settings":
        return <SettingsSection />;
      case "support":
        return <CatalogProvider><SupportSection /></CatalogProvider>;
      case "website":
        return <WebsiteSection />;
      default:
        return <DashboardSection onNavigate={setSection} />;
    }
  };

  return (
    <main className="admin-shell">
      {sidebarOpen && <button className="admin-sidebar-scrim" onClick={() => setSidebarOpen(false)} aria-label="Đóng menu quản trị" />}
      <aside className={sidebarOpen ? "admin-sidebar is-open" : "admin-sidebar"} aria-label="Điều hướng quản trị">
        <div className="admin-logo">
          <span aria-hidden="true">A</span>
          <div>
            <b>A Sỉn</b>
            <small>QUẢN TRỊ</small>
          </div>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Đóng menu quản trị">
            <X size={18} />
          </button>
        </div>
        <nav>
          {MENU_GROUPS.map((group) => {
            const items = group.items.filter((item) => allowed.some((entry) => entry.id === item.id));
            if (!items.length) return null;
            return (
              <div className="admin-nav-group" key={group.title}>
                <h2>{group.title}</h2>
                {items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      className={section === item.id ? "active" : ""}
                      aria-current={section === item.id ? "page" : undefined}
                      onClick={() => setSection(item.id)}
                    >
                      <Icon size={18} strokeWidth={1.8} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>
        <div className="admin-sidebar-bottom">
          <span>Vai trò: <b>{roleLabel(profile?.role, profile?.staffScope)}</b></span>
          <button onClick={() => void signOut()}>
            <LogOut size={16} /> Đăng xuất
          </button>
        </div>
      </aside>
      <section className="admin-main">
        <header className="admin-topbar">
          <button className="admin-menu-button" onClick={() => setSidebarOpen(true)} aria-label="Mở menu quản trị" aria-expanded={sidebarOpen}>
            <Menu size={20} />
          </button>
          <div className="admin-breadcrumb">
            <span>Quản trị</span>
            <ChevronRight size={14} aria-hidden="true" />
            <b>{active.label}</b>
          </div>
          <div className="admin-topbar-actions">
            <Link className="admin-view-site" to="/" target="_blank" rel="noopener noreferrer" aria-label="Xem website (mở tab mới)">
              <ExternalLink size={15} /> <span>Xem website</span>
            </Link>
            <div className="admin-user" title={session.user.email}>
              <span aria-hidden="true">{initials}</span>
              <div>
                <b>{profile?.fullName || session.user.email}</b>
                <small>{roleLabel(profile?.role, profile?.staffScope)}</small>
              </div>
            </div>
          </div>
        </header>
        <div className="admin-content" ref={contentRef}>{renderSection()}</div>
      </section>
    </main>
  );
}
