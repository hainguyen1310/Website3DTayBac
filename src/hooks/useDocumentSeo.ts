import { useEffect, useRef } from "react";
import { clientSeoContext } from "../seo/client";
import { applySeoMeta } from "../seo/head";
import { useWebsite } from "../WebsiteContext";
import type { SeoMeta } from "../seo/types";
import { useLocation } from "react-router-dom";
import { trackPageView } from "../analytics";

/**
 * Áp SEO cho route hiện tại trên client (B02). `build` trả null khi route không
 * chuẩn bị metadata (khu vực admin) để gỡ các thẻ do SEO quản lý.
 */
export function useDocumentSeo(build: (context: ReturnType<typeof clientSeoContext>) => SeoMeta | null, deps: unknown[], ready = true) {
  const { content } = useWebsite();
  const location = useLocation();
  const buildRef = useRef(build);
  buildRef.current = build;
  useEffect(() => {
    const meta = buildRef.current(clientSeoContext(content));
    applySeoMeta(meta);
    // Dữ liệu bất đồng bộ phải đặt title đúng trước khi gửi page_view.
    if (meta && ready) trackPageView(window.location.href);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, content, ready, location.pathname, location.search]);
}
