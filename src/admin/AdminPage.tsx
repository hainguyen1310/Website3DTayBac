import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Mail,
  Megaphone,
  Menu,
  Package,
  Percent,
  Settings,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "../AuthContext";
import AdminLogin, { AdminNoAccess } from "./AdminLogin";
import ContentSection from "./ContentSection";
import CustomersSection from "./CustomersSection";
import DashboardSection from "./DashboardSection";
import MessagesSection from "./MessagesSection";
import OrdersSection from "./OrdersSection";
import ProductsSection from "./ProductsSection";
import PromotionsSection from "./PromotionsSection";
import ReportsSection from "./ReportsSection";
import SettingsSection from "./SettingsSection";
import { AdminLoading } from "./ui";
import type { AdminSection } from "./sections";

const menu: {
  id: AdminSection;
  label: string;
  icon: typeof LayoutDashboard;
}[] = [
  { id: "dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { id: "orders", label: "Đơn hàng", icon: ClipboardList },
  { id: "products", label: "Sản phẩm", icon: Package },
  { id: "customers", label: "Khách hàng", icon: Users },
  { id: "promotions", label: "Khuyến mãi", icon: Percent },
  { id: "content", label: "Nội dung", icon: Megaphone },
  { id: "messages", label: "Liên hệ", icon: Mail },
  { id: "reports", label: "Báo cáo", icon: BarChart3 },
  { id: "settings", label: "Cài đặt", icon: Settings },
];

export default function AdminPage() {
  const { session, loading, isStaff, profile, signOut } = useAuth();
  const [section, setSection] = useState<AdminSection>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const active = menu.find((item) => item.id === section)!;

  if (loading) {
    return (
      <main className="admin-login">
        <div className="admin-login-card">
          <AdminLoading label="Đang kiểm tra phiên đăng nhập…" />
        </div>
      </main>
    );
  }
  if (!session) return <AdminLogin />;
  if (!isStaff) return <AdminNoAccess />;

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
      default:
        return <DashboardSection onNavigate={setSection} />;
    }
  };

  return (
    <main className="admin-shell">
      {sidebarOpen && (
        <button
          className="admin-sidebar-scrim"
          onClick={() => setSidebarOpen(false)}
          aria-label="Đóng menu quản trị"
        />
      )}
      <aside
        className={sidebarOpen ? "admin-sidebar is-open" : "admin-sidebar"}
        aria-label="Điều hướng quản trị"
      >
        <div className="admin-logo">
          <span>A</span>
          <div>
            <b>A Sỉn.</b>
            <small>QUẢN TRỊ</small>
          </div>
          <button
            className="sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Đóng menu quản trị"
          >
            <X size={18} />
          </button>
        </div>
        <nav>
          {menu.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={section === item.id ? "active" : ""}
                onClick={() => {
                  setSection(item.id);
                  setSidebarOpen(false);
                }}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="admin-sidebar-bottom">
          <span>
            Vai trò: <b>{profile?.role}</b>
          </span>
          <Link to="/">
            Xem cửa hàng <ArrowUpRight size={15} />
          </Link>
          <button onClick={() => void signOut()}>
            <LogOut size={15} /> Đăng xuất
          </button>
        </div>
      </aside>
      <section className="admin-main">
        <header className="admin-topbar">
          <button
            className="admin-menu-button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Mở menu quản trị"
            aria-expanded={sidebarOpen}
          >
            <Menu size={21} />
          </button>
          <div className="admin-breadcrumb">
            <span>Quản trị</span>
            <ArrowUpRight size={14} />
            <b>{active.label}</b>
          </div>
          <div>
            <div className="admin-user">
              <span>{initials}</span>
              <div>
                <b>{profile?.fullName || session.user.email}</b>
                <small>{session.user.email}</small>
              </div>
            </div>
          </div>
        </header>
        <div className="admin-content">{renderSection()}</div>
      </section>
    </main>
  );
}
