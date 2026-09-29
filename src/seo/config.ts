/**
 * Cấu hình SEO dùng chung cho client và server.
 *
 * - Một origin tin cậy duy nhất sinh canonical/OG/sitemap; không đọc Host header
 *   để tạo URL canonical (B15).
 * - Chỉ host nằm trong danh sách được index; localhost/preview mặc định noindex.
 * - Không chứa bí mật. Chỉ dùng publishable/anon key cho dữ liệu công khai.
 */

export const DEFAULT_SITE_ORIGIN = "https://asintaybac.com";

export type SeoRuntimeEnv = Record<string, string | undefined>;

export type SeoEnvironment = {
  canonicalOrigin: string;
  canonicalHost: string;
  indexableHosts: string[];
  indexingEnabled: boolean;
  supabaseUrl: string;
  supabasePublicKey: string;
};

function readImportMetaEnv(): SeoRuntimeEnv {
  try {
    // Vite chỉ thay thế tham chiếu import.meta.env trực tiếp, không qua alias import.meta.
    return (import.meta.env as unknown as SeoRuntimeEnv) ?? {};
  } catch {
    return {};
  }
}

function readProcessEnv(): SeoRuntimeEnv {
  try {
    if (typeof process === "undefined" || !process.env) return {};
    return process.env as SeoRuntimeEnv;
  } catch {
    return {};
  }
}

/**
 * Biến `process.env` (server) được ưu tiên cho giá trị chỉ có ở runtime;
 * biến `import.meta.env` (Vite) là fallback để bản build tĩnh vẫn có cấu hình.
 */
export function readSeoEnv(): SeoRuntimeEnv {
  return { ...readImportMetaEnv(), ...readProcessEnv() };
}

export function normalizeOrigin(value: string | undefined | null): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    return `${url.protocol}//${url.host}`;
  } catch {
    return "";
  }
}

export function hostWithoutPort(host: string | undefined | null): string {
  return (host ?? "").trim().toLowerCase().replace(/:\d+$/, "");
}

export function getSeoEnvironment(env: SeoRuntimeEnv = readSeoEnv()): SeoEnvironment {
  const canonicalOrigin =
    normalizeOrigin(env.SITE_URL) ||
    normalizeOrigin(env.VITE_SITE_URL) ||
    DEFAULT_SITE_ORIGIN;
  const canonicalHost = hostWithoutPort(new URL(canonicalOrigin).host);
  const alternateHost = canonicalHost.startsWith("www.")
    ? canonicalHost.slice(4)
    : `www.${canonicalHost}`;

  const extraHosts = (env.ASIN_SEO_INDEX_HOSTS ?? env.VITE_SEO_INDEX_HOSTS ?? "")
    .split(",")
    .map((host) => hostWithoutPort(host))
    .filter(Boolean);

  const indexableHosts = [...new Set([canonicalHost, alternateHost, ...extraHosts])];

  return {
    canonicalOrigin,
    canonicalHost,
    indexableHosts,
    // Mở index chủ động sau khi duyệt nội dung. Cùng một biến build/runtime.
    indexingEnabled: env.VITE_SEO_INDEX_ENABLED === "true",
    supabaseUrl: (env.SUPABASE_URL || env.VITE_SUPABASE_URL || "").trim().replace(/\/+$/, ""),
    supabasePublicKey:
      env.SUPABASE_PUBLISHABLE_KEY ||
      env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      env.SUPABASE_ANON_KEY ||
      "",
  };
}

/** Host có được phép index không (localhost, *.vercel.app, preview mặc định là không). */
export function isIndexableHost(host: string | undefined | null, env: SeoEnvironment = getSeoEnvironment()): boolean {
  return env.indexingEnabled && isProductionHost(host, env);
}

/** Analytics không phụ thuộc công tắc mở index; local/preview luôn bị loại. */
export function isProductionHost(host: string | undefined | null, env: SeoEnvironment = getSeoEnvironment()): boolean {
  const clean = hostWithoutPort(host);
  if (!clean || clean === "localhost" || clean === "127.0.0.1" || clean.endsWith(".local") || clean.endsWith(".vercel.app")) return false;
  return env.indexableHosts.includes(clean);
}

export function hasSiteDataConfig(env: SeoEnvironment = getSeoEnvironment()): boolean {
  return Boolean(env.supabaseUrl && env.supabasePublicKey);
}

/** Origin để dùng khi chạy local/dev (không rò lên canonical production). */
export function resolveDisplayOrigin(requestHost: string | undefined, env: SeoEnvironment = getSeoEnvironment()): string {
  const clean = hostWithoutPort(requestHost);
  if (clean === "localhost" || clean === "127.0.0.1" || clean.endsWith(".local")) {
    return `http://${requestHost}`;
  }
  return env.canonicalOrigin;
}
