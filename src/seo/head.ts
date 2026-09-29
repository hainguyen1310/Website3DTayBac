/** Sinh head tags từ SeoMeta cho HTML server và áp dụng tương tự trên client (B02). */

import type { SeoMeta } from "./types.ts";

export function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function escapeHtmlText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** JSON-LD an toàn khi nhúng vào HTML: không cho `</script>` hoặc ký tự điều khiển. */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function tag(name: string, attrs: Record<string, string | undefined>, selfClosing = true): string {
  const body = Object.entries({ ...attrs, "data-asin-seo": attrs.name || attrs.property || attrs.rel })
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${key}="${escapeHtmlAttribute(String(value))}"`)
    .join(" ");
  return selfClosing ? `<${name}${body ? ` ${body}` : ""}>` : `<${name}${body ? ` ${body}` : ""}></${name}>`;
}

export const SEO_HEAD_MARKER_START = "<!--seo:head:start-->";
export const SEO_HEAD_MARKER_END = "<!--seo:head:end-->";

export function renderHeadTags(meta: SeoMeta): string {
  const tags: string[] = [
    `<title>${escapeHtmlText(meta.title)}</title>`,
    tag("meta", { name: "description", content: meta.description }),
    tag("meta", { name: "robots", content: meta.robots }),
    tag("link", { rel: "canonical", href: meta.canonical }),
    tag("meta", { property: "og:type", content: meta.ogType }),
    tag("meta", { property: "og:site_name", content: "A Sỉn Tây Bắc" }),
    tag("meta", { property: "og:locale", content: "vi_VN" }),
    tag("meta", { property: "og:title", content: meta.ogTitle }),
    tag("meta", { property: "og:description", content: meta.ogDescription }),
    tag("meta", { property: "og:url", content: meta.canonical }),
    tag("meta", { property: "og:image", content: meta.ogImage.url }),
    tag("meta", { name: "twitter:card", content: meta.twitterCard }),
    tag("meta", { name: "twitter:title", content: meta.ogTitle }),
    tag("meta", { name: "twitter:description", content: meta.ogDescription }),
    tag("meta", { name: "twitter:image", content: meta.ogImage.url }),
  ];
  if (meta.ogImage.alt) tags.push(tag("meta", { property: "og:image:alt", content: meta.ogImage.alt }));
  if (meta.ogImage.width) tags.push(tag("meta", { property: "og:image:width", content: String(meta.ogImage.width) }));
  if (meta.ogImage.height) tags.push(tag("meta", { property: "og:image:height", content: String(meta.ogImage.height) }));
  if (meta.article?.publishedTime) tags.push(tag("meta", { property: "article:published_time", content: meta.article.publishedTime }));
  if (meta.article?.modifiedTime) tags.push(tag("meta", { property: "article:modified_time", content: meta.article.modifiedTime }));
  if (meta.article?.author) tags.push(tag("meta", { property: "article:author", content: meta.article.author }));
  if (meta.article?.section) tags.push(tag("meta", { property: "article:section", content: meta.article.section }));
  for (const node of meta.jsonLd) {
    tags.push(
      `<script type="application/ld+json" data-asin-seo-jsonld="">${serializeJsonLd(node)}</script>`,
    );
  }
  return tags.join("\n    ");
}

/** Chèn head + nội dung server vào template index.html. */
export function injectSeoIntoHtml(
  template: string,
  headHtml: string,
  rootHtml: string,
  htmlAttributes?: Record<string, string>,
): string {
  let output = template;
  const headBlock = `${SEO_HEAD_MARKER_START}\n    ${headHtml}\n    ${SEO_HEAD_MARKER_END}`;
  if (output.includes(SEO_HEAD_MARKER_START)) {
    output = output.replace(
      new RegExp(`${SEO_HEAD_MARKER_START}[\\s\\S]*?${SEO_HEAD_MARKER_END}`),
      headBlock,
    );
  } else {
    output = output.replace("</head>", `    ${headBlock}\n  </head>`);
  }
  // Bỏ title/description tĩnh để không nhân đôi khi template được chèn thủ công.
  if (!output.includes(SEO_HEAD_MARKER_START)) {
    output = output.replace(/<title>[\s\S]*?<\/title>\s*/i, "");
  }
  output = output.replace(
    /<div id="root">[\s\S]*?<\/div>/i,
    `<div id="root">${rootHtml}</div>`,
  );
  if (htmlAttributes) {
    output = output.replace(/<html\b[^>]*>/i, (match) => {
      let next = match;
      for (const [key, value] of Object.entries(htmlAttributes)) {
        const pattern = new RegExp(`\\s${key}="[^"]*"`, "i");
        if (pattern.test(next)) next = next.replace(pattern, ` ${key}="${escapeHtmlAttribute(value)}"`);
        else next = next.replace(/>$/, ` ${key}="${escapeHtmlAttribute(value)}">`);
      }
      return next;
    });
  }
  return output;
}

/* ------------------------------------------------------------------ */
/* Client: áp dụng cùng SeoMeta vào document.head                      */
/* ------------------------------------------------------------------ */

const MANAGED = "data-asin-seo";

function setMeta(attr: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]:not([${MANAGED}])`);
  if (element) {
    // Thẻ tĩnh trong shell bị thay thế hẳn để không nhân đôi description/robots.
    element.remove();
    element = null;
  }
  element = document.head.querySelector<HTMLMetaElement>(`meta[${MANAGED}="${key}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attr, key);
    element.setAttribute(MANAGED, key);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

function setLink(rel: string, href: string) {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]:not([${MANAGED}])`);
  if (element) {
    element.remove();
    element = null;
  }
  element = document.head.querySelector<HTMLLinkElement>(`link[${MANAGED}="${rel}"]`);
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", rel);
    element.setAttribute(MANAGED, rel);
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
}

/**
 * Cập nhật head khi điều hướng client. Gọi với `null` để gỡ toàn bộ thẻ do SEO
 * quản lý (dùng khi vào khu vực admin hoặc trang không cần metadata riêng).
 */
export function applySeoMeta(meta: SeoMeta | null): void {
  for (const element of document.head.querySelectorAll(`[${MANAGED}]`)) {
    element.remove();
  }
  for (const element of document.head.querySelectorAll('script[type="application/ld+json"][data-asin-seo-jsonld]')) {
    element.remove();
  }
  if (!meta) return;

  document.title = meta.title;
  setMeta("name", "description", meta.description);
  setMeta("name", "robots", meta.robots);
  setLink("canonical", meta.canonical);
  setMeta("property", "og:type", meta.ogType);
  setMeta("property", "og:site_name", "A Sỉn Tây Bắc");
  setMeta("property", "og:locale", "vi_VN");
  setMeta("property", "og:title", meta.ogTitle);
  setMeta("property", "og:description", meta.ogDescription);
  setMeta("property", "og:url", meta.canonical);
  setMeta("property", "og:image", meta.ogImage.url);
  setMeta("name", "twitter:card", meta.twitterCard);
  setMeta("name", "twitter:title", meta.ogTitle);
  setMeta("name", "twitter:description", meta.ogDescription);
  setMeta("name", "twitter:image", meta.ogImage.url);
  if (meta.ogImage.alt) setMeta("property", "og:image:alt", meta.ogImage.alt);
  if (meta.article?.publishedTime) setMeta("property", "article:published_time", meta.article.publishedTime);
  if (meta.article?.modifiedTime) setMeta("property", "article:modified_time", meta.article.modifiedTime);
  if (meta.article?.author) setMeta("property", "article:author", meta.article.author);
  if (meta.article?.section) setMeta("property", "article:section", meta.article.section);

  for (const node of meta.jsonLd) {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-asin-seo-jsonld", "");
    script.textContent = serializeJsonLd(node);
    document.head.appendChild(script);
  }
}
