import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChevronRight, Gift, Heart, Leaf, Mountain, Play, ShoppingCart, Sprout } from "lucide-react";
import CircularSeal from "./CircularSeal";
import { useCatalog } from "./CatalogContext";
import { useShop } from "./ShopContext";
import { money } from "./catalog";
import { landingProducts, productWindow } from "./landingCatalog";
import { usePublishedArticleFeed } from "./hooks/usePublishedArticles";
import Newsletter from "./Newsletter";
import { ContactSection } from "./Contact";
import { ContentHeading, useWebsite } from "./WebsiteContext";

function FeedState({ loading, error, emptyText, reload }: {
  loading: boolean; error: boolean; emptyText: string; reload: () => void;
}) {
  if (loading) return <div className="moc-feed-skeletons" role="status" aria-label="Đang tải nội dung">
    {[0, 1, 2].map((key) => <div className="moc-feed-skeleton" key={key} />)}
  </div>;
  return <div className="moc-feed-state" role="status">
    <Leaf size={28} strokeWidth={1.2} />
    <p>{error ? "Chưa tải được nội dung. Bạn thử lại nhé." : emptyText}</p>
    {error && <button onClick={reload} className="moc-text-arrow-link">Thử lại <ArrowRight size={14} /></button>}
  </div>;
}

export default function Home() {
  const location = useLocation();
  const { content: c } = useWebsite();
  const { products, deals, loading, error, reload } = useCatalog();
  const { addProduct, setSelectedProduct } = useShop();
  const feed = usePublishedArticleFeed();
  const [productIndex, setProductIndex] = useState(0);
  const showcase = landingProducts(products, deals);
  const visibleProducts = productWindow(showcase, productIndex);
  const canSlide = showcase.length > 3;

  useEffect(() => {
    // Wait for the feeds above the form so their loading states cannot move the anchor.
    if (location.hash !== "#lien-he" || loading || feed.loading) return;
    const frame = requestAnimationFrame(() => {
      document.getElementById("lien-he")?.scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [location.key, location.hash, loading, feed.loading]);

  return <main className="moc-landing">
    <section className="moc-hero" aria-labelledby="hero-title">
      <img className="moc-hero-bg" src={c["hero.image"]} alt="Ruộng bậc thang và mái nhà gỗ giữa núi rừng Tây Bắc trong nắng sớm" width={1536} height={512} fetchPriority="high" />
      <div className="moc-hero-overlay" aria-hidden="true" />
      <div className="moc-container moc-hero-container">
        <div className="moc-hero-content">
          <span className="moc-hero-eyebrow">{c["hero.eyebrow"]}</span>
          <h1 id="hero-title" className="moc-hero-title"><span>{c["hero.line1"]}</span><strong>{c["hero.line2"]}</strong><em>{c["hero.line3"]}</em></h1>
          <p className="moc-hero-subtitle">{c["hero.description"]}</p>
          <div className="moc-hero-actions">
            <Link to="/thiet-ke" className="moc-hero-btn-primary"><Gift size={18} /> Thiết kế hộp quà <ArrowRight size={16} /></Link>
            <Link to={c["hero.link"]} className="moc-hero-btn-secondary">{c["hero.cta"]} <ArrowRight size={16} /></Link>
          </div>
          <a href="#cau-chuyen" className="moc-hero-btn-story"><span className="moc-play-icon-wrap"><Play size={12} fill="currentColor" /></span><span>Xem câu chuyện thương hiệu</span></a>
        </div>
      </div>
      <div className="moc-hero-right-stamp" aria-hidden="true">
        <span className="moc-hero-curved-text">Từ núi rừng<br />đến cuộc sống an lành.</span>
        <CircularSeal variant="hero" size={132} className="moc-hero-seal-badge" />
      </div>
      <div className="moc-hero-paper-tear-corner" aria-hidden="true">
        <img src="/images/paper_tear_hero.png" alt="" />
        <span>Những<br />điều thuần khiết<br />vẫn còn đây...<i /></span>
      </div>
      <img className="moc-hero-leaf" src="/images/single_leaf.png" alt="" />
      <div className="moc-values-section-wrap">
        <div className="moc-container moc-values-inner">
          {[
            { Icon: Leaf, title: c["values.1.title"], text: c["values.1.text"] },
            { Icon: Mountain, title: c["values.2.title"], text: c["values.2.text"] },
            { Icon: Heart, title: c["values.3.title"], text: c["values.3.text"] },
            { Icon: Sprout, title: c["values.4.title"], text: c["values.4.text"] },
          ].map(({ Icon, title, text }) => <div className="moc-value-item" data-reveal="soft" key={title}><Icon size={34} strokeWidth={1.2} /><div><b>{title}</b><small>{text}</small></div></div>)}
        </div>
      </div>
    </section>

    <section id="deal-hoi" className="moc-deal-section" aria-labelledby="deal-title">
      <img className="moc-deal-leaf" src="/images/hero_leaves_bottom.png" alt="" loading="lazy" />
      <div className="moc-container moc-deal-layout">
        <div className="moc-deal-copy" data-reveal="rise">
          <span className="moc-eyebrow">SẢN PHẨM NỔI BẬT</span>
          <h2 id="deal-title"><ContentHeading text={c["products.title"]} /><img src="/images/single_leaf.png" alt="" /></h2>
          <p>{c["products.description"]}</p>
          <Link to="/san-pham" className="moc-text-arrow-link">Xem toàn bộ sản phẩm <ArrowRight size={14} /></Link>
        </div>
        <div className="moc-products-grid" id="landing-products" aria-busy={loading}>
          {loading || error || !visibleProducts.length ? <FeedState loading={loading} error={error} emptyText="A Sỉn đang chuẩn bị những sản vật mới." reload={() => void reload()} /> : visibleProducts.map((product) => {
            const deal = deals.find((item) => item.productId === product.id && item.originalPrice > product.price);
            return <article className="moc-product-card" data-reveal="rise" key={product.id}>
              {deal && <span className="moc-badge" title={deal.label}>−{deal.discount}%</span>}
              <button className="moc-card-img-wrap" aria-label={`Xem ${product.name}`} onClick={() => setSelectedProduct(product)}><img src={product.image} alt={product.name} loading="lazy" width={300} height={250} /></button>
              <div className="moc-card-body">
                <h3><button onClick={() => setSelectedProduct(product)}>{product.name}</button></h3>
                <p>{product.tag || product.origin}</p>
                <div className="moc-card-bottom"><div className="moc-card-prices">{deal && <del>{money(deal.originalPrice)}</del>}<strong>{money(product.price)}</strong></div><button className="moc-card-cart-btn" aria-label={`Thêm ${product.name} vào giỏ`} onClick={() => addProduct(product.id)}><ShoppingCart size={18} strokeWidth={1.5} /></button></div>
              </div>
            </article>;
          })}
        </div>
        <aside className="moc-deal-aside">
          <div className="moc-deal-nav-row">
            <button className="moc-round-nav-btn" aria-label="Sản phẩm trước" aria-controls="landing-products" disabled={!canSlide || loading} onClick={() => setProductIndex((index) => (index - 3 + showcase.length) % showcase.length)}><ChevronLeft size={16} /></button>
            <button className="moc-round-nav-btn" aria-label="Sản phẩm tiếp theo" aria-controls="landing-products" disabled={!canSlide || loading} onClick={() => setProductIndex((index) => (index + 3) % showcase.length)}><ChevronRight size={16} /></button>
          </div>
          <div className="moc-deal-note" aria-hidden="true"><img src="/images/tea_twig_vertical.png" alt="" loading="lazy" /><span className="moc-red-diamond">✦</span><p>Tinh túy<br />đất trời,<br />trong từng<br />sản phẩm nhỏ.</p><i /></div>
        </aside>
      </div>
    </section>

    <section className="moc-gift-section" id="qua-tang" aria-labelledby="gift-title">
      <div className="moc-gift-grid">
        <div className="moc-gift-left-visual" data-reveal="landscape">
          <img className="moc-gift-left-img" src={c["gift.image"]} alt="Hộp quà A Sỉn xanh rừng, mở nắp với trà và mật ong giữa thiên nhiên" loading="lazy" width={1024} height={768} />
          <div className="moc-craft-tag" aria-hidden="true"><b>MÓN QUÀ</b><span>từ núi rừng<br />cho những<br />điều ý nghĩa.</span></div>
          <CircularSeal variant="gift" text="QUÀ TỪ TÂY BẮC • TRAO GỬI YÊU THƯƠNG •" size={118} className="moc-gift-stamp" />
        </div>
        <div className="moc-gift-copy" data-reveal="rise"><span className="moc-eyebrow">BỘ QUÀ TẶNG</span><h2 id="gift-title"><ContentHeading text={c["gift.title"]} /></h2><p>{c["gift.description"]}</p><Link to={c["gift.link"]} className="moc-btn-dark">{c["gift.cta"]} <ArrowRight size={15} /></Link></div>
        <div className="moc-gift-right-visual" data-reveal="photo"><div className="moc-gift-photo-back" aria-hidden="true" /><img className="moc-gift-right-img" src={c["gift.secondaryImage"]} alt="Đôi tay gói món quà bằng giấy kraft và dây mộc" loading="lazy" width={400} height={280} /><div className="moc-gift-note">Trao giá trị<br />Giữ mãi những<br />điều thuần khiết.</div><img className="moc-gift-leaf" src="/images/single_leaf.png" alt="" /></div>
      </div>
    </section>

    <section className="moc-story-section" id="cau-chuyen" aria-labelledby="story-title">
      <img className="moc-story-leaf" src="/images/single_leaf.png" alt="" loading="lazy" />
      <div className="moc-container moc-story-grid">
        <div className="moc-story-copy" data-reveal="rise"><span className="moc-eyebrow">CÂU CHUYỆN A SỈN</span><h2 id="story-title"><ContentHeading text={c["story.title"]} /></h2><p>{c["story.description"]}</p><Link to="/gioi-thieu" className="moc-btn-dark">Xem hành trình của A Sỉn <ArrowRight size={14} /></Link></div>
        <div className="moc-stats-row"><div data-reveal="rise"><b>{c["story.stat1"]}</b><small>{c["story.stat1Label"]}</small></div><div data-reveal="rise"><b>{c["story.stat2"]}</b><small>{c["story.stat2Label"]}</small></div><div data-reveal="rise"><b>{c["story.stat3"]}</b><small>{c["story.stat3Label"]}</small></div></div>
        <div className="moc-story-visual" data-reveal="landscape"><img className="moc-story-landscape-img" src={c["story.image"]} alt="Những dãy núi và ruộng bậc thang của Tây Bắc" loading="lazy" width={700} height={360} /><span className="moc-story-script">Nơi những giá trị<br />bắt đầu từ con người.</span><CircularSeal variant="story" size={126} className="moc-story-stamp" /></div>
      </div>
    </section>

    <section className="moc-magazine-section" aria-labelledby="magazine-title">
      <img className="moc-magazine-leaf" src="/images/single_leaf.png" alt="" loading="lazy" />
      <div className="moc-container moc-mag-grid">
        <div className="moc-mag-copy" data-reveal="side"><span className="moc-eyebrow">TẠP CHÍ A SỈN</span><h2 id="magazine-title"><ContentHeading text={c["news.title"]} /></h2><p>{c["news.description"]}</p><Link to="/tin-tuc" className="moc-text-arrow-link">Xem tất cả bài viết <ArrowRight size={14} /></Link></div>
        <div className="moc-articles-row" aria-busy={feed.loading}>
          {feed.loading || feed.error || !feed.articles.length ? <FeedState loading={feed.loading} error={feed.error} emptyText="Những câu chuyện mới sẽ sớm được A Sỉn chia sẻ." reload={feed.reload} /> : feed.articles.slice(0, 3).map((article) => <article className="moc-article-card" data-reveal="soft" key={article.id}><Link to={`/tin-tuc/${article.id}`}><img src={article.image} alt="" width={340} height={150} loading="lazy" /><div className="moc-article-body"><h3>{article.title}</h3><p>{article.excerpt}</p><span>Đọc thêm <ArrowRight size={12} /></span></div></Link></article>)}
        </div>
      </div>
    </section>
    <ContactSection />
    <Newsletter />
  </main>;
}
