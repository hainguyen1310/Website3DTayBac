import type { StaticArticle } from "../content";

export const seoArticle = (article: StaticArticle) => ({
  slug: article.slug,
  title: article.title,
  excerpt: article.excerpt,
  image: article.image,
  tag: article.label,
  tagSlug: article.topic,
  publishedAt: null,
  modifiedAt: null,
});

/** Thời gian đọc ước tính (200 từ/phút). */
export function readingMinutes(article: StaticArticle) {
  const text = [
    article.caption ?? "",
    ...article.body,
    ...(article.sections ?? []).flatMap((section) => [section.heading, ...section.paragraphs]),
    article.quote ?? "",
  ].join(" ");
  return Math.max(1, Math.round(text.split(/\s+/).filter(Boolean).length / 200));
}
