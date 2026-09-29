/**
 * Phân loại URL và tính canonical/redirect (B03).
 * Quy tắc: HTTPS, không trailing slash (trừ gốc), chữ thường, bỏ tham số tracking
 * khỏi canonical nhưng giữ tham số có ý nghĩa (`product`, `page`, `chu-de`).
 */

export type SiteRoute =
  | { kind: "home" }
  | { kind: "products"; productSlug?: string }
  | { kind: "product"; slug: string }
  | { kind: "category"; slug: string }
  | { kind: "gift" }
  | { kind: "about" }
  | { kind: "news"; page: number; topic?: string }
  | { kind: "article"; slug: string }
  | { kind: "contact" }
  | { kind: "unsubscribe" }
  | { kind: "admin" }
  | { kind: "notFound" };

const TRACKING_PARAM = /^(utm_|fbclid$|gclid$|msclkid$|yclid$|_hs|mc_|ref$|igshid$|vero_|wickedid$|twclid$)/i;

export const CANONICAL_QUERY_KEYS = ["product", "page", "chu-de", "q"] as const;

export type PathNormalization = {
  pathname: string;
  search: string;
  redirectTo?: string;
};

/** Giải mã an toàn; URL hỏng trả nguyên bản để router xử lý như 404. */
export function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function splitPages(pathname: string): string[] {
  return safeDecode(pathname)
    .split("/")
    .filter((segment) => segment.length > 0);
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function matchSiteRoute(pathname: string, search: URLSearchParams): SiteRoute {
  const segments = splitPages(pathname);
  const canonicalSearch = new URLSearchParams(search);
  if (segments.length === 0) return { kind: "home" };

  const [first, second, third] = segments;
  if (first === "admin") return { kind: "admin" };

  if (first === "san-pham") {
    if (segments.length === 1) {
      const productSlug = canonicalSearch.get("product") ?? undefined;
      return { kind: "products", productSlug: productSlug && SLUG_PATTERN.test(productSlug) ? productSlug : undefined };
    }
    if (segments.length === 2 && SLUG_PATTERN.test(second)) return { kind: "product", slug: second };
    return { kind: "notFound" };
  }

  if (first === "danh-muc") {
    if (segments.length === 2 && SLUG_PATTERN.test(second)) return { kind: "category", slug: second };
    return { kind: "notFound" };
  }

  if (first === "thiet-ke" && segments.length === 1) return { kind: "gift" };
  if (first === "gioi-thieu" && segments.length === 1) return { kind: "about" };
  if (first === "lien-he" && segments.length === 1) return { kind: "contact" };
  if (first === "huy-nhan-tin" && segments.length === 1) return { kind: "unsubscribe" };

  if (first === "tin-tuc") {
    const pageParam = Number.parseInt(canonicalSearch.get("page") ?? "1", 10);
    const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.min(1000, pageParam) : 1;
    if (segments.length === 1) {
      const topic = canonicalSearch.get("chu-de") ?? undefined;
      return { kind: "news", page, topic: topic && SLUG_PATTERN.test(topic) ? topic : undefined };
    }
    if (segments.length === 2 && SLUG_PATTERN.test(second)) return { kind: "article", slug: second };
    if (segments.length === 3 && second === "chu-de" && SLUG_PATTERN.test(third)) {
      return { kind: "news", page, topic: third };
    }
    return { kind: "notFound" };
  }

  return { kind: "notFound" };
}

/**
 * Chuẩn hoá pathname: bỏ slash cuối, gộp slash, chữ thường. Trả về `redirectTo`
 * khi cần 301/308. Không xử lý redirect www/HTTPS ở đây (thuộc host policy).
 */
export function normalizePathname(pathname: string): PathNormalization {
  const decoded = safeDecode(pathname);
  const collapsed = decoded.replace(/\/{2,}/g, "/");
  const lower = collapsed.toLowerCase();
  let normalized = lower;
  if (normalized.length > 1 && normalized.endsWith("/")) normalized = normalized.replace(/\/+$/, "");
  if (normalized.length === 0) normalized = "/";
  if (normalized !== decoded) return { pathname: normalized, search: "", redirectTo: normalized };
  return { pathname: normalized, search: "" };
}

export function stripTrackingParams(search: URLSearchParams): URLSearchParams {
  const clean = new URLSearchParams();
  for (const [key, value] of search.entries()) {
    if (!TRACKING_PARAM.test(key)) clean.append(key, value);
  }
  return clean;
}

export function hasTrackingParams(search: URLSearchParams): boolean {
  for (const key of search.keys()) if (TRACKING_PARAM.test(key)) return true;
  return false;
}

/** Canonical chỉ giữ tham số có ý nghĩa; sắp xếp ổn định và bỏ giá trị mặc định. */
export function canonicalSearch(search: URLSearchParams): string {
  const clean = stripTrackingParams(search);
  const kept: Array<[string, string]> = [];
  for (const key of CANONICAL_QUERY_KEYS) {
    const value = clean.get(key);
    if (!value) continue;
    if (key === "page" && value === "1") continue;
    if (key === "product") continue; // ?product= được hợp nhất về /san-pham/<slug>
    if (key === "q") continue; // tìm kiếm không phải landing index
    kept.push([key, value]);
  }
  return kept.map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join("&");
}

export function absoluteUrl(origin: string, pathname: string, query = ""): string {
  const base = origin.replace(/\/+$/, "");
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return query ? `${base}${path}?${query}` : `${base}${path}`;
}

/** Canonical CMS chỉ nhận đường dẫn nội bộ hợp lệ, không nhận query/fragment. */
export function articleCanonicalPath(article: { slug: string; canonicalPath?: string | null }): string {
  const candidate = article.canonicalPath?.trim();
  if (!candidate || !/^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*\/?)*$/.test(candidate)) return `/tin-tuc/${article.slug}`;
  const path = normalizePathname(candidate).pathname;
  const route = matchSiteRoute(path, new URLSearchParams());
  return ["notFound", "admin", "unsubscribe"].includes(route.kind) ? `/tin-tuc/${article.slug}` : path;
}

/** URL chuẩn cho từng loại route; tách khỏi việc ghép origin. */
export function routePath(route: SiteRoute): string {
  switch (route.kind) {
    case "home":
      return "/";
    case "products":
      return route.productSlug ? `/san-pham/${route.productSlug}` : "/san-pham";
    case "product":
      return `/san-pham/${route.slug}`;
    case "category":
      return `/danh-muc/${route.slug}`;
    case "gift":
      return "/thiet-ke";
    case "about":
      return "/gioi-thieu";
    case "news": {
      if (route.topic) return `/tin-tuc/chu-de/${route.topic}`;
      return "/tin-tuc";
    }
    case "article":
      return `/tin-tuc/${route.slug}`;
    case "contact":
      return "/lien-he";
    case "unsubscribe":
      return "/huy-nhan-tin";
    case "admin":
      return "/admin";
    default:
      return "/";
  }
}

export type RedirectRule = { fromPath: string; toPath: string; status: 301 | 308 };

export function findRedirect(pathname: string, rules: RedirectRule[]): RedirectRule | undefined {
  return rules.find((rule) => rule.fromPath === pathname);
}

/** Chặn vòng lặp/gộp chuỗi redirect về đích cuối (B11). */
export function resolveRedirectTarget(pathname: string, rules: RedirectRule[], maxHops = 10): { toPath: string; status: 301 | 308 } | null {
  let current = pathname;
  let status: 301 | 308 = 308;
  const visited = new Set([pathname]);
  for (let hop = 0; hop < maxHops; hop += 1) {
    const rule = findRedirect(current, rules);
    if (!rule) return current === pathname ? null : { toPath: current, status };
    if (visited.has(rule.toPath)) return null;
    visited.add(rule.toPath);
    status = rule.status === 301 ? 301 : status;
    current = rule.toPath;
  }
  return null;
}
