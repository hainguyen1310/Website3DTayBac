import { lazy, Suspense, useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { CatalogProvider } from "./CatalogContext";
import { ShopProvider } from "./ShopContext";
import SiteShell from "./site/SiteShell";
import { initAnalytics } from "./analytics";

const AdminArea = lazy(() => import("./admin/AdminArea"));

export default function App() {
  const location = useLocation();
  useEffect(() => { initAnalytics(); }, [location.pathname, location.search]);
  return (
    <Routes>
      <Route path="/admin/*" element={
        <Suspense fallback={<main className="admin-login"><p role="status">Đang mở khu vực quản trị…</p></main>}>
          <AdminArea />
        </Suspense>
      } />
      <Route path="*" element={
        <CatalogProvider>
          <ShopProvider><SiteShell /></ShopProvider>
        </CatalogProvider>
      } />
    </Routes>
  );
}
