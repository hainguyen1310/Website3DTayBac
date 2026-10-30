import { Link, useParams, useSearchParams } from "react-router-dom";
import { useDocumentSeo } from "../../hooks/useDocumentSeo";
import { newsMeta } from "../../seo/meta";
import { MEDIA, NEWS_TOPICS } from "../content";
import { useArticlePagination } from "../../hooks/usePublishedArticles";
import { slugify } from "../../operations";
import { NewsletterBand, SplitHero, Eyebrow } from "../ui";

export { ArticlePage } from "./ArticlePage";

const PAGE_SIZE = 9;

export function NewsPage() {
  const [params, setParams] = useSearchParams();
  const { topicSlug } = useParams();
  const requested = topicSlug || params.get("chu-de") || "";
  const topic = requested ? slugify(requested) : "";
  const page = Math.min(1000, Math.max(1, Math.floor(Number(params.get("page") || params.get("trang")) || 1)));
  const { articles: visible, total, loading, error, reload } = useArticlePagination({ topicSlug: topic || undefined, page });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const topics = [...new Set([...NEWS_TOPICS, "Từ bản làng", "Gợi ý tặng quà", "Vị Tây Bắc", "Cẩm nang sản vật", ...visible.map((article) => article.tag)])];
  const topicName = topics.find((name) => slugify(name) === topic);
  useDocumentSeo((ctx) => newsMeta(ctx, { page, topicSlug: topic || undefined, topicName, articles: visible }), [page, topic, visible], !loading && !error);

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setParams(next);
  };

  return (
    <main className="sf-page sf-news-page">
      <SplitHero
        className="sf-news-hero"
        image={MEDIA.newsHero}
        focus="center top"
        alt="Núi rừng Tây Bắc giữa biển mây và những thửa ruộng bậc thang vàng"
      >
        <Eyebrow>Tin tức</Eyebrow>
        <h1 className="sf-script-display is-xl">
          Câu chuyện
          <br />
          vùng cao hôm nay
        </h1>
        <p className="sf-lead">
          Những câu chuyện, con người và giá trị đằng sau mỗi sản phẩm A SỈN – từ núi rừng Tây Bắc đến bàn ăn của bạn.
        </p>
      </SplitHero>

      <section className="sf-section sf-container sf-deco is-sides">
        <nav className="sf-chips is-square sf-topic-chips" aria-label="Chủ đề tin tức">
          {topics.map((item) => (
            <Link key={item} className="sf-chip" aria-current={(item === "Tất cả" ? !topic : topic === slugify(item)) ? "page" : undefined} to={item === "Tất cả" ? "/tin-tuc" : `/tin-tuc/chu-de/${slugify(item)}`}>
              {item}
            </Link>
          ))}
        </nav>
        <div className="sf-news-grid">
          {visible.map((article) => (
            <article key={article.slug} className="sf-news-card" data-reveal="rise">
              <Link to={`/tin-tuc/${article.slug}`} className="sf-news-media" tabIndex={-1} aria-hidden="true">
                <img src={article.image} alt="" loading="lazy" width={602} height={310} />
              </Link>
              <div>
                <p className="sf-news-meta"><span>{article.date}</span><span>{article.tag}</span></p>
                <h2><Link to={`/tin-tuc/${article.slug}`}>{article.title}</Link></h2>
                <p>{article.excerpt}</p>
                <Link to={`/tin-tuc/${article.slug}`} className="sf-read-more">Đọc thêm →</Link>
              </div>
            </article>
          ))}
        </div>
        {loading && <p className="sf-empty" role="status">Đang tải bài viết…</p>}
        {error && <p className="sf-empty" role="alert">Chưa tải được bài viết. <button type="button" className="sf-chip" onClick={reload}>Thử lại</button></p>}
        {!loading && !error && !visible.length && <p className="sf-empty">Chưa có bài viết ở trang hoặc chủ đề này.</p>}
        <nav className="sf-pagination" aria-label="Phân trang">
          <button type="button" aria-label="Trang trước" disabled={page === 1 || loading} onClick={() => update({ page: String(page - 1), trang: null })}>←</button>
          {Array.from({ length: pages }, (_, index) => index + 1).map((number) => (
            <button key={number} type="button" aria-current={number === page ? "page" : undefined} onClick={() => update({ page: number === 1 ? null : String(number), trang: null })}>
              {number}
            </button>
          ))}
          <button type="button" aria-label="Trang sau" disabled={page >= pages || loading} onClick={() => update({ page: String(page + 1), trang: null })}>→</button>
        </nav>
      </section>

      <NewsletterBand />
    </main>
  );
}
