import { getSeoEnvironment, isProductionHost, readSeoEnv } from "./seo/config.ts";
import type { AnalyticsItem } from "./analyticsItems.ts";

export type AnalyticsEventName = "page_view" | "article_view" | "article_cta_click" | "view_item_list" | "select_item" | "view_item" | "add_to_cart" | "remove_from_cart" | "begin_checkout" | "generate_lead" | "newsletter_signup" | "zalo_click" | "phone_click" | "purchase" | "refund";
type Scalar = string | number | boolean;
export type AnalyticsParams = Record<string, Scalar | AnalyticsItem[] | undefined>;

declare global {
  interface Window { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void; }
}

let initialized = false;
let measurementId = "";
let lastPage = "";
const sentPurchases = new Set<string>();
let viewUrl = "";
const viewEvents = new Set<string>();
const privatePath = (path: string) => /^\/admin(?:\/|$)/.test(path) || path === "/huy-nhan-tin";
const hasContactData = (value: string) => /@|(?:^|\D)(?:\+?84|0)\d{9}(?:\D|$)/.test(value);

export function getMeasurementId(): string { return (readSeoEnv().VITE_GA4_ID ?? "").trim(); }

export function isAnalyticsEnabled(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined" && /^G-[A-Z0-9]+$/.test(measurementId) && !privatePath(window.location.pathname) && isProductionHost(window.location.hostname, getSeoEnvironment());
}

/** Loại query tìm kiếm, token, thông tin khách hàng; giữ attribution hợp lệ. */
export function analyticsUrl(value: string, origin: string): string {
  const url = new URL(value, origin);
  const safe = new URL(`${url.origin}${url.pathname}`);
  for (const [key, item] of url.searchParams) {
    if (/^(utm_(source|medium|campaign|term|content|id)|gclid|fbclid|msclkid|page)$/.test(key) && !hasContactData(item)) safe.searchParams.set(key, item.slice(0, 120));
  }
  return safe.href;
}

export function initAnalytics(): void {
  measurementId = getMeasurementId();
  const enabled = isAnalyticsEnabled();
  if (typeof window !== "undefined" && measurementId) (window as unknown as Record<string, unknown>)[`ga-disable-${measurementId}`] = !enabled;
  if (!enabled) { lastPage = ""; viewUrl = ""; viewEvents.clear(); return; }
  if (initialized) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = (...args: unknown[]) => { window.dataLayer?.push(args); };
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);
  window.gtag("js", new Date());
  window.gtag("config", measurementId, { send_page_view: false, currency: "VND", page_location: analyticsUrl(window.location.href, window.location.origin), page_referrer: document.referrer ? analyticsUrl(document.referrer, window.location.origin) : "" });
  initialized = true;
}

export function cleanAnalyticsParams(params: AnalyticsParams): AnalyticsParams {
  const output: AnalyticsParams = {};
  for (const [key, value] of Object.entries(params)) {
    if (/email|phone|address|recipient|message|customer|token/i.test(key) || value === undefined) continue;
    if (key === "items" && Array.isArray(value)) {
      output.items = value.slice(0, 200).flatMap(item => {
        if (!item.item_id || !Number.isFinite(item.price) || item.price < 0 || !Number.isFinite(item.quantity) || item.quantity <= 0) return [];
        const clean: Record<string, Scalar> = {};
        for (const name of ["item_id", "item_name", "item_category", "item_variant", "price", "quantity", "index"] as const) {
          const field = item[name];
          if (typeof field === "string" && !hasContactData(field)) clean[name] = field.slice(0, 100);
          else if (typeof field === "number" && Number.isFinite(field)) clean[name] = field;
        }
        return clean.item_id ? [clean as AnalyticsItem] : [];
      });
    } else if (typeof value === "string" && !hasContactData(value)) output[key] = value.slice(0, 120);
    else if (typeof value === "number" && Number.isFinite(value) || typeof value === "boolean") output[key] = value;
  }
  return output;
}

export function trackEvent(name: AnalyticsEventName, params: AnalyticsParams = {}): boolean {
  initAnalytics();
  if (!initialized || !isAnalyticsEnabled() || !window.gtag) return false;
  const clean = cleanAnalyticsParams(params);
  if (["view_item", "view_item_list", "article_view"].includes(name)) {
    if (viewUrl !== window.location.href) { viewUrl = window.location.href; viewEvents.clear(); }
    const key = `${name}:${JSON.stringify(clean)}`;
    if (viewEvents.has(key)) return false;
    viewEvents.add(key);
  }
  window.gtag("event", name, { ...clean, page_location: analyticsUrl(window.location.href, window.location.origin) });
  return true;
}

export function trackPageView(url: string): void {
  initAnalytics();
  if (typeof window === "undefined") return;
  const enabled = isAnalyticsEnabled();
  if (measurementId) (window as unknown as Record<string, unknown>)[`ga-disable-${measurementId}`] = !enabled;
  if (!enabled) { lastPage = ""; return; }
  try {
    const parsed = new URL(url, window.location.origin);
    if (privatePath(parsed.pathname) || parsed.origin !== window.location.origin) return;
    const safeUrl = analyticsUrl(parsed.href, window.location.origin);
    if (safeUrl === lastPage) return;
    if (trackEvent("page_view", { page_title: document.title, page_path: new URL(safeUrl).pathname })) lastPage = safeUrl;
  } catch { /* Bỏ URL không hợp lệ. */ }
}

/** Chống lặp trong trình duyệt qua reload/tab; transaction_id vẫn dùng mã đơn DB. */
export function trackPurchaseOnce(transactionId: string, params: AnalyticsParams): void {
  initAnalytics();
  if (!isAnalyticsEnabled() || sentPurchases.has(transactionId)) return;
  const key = `asin:ga4:purchase:${transactionId}`;
  try { if (window.localStorage.getItem(key)) return; } catch { /* Bộ nhớ RAM vẫn chống retry. */ }
  if (!trackEvent("purchase", { ...params, transaction_id: transactionId })) return;
  sentPurchases.add(transactionId);
  try { window.localStorage.setItem(key, "1"); } catch { /* Không chặn đặt hàng nếu storage bị khóa. */ }
}
