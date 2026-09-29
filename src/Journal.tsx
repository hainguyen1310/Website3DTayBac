import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, Check, Clock3, Copy, ExternalLink, Search, X } from "lucide-react";
import { useArticlePagination, usePublishedArticle, usePublishedArticleFeed } from "./hooks/usePublishedArticles";
import { getPublishedArticlesBySlugs } from "./services/storeApi";
import type { PublishedArticle } from "./services/storeApi";
import { useWebsite, ContentHeading } from "./WebsiteContext";
import { PageHero } from "./PageElements";
import Newsletter from "./Newsletter";
import { normalizeSearch } from "./search";
import { slugify } from "./operations";
import { renderInline, toBlocks } from "./content/blocks";
import type { ContentBlock } from "./content/blocks";
import { useDocumentSeo } from "./hooks/useDocumentSeo";
import { articleMeta, newsMeta, noindexMeta } from "./seo/meta";
import { trackEvent } from "./analytics";

function JournalState({ loading, error, reload, filtered = false, onClear }: {
  loading: boolean; error: boolean; reload: () => void; filtered?: boolean; onClear?: () => void;
}) {
  return <div className="asin-journal-state" role={error ? "alert" : "status"}>
    <BookOpen size={34} strokeWidth={1.1}/>
    <h2>{loading ? "Đang mở những trang chuyện…" : error ? "Chưa mở được tạp chí." : filtered ? "Chưa tìm thấy câu chuyện phù hợp." : "Hẹn bạn ở những trang chuyện mới."}</h2>
    <p>{error ? "Bạn có thể thử tải lại sau ít phút." : loading ? "Những câu chuyện từ A Sỉn đang được tải." : filtered ? "Thử một từ khóa ngắn hơn hoặc xem tất cả chủ đề." : "Câu chuyện về con người, món ngon và những miền đất Tây Bắc sẽ được chia sẻ tại đây."}</p>
    {error ? <button className="asin-button" onClick={reload}>Thử lại <ArrowRight size={15}/></button> : filtered ? <button className="asin-button" onClick={onClear}>Xóa bộ lọc <X size={15}/></button> : !loading && <Link className="asin-button asin-button-light" to="/gioi-thieu">Đọc câu chuyện A Sỉn <ArrowRight size={15}/></Link>}
  </div>;
}

function ArticleDate({ article }: { article: PublishedArticle }) {
  if (!article.dateIso) return <span>{article.date}</span>;
  return <time dateTime={article.dateIso}>{article.date}</time>;
}

export function ArticleCard({ article }: { article: PublishedArticle }) {
  return <article className="asin-article-card">
    <Link className="asin-article-card-image" to={`/tin-tuc/${article.slug}`} aria-label={`Đọc ${article.title}`}><img src={article.image || "/images/asin/story-terraces.webp"} alt={article.imageAlt || article.title} loading="lazy" width={600} height={430}/><span>{article.tag || "Chuyện A Sỉn"}</span></Link>
    <div className="asin-article-card-copy"><div className="asin-article-meta"><ArticleDate article={article}/><span><Clock3 size={13}/>{article.readTime}</span></div><h3><Link to={`/tin-tuc/${article.slug}`}>{article.title}</Link></h3><p>{article.excerpt}</p><Link className="asin-read-link" to={`/tin-tuc/${article.slug}`}>Đọc câu chuyện <ArrowRight size={16}/></Link></div>
  </article>;
}

function BlockView({ block, articleSlug, index }: { block: ContentBlock; articleSlug: string; index: number }) {
  switch (block.type) {
    case "heading":
      return block.level === 3
        ? <h3>{block.text}</h3>
        : <h2>{block.text}</h2>;
    case "paragraph":
      return <p dangerouslySetInnerHTML={{ __html: renderInline(block.text) }} />;
    case "list": {
      const items = block.items.map((item, itemIndex) => <li key={itemIndex} dangerouslySetInnerHTML={{ __html: renderInline(item) }} />);
      return block.ordered ? <ol>{items}</ol> : <ul>{items}</ul>;
    }
    case "quote":
      return <blockquote><p dangerouslySetInnerHTML={{ __html: renderInline(block.text) }} /></blockquote>;
    case "image":
      return <figure><img src={block.url} alt={block.alt} loading="lazy" decoding="async" />{block.caption && <figcaption>{block.caption}</figcaption>}</figure>;
    case "cta": {
      const onClick = () => trackEvent("article_cta_click", { article: articleSlug, position: index, destination: block.href, product_id: block.productId || undefined });
      const external = /^https:\/\//i.test(block.href);
      return external
        ? <p className="asin-article-cta"><a className="asin-button" href={block.href} target="_blank" rel="noopener noreferrer" onClick={onClick}>{block.label} <ExternalLink size={15}/></a></p>
        : <p className="asin-article-cta"><Link className="asin-button" to={block.href} onClick={onClick}>{block.label} <ArrowRight size={15}/></Link></p>;
    }
    case "divider":
      return <hr />;
    default:
      return null;
  }
}

export function ArticleBody({ article }: { article: PublishedArticle }) {
  return <article className="asin-article-prose" aria-label={article.title}>
    {toBlocks(article.body).map((block, index) => <BlockView key={index} block={block} articleSlug={article.slug} index={index} />)}
    <div className="asin-article-end"><BookOpen size={24} strokeWidth={1.2}/><p>Cảm ơn bạn đã dành một khoảng lặng cùng A Sỉn.</p><Link className="asin-read-link" to="/tin-tuc">Đọc tiếp những câu chuyện <ArrowRight size={16}/></Link></div>
  </article>;
}

export function LandingNews() {
  const { content: c } = useWebsite();
  const { articles, loading, error, reload } = usePublishedArticleFeed(3);
  return <section className="asin-landing-news" id="tin-tuc" aria-labelledby="landing-news-title">
    <div className="asin-container">
      <div className="asin-editorial-heading"><div><span className="asin-eyebrow">TẠP CHÍ A SỈN</span><h2 id="landing-news-title"><ContentHeading text={c["news.title"]}/></h2></div><div><p>{c["news.description"]}</p><Link className="asin-read-link" to="/tin-tuc">Tất cả câu chuyện <ArrowRight size={18}/></Link></div></div>
      {loading || error || !articles.length ? <JournalState loading={loading} error={error} reload={reload}/> : <div className="asin-article-grid">{articles.slice(0, 3).map(article => <ArticleCard key={article.slug} article={article}/>)}</div>}
    </div>
  </section>;
}

export function NewsPage() {
  const { content: c } = useWebsite();
  const { topicSlug } = useParams<{ topicSlug?: string }>();
  const [params, setParams] = useSearchParams();
  const query = params.get("q") || "";
  const pageParam = Number.parseInt(params.get("page") ?? "1", 10);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.min(1000, pageParam) : 1;
  const effectiveTopic = topicSlug || params.get("chu-de") || undefined;
  const { articles, total, hasMore, loading, error, reload } = useArticlePagination({ topicSlug: effectiveTopic, page });
  const missingPage = !loading && !error && !articles.length && Boolean(effectiveTopic || page > 1);
  const filtered = useMemo(
    () => articles.filter(article => normalizeSearch(`${article.title} ${article.excerpt} ${article.tag}`).includes(normalizeSearch(query.trim()))),
    [articles, query],
  );
  const [featured, ...remaining] = filtered;
  const tags = useMemo(() => {
    const map = new Map<string, string>();
    for (const article of articles) if (article.tag) map.set(article.tagSlug || slugify(article.tag), article.tag);
    return [...map.entries()];
  }, [articles]);
  const topicName = effectiveTopic ? tags.find(([slug]) => slug === effectiveTopic)?.[1] : undefined;

  useDocumentSeo(
    (ctx) =>
      missingPage || error || loading
        ? noindexMeta(ctx, missingPage ? "Không tìm thấy trang — A Sỉn" : "Tạp chí A Sỉn")
        : query
        ? noindexMeta(ctx, "Tìm kiếm bài viết — Tạp chí A Sỉn")
        : newsMeta(ctx, { page, topicName, topicSlug: effectiveTopic, articles }),
    [query, page, topicName, effectiveTopic, articles, missingPage, error, loading],
    !loading,
  );

  const changeFilter = (key: string, value: string) => {
    setParams(previous => {
      const next = new URLSearchParams(previous);
      if (value) next.set(key, value); else next.delete(key);
      next.delete("page");
      return next;
    }, { replace: true });
  };
  const pageUrl = (number: number) => {
    const next = new URLSearchParams(params);
    next.delete("chu-de");
    if (number > 1) next.set("page", String(number)); else next.delete("page");
    const base = effectiveTopic ? `/tin-tuc/chu-de/${effectiveTopic}` : "/tin-tuc";
    return `${base}${next.size ? `?${next}` : ""}`;
  };

  if (missingPage) return <main className="moc-page asin-journal-page"><div className="asin-container asin-journal-state"><h1>Không tìm thấy trang bài viết.</h1><p>Chủ đề hoặc trang bạn tìm chưa có nội dung.</p><Link className="asin-button" to="/tin-tuc">Về tạp chí A Sỉn</Link></div></main>;

  return <main className="moc-page asin-journal-page">
    <PageHero current="Tin tức & câu chuyện" eyebrow="TẠP CHÍ A SỈN" title={topicName || c["news.title"]} description={c["journal.intro"]} image="/images/asin/journey-panorama.webp" alt="Ruộng bậc thang và những dãy núi Tây Bắc"><span className="asin-page-signature">Hương vị · Con người · Miền đất</span></PageHero>
    <section className="asin-container asin-journal-feed" aria-label="Bài viết từ A Sỉn">
      <div className="asin-journal-toolbar"><div><span className="asin-eyebrow">NHỮNG ĐIỀU ĐÁNG GIỮ</span><h2>Ghé đọc một chút.</h2></div><label className="moc-page-search"><Search size={18}/><input aria-label="Tìm bài viết" placeholder="Tìm câu chuyện, hương vị…" value={query} onChange={e => changeFilter("q", e.target.value)}/>{query && <button onClick={() => changeFilter("q", "")} aria-label="Xóa tìm kiếm bài viết"><X size={17}/></button>}</label></div>
      <div className="asin-journal-filters"><div className="moc-page-tabs" role="group" aria-label="Chủ đề bài viết"><Link className={!topicSlug ? "is-active" : ""} aria-current={!topicSlug ? "page" : undefined} to="/tin-tuc">Tất cả</Link>{tags.map(([slug, name]) => <Link key={slug} className={topicSlug === slug ? "is-active" : ""} aria-current={topicSlug === slug ? "page" : undefined} to={`/tin-tuc/chu-de/${slug}`}>{name}</Link>)}</div><span aria-live="polite">{!loading && !error && `${total} bài viết`}</span></div>
      {loading || error || !featured ? <JournalState loading={loading} error={error} reload={reload} filtered={Boolean(query || topicSlug)} onClear={() => setParams({}, {replace:true})}/> : <>
        <article className="asin-journal-feature"><Link className="asin-journal-feature-image" to={`/tin-tuc/${featured.slug}`} aria-label={`Đọc ${featured.title}`}><img src={featured.image || "/images/asin/story-terraces.webp"} alt={featured.imageAlt || featured.title} width={960} height={660}/><span>CÂU CHUYỆN MỚI NHẤT</span></Link><div className="asin-journal-feature-copy"><span className="asin-eyebrow">{featured.tag || "CHUYỆN A SỈN"}</span><h2><Link to={`/tin-tuc/${featured.slug}`}>{featured.title}</Link></h2><p>{featured.excerpt}</p><div className="asin-article-meta"><ArticleDate article={featured}/><span><Clock3 size={14}/>{featured.readTime}</span></div><Link className="asin-button" to={`/tin-tuc/${featured.slug}`}>Đọc câu chuyện <ArrowRight size={16}/></Link></div></article>
        {remaining.length > 0 && <div className="asin-journal-latest"><div className="asin-editorial-heading"><h2>Thêm một chút <em>cảm hứng.</em></h2></div><div className="asin-article-grid">{remaining.map(article => <ArticleCard key={article.slug} article={article}/>)}</div></div>}
      </>}
      {!loading && !error && <nav aria-label="Phân trang bài viết">{page > 1 && <Link className="asin-button asin-button-light" to={pageUrl(page - 1)}>Trang trước</Link>} <span>Trang {page}</span> {hasMore && <Link className="asin-button asin-button-light" to={pageUrl(page + 1)}>Trang tiếp theo <ArrowRight size={16}/></Link>}</nav>}
    </section><Newsletter/>
  </main>;
}

export function NewsDetailPage() {
  const { storyId } = useParams<{ storyId: string }>();
  const { article: story, loading, error, reload } = usePublishedArticle(storyId);
  const { articles: recent } = usePublishedArticleFeed(4);
  const [editorsChoice, setEditorsChoice] = useState<PublishedArticle[]>([]);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  useEffect(() => {
    if (!story || !story.relatedArticleSlugs.length) {
      setEditorsChoice([]);
      return;
    }
    let active = true;
    void getPublishedArticlesBySlugs(story.relatedArticleSlugs).then((items) => {
      if (active) setEditorsChoice(items);
    });
    return () => {
      active = false;
    };
  }, [story]);

  useDocumentSeo(
    (ctx) => {
      if (loading) return null;
      if (story) return articleMeta(ctx, story);
      return noindexMeta(ctx, "Bài viết chưa có — Tạp chí A Sỉn");
    },
    [story, loading],
  );

  useEffect(() => {
    setCopied(false);
    setCopyError(false);
    if (story) trackEvent("article_view", { article_id: story.slug, article_slug: story.slug, topic: story.tag });
  }, [story]);

  async function copyLink() {
    try { await navigator.clipboard.writeText(window.location.href); setCopied(true); setCopyError(false); }
    catch { setCopyError(true); }
  }
  if (loading || error || !story) return <main className="moc-page asin-article-page"><div className="asin-container"><Link className="asin-read-link asin-article-back" to="/tin-tuc"><ArrowLeft size={16}/>Trở về tạp chí</Link>{loading || error ? <JournalState loading={loading} error={error} reload={reload}/> : <div className="asin-journal-state"><BookOpen size={35}/><h1>Bài viết chưa có ở đây.</h1><p>Bài viết có thể đã được gỡ hoặc chưa xuất bản.</p><Link className="asin-button" to="/tin-tuc">Khám phá câu chuyện khác <ArrowRight size={16}/></Link></div>}</div></main>;
  const relatedPool = editorsChoice.length ? editorsChoice : recent;
  const related = relatedPool.filter(item => item.slug !== story.slug).sort((a, b) => Number(b.tag === story.tag) - Number(a.tag === story.tag)).slice(0, 3);
  return <main className="moc-page asin-article-page">
    <header className="asin-container asin-article-heading"><Link className="asin-read-link asin-article-back" to="/tin-tuc"><ArrowLeft size={16}/>Trở về tạp chí</Link><span className="asin-eyebrow">{story.tag}</span><h1>{story.title}</h1><p>{story.excerpt}</p><div className="asin-article-byline"><span>{story.authorName || "A SỈN · TẠP CHÍ"}</span><ArticleDate article={story}/><span><Clock3 size={14}/>{story.readTime}</span><button onClick={() => void copyLink()}>{copied ? <Check size={15}/> : <Copy size={15}/>} {copied ? "Đã sao chép" : "Sao chép liên kết"}</button></div>{copyError && <p className="asin-copy-message" role="status">Bạn có thể sao chép địa chỉ bài viết từ thanh địa chỉ trình duyệt.</p>}</header>
    <figure className="asin-container asin-article-cover"><img src={story.image || "/images/asin/story-terraces.webp"} alt={story.imageAlt || story.title} width={1280} height={700} fetchPriority="high"/></figure>
    <div className="asin-container asin-article-layout"><aside className="asin-article-sidebar"><span className="asin-eyebrow">GÓC NHỎ A SỈN</span><p>Chuyện kể từ núi rừng,<br/><em>gửi đến bạn.</em></p><Link className="asin-read-link" to="/san-pham">Khám phá sản vật <ArrowRight size={16}/></Link></aside><ArticleBody article={story}/></div>
    {(story.relatedProductSlugs.length > 0 || story.sourceUrl) && <section className="asin-container asin-article-related" aria-label="Thông tin liên quan">
      {story.relatedProductSlugs.length > 0 && <><div className="asin-editorial-heading"><h2>Sản vật <em>trong bài.</em></h2></div><p>{story.relatedProductSlugs.map(slug => <Link key={slug} className="asin-read-link" to={`/san-pham/${slug}`} onClick={() => trackEvent("article_cta_click", { article: story.slug, position: "related-products", destination: `/san-pham/${slug}`, product_id: slug })}>Xem sản vật <ArrowRight size={15}/></Link>)}</p></>}
      {story.sourceUrl && <p className="asin-article-source">Nguồn tham khảo: <a href={story.sourceUrl} target="_blank" rel="noopener noreferrer">{story.sourceName || story.sourceUrl}</a></p>}
    </section>}
    {related.length > 0 && <section className="asin-container asin-article-related"><div className="asin-editorial-heading"><h2>Câu chuyện <em>còn tiếp.</em></h2><Link className="asin-read-link" to="/tin-tuc">Tất cả bài viết <ArrowRight size={16}/></Link></div><div className="asin-article-grid">{related.map(article => <ArticleCard key={article.slug} article={article}/>)}</div></section>}
    <Newsletter/>
  </main>;
}
