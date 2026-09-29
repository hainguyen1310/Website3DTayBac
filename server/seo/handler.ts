/**
 * Xử lý request HTML/robots/sitemap phía Node (dùng cho Vercel Functions và
 * dev middleware). Logic render nằm trong `src/seo/*` để client dùng chung.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { buildRobotsTxt } from "../../src/seo/robots.ts";
import { buildSitemapXml } from "../../src/seo/sitemap.ts";
import { injectSeoIntoHtml, renderHeadTags } from "../../src/seo/head.ts";
import { bootstrapScriptTag } from "../../src/seo/bootstrap.ts";
import { getSeoEnvironment, hostWithoutPort, isIndexableHost } from "../../src/seo/config.ts";
import { PUBLIC_CONTENT_CACHE } from "../../src/seo/cachePolicy.ts";
import type { SeoEnvironment } from "../../src/seo/config.ts";
import { absoluteUrl, normalizePathname } from "../../src/seo/paths.ts";
import { renderSitePage } from "../../src/seo/renderSite.ts";
import { SupabaseRest } from "../../src/seo/content.ts";

let cachedShell: string | null = null;

export async function loadShellTemplate(): Promise<string> {
  if (cachedShell) return cachedShell;
  const candidates = [
    join(process.cwd(), "dist", "seo-shell.html"),
    join(process.cwd(), "seo-shell.html"),
    join(process.cwd(), "index.html"),
  ];
  for (const candidate of candidates) {
    try {
      cachedShell = await readFile(candidate, "utf8");
      return cachedShell;
    } catch {
      // thử đường dẫn kế tiếp
    }
  }
  throw new Error("Không tìm thấy template seo-shell.html trong deployment.");
}

export type SiteRequestInput = {
  pathname: string;
  search?: URLSearchParams;
  host?: string;
  method?: string;
  env?: SeoEnvironment;
  /** Dev middleware chèn client/HMR của Vite vào shell trước khi inject SEO. */
  transformTemplate?: (template: string) => Promise<string>;
  /** Dev đọc trực tiếp index.html thay vì template build trong dist. */
  loadTemplate?: () => Promise<string>;
};

function htmlResponse(html: string, status: number, cacheControl: string, extra: Record<string, string> = {}): Response {
  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": cacheControl,
      "X-Content-Type-Options": "nosniff",
      ...extra,
    },
  });
}

function redirectResponse(location: string, status: number): Response {
  return new Response(null, {
    status,
    headers: {
      Location: location,
      "Cache-Control": PUBLIC_CONTENT_CACHE,
    },
  });
}

/** Render HTML đầy đủ cho một URL; trả trạng thái HTTP thật. */
export async function handleSiteRequest(input: SiteRequestInput): Promise<Response> {
  const env = input.env ?? getSeoEnvironment();
  const search = input.search ?? new URLSearchParams();
  const normalized = normalizePathname(input.pathname);
  if (normalized.redirectTo) {
    const query = search.toString();
    return redirectResponse(`${normalized.redirectTo}${query ? `?${query}` : ""}`, 308);
  }
  const { pathname } = normalized;

  const host = hostWithoutPort(input.host);
  const canonicalHost = env.canonicalHost;
  if (host && host !== canonicalHost && env.indexableHosts.includes(host)) {
    const query = search.toString();
    return redirectResponse(`${absoluteUrl(env.canonicalOrigin, pathname)}${query ? `?${query}` : ""}`, 308);
  }

  const client = new SupabaseRest(env);
  const page = await renderSitePage({ pathname, search, requestHost: input.host, env, client });

  if (page.redirect) {
    const query = page.redirect.search ?? "";
    const destination = new URL(page.redirect.toPath, env.canonicalOrigin);
    for (const [key, value] of new URLSearchParams(query)) if (!destination.searchParams.has(key)) destination.searchParams.append(key, value);
    return redirectResponse(`${destination.pathname}${destination.search}${destination.hash}`, page.redirect.status);
  }

  const rawTemplate = input.loadTemplate ? await input.loadTemplate() : await loadShellTemplate();
  const template = input.transformTemplate ? await input.transformTemplate(rawTemplate) : rawTemplate;
  const head = renderHeadTags(page.seo);
  const bootstrap = page.bootstrap ? bootstrapScriptTag(page.bootstrap) : "";
  const root = `${page.bodyHtml}${bootstrap}`;
  const html = injectSeoIntoHtml(template, head, root, { lang: "vi" });
  const extra: Record<string, string> = {};
  if (page.seo.robots.includes("noindex")) extra["X-Robots-Tag"] = page.seo.robots;
  if (page.retryAfterSeconds) extra["Retry-After"] = String(page.retryAfterSeconds);
  return htmlResponse(html, page.status, page.cacheControl, extra);
}

export type SeoAsset = "robots" | "sitemap";

export async function handleSeoAsset(asset: SeoAsset, host: string | undefined, envInput?: SeoEnvironment): Promise<Response> {
  const env = envInput ?? getSeoEnvironment();
  if (asset === "robots") {
    return new Response(buildRobotsTxt(host, env), {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": PUBLIC_CONTENT_CACHE,
      },
    });
  }
  let xml: string;
  try { xml = await buildSitemapXml(host, env); }
  catch {
    console.error("[seo/sitemap] Không đọc đủ nguồn dữ liệu công khai.");
    return new Response("Sitemap temporarily unavailable. Retry later.\n", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "Retry-After": "60", "X-Robots-Tag": "noindex" } });
  }
  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": PUBLIC_CONTENT_CACHE,
      ...(!isIndexableHost(host, env) ? { "X-Robots-Tag": "noindex" } : {}),
    },
  });
}

/** Khi includeFiles/template lỗi, không trả 200 rỗng (B03). */
export function renderUnavailableResponse(): Response {
  return htmlResponse(
    `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>A Sỉn tạm thời gián đoạn</title><meta name="robots" content="noindex"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><h1>A Sỉn đang bảo trì ngắn.</h1><p>Vui lòng thử lại sau ít phút.</p></body></html>`,
    503,
    "no-store",
    { "Retry-After": "120" },
  );
}
