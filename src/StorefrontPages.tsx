import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Clock3, Heart, HeartHandshake, Leaf, Mountain, Search, ShoppingBag, Sprout, X } from "lucide-react";
import { ALL_CATEGORY, money } from "./catalog";
import type { Deal, Product } from "./catalog";
import { useCatalog } from "./CatalogContext";
import { useShop } from "./ShopContext";
import { usePublishedArticleFeed } from "./hooks/usePublishedArticles";
import type { PublishedArticle } from "./services/storeApi";
import CircularSeal from "./CircularSeal";
import Newsletter from "./Newsletter";
import { ContentHeading, useWebsite } from "./WebsiteContext";

function Breadcrumb({ current }: { current: string }) {
  return <nav className="moc-page-breadcrumb" aria-label="Đường dẫn"><Link to="/">Trang chủ</Link><span aria-hidden="true">/</span><span aria-current="page">{current}</span></nav>;
}

function ContentState({ loading, error, emptyText, reload }: { loading: boolean; error: boolean; emptyText: string; reload: () => void }) {
  return <div className="moc-page-state" role={error ? "alert" : "status"}>
    <Leaf size={32} strokeWidth={1.2} />
    <p>{loading ? "A Sỉn đang chuẩn bị nội dung…" : error ? "Chưa tải được nội dung. Bạn thử lại nhé." : emptyText}</p>
    {error && <button className="moc-text-arrow-link" onClick={reload}>Thử lại <ArrowRight size={16} /></button>}
  </div>;
}

function GiftInvitation() {
  const {content:c}=useWebsite();
  return <section className="moc-page-gift" aria-labelledby="gift-invitation-title">
    <div className="moc-container moc-page-gift-inner">
      <img src={c["gift.image"]} alt="Hộp quà A Sỉn với trà và mật ong giữa núi rừng" loading="lazy" width={720} height={480} />
      <div data-reveal="rise"><span className="moc-eyebrow">MỘT MÓN QUÀ, NHIỀU THƯƠNG MẾN</span><h2 id="gift-invitation-title"><ContentHeading text={c["gift.title"]}/></h2><p>{c["gift.description"]}</p><Link to="/thiet-ke" className="moc-btn-dark">Thiết kế hộp quà <ArrowRight size={16} /></Link></div>
      <span className="moc-page-handwritten" aria-hidden="true">Trao giá trị,<br />gửi yêu thương.</span>
    </div>
  </section>;
}

function ProductCard({ product, deal }: { product: Product; deal?: Deal }) {
  const { addProduct, setSelectedProduct, favoriteIds, toggleFavorite } = useShop();
  const saved = favoriteIds.includes(product.id);
  const promotion = deal && deal.originalPrice > product.price ? deal : undefined;
  return <article className="moc-shop-card" data-reveal="rise">
    <div className="moc-shop-card-photo">
      <button onClick={() => setSelectedProduct(product)} aria-label={`Xem ${product.name}`}><img src={product.image} alt={product.name} loading="lazy" width={480} height={480} /></button>
      {promotion && <span className="moc-shop-discount" title={promotion.label}>−{promotion.discount}%</span>}
      <button className={`moc-shop-save${saved ? " is-saved" : ""}`} aria-pressed={saved} onClick={() => toggleFavorite(product.id)} aria-label={`${saved ? "Bỏ yêu thích" : "Yêu thích"} ${product.name}`}><Heart size={18} fill={saved ? "currentColor" : "none"} strokeWidth={1.5} /></button>
    </div>
    <div className="moc-shop-card-body">
      <span className="moc-shop-origin">{product.origin || product.category}</span>
      <h2><button onClick={() => setSelectedProduct(product)}>{product.name}</button></h2>
      <p>{product.tag || product.description}</p>
      {product.weight && <span className="moc-shop-weight">{product.weight}</span>}
      <div className="moc-shop-card-bottom"><div>{promotion && <del>{money(promotion.originalPrice)}</del>}<strong>{money(product.price)}</strong></div><button className="moc-shop-add" onClick={() => addProduct(product.id)} aria-label={`Thêm ${product.name} vào giỏ`}><ShoppingBag size={18} strokeWidth={1.5} /></button></div>
    </div>
  </article>;
}

export function ProductsPage() {
  const {content:c}=useWebsite();
  const { products, categories, deals, loading, error, reload } = useCatalog();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(ALL_CATEGORY);
  const [sort, setSort] = useState("default");
  const visibleProducts = useMemo(() => {
    const filtered = products.filter(product => (category === ALL_CATEGORY || product.category === category) && `${product.name} ${product.category} ${product.origin}`.toLocaleLowerCase("vi-VN").includes(query.trim().toLocaleLowerCase("vi-VN")));
    if (sort === "price-asc") filtered.sort((a, b) => a.price - b.price);
    if (sort === "price-desc") filtered.sort((a, b) => b.price - a.price);
    return filtered;
  }, [products, category, query, sort]);

  return <main className="moc-page moc-shop-page">
    <section className="moc-shop-intro">
      <div className="moc-container"><Breadcrumb current="Sản phẩm" /><div className="moc-shop-intro-copy" data-reveal="rise"><span className="moc-eyebrow">SẢN VẬT TỪ NÚI RỪNG</span><h1><ContentHeading text={c["shop.title"]}/></h1><p>{c["shop.intro"]}</p></div></div>
      <div className="moc-shop-intro-art" data-reveal="soft" aria-hidden="true"><img src={c["shop.image"]} alt="" /><span>Tinh túy đất trời,<br />trong từng sản vật nhỏ.</span></div>
      <img className="moc-shop-intro-leaf" src="/images/single_leaf.png" alt="" />
    </section>
    <section className="moc-container moc-shop-catalog" aria-label="Danh mục sản phẩm">
      <div className="moc-shop-toolbar">
        <label className="moc-page-search"><Search size={19} strokeWidth={1.5} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm hương vị bạn yêu…" aria-label="Tìm sản phẩm" />{query && <button onClick={() => setQuery("")} aria-label="Xóa từ khóa tìm kiếm"><X size={17} /></button>}</label>
        <label className="moc-shop-sort">Sắp xếp theo<select value={sort} onChange={event => setSort(event.target.value)}><option value="default">Mặc định</option><option value="price-asc">Giá tăng dần</option><option value="price-desc">Giá giảm dần</option></select></label>
      </div>
      <div className="moc-page-tabs" role="group" aria-label="Danh mục sản phẩm">{categories.map(item => <button key={item} aria-pressed={category === item} className={category === item ? "is-active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div>
      <div className="moc-shop-result" aria-live="polite"><span>{loading ? "Đang tải sản vật…" : error ? "Chưa tải được danh mục" : `${visibleProducts.length} sản vật dành cho bạn`}</span><span>Chắt chiu từ những điều mộc mạc.</span></div>
      {loading || error ? <ContentState loading={loading} error={error} emptyText="" reload={() => void reload()} /> : visibleProducts.length ? <div className="moc-shop-grid">{visibleProducts.map(product => <ProductCard key={product.id} product={product} deal={deals.find(deal => deal.productId === product.id)} />)}</div> : <div className="moc-page-state" role="status"><Search size={30} strokeWidth={1.2} /><h2>Chưa tìm thấy sản vật phù hợp.</h2><p>Thử một từ khóa hoặc danh mục khác nhé.</p>{(query || category !== ALL_CATEGORY) && <button className="moc-text-arrow-link" onClick={() => { setQuery(""); setCategory(ALL_CATEGORY); }}>Xem tất cả sản phẩm <ArrowRight size={16} /></button>}</div>}
    </section>
    <GiftInvitation />
    <Newsletter />
  </main>;
}

export function AboutPage() {
  const { content:c }=useWebsite();
  return <main className="moc-page moc-about-page">
    <section className="moc-about-hero" aria-labelledby="about-title">
      <img className="moc-about-hero-image" src={c["about.heroImage"]} alt="Nắng sớm trên ruộng bậc thang và những dãy núi Tây Bắc" fetchPriority="high" width={1536} height={512} />
      <div className="moc-container"><Breadcrumb current="Về A Sỉn" /><div className="moc-about-hero-copy" data-reveal="rise"><span className="moc-eyebrow">CÂU CHUYỆN A SỈN</span><h1 id="about-title"><ContentHeading text={c["about.title"]}/></h1><p>{c["about.intro"]}</p><a className="moc-page-light-link" href="#cau-chuyen-moc">Bắt đầu câu chuyện <ArrowRight size={17} /></a></div><CircularSeal variant="hero" size={136} className="moc-about-hero-seal" /></div>
    </section>
    <section id="cau-chuyen-moc" className="moc-container moc-about-origin">
      <div className="moc-about-photo" data-reveal="photo"><img src={c["about.storyImage"]} alt="Những triền ruộng bậc thang ôm lấy bản làng Tây Bắc" loading="lazy" width={700} height={600} /><span>Tây Bắc, nơi A Sỉn bắt đầu.</span><CircularSeal variant="story" size={118} /></div>
      <div className="moc-about-copy" data-reveal="rise"><span className="moc-eyebrow">TỪ MIỀN ĐẤT THƯƠNG NHỚ</span><h2><ContentHeading text={c["about.heading"]}/></h2><p>{c["about.body1"]}</p><p>{c["about.body2"]}</p><span className="moc-about-signature">Từ núi rừng, bằng cả tấm lòng.</span></div>
    </section>
    <section className="moc-about-values" aria-labelledby="values-title"><div className="moc-container"><div className="moc-page-section-heading" data-reveal="soft"><span className="moc-eyebrow">NHỮNG ĐIỀU A SỈN TRÂN QUÝ</span><h2 id="values-title">Giữ điều lành.<br /><em>Gửi điều thật.</em></h2><p>Những giá trị giản dị dẫn lối cho cách A Sỉn lựa chọn, kể chuyện và trao gửi.</p></div><div className="moc-about-value-grid">{[
      { Icon: Sprout, number: "01", title: "Trân quý tự nhiên", text: "Trân trọng hương vị vốn có của nguyên liệu, vẻ đẹp của mùa vụ và nhịp sống của núi rừng." },
      { Icon: HeartHandshake, number: "02", title: "Đặt con người ở giữa", text: "Kể câu chuyện về những đôi tay, những nếp sống và sự tận tâm phía sau mỗi sản vật." },
      { Icon: Mountain, number: "03", title: "Gìn giữ bản sắc", text: "Mang hương vị và nét đẹp Tây Bắc vào những món quà, để mỗi lần trao là một lần kết nối." },
    ].map(({ Icon, number, title, text }) => <article key={number} data-reveal="rise"><div><Icon size={36} strokeWidth={1.1} /><span>{number}</span></div><h3>{title}</h3><p>{text}</p></article>)}</div></div></section>
    <section className="moc-container moc-about-craft"><div className="moc-about-copy" data-reveal="rise"><span className="moc-eyebrow">TỪ MỘT SẢN VẬT ĐẾN MỘT MÓN QUÀ</span><h2>Thêm chút chăm chút.<br /><em>Thành nhiều yêu thương.</em></h2><p>Một vị trà hợp ý, một hũ mật ngọt lành, một lời nhắn viết riêng. Món quà ý nghĩa đôi khi bắt đầu từ những điều nhỏ như thế.</p><p>A Sỉn dành một khoảng không để bạn tự chọn, tự phối và gửi gắm câu chuyện của mình trong từng hộp quà.</p><Link className="moc-text-arrow-link" to="/thiet-ke">Gói món quà của bạn <ArrowRight size={16} /></Link></div><figure className="moc-about-craft-photo" data-reveal="photo"><img src="/images/landing-kraft.jpg" alt="Đôi tay chăm chút gói quà bằng giấy kraft và dây mộc" loading="lazy" width={650} height={520} /><figcaption>Món quà nhỏ, gửi những điều lớn lao.</figcaption></figure></section>
    <section className="moc-about-quote"><div className="moc-container"><Leaf size={30} strokeWidth={1.2} /><blockquote data-reveal="soft">“{c["about.quote"]}”</blockquote><Link className="moc-btn-dark" to="/san-pham">Khám phá sản vật của A Sỉn <ArrowRight size={16} /></Link></div></section>
    <Newsletter />
  </main>;
}

function ArticleCard({ article }: { article: PublishedArticle }) {
  return <article className="moc-journal-card" data-reveal="rise"><Link className="moc-journal-card-image" to={`/tin-tuc/${article.id}`} aria-label={`Đọc ${article.title}`}><img src={article.image} alt={article.title} loading="lazy" width={540} height={370} /></Link><div className="moc-journal-card-body"><div className="moc-journal-meta"><span>{article.tag}</span><span>{article.date}</span></div><h2><Link to={`/tin-tuc/${article.id}`}>{article.title}</Link></h2><p>{article.excerpt}</p><Link className="moc-text-arrow-link" to={`/tin-tuc/${article.id}`}>Đọc câu chuyện <ArrowRight size={15} /></Link></div></article>;
}

export function NewsPage() {
  const {content:c}=useWebsite();
  const { articles, loading, error, reload } = usePublishedArticleFeed();
  const [tag, setTag] = useState("");
  const tags = [...new Set(articles.map(article => article.tag).filter(Boolean))];
  const filtered = tag ? articles.filter(article => article.tag === tag) : articles;
  const [featured, ...remaining] = filtered;
  return <main className="moc-page moc-journal-page">
    <header className="moc-container moc-journal-intro"><Breadcrumb current="Tạp chí A Sỉn" /><div className="moc-journal-masthead" data-reveal="soft"><span className="moc-eyebrow">HƯƠNG VỊ · CON NGƯỜI · NHỮNG MIỀN ĐẤT</span><h1><ContentHeading text={c["news.title"]}/></h1><p>{c["journal.intro"]}</p><img src="/images/tea_twig_vertical.png" alt="" /><span className="moc-page-handwritten" aria-hidden="true">Ngồi xuống,<br />mình kể nhau nghe.</span></div></header>
    <section className="moc-container moc-journal-feed" aria-label="Bài viết từ A Sỉn">
      <div className="moc-journal-index"><span>TẠP CHÍ A SỈN</span><Leaf size={18} strokeWidth={1.2} /><span>NHỮNG ĐIỀU ĐÁNG GIỮ</span></div>
      {tags.length > 0 && <div className="moc-page-tabs moc-journal-tabs" role="group" aria-label="Chủ đề bài viết"><button className={!tag ? "is-active" : ""} aria-pressed={!tag} onClick={() => setTag("")}>Tất cả câu chuyện</button>{tags.map(item => <button key={item} className={tag === item ? "is-active" : ""} aria-pressed={tag === item} onClick={() => setTag(item)}>{item}</button>)}</div>}
      {loading || error || !featured ? <ContentState loading={loading} error={error} emptyText="Những câu chuyện mới sẽ sớm được A Sỉn chia sẻ." reload={reload} /> : <>
        <article className="moc-journal-feature"><Link className="moc-journal-feature-image" data-reveal="landscape" to={`/tin-tuc/${featured.id}`} aria-label={`Đọc ${featured.title}`}><img src={featured.image} alt={featured.title} width={900} height={670} fetchPriority="high" /></Link><div className="moc-journal-feature-copy" data-reveal="side"><span className="moc-eyebrow">CÂU CHUYỆN MỚI NHẤT</span><div className="moc-journal-meta"><span>{featured.tag}</span><span>{featured.date}</span></div><h2><Link to={`/tin-tuc/${featured.id}`}>{featured.title}</Link></h2><p>{featured.excerpt}</p><span className="moc-journal-readtime"><Clock3 size={14} />{featured.readTime}</span><Link className="moc-btn-dark" to={`/tin-tuc/${featured.id}`}>Đọc câu chuyện <ArrowRight size={16} /></Link></div></article>
        {remaining.length > 0 && <div className="moc-journal-latest"><div className="moc-journal-section-title" data-reveal="soft"><h2>Thêm một chút <em>cảm hứng.</em></h2><span>{remaining.length} câu chuyện để khám phá</span></div><div className="moc-journal-grid">{remaining.map(article => <ArticleCard key={article.id} article={article} />)}</div></div>}
      </>}
    </section>
    <Newsletter />
  </main>;
}

export function NewsDetailPage() {
  const { storyId } = useParams();
  const { articles, loading, error, reload } = usePublishedArticleFeed();
  const story = articles.find(item => item.id === storyId);
  if (loading || error || !story) return <main className="moc-page"><div className="moc-container"><Breadcrumb current="Tạp chí A Sỉn" /><ContentState loading={loading} error={error} emptyText="Bài viết này chưa có ở đây." reload={reload} /><Link className="moc-text-arrow-link moc-article-return" to="/tin-tuc"><ArrowLeft size={16} />Về Tạp chí A Sỉn</Link></div></main>;
  const related = articles.filter(item => item.id !== story.id).slice(0, 3);
  return <main className="moc-page moc-article-page">
    <header className="moc-container moc-article-heading" data-reveal="rise"><Link className="moc-article-back" to="/tin-tuc"><ArrowLeft size={16} />Trở về Tạp chí A Sỉn</Link><div className="moc-journal-meta"><span>{story.tag}</span><span>{story.date}</span><span>{story.readTime}</span></div><h1>{story.title}</h1><p>{story.excerpt}</p></header>
    <figure className="moc-container moc-article-cover" data-reveal="landscape"><img src={story.image} alt={story.title} width={1280} height={700} fetchPriority="high" /></figure>
    <article className="moc-article-prose">{story.body.map((paragraph, index) => <p key={`${story.id}-${index}`}>{paragraph}</p>)}<div className="moc-article-end"><Leaf size={23} strokeWidth={1.2} /><span>A Sỉn — Tinh hoa núi rừng Việt Nam.</span></div></article>
    {related.length > 0 && <section className="moc-container moc-article-related"><div className="moc-journal-section-title" data-reveal="soft"><h2>Câu chuyện <em>còn tiếp.</em></h2><Link className="moc-text-arrow-link" to="/tin-tuc">Xem tất cả <ArrowRight size={15} /></Link></div><div className="moc-journal-grid">{related.map(article => <ArticleCard key={article.id} article={article} />)}</div></section>}
    <Newsletter />
  </main>;
}
