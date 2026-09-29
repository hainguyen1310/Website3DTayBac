import { getSeoEnvironment, isIndexableHost } from "./config.ts";
import type { SeoEnvironment } from "./config.ts";

/** Cho bot đọc noindex trên preview/admin; quyền truy cập dữ liệu do Auth/RLS bảo vệ. */
export function buildRobotsTxt(host: string | undefined, env: SeoEnvironment = getSeoEnvironment()): string {
  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /api/",
    "",
    ...(isIndexableHost(host, env) ? [`Sitemap: ${env.canonicalOrigin}/sitemap.xml`] : []),
    "",
  ].join("\n");
}
