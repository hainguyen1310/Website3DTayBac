import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Icon } from "../../icons";
import "./news.css";
import { PAGE_SIZE, useArticlePagination } from "../../../hooks/usePublishedArticles";
import type { PublishedArticle } from "../../../content/article";
import { useDocumentSeo } from "../../../hooks/useDocumentSeo";
import { newsMeta } from "../../../seo/meta";
import { slugify } from "../../../operations";

export function ArticleCard({ article, index }: { article: PublishedArticle; index: number }) {
  return (
    <article className="pg-article-card">
      <a href={`/tin-tuc/${article.slug}`} className="pg-article-image">
        <img src={article.image} alt={article.title} loading="lazy" />
        <span>{String(index + 1).padStart(2, "0")}</span>
      </a>
      <div className="pg-article-meta">
        <span>{article.tag.toLocaleUpperCase("vi")}</span>
        {article.dateIso && <time dateTime={article.dateIso}>{article.date}</time>}
      </div>
      <h2>
        <a href={`/tin-tuc/${article.slug}`}>{article.title}</a>
      </h2>
      <a href={`/tin-tuc/${article.slug}`} className="pg-text-link">
        Đọc câu chuyện <Icon name="arrow" />
      </a>
    </article>
  );
}

/** Bộ lọc chủ đề của bản gốc; mỗi chủ đề có URL riêng /tin-tuc/chu-de/<slug>. */
const TOPICS: { label: string; tag: string | null }[] = [
  { label: "Tất cả câu chuyện", tag: null },
  { label: "Chọn quà", tag: "Gợi ý tặng quà" },
  { label: "Cẩm nang", tag: "Cẩm nang sản vật" },
];

export function NewsPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { topicSlug } = useParams();
  const requested = topicSlug || params.get("chu-de") || "";
  const topic = requested ? slugify(requested) : "";
  const page = Math.min(1000, Math.max(1, Math.floor(Number(params.get("page") || params.get("trang")) || 1)));
  const { articles, total, loading, error, reload } = useArticlePagination({ topicSlug: topic || undefined, page });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const topicName = TOPICS.find((item) => item.tag && slugify(item.tag) === topic)?.tag ?? articles.find((article) => slugify(article.tag) === topic)?.tag;
  useDocumentSeo((ctx) => newsMeta(ctx, { page, topicSlug: topic || undefined, topicName, articles }), [page, topic, articles], !loading && !error);

  const topicPath = (tag: string | null) => (tag ? `/tin-tuc/chu-de/${slugify(tag)}` : "/tin-tuc");
  const pagePath = (number: number) => `${topicPath(topicName ?? (topic || null))}${number > 1 ? `?page=${number}` : ""}#eu-news-list`;

  return (
    <>
      <section className="pg-news-intro eu-hero uh-hero">
        <img className="eu-hero-image uh-scene-img" src="/assets/original/images__asin__journey-panorama.webp" alt="Những tầng núi và ruộng bậc thang Tây Bắc" fetchPriority="high" />
        <div className="wrap">
          <nav className="pg-crumb" aria-label="Đường dẫn"><a href="/">Trang chủ</a><span>/</span><span aria-current="page">Chuyện vùng cao</span></nav>
          <div className="catalog-title-row">
            <div className="uh-hero-copy" data-uh-reveal>
              <p className="eyebrow">TẠP CHÍ A SỈN</p>
              <h1 className="pg-title">Chuyện miền núi.<br /><em>Chuyện gửi trao.</em></h1>
              <p className="catalog-intro-copy">Một góc đọc về cách thưởng thức, chọn quà và những điều nhỏ làm nên một lần trao gửi chỉn chu.</p>
              <a className="btn dark" href="#eu-news-list">Đọc câu chuyện <Icon name="arrow" /></a>
            </div>
          </div>
        </div>
      </section>

      <section className="section pg-news-list" id="eu-news-list">
        <div className="wrap">
          <div className="pg-news-filters" role="group" aria-label="Chủ đề bài viết">
            {TOPICS.map((item) => {
              const active = item.tag ? topic === slugify(item.tag) : !topic;
              return (
                <button key={item.label} type="button" data-news-category={item.tag ? item.tag.toLocaleUpperCase("vi") : "all"} aria-pressed={active} onClick={() => { if (!active) navigate(topicPath(item.tag)); }}>
                  {item.label}
                </button>
              );
            })}
          </div>
          {/* Mỗi trang 3 bài: CSS bản gốc dựng bố cục "1 bài lớn + 2 bài ngang" cho lưới đúng 3 bài. */}
          <div className="pg-news-grid">
            {articles.map((article, index) => <ArticleCard key={article.slug} article={article} index={(page - 1) * PAGE_SIZE + index} />)}
          </div>
          {loading && <p className="pg-news-status" role="status">Đang tải câu chuyện…</p>}
          {error && <p className="pg-news-status" role="alert">Chưa tải được bài viết. <button type="button" className="pg-text-link" onClick={reload}>Thử lại</button></p>}
          {!loading && !error && !articles.length && <p className="pg-news-status">Chưa có câu chuyện ở chủ đề này.</p>}
          {pages > 1 && (
            <nav className="pg-news-filters pg-news-pagination" aria-label="Phân trang bài viết">
              {Array.from({ length: pages }, (_, index) => index + 1).map((number) => (
                <button key={number} type="button" aria-pressed={number === page} aria-label={`Trang ${number}`} onClick={() => { if (number !== page) navigate(pagePath(number)); }}>
                  {String(number).padStart(2, "0")}
                </button>
              ))}
            </nav>
          )}
        </div>
      </section>
    </>
  );
}
