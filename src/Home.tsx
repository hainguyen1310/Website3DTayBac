import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChevronRight, Heart, Leaf, Mountain, Play, ShoppingCart, Sprout } from "lucide-react";
import CircularSeal from "./CircularSeal";
import { useCatalog } from "./CatalogContext";
import { useShop } from "./ShopContext";
import { money } from "./catalog";
import { landingProducts, productWindow } from "./landingCatalog";
import { usePublishedArticleFeed } from "./hooks/usePublishedArticles";
import { submitContactMessage } from "./services/storeApi";

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

function Newsletter() {
  const [state, setState] = useState<"idle" | "sending" | "success" | "error">("idle");
  async function subscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const email = String(new FormData(form).get("email") ?? "");
    setState("sending");
    try {
      await submitContactMessage({ name: "Đăng ký nhận tin", email, message: "Tôi đăng ký nhận những câu chuyện, sản phẩm mới và ưu đãi từ Mộc qua email." });
      setState("success");
      form.reset();
    } catch { setState("error"); }
  }
  return <section className="moc-newsletter-section" id="lien-he" aria-labelledby="newsletter-title">
    <div className="moc-container moc-newsletter-content">
      <div className="moc-newsletter-left">
        <span className="moc-eyebrow">CÙNG MỘC GIỮ TRỌN ĐIỀU THUẦN KHIẾT</span>
        <h2 id="newsletter-title">Mộc luôn muốn kể cho bạn<br />nhiều câu chuyện <em>hơn...</em></h2>
      </div>
      <div className="moc-newsletter-form-col">
        <p>Đăng ký nhận tin để không bỏ lỡ những câu chuyện,<br className="moc-desktop-break" /> sản phẩm mới và ưu đãi đặc biệt từ Mộc.</p>
        <form className="moc-newsletter-form" onSubmit={subscribe}>
          <input type="email" name="email" autoComplete="email" required aria-label="Email nhận tin" placeholder="Nhập email của bạn" disabled={state === "sending"} />
          <button type="submit" disabled={state === "sending"}>{state === "sending" ? "Đang gửi…" : "Đăng ký"}<ArrowRight size={15} /></button>
        </form>
        {state === "success" && <p className="moc-form-message" role="status">Mộc đã nhận đăng ký của bạn. Cảm ơn bạn!</p>}
        {state === "error" && <p className="moc-form-message" role="alert">Chưa gửi được đăng ký. Vui lòng thử lại.</p>}
      </div>
      <span className="moc-newsletter-script">Sống chậm hơn<br />Để cảm nhận nhiều hơn...</span>
    </div>
  </section>;
}

export default function Home() {
  const { products, deals, loading, error, reload } = useCatalog();
  const { addProduct, setSelectedProduct } = useShop();
  const feed = usePublishedArticleFeed();
  const [productIndex, setProductIndex] = useState(0);
  const showcase = landingProducts(products, deals);
  const visibleProducts = productWindow(showcase, productIndex);
  const canSlide = showcase.length > 3;

  return <main className="moc-landing">
    <section className="moc-hero" aria-labelledby="hero-title">
      <img className="moc-hero-bg" src="/images/landing-hero.jpg" alt="Ruộng bậc thang và mái nhà gỗ giữa núi rừng Tây Bắc trong nắng sớm" width={1536} height={512} fetchPriority="high" />
      <div className="moc-hero-overlay" aria-hidden="true" />
      <nav className="moc-hero-chapters" aria-label="Khám phá Mộc">
        <a href="#hero-title" aria-label="01 — Giới thiệu Mộc" aria-current="location">01</a><span />
        <a href="#qua-tang" aria-label="02 — Bộ quà tặng">02</a>
        <a href="#cau-chuyen" aria-label="03 — Câu chuyện Mộc">03</a>
      </nav>
      <div className="moc-container moc-hero-container">
        <div className="moc-hero-content">
          <span className="moc-hero-eyebrow">— TINH HOA NÚI RỪNG VIỆT NAM</span>
          <h1 id="hero-title" className="moc-hero-title"><span>Một chút</span><strong>Tây Bắc,</strong><em>một trời thương nhớ.</em></h1>
          <p className="moc-hero-subtitle">Hương vị từ núi rừng, được gìn giữ bởi những<br className="moc-desktop-break" /> con người chân chất, và nâng niu trong từng sản phẩm.</p>
          <div className="moc-hero-actions">
            <Link to="/san-pham" className="moc-hero-btn-primary">Khám phá Mộc ngay <ArrowRight size={16} /></Link>
            <a href="#cau-chuyen" className="moc-hero-btn-story"><span className="moc-play-icon-wrap"><Play size={15} fill="currentColor" /></span><span>Xem câu chuyện<br />thương hiệu</span></a>
          </div>
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
            { Icon: Leaf, title: "Nguyên liệu bản địa", text: "chọn lọc từ núi rừng" },
            { Icon: Mountain, title: "Sản xuất thủ công", text: "Giữ trọn hương vị tự nhiên" },
            { Icon: Heart, title: "An toàn & lành tính", text: "Vì sức khỏe bền lâu" },
            { Icon: Sprout, title: "Đồng hành cùng bản làng", text: "Phát triển bền vững" },
          ].map(({ Icon, title, text }) => <div className="moc-value-item" key={title}><Icon size={34} strokeWidth={1.2} /><div><b>{title}</b><small>{text}</small></div></div>)}
        </div>
      </div>
    </section>

    <section id="deal-hoi" className="moc-deal-section" aria-labelledby="deal-title">
      <img className="moc-deal-leaf" src="/images/hero_leaves_bottom.png" alt="" loading="lazy" />
      <div className="moc-container moc-deal-layout">
        <div className="moc-deal-copy">
          <span className="moc-eyebrow">SẢN PHẨM NỔI BẬT</span>
          <h2 id="deal-title">Thích là<br /><em>chốt deal<span>.</span></em><img src="/images/single_leaf.png" alt="" /></h2>
          <p>Những hương vị thuần khiết từ núi rừng,<br className="moc-desktop-break" /> gói trọn giá trị sức khỏe và cuộc sống an lành.</p>
          <Link to="/san-pham" className="moc-text-arrow-link">Xem toàn bộ sản phẩm <ArrowRight size={14} /></Link>
        </div>
        <div className="moc-products-grid" id="landing-products" aria-busy={loading}>
          {loading || error || !visibleProducts.length ? <FeedState loading={loading} error={error} emptyText="Mộc đang chuẩn bị những sản vật mới." reload={() => void reload()} /> : visibleProducts.map((product) => {
            const deal = deals.find((item) => item.productId === product.id && item.originalPrice > product.price);
            return <article className="moc-product-card" key={product.id}>
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
        <div className="moc-gift-left-visual">
          <img className="moc-gift-left-img" src="/images/landing-gift.jpg" alt="Hộp quà Mộc xanh rừng, mở nắp với trà và mật ong giữa thiên nhiên" loading="lazy" width={1024} height={768} />
          <div className="moc-craft-tag" aria-hidden="true"><b>MÓN QUÀ</b><span>từ núi rừng<br />cho những<br />điều ý nghĩa.</span></div>
          <CircularSeal variant="gift" text="QUÀ TỪ TÂY BẮC • TRAO GỬI YÊU THƯƠNG •" size={118} className="moc-gift-stamp" />
        </div>
        <div className="moc-gift-copy"><span className="moc-eyebrow">BỘ QUÀ TẶNG</span><h2 id="gift-title">Gói hương núi.<br />Gửi <em>tình mình.</em></h2><p>Mỗi hộp quà là một câu chuyện về con người, về thiên nhiên và những giá trị bền vững từ Tây Bắc – món quà của sự chân thành.</p><Link to="/thiet-ke" className="moc-btn-dark">Khám phá bộ quà tặng <ArrowRight size={15} /></Link></div>
        <div className="moc-gift-right-visual"><div className="moc-gift-photo-back" aria-hidden="true" /><img className="moc-gift-right-img" src="/images/landing-kraft.jpg" alt="Đôi tay gói món quà bằng giấy kraft và dây mộc" loading="lazy" width={400} height={280} /><div className="moc-gift-note">Trao giá trị<br />Giữ mãi những<br />điều thuần khiết.</div><img className="moc-gift-leaf" src="/images/single_leaf.png" alt="" /></div>
      </div>
    </section>

    <section className="moc-story-section" id="cau-chuyen" aria-labelledby="story-title">
      <img className="moc-story-leaf" src="/images/single_leaf.png" alt="" loading="lazy" />
      <div className="moc-container moc-story-grid">
        <div className="moc-story-copy"><span className="moc-eyebrow">CÂU CHUYỆN MỘC</span><h2 id="story-title">Đi từ những<br /><em>điều thật mộc.</em></h2><p>Từ những bản làng giữa núi rừng Tây Bắc,<br className="moc-desktop-break" /> chúng tôi mang đến những sản phẩm thuần khiết và câu chuyện về con người, văn hóa và thiên nhiên – để những giá trị tốt đẹp được lan tỏa và tiếp nối.</p><Link to="/gioi-thieu" className="moc-btn-dark">Xem hành trình của Mộc <ArrowRight size={14} /></Link></div>
        <div className="moc-stats-row"><div><b>3+</b><small>Năm đồng hành<br />cùng người bản địa</small></div><div><b>20+</b><small>Sản phẩm thuần khiết<br />từ Tây Bắc</small></div><div><b>100%</b><small>Nguyên liệu tự nhiên<br />và bền vững</small></div></div>
        <div className="moc-story-visual"><img className="moc-story-landscape-img" src="/images/landing-story.jpg" alt="Những dãy núi và ruộng bậc thang của Tây Bắc" loading="lazy" width={700} height={360} /><span className="moc-story-script">Nơi những giá trị<br />bắt đầu từ con người.</span><CircularSeal variant="story" size={126} className="moc-story-stamp" /></div>
      </div>
    </section>

    <section className="moc-magazine-section" aria-labelledby="magazine-title">
      <img className="moc-magazine-leaf" src="/images/single_leaf.png" alt="" loading="lazy" />
      <div className="moc-container moc-mag-grid">
        <div className="moc-mag-copy"><span className="moc-eyebrow">TẠP CHÍ MỘC</span><h2 id="magazine-title">Đọc một chút<br /><em>chuyện núi rừng.</em></h2><p>Những câu chuyện, hương vị và con người từ Tây Bắc – nơi thiên nhiên vẫn luôn có thể kể những điều thật đẹp.</p><Link to="/tin-tuc" className="moc-text-arrow-link">Xem tất cả bài viết <ArrowRight size={14} /></Link></div>
        <div className="moc-articles-row" aria-busy={feed.loading}>
          {feed.loading || feed.error || !feed.articles.length ? <FeedState loading={feed.loading} error={feed.error} emptyText="Những câu chuyện mới sẽ sớm được Mộc chia sẻ." reload={feed.reload} /> : feed.articles.slice(0, 3).map((article) => <article className="moc-article-card" key={article.id}><Link to={`/tin-tuc/${article.id}`}><img src={article.image} alt="" width={340} height={150} loading="lazy" /><div className="moc-article-body"><h3>{article.title}</h3><p>{article.excerpt}</p><span>Đọc thêm <ArrowRight size={12} /></span></div></Link></article>)}
        </div>
      </div>
    </section>
    <Newsletter />
  </main>;
}
