/**
 * Dữ liệu và quy tắc của form soạn bài, tách khỏi giao diện để dễ kiểm thử.
 */

import { slugify } from "../operations.ts";
import type { AdminArticle, ArticleInput } from "../services/adminApi.ts";
import { blocksToPlainText, estimateReadMinutes, toBlocks, validateArticleBody } from "../content/blocks.ts";
import type { ContentBlock } from "../content/blocks.ts";
import { externalImageCount } from "./editor/convert.ts";

export const ARTICLE_TOPICS = ["Câu chuyện A SỈN", "Văn hoá – Ẩm thực", "Nguồn nguyên liệu", "Hoạt động cộng đồng", "Kinh nghiệm – Mẹo hay", "Từ bản làng", "Gợi ý tặng quà", "Vị Tây Bắc"];

export const SEO_TITLE_MAX = 60;
export const SEO_DESCRIPTION_MIN = 70;
export const SEO_DESCRIPTION_MAX = 160;

export type PublishMode = "draft" | "now" | "schedule";

export type ArticleForm = {
  id: string | null;
  updatedAt: string | null;
  archived: boolean;
  slug: string;
  slugTouched: boolean;
  tag: string;
  title: string;
  excerpt: string;
  imageUrl: string;
  body: ContentBlock[];
  mode: PublishMode;
  scheduledAt: string | null;
  firstPublishedAt: string | null;
  contentModifiedAt: string | null;
  authorName: string;
  seoTitle: string;
  seoDescription: string;
  socialImageUrl: string;
  socialTitle: string;
  socialDescription: string;
  sourceName: string;
  sourceUrl: string;
  canonicalPath: string;
  relatedProductSlugs: string[];
  relatedArticleSlugs: string[];
};

export const isFutureArticle = (article: Pick<AdminArticle, "scheduledAt" | "publishedAt">): boolean => {
  const release = article.scheduledAt || article.publishedAt;
  return Boolean(release && new Date(release).getTime() > Date.now());
};

export const emptyArticleForm = (): ArticleForm => ({
  id: null,
  updatedAt: null,
  archived: false,
  slug: "",
  slugTouched: false,
  tag: "",
  title: "",
  excerpt: "",
  imageUrl: "",
  body: [],
  mode: "draft",
  scheduledAt: null,
  firstPublishedAt: null,
  contentModifiedAt: null,
  authorName: "",
  seoTitle: "",
  seoDescription: "",
  socialImageUrl: "",
  socialTitle: "",
  socialDescription: "",
  sourceName: "",
  sourceUrl: "",
  canonicalPath: "",
  relatedProductSlugs: [],
  relatedArticleSlugs: [],
});

export const articleToForm = (article: AdminArticle): ArticleForm => ({
  id: article.id,
  updatedAt: article.updatedAt,
  archived: article.archived,
  slug: article.slug,
  slugTouched: true,
  tag: article.tag,
  title: article.title,
  excerpt: article.excerpt,
  imageUrl: article.imageUrl,
  body: toBlocks(article.body),
  mode: !article.published ? "draft" : isFutureArticle(article) ? "schedule" : "now",
  scheduledAt: article.scheduledAt,
  firstPublishedAt: article.firstPublishedAt ?? article.publishedAt,
  contentModifiedAt: article.contentModifiedAt,
  authorName: article.authorName ?? "",
  seoTitle: article.seoTitle ?? "",
  seoDescription: article.seoDescription ?? "",
  socialImageUrl: article.socialImageUrl ?? "",
  socialTitle: article.socialTitle ?? "",
  socialDescription: article.socialDescription ?? "",
  sourceName: article.sourceName ?? "",
  sourceUrl: article.sourceUrl ?? "",
  canonicalPath: article.canonicalPath ?? "",
  relatedProductSlugs: article.relatedProductSlugs,
  relatedArticleSlugs: article.relatedArticleSlugs,
});

/** Slug tự theo tiêu đề cho tới khi người dùng sửa tay. */
export const withTitle = (form: ArticleForm, title: string): ArticleForm => ({
  ...form,
  title,
  slug: form.slugTouched ? form.slug : slugify(title).slice(0, 80).replace(/-+$/, ""),
});

export const formToInput = (form: ArticleForm): ArticleInput => ({
  slug: form.slug.trim(),
  tag: form.tag.trim(),
  title: form.title.trim(),
  excerpt: form.excerpt.trim(),
  imageUrl: form.imageUrl.trim(),
  readTimeMinutes: estimateReadMinutes(form.body),
  body: form.body,
  published: form.mode !== "draft",
  scheduledAt: form.mode === "schedule" ? form.scheduledAt : null,
  authorName: form.authorName,
  seoTitle: form.seoTitle,
  seoDescription: form.seoDescription,
  socialImageUrl: form.socialImageUrl,
  socialTitle: form.socialTitle,
  socialDescription: form.socialDescription,
  sourceName: form.sourceName,
  sourceUrl: form.sourceUrl,
  canonicalPath: form.canonicalPath,
  relatedProductSlugs: form.relatedProductSlugs,
  relatedArticleSlugs: form.relatedArticleSlugs,
});

export const wordCount = (body: ContentBlock[]) => blocksToPlainText(body).split(/\s+/).filter(Boolean).length;

export type CheckItem = { id: string; label: string; done: boolean; required: boolean; hint?: string };

/** Danh sách "Sẵn sàng đăng" hiển thị cho người viết. */
export function readinessChecklist(form: ArticleForm): CheckItem[] {
  const words = wordCount(form.body);
  const blocks = form.body;
  const images = blocks.flatMap((block) => block.type === "image" ? [block] : block.type === "image-pair" || block.type === "gallery" ? block.images : []);
  const description = (form.seoDescription || form.excerpt).trim();
  return [
    { id: "title", label: "Có tiêu đề bài viết", done: Boolean(form.title.trim()), required: true },
    { id: "cover", label: "Có ảnh bìa", done: Boolean(form.imageUrl), required: true },
    { id: "tag", label: "Đã chọn chuyên mục", done: Boolean(form.tag.trim()), required: true },
    { id: "excerpt", label: "Có mô tả ngắn", done: Boolean(form.excerpt.trim()), required: true, hint: "Hiện ở danh sách tin tức và trên Google." },
    { id: "words", label: words >= 300 ? `Nội dung ${words} từ` : `Nội dung mới ${words} từ (nên từ 300 từ)`, done: words >= 300, required: false },
    { id: "headings", label: "Có tiêu đề mục để chia phần", done: blocks.some((block) => block.type === "heading"), required: false },
    { id: "description", label: "Mô tả Google dài 70–160 ký tự", done: description.length >= SEO_DESCRIPTION_MIN && description.length <= SEO_DESCRIPTION_MAX, required: false },
    { id: "alt", label: "Ảnh trong bài đều có mô tả", done: images.every((image) => image.alt.trim()), required: false, hint: "Bấm vào ảnh, điền dòng mô tả nhỏ bên dưới." },
    { id: "hosted", label: "Ảnh đã nằm trong kho của A Sỉn", done: externalImageCount(blocks) === 0, required: true, hint: "Ảnh dán từ tài liệu đang được tải hoặc bị lỗi." },
  ];
}

/** Lỗi chặn lưu; bản nháp chỉ cần tiêu đề, bài đăng cần đủ thông tin. */
export function blockingErrors(form: ArticleForm): string[] {
  const errors: string[] = [];
  const publishing = form.mode !== "draft";
  if (!form.title.trim()) errors.push("Hãy nhập tiêu đề bài viết.");
  if (!form.slug.trim()) errors.push("Đường dẫn bài viết đang trống.");
  else if (!/^[a-z0-9-]+$/.test(form.slug.trim())) errors.push("Đường dẫn chỉ gồm chữ thường không dấu, số và dấu gạch ngang.");
  if (publishing) {
    if (!form.tag.trim()) errors.push("Chọn chuyên mục trước khi đăng.");
    if (!form.excerpt.trim()) errors.push("Viết mô tả ngắn trước khi đăng.");
    if (!form.imageUrl.trim()) errors.push("Chọn ảnh bìa trước khi đăng.");
    if (form.mode === "schedule" && !form.scheduledAt) errors.push("Chọn ngày giờ hẹn đăng.");
    if (form.mode === "schedule" && form.scheduledAt && new Date(form.scheduledAt).getTime() <= Date.now()) errors.push("Giờ hẹn đăng phải ở tương lai.");
  }
  const external = externalImageCount(form.body);
  if (external) errors.push(`Còn ${external} ảnh chưa vào kho ảnh của A Sỉn (đang tải hoặc bị lỗi). Đợi tải xong hoặc chọn ảnh thay thế.`);
  errors.push(...validateArticleBody(form.body, { publishing }).errors);
  if (form.sourceUrl.trim() && !/^https?:\/\//i.test(form.sourceUrl.trim())) errors.push("Link nguồn tham khảo phải bắt đầu bằng https://");
  if (form.canonicalPath.trim() && !/^\/[a-z0-9/.-]*$/.test(form.canonicalPath.trim())) errors.push("Canonical riêng phải là đường dẫn bắt đầu bằng /.");
  return errors;
}

export const DRAFT_STORAGE_PREFIX = "asin:article-draft:";
export const draftKey = (id: string | null) => `${DRAFT_STORAGE_PREFIX}${id ?? "new"}`;
