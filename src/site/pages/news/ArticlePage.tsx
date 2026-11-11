import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Icon } from "../../icons";
import { usePublishedArticle, usePublishedArticleFeed } from "../../../hooks/usePublishedArticles";
import { useDocumentSeo } from "../../../hooks/useDocumentSeo";
import { articleMeta, noindexMeta } from "../../../seo/meta";
import { getPublishedArticlesBySlugs } from "../../../services/storeApi";
import { trackEvent } from "../../../analytics";
import type { PublishedArticle } from "../../../content/article";
import { ArticleBlocks } from "../../../content/ArticleBlocks";
import { ArticleCard } from "./NewsPage";

/** Bản gốc hiện 2 bài đọc thêm trong lưới 2 cột (nó chỉ có 3 bài); dữ liệu thật nhiều hơn nên giữ đúng 2. */
const RELATED_LIMIT = 2;

/** Bài đọc thêm: ưu tiên bài biên tập viên chọn, sau đó là các bài mới nhất. */
function useRelatedArticles(article: PublishedArticle | null) {
  const { articles: latest } = usePublishedArticleFeed(RELATED_LIMIT + 1);
  const [chosen, setChosen] = useState<PublishedArticle[]>([]);
  const slugs = article?.relatedArticleSlugs ?? [];
  const key = slugs.join(",");
  useEffect(() => {
    if (!key) {
      setChosen([]);
      return;
    }
    let active = true;
    void getPublishedArticlesBySlugs(key.split(",")).then((items) => { if (active) setChosen(items); }).catch(() => undefined);
    return () => { active = false; };
  }, [key]);
  if (!article) return [];
  const pool = [...chosen, ...latest].filter((item, index, list) => item.slug !== article.slug && list.findIndex((other) => other.slug === item.slug) === index);
  return pool.slice(0, RELATED_LIMIT);
}

function ArticleState({ loading, error, reload }: { loading: boolean; error: boolean; reload: () => void }) {
  return (
    <section className="not-found">
      <span className="eyebrow">CHUYỆN VÙNG CAO</span>
      <h1>{loading ? "Đang mở câu chuyện…" : error ? "Chưa tải được bài viết." : "Chưa tìm thấy bài viết."}</h1>
      {error
        ? <button type="button" className="btn dark" onClick={reload}>Thử lại <Icon name="arrow" /></button>
        : !loading && <a className="btn dark" href="/tin-tuc">Tất cả câu chuyện <Icon name="arrow" /></a>}
    </section>
  );
}

/** Chi tiết bài viết (renderArticle): thân bài từ trình soạn thảo của admin. */
export function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const { article, loading, error, reload } = usePublishedArticle(slug);
  const related = useRelatedArticles(article);
  useDocumentSeo((ctx) => (article ? articleMeta(ctx, article) : noindexMeta(ctx, "Bài viết — A Sỉn")), [article], !loading);
  useEffect(() => {
    if (article) trackEvent("article_view", { article_id: article.slug, article_slug: article.slug, topic: article.tag });
  }, [article]);

  if (!article) return <ArticleState loading={loading} error={error} reload={reload} />;

  return (
    <>
      <article className="pg-article eu-article">
        <section className="eu-article-hero eu-hero uh-hero">
          <img className="eu-hero-image uh-scene-img" src={article.image} alt={article.imageAlt || article.title} fetchPriority="high" />
          <div className="wrap">
            <nav className="pg-crumb" aria-label="Đường dẫn"><a href="/">Trang chủ</a><span>/</span><span aria-current="page">Chuyện vùng cao</span></nav>
            <div className="pg-article-heading uh-hero-copy" data-uh-reveal>
              <a href="/tin-tuc" className="pg-text-link pg-back-link">← Tất cả câu chuyện</a>
              <p className="eyebrow">{article.tag.toLocaleUpperCase("vi")}</p>
              <h1>{article.title}</h1>
              <div className="pg-article-byline">
                <span>{article.authorName || "Ban biên tập A SỈN"}</span>
                {article.dateIso && <time dateTime={article.dateIso}>{article.date}</time>}
              </div>
            </div>
          </div>
        </section>
        <div className="wrap">
          <div className="pg-article-body">
            <p className="pg-large-copy">{article.excerpt}</p>
            <div className="pg-original-article-body">
              <ArticleBlocks body={article.body} onCta={(href, productId, index) => trackEvent("article_cta_click", { article: article.slug, position: index, destination: href, product_id: productId || undefined })} />
            </div>
            <div className="pg-article-editor-note"><p>Nội dung bài viết từ website A SỈN. {article.readTime}</p></div>
            <a href="/thiet-ke" className="btn dark">Tự tay chọn một hộp quà <Icon name="arrow" /></a>
          </div>
        </div>
      </article>
      {related.length > 0 && (
        <section className="section pg-related-articles">
          <div className="wrap">
            <div className="section-head">
              <h2 className="pg-section-title">Đọc thêm <em>một câu chuyện.</em></h2>
              <a className="pg-text-link" href="/tin-tuc">Tất cả bài viết <Icon name="arrow" /></a>
            </div>
            <div className="pg-news-grid">
              {related.map((item, index) => <ArticleCard key={item.slug} article={item} index={index} />)}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
