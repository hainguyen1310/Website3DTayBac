import { usePublishedArticleFeed } from "../../../../hooks/usePublishedArticles";
import { Icon } from "../../../icons";
import type { PublishedArticle } from "../../../../services/storeApi";

const arrow = () => <Icon name="diagonal" />;

export function NewsSection() {
  const { articles } = usePublishedArticleFeed(3);

  if (!articles.length) {
    return null;
  }

  // Ưu tiên bài "Quà đặc sản cho đối tác", nếu không có thì dùng bài đầu tiên
  const featured =
    articles.find((article) => article.slug === "qua-dac-san-cho-doi-tac") ||
    articles[0];
  const secondary = articles.filter((article) => article !== featured);

  return (
    <section
      className="ph-section ph-news ph-editorial-news"
      aria-labelledby="ph-news-title"
    >
      <div className="ph-wrap">
        <header className="ph-editorial-news-header">
          <h2 id="ph-news-title">
            Tin tức &amp; <em>hành trình A SỈN</em>
          </h2>
          <a className="ph-text-link" href="/tin-tuc">
            Tất cả bài viết {arrow()}
          </a>
        </header>

        <div className="ph-editorial-news-layout">
          {featured && (
            <article className="ph-editorial-article ph-editorial-article-featured">
              <a
                className="ph-editorial-article-link"
                href={`/tin-tuc/${encodeURIComponent(featured.slug)}`}
                aria-labelledby={`ph-article-${featured.slug}`}
              >
                <figure>
                  <img src={featured.image} alt="" loading="lazy" decoding="async" />
                </figure>
                <div className="ph-editorial-article-copy">
                  <div className="ph-editorial-article-meta">
                    <span>{featured.tag}</span>
                    <time dateTime={featured.dateIso ?? ""}>{featured.date}</time>
                    <span>{featured.readTime}</span>
                  </div>
                  <h3 id={`ph-article-${featured.slug}`}>{featured.title}</h3>
                  <p>{featured.excerpt}</p>
                  <span className="ph-editorial-article-more" aria-hidden="true">
                    Đọc bài viết {arrow()}
                  </span>
                </div>
              </a>
            </article>
          )}

          <div className="ph-editorial-news-secondary">
            {secondary.map((article: PublishedArticle) => (
              <article key={article.slug} className="ph-editorial-article">
                <a
                  className="ph-editorial-article-link"
                  href={`/tin-tuc/${encodeURIComponent(article.slug)}`}
                  aria-labelledby={`ph-article-${article.slug}`}
                >
                  <figure>
                    <img src={article.image} alt="" loading="lazy" decoding="async" />
                  </figure>
                  <div className="ph-editorial-article-copy">
                    <div className="ph-editorial-article-meta">
                      <span>{article.tag}</span>
                      <time dateTime={article.dateIso ?? ""}>{article.date}</time>
                      <span>{article.readTime}</span>
                    </div>
                    <h3 id={`ph-article-${article.slug}`}>{article.title}</h3>
                    <p>{article.excerpt}</p>
                    <span className="ph-editorial-article-more" aria-hidden="true">
                      Đọc bài viết {arrow()}
                    </span>
                  </div>
                </a>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
