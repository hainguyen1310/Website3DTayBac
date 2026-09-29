/**
 * Kiểu bài viết công khai dùng chung cho client (storeApi) và renderer server.
 * Một mapper duy nhất giữ HTML/schema/sitemap dùng cùng dữ liệu ngày và nội dung.
 */

import { parseArticleBody } from "./blocks.ts";
import type { ArticleBody } from "./blocks.ts";
import { slugify } from "../operations.ts";

export type ArticleRow = {
  id: string;
  slug: string;
  tag: string;
  tag_slug?: string | null;
  title: string;
  excerpt: string;
  image_url: string;
  read_time_minutes: number;
  body: unknown;
  published?: boolean;
  published_at: string | null;
  first_published_at?: string | null;
  scheduled_at?: string | null;
  content_modified_at?: string | null;
  author_name?: string | null;
  source_name?: string | null;
  source_url?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  social_image_url?: string | null;
  social_title?: string | null;
  social_description?: string | null;
  canonical_path?: string | null;
  related_product_slugs?: unknown;
  related_article_slugs?: unknown;
};

export type PublishedArticle = {
  id: string;
  slug: string;
  tag: string;
  tagSlug: string;
  date: string;
  dateIso: string | null;
  publishedAt: string | null;
  modifiedAt: string | null;
  title: string;
  excerpt: string;
  image: string;
  imageAlt: string;
  readTime: string;
  readMinutes: number;
  body: ArticleBody;
  authorName: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  socialImageUrl: string | null;
  socialTitle: string | null;
  socialDescription: string | null;
  relatedProductSlugs: string[];
  relatedArticleSlugs: string[];
  sourceName: string | null;
  sourceUrl: string | null;
  canonicalPath: string | null;
};

/** Tách ra để test thuần và tránh phụ thuộc Intl trên môi trường lạ. */
export function formatVietnameseDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  })
    .format(date)
    .replaceAll("/", ".");
}

export const ARTICLE_PUBLIC_COLUMNS =
  "id, slug, tag, tag_slug, title, excerpt, image_url, read_time_minutes, body, published, published_at, first_published_at, scheduled_at, content_modified_at, author_name, source_name, source_url, seo_title, seo_description, social_image_url, social_title, social_description, canonical_path, related_product_slugs, related_article_slugs";

const stringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

export function articleFromRow(row: ArticleRow): PublishedArticle {
  const effectivePublishedAt = row.first_published_at ?? row.published_at;
  const products = stringArray(row.related_product_slugs);
  return {
    id: row.slug,
    slug: row.slug,
    tag: row.tag,
    tagSlug: row.tag_slug || slugify(row.tag),
    date: formatVietnameseDate(effectivePublishedAt),
    dateIso: effectivePublishedAt ? new Date(effectivePublishedAt).toISOString() : null,
    publishedAt: effectivePublishedAt,
    modifiedAt: row.content_modified_at ?? null,
    title: row.title,
    excerpt: row.excerpt,
    image: row.image_url,
    imageAlt: row.title,
    readTime: `${row.read_time_minutes} phút đọc`,
    readMinutes: Number(row.read_time_minutes) || 1,
    body: parseArticleBody(row.body),
    authorName: row.author_name ?? null,
    seoTitle: row.seo_title ?? null,
    seoDescription: row.seo_description ?? null,
    socialImageUrl: row.social_image_url ?? null,
    socialTitle: row.social_title ?? null,
    socialDescription: row.social_description ?? null,
    relatedProductSlugs: products,
    relatedArticleSlugs: stringArray(row.related_article_slugs),
    sourceName: row.source_name ?? null,
    sourceUrl: row.source_url ?? null,
    canonicalPath: row.canonical_path ?? null,
  };
}

/** Thời điểm hiệu lực để hiển thị/lên lịch (B09): scheduled_at khi hẹn giờ. */
export function articleEffectiveTime(row: Pick<ArticleRow, "scheduled_at" | "published_at" | "first_published_at">): string | null {
  return row.scheduled_at ?? row.first_published_at ?? row.published_at ?? null;
}
