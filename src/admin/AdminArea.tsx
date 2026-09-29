import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "../AuthContext";
import AdminPage from "./AdminPage";
import AdminLogin from "./AdminLogin";
import { AdminLoading } from "./ui";
import { applySeoMeta } from "../seo/head";

function LoginRoute() {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return <main className="admin-login"><div className="admin-login-card"><AdminLoading label="Đang kiểm tra phiên đăng nhập…" /></div></main>;
  // Keep staff invitations and bookmarked admin sections on their existing paths.
  if (session) return <Navigate to={`/admin${location.search}`} replace />;
  return <AdminLogin />;
}

/** Staff-only UI entry. Database/API authorization remains the security boundary. */
export default function AdminArea() {
  useEffect(() => {
    document.title = "Quản trị nội bộ — A Sỉn";
    applySeoMeta(null);
    const existing = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const previous = existing?.getAttribute("content");
    const robots = existing || document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex, nofollow";
    if (!existing) document.head.appendChild(robots);
    return () => {
      if (!existing) robots.remove();
      else if (previous === null) robots.removeAttribute("content");
      else robots.content = previous || "";
    };
  }, []);
  return <AuthProvider>
    <Routes>
      <Route path="dang-nhap" element={<LoginRoute />} />
      <Route path="*" element={<AdminPage />} />
    </Routes>
  </AuthProvider>;
}
