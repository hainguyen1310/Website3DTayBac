import { mkdir, readFile, rename } from "node:fs/promises";
import { join } from "node:path";
import type { Plugin } from "vite";
import type { SeoEnvironment } from "../../src/seo/config";
import { handleSeoAsset, handleSiteRequest } from "./handler";

const PASSTHROUGH = [
  /^\/api\//,
  /^\/@/,
  /^\/src\//,
  /^\/node_modules\//,
  /^\/__/,
  /\.(?:js|mjs|ts|tsx|css|map|png|jpe?g|webp|avif|svg|gif|ico|woff2?|ttf|otf|glb|gltf|hdr|json|xml|txt|pdf|mp4|webm)$/i,
];

/**
 * Dev middleware: mọi request tài liệu được render từ `src/seo` với cùng logic
 * như production, sau khi Vite chèn client/preamble. Build xong đổi tên
 * `dist/index.html` thành `dist/seo-shell.html` để `/` cũng đi qua renderer.
 */
export function seoPlugin(env: SeoEnvironment): Plugin {
  return {
    name: "asin-seo",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url ?? "/", "http://localhost");
        const pathname = url.pathname;
        const isAsset = pathname === "/robots.txt" || pathname === "/sitemap.xml";
        if (!isAsset) {
          if (req.method !== "GET" && req.method !== "HEAD") return next();
          if (pathname !== "/" && PASSTHROUGH.some((pattern) => pattern.test(pathname))) return next();
        }
        void (async () => {
          try {
            const host = String(req.headers.host ?? "localhost:5173");
            let response: Response;
            if (pathname === "/robots.txt") response = await handleSeoAsset("robots", host, env);
            else if (pathname === "/sitemap.xml") response = await handleSeoAsset("sitemap", host, env);
            else {
              response = await handleSiteRequest({
                pathname,
                search: url.searchParams,
                host,
                env,
                loadTemplate: readDevShell,
                transformTemplate: (template) => server.transformIndexHtml(url.pathname + url.search, template),
              });
            }
            const body = await response.text();
            res.statusCode = response.status;
            response.headers.forEach((value, key) => res.setHeader(key, value));
            res.end(body);
          } catch (error) {
            next(error as Error);
          }
        })();
      });
    },
    async closeBundle() {
      const dist = join(process.cwd(), "dist");
      try {
        await mkdir(dist, { recursive: true });
        await rename(join(dist, "index.html"), join(dist, "seo-shell.html"));
      } catch {
        // build không có index.html (ví dụ build type-check) — bỏ qua
      }
    },
  };
}

/** Đọc shell thô trong dev/test (không qua Vite transform). */
export async function readDevShell(): Promise<string> {
  return readFile(join(process.cwd(), "index.html"), "utf8");
}
