/** Kiểu dữ liệu SEO dùng chung giữa renderer server, client và CMS. */

export type SeoImage = {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
};

export type SeoArticleInput = {
  slug: string;
  title: string;
  excerpt: string;
  image: string;
  imageAlt?: string;
  tag: string;
  tagSlug: string;
  publishedAt: string | null;
  modifiedAt: string | null;
  authorName?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  socialImageUrl?: string | null;
  socialTitle?: string | null;
  socialDescription?: string | null;
  canonicalPath?: string | null;
};

export type SeoProductInput = {
  slug: string;
  name: string;
  description: string;
  tag?: string;
  image: string;
  imageAlt?: string;
  sku?: string;
  price: number;
  originalPrice?: number | null;
  inStock?: boolean;
  categoryName?: string;
  categorySlug?: string;
};

export type SeoCategoryInput = {
  slug: string;
  name: string;
  description?: string;
  image?: string;
  products: SeoProductInput[];
};

export type SeoContact = {
  phone?: string;
  email?: string;
  address?: string;
  zaloUrl?: string;
};

export type SeoBrand = {
  name: string;
  description: string;
};

export type SeoContext = {
  origin: string;
  indexable: boolean;
  brand: SeoBrand;
  contact: SeoContact;
  social: string[];
  logoUrl: string;
  defaultImage: SeoImage;
};

export type SeoMeta = {
  title: string;
  description: string;
  canonical: string;
  robots: string;
  ogType: "website" | "article" | "product";
  ogImage: SeoImage;
  ogTitle: string;
  ogDescription: string;
  twitterCard: "summary_large_image" | "summary";
  article?: {
    publishedTime?: string;
    modifiedTime?: string;
    author?: string;
    section?: string;
  };
  jsonLd: Record<string, unknown>[];
};

export function noindexRobots(): string {
  return "noindex, nofollow";
}

export function indexRobots(): string {
  return "index, follow, max-image-preview:large, max-snippet:-1";
}
