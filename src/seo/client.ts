import { getSeoEnvironment, isIndexableHost } from "./config";
import { absoluteUrl } from "./paths";
import type { SeoContext } from "./types";

/** Bối cảnh SEO phía client; cùng origin/host policy với renderer server (B02/B15). */
export function clientSeoContext(content: Record<string, string>): SeoContext {
  const env = getSeoEnvironment();
  const host = typeof location !== "undefined" ? location.hostname : "";
  const social = ["facebook", "tiktok", "instagram", "youtube"]
    .map((key) => content[`social.${key}`])
    .filter((value): value is string => Boolean(value && /^https?:\/\//i.test(value)));
  return {
    origin: env.canonicalOrigin,
    indexable: isIndexableHost(host, env),
    brand: {
      name: "A Sỉn",
      description: "Đặc sản gác bếp, gia vị núi rừng và những món quà mang dấu ấn Tây Bắc.",
    },
    contact: {
      phone: content["contact.phone"] || undefined,
      email: content["contact.email"] || undefined,
      address: content["contact.address"] || undefined,
    },
    social,
    logoUrl: absoluteUrl(env.canonicalOrigin, "/favicon.svg"),
    defaultImage: {
      url: absoluteUrl(env.canonicalOrigin, content["hero.image"] || "/images/asin/journey-panorama.webp"),
      alt: "A Sỉn — Tinh hoa Tây Bắc",
    },
  };
}
