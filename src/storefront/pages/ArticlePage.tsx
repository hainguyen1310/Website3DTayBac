import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CalendarDays, Check, Clock3, Facebook, Link2, Share2, UserRound } from "lucide-react";
import { useDocumentSeo } from "../../hooks/useDocumentSeo";
import { articleMeta, noindexMeta } from "../../seo/meta";
import { MEDIA } from "../content";
import { usePublishedArticle, usePublishedArticleFeed } from "../../hooks/usePublishedArticles";
import { getPublishedArticlesBySlugs } from "../../services/storeApi";
import type { PublishedArticle } from "../../content/article";
import { ArticleBlocks } from "../../content/ArticleBlocks";
import { trackEvent } from "../../analytics";
import { Contours, Eyebrow, NewsletterBand, WhyBand } from "../ui";

export function ArticlePage() {
  const { storyId } = useParams();
  return <ArticleReader key={storyId} slug={storyId} />;
}

const displayDate = (value: string | null) => value ? new Intl.DateTimeFormat("vi-VN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(value)) : "";

function ArticleReader({ slug }: { slug: string | undefined }) {
  const { article, loading, error, reload } = usePublishedArticle(slug);
  useDocumentSeo((ctx) => article ? articleMeta(ctx, article) : noindexMeta(ctx, "Bài viết — A Sỉn"), [article], !loading);
  useEffect(() => {
    if (article) trackEvent("article_view", { article_id: article.slug, article_slug: article.slug, topic: article.tag });
  }, [article]);
  if (loading || error || !article) return <main className="sf-page"><div className="sf-container sf-section" role="status">
    <h1>{loading ? "Đang tải bài viết…" : error ? "Chưa tải được bài viết" : "Bài viết chưa có ở đây"}</h1>
    <p>{error ? "Bạn hãy thử tải lại sau ít phút." : !loading ? "Bài viết có thể đã được ẩn hoặc chưa xuất bản." : ""}</p>
    {error && <button type="button" className="sf-chip" onClick={reload}>Thử lại</button>} <Link to="/tin-tuc">Về trang tin tức</Link>
  </div></main>;
  return <ArticleView article={article} />;
}

function ArticleView({ article }: { article: PublishedArticle }) {
  const { articles: recent } = usePublishedArticleFeed(6);
  const [selected, setSelected] = useState<PublishedArticle[]>([]);
  useEffect(() => {
    let active = true;
    void getPublishedArticlesBySlugs(article.relatedArticleSlugs).then((items) => { if (active) setSelected(items); });
    return () => { active = false; };
  }, [article.relatedArticleSlugs]);
  const related = [...selected, ...recent].filter((item, index, all) => item.slug !== article.slug && all.findIndex((candidate) => candidate.slug === item.slug) === index).slice(0, 5);
  return (
    <main className="sf-page sf-article-page">
      <section className="sf-article-head">
        <Contours src={MEDIA.contours.pageHero} className="sf-article-contours" />
        <div className="sf-container">
          <nav className="sf-breadcrumb" aria-label="Breadcrumb">
            <Link to="/">Trang chủ</Link> <span aria-hidden="true">›</span> <Link to="/tin-tuc">Tin tức</Link> <span aria-hidden="true">›</span> <span aria-current="page">{article.title}</span>
          </nav>
          <Eyebrow>{article.tag}</Eyebrow>
          <h1 className="sf-article-title">{article.title}</h1>
          <ul className="sf-article-meta">
            <li><CalendarDays size={15} strokeWidth={1.6} aria-hidden="true" /> <time dateTime={article.publishedAt ?? undefined}>{displayDate(article.publishedAt)}</time></li>
            <li><UserRound size={15} strokeWidth={1.6} aria-hidden="true" /> {article.authorName ?? "A SỈN"}</li>
            <li><Clock3 size={15} strokeWidth={1.6} aria-hidden="true" /> {article.readTime}</li>
          </ul>
        </div>
      </section>

      <div className="sf-container sf-article-layout">
        <article className="sf-article-body" aria-label={article.title}>
          <figure className="sf-article-hero">
            <img src={article.image} alt={article.imageAlt} width={1800} height={1200} fetchPriority="high" />
          </figure>
          <ArticleBlocks body={article.body} onCta={(href, productId, index) => trackEvent("article_cta_click", { article: article.slug, position: index, destination: href, product_id: productId || undefined })} />
          {article.relatedProductSlugs.length > 0 && <nav className="sf-article-products" aria-label="Sản vật trong bài">{article.relatedProductSlugs.map((slug) => <Link key={slug} to={`/san-pham/${slug}`}>Khám phá {slug.replaceAll("-", " ")} →</Link>)}</nav>}
          {article.sourceUrl && <p>Nguồn tham khảo: <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer">{article.sourceName || article.sourceUrl}</a></p>}
        </article>

        <aside className="sf-article-aside">
          <section className="sf-aside-card">
            <h2>Bài viết liên quan</h2>
            <ul className="sf-aside-posts">
              {related.map((item) => (
                <li key={item.slug}>
                  <Link to={`/tin-tuc/${item.slug}`}>
                    <img src={item.image} alt="" loading="lazy" width={160} height={120} />
                    <span>
                      <small>{displayDate(item.publishedAt)}</small>
                      <strong>{item.title}</strong>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <ShareCard title={article.title} />
        </aside>
      </div>

      <NewsletterBand />
      <WhyBand />
    </main>
  );
}

function ShareCard({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window === "undefined" ? "" : window.location.href;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  const nativeShare = () => {
    if (navigator.share) void navigator.share({ title, url }).catch(() => undefined);
    else void copy();
  };
  return (
    <section className="sf-aside-card">
      <h2>Chia sẻ bài viết</h2>
      <div className="sf-share">
        <a className="is-facebook" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" aria-label="Chia sẻ lên Facebook">
          <Facebook size={16} />
        </a>
        <a className="is-pinterest" href={`https://www.pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&description=${encodeURIComponent(title)}`} target="_blank" rel="noopener noreferrer" aria-label="Lưu lên Pinterest">
          P
        </a>
        <button type="button" className="is-link" onClick={copy} aria-label={copied ? "Đã sao chép liên kết" : "Sao chép liên kết"}>
          {copied ? <Check size={16} /> : <Link2 size={16} />}
        </button>
        <button type="button" className="is-share" onClick={nativeShare} aria-label="Chia sẻ">
          <Share2 size={16} />
        </button>
      </div>
      {copied && <p role="status">Đã sao chép liên kết.</p>}
    </section>
  );
}
