import { ARTICLES } from "../storefront/content.ts";
import type { StaticArticle } from "../storefront/content.ts";
import type { ContentBlock } from "./blocks.ts";

/** Nguồn biên tập để nhập CMS và làm mẫu soạn bài; website đọc bản đã lưu trong CMS. */
export function editorialBody(article: StaticArticle): ContentBlock[] {
  const body: ContentBlock[] = [
    { type: "paragraph", text: article.caption ?? article.body[0] ?? article.excerpt, style: "lead" },
    ...article.body.slice(article.caption ? 0 : 1).map((text): ContentBlock => ({ type: "paragraph", text })),
  ];
  for (const section of article.sections ?? []) {
    body.push({ type: "heading", level: 2, text: section.heading });
    body.push(...section.paragraphs.map((text): ContentBlock => ({ type: "paragraph", text })));
    if (section.images) body.push({ type: "image-pair", images: [
      { url: section.images[0], alt: `${article.title} — ảnh 1`, caption: "" },
      { url: section.images[1], alt: `${article.title} — ảnh 2`, caption: "" },
    ] });
  }
  if (article.quote) body.push({ type: "quote", text: article.quote });
  return body;
}

export const referenceArticleBody = () => structuredClone(editorialBody(ARTICLES[0]));

export const editorialArticles = ARTICLES.map((article) => ({
  slug: article.slug,
  title: article.title,
  tag: article.topic,
  excerpt: article.excerpt,
  image_url: article.image,
  body: editorialBody(article),
  author_name: "A SỈN",
  read_time_minutes: article.slug === "hanh-trinh-mang-dac-san-tay-bac" ? 5 : 3,
}));
