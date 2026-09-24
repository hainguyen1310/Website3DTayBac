import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  BadgePercent,
  CheckCircle2,
  ChevronRight,
  Clock3,
  HeartHandshake,
  Leaf,
  Mail,
  MapPin,
  MessageCircle,
  Mountain,
  PackageCheck,
  Phone,
  Plus,
  Search,
  Send,
  ShoppingBag,
  Sprout,
  Store,
} from "lucide-react";
import { ALL_CATEGORY, money } from "./catalog";
import type { Product } from "./catalog";
import { useCatalog } from "./CatalogContext";
import { useShop } from "./ShopContext";
import { usePublishedArticles } from "./hooks/usePublishedArticles";
import { submitContactMessage } from "./services/storeApi";

function PageIntro({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="page-intro">
      <div className="container">
        <span className="eyebrow">
          <span className="tiny-diamond" /> {eyebrow}
        </span>
        <h1>{title}</h1>
        <p>{children}</p>
      </div>
    </section>
  );
}

function StoreProductCard({ product, deal }: { product: Product; deal?: boolean }) {
  const { addProduct, setSelectedProduct, favoriteIds, toggleFavorite } = useShop();
  const saved = favoriteIds.includes(product.id);
  return (
    <article className="store-product-card">
      <button
        className="store-product-image"
        onClick={() => setSelectedProduct(product)}
        aria-label={`Xem ${product.name}`}
      >
        <img src={product.image} alt={product.name} />
        {deal && <span className="sale-chip">ƯU ĐÃI HÔM NAY</span>}
      </button>
      <div className="store-product-info">
        <div className="store-product-meta">
          <span>{product.origin}</span>
          <button
            className={saved ? "heart-control active" : "heart-control"}
            onClick={() => toggleFavorite(product.id)}
            aria-label={saved ? `Bỏ yêu thích ${product.name}` : `Yêu thích ${product.name}`}
          >
            <HeartHandshake size={17} />
          </button>
        </div>
        <button className="store-product-title" onClick={() => setSelectedProduct(product)}>
          <h2>{product.name}</h2>
        </button>
        <p>{product.weight} · {product.description}</p>
        <div className="store-product-buy">
          <strong>{money(product.price)}</strong>
          <button
            className="round-add"
            onClick={() => addProduct(product.id)}
            aria-label={`Thêm ${product.name} vào giỏ`}
          >
            <Plus size={19} />
          </button>
        </div>
      </div>
    </article>
  );
}

export function ProductsPage() {
  const { products, categories } = useCatalog();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(ALL_CATEGORY);
  const visibleProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          (category === ALL_CATEGORY || product.category === category) &&
          `${product.name} ${product.category} ${product.origin}`
            .toLocaleLowerCase("vi-VN")
            .includes(query.toLocaleLowerCase("vi-VN")),
      ),
    [category, products, query],
  );
  return (
    <main>
      <PageIntro eyebrow="CỬA HÀNG A SỈN" title="Sản vật gọi tên miền nhớ.">
        Chọn một vị trà, một hũ mật rừng, hay chút gia vị từ núi cao. Giá và nội dung trong bản này đều là minh họa.
      </PageIntro>
      <section className="container catalog-page">
        <div className="catalog-toolbar">
          <div className="catalog-search">
            <Search size={19} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm sản vật bạn yêu thích"
              aria-label="Tìm sản phẩm"
            />
          </div>
          <span>{visibleProducts.length} sản vật</span>
        </div>
        <div className="category-tabs catalog-tabs" role="group" aria-label="Danh mục sản phẩm">
          {categories.map((item) => (
            <button
              key={item}
              className={category === item ? "active" : ""}
              onClick={() => setCategory(item)}
              aria-pressed={category === item}
            >
              {item}
            </button>
          ))}
        </div>
        {visibleProducts.length ? (
          <div className="store-product-grid">
            {visibleProducts.map((product) => <StoreProductCard product={product} key={product.id} />)}
          </div>
        ) : (
          <div className="catalog-empty"><Search size={34} /><h2>Chưa có sản vật phù hợp</h2><p>Thử một từ khóa hoặc danh mục khác nhé.</p></div>
        )}
      </section>
      <section className="purchase-help">
        <div className="container purchase-help-inner">
          <PackageCheck size={38} />
          <div><h2>Chọn xong rồi? Mình cùng gói quà nhé.</h2><p>Thêm sản vật vào giỏ hoặc ghé trình thiết kế để tạo một hộp quà riêng.</p></div>
          <Link className="button button-cream" to="/thiet-ke">Thiết kế hộp quà <ArrowRight size={17} /></Link>
        </div>
      </section>
    </main>
  );
}

export function DealsPage() {
  const { addProduct } = useShop();
  const { products, deals } = useCatalog();
  return (
    <main>
      <section className="deal-hero">
        <div className="container deal-hero-content">
          <span><BadgePercent size={17} /> ƯU ĐÃI MINH HỌA</span>
          <h1>Deal hời.<br /><em>Giá thật vui.</em></h1>
          <p>Ba niềm vui nho nhỏ từ A Sỉn — chỉ dùng để trải nghiệm giao diện, không phải chương trình khuyến mãi thực tế.</p>
          <a href="#deal-list" className="button button-cream">Xem deal hôm nay <ArrowRight size={17} /></a>
        </div>
      </section>
      <section id="deal-list" className="container deals-page">
        <div className="section-heading"><div><span className="eyebrow"><Clock3 size={14} /> LỰA CHỌN HÔM NAY</span><h2>Thích là <em>chốt deal.</em></h2></div><p>Giá niêm yết và mức giảm đều là dữ liệu giả.</p></div>
        <div className="deal-grid">
          {deals.flatMap((deal) => {
            const product = products.find((p) => p.id === deal.productId);
            if (!product) return [];
            return <article className={`deal-card deal-${deal.color}`} key={deal.id}>
              <div className="deal-image"><img src={product.image} alt={product.name} /><span>-{deal.discount}%</span></div>
              <div className="deal-copy"><small>{deal.label}</small><h2>{product.name}</h2><p>{product.weight} · {product.origin}</p><div className="deal-price"><del>{money(deal.originalPrice)}</del><strong>{money(product.price)}</strong></div><div className="deal-bottom"><span><Clock3 size={15} /> {deal.ending}</span><button className="button button-green" onClick={() => addProduct(product.id)}><ShoppingBag size={17} /> Chọn mua</button></div></div>
            </article>;
          })}
        </div>
      </section>
    </main>
  );
}

export function AboutPage() {
  return (
    <main>
      <PageIntro eyebrow="VỀ A SỈN" title="Từ miền đất lành, đến những món quà lành.">
        Đây là câu chuyện thương hiệu minh họa: một chuyến đi tưởng tượng qua những bản làng và mùa hương núi.
      </PageIntro>
      <section className="container origin-layout">
        <div className="origin-photo"><img src="/images/hero.webp" alt="Ruộng bậc thang Tây Bắc" /><span>21°46′ N · 104°07′ E</span></div>
        <div className="origin-story"><span className="eyebrow"><Mountain size={14} /> NGUỒN GỐC MINH HỌA</span><h2>Từ những ngày đi tìm <em>vị thật.</em></h2><p>A Sỉn được kể như một thương hiệu nhỏ mang sản vật Tây Bắc đến gần hơn với nhịp sống thành thị. Chúng tôi chọn trà, mật ong, gia vị và những câu chuyện đi cùng chúng.</p><p>Trong bản demo này, địa danh, đối tác sản xuất, con người và số liệu đều là hư cấu — được dùng để thể hiện cách một thương hiệu có thể kể câu chuyện nguồn gốc rõ ràng, ấm áp.</p><div className="origin-signature"><Leaf size={21} /> Từ núi rừng, bằng cả tấm lòng.</div></div>
      </section>
      <section className="brand-values"><div className="container"><span className="eyebrow">ĐIỀU A SỈN TIN</span><div className="brand-value-grid"><article><Sprout size={29} /><h3>Gần tự nhiên</h3><p>Ưu tiên câu chuyện mùa vụ, nguyên liệu và cách làm mộc mạc.</p></article><article><HeartHandshake size={29} /><h3>Đủ chân thành</h3><p>Mỗi món quà là một cách gửi đi sự quan tâm vừa vặn.</p></article><article><Store size={29} /><h3>Rõ nguồn gốc</h3><p>Trang thông tin thật sẽ cần công khai vùng trồng, tiêu chuẩn và đối tác.</p></article></div></div></section>
      <section className="container timeline-section"><span className="eyebrow">HÀNH TRÌNH TƯỞNG TƯỢNG</span><div className="timeline"><div><b>2022</b><h3>Một chuyến đi</h3><p>Ý tưởng gom góp hương vị Tây Bắc thành những món quà nhỏ.</p></div><div><b>2024</b><h3>Những hộp quà đầu tiên</h3><p>Thử phối trà, mật rừng và thiệp viết tay cho mùa đoàn viên.</p></div><div><b>2026</b><h3>A Sỉn trên không gian số</h3><p>Ra mắt trải nghiệm mua sắm và thiết kế quà trực tuyến — bản demo.</p></div></div></section>
    </main>
  );
}

export function NewsPage() {
  const publishedArticles = usePublishedArticles();
  return (
    <main>
      <PageIntro eyebrow="NHẬT KÝ CỦA A SỈN" title="Những mẩu chuyện từ núi về phố.">
        Cùng đọc vài bài viết giả lập về hương vị, những dịp tặng quà và cảm hứng sống chậm.
      </PageIntro>
      <section className="container news-page">
        <article className="featured-story"><img src="/images/hero.webp" alt="Núi rừng Tây Bắc" /><div><span className="eyebrow">CÂU CHUYỆN NỔI BẬT</span><h2>Đôi khi, một món quà là chiếc cầu nối ta về với những điều thân thương.</h2><p>Những chất liệu nhỏ bé có thể giữ lại cảm giác của một sáng mây, một bếp lửa, hay lời cảm ơn chưa kịp nói.</p><Link className="text-link" to={`/tin-tuc/${publishedArticles[0].id}`}>Đọc câu chuyện minh họa <ArrowRight size={17} /></Link></div></article>
        <div className="news-grid">{publishedArticles.map((story) => <article className="news-card" key={story.id}><img src={story.image} alt="" /><div><span>{story.tag} · {story.date}</span><h2>{story.title}</h2><p>{story.excerpt}</p><Link className="article-link" to={`/tin-tuc/${story.id}`}>Đọc bài viết <ChevronRight size={16} /></Link></div></article>)}</div>
      </section>
      <section className="newsletter"><div className="container newsletter-inner"><div><span className="eyebrow">THƯ TỪ A SỈN</span><h2>Thỉnh thoảng nhận một câu chuyện hay?</h2><p>Biểu mẫu đăng ký minh họa — không thu thập email.</p></div><div className="newsletter-fake"><span>hello@vi-du.vn</span><button aria-label="Đăng ký bản tin minh họa"><Send size={18} /></button></div></div></section>
    </main>
  );
}

export function NewsDetailPage() {
  const { storyId } = useParams();
  const publishedArticles = usePublishedArticles();
  const story = publishedArticles.find((item) => item.id === storyId);
  if (!story) {
    return <main className="article-not-found"><div className="container"><span className="eyebrow">NHẬT KÝ CỦA A SỈN</span><h1>Bài viết này chưa có ở đây.</h1><Link to="/tin-tuc" className="button button-green">Về trang tin tức <ArrowRight size={17} /></Link></div></main>;
  }
  return <main className="article-detail">
    <header className="article-hero"><div className="container"><Link className="article-back" to="/tin-tuc">← Trở về Tin tức</Link><span>{story.tag} · {story.date} · {story.readTime}</span><h1>{story.title}</h1><p>{story.excerpt}</p></div></header>
    <div className="article-cover container"><img src={story.image} alt={story.title} /></div>
    <article className="article-body"><p className="article-lead">Đây là bài viết minh họa được tạo để hoàn thiện trải nghiệm đọc tin của A Sỉn.</p>{story.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}<div className="article-note"><Leaf size={19} /><p>Toàn bộ câu chuyện, con người và thông tin sản vật trong bài đang là dữ liệu giả lập.</p></div></article>
    <section className="container article-more"><div><span className="eyebrow">ĐỌC TIẾP</span><h2>Còn vài câu chuyện nhỏ của A Sỉn.</h2></div><Link className="button button-green" to="/tin-tuc">Xem tất cả bài viết <ArrowRight size={17} /></Link></section>
  </main>;
}

export function ContactSection({ id }: { id?: string }) {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const sendMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSending(true);
    setError("");
    try {
      await submitContactMessage({
        name: String(form.get("name") ?? ""),
        email: String(form.get("email") ?? ""),
        message: String(form.get("message") ?? ""),
      });
      setSent(true);
    } catch {
      setError("A Sỉn chưa thể nhận lời nhắn. Vui lòng thử lại sau.");
    } finally {
      setSending(false);
    }
  };
  return (
      <section id={id} className="container contact-layout">
        <div className="contact-options"><article><span><Phone size={20} /></span><div><small>HOTLINE MINH HỌA</small><h2>0900 000 001</h2><p>Thứ Hai – Chủ Nhật · 08:30 – 20:30</p></div></article><article><span><Mail size={20} /></span><div><small>HÒM THƯ MINH HỌA</small><h2>hello@moctaybac.demo</h2><p>Để lại lời nhắn, A Sỉn sẽ phản hồi trong một ngày.</p></div></article><article><span><MapPin size={20} /></span><div><small>GÓC NHỎ MINH HỌA</small><h2>12 Đường Mây, Hà Nội</h2><p>Chỉ là địa chỉ giả để hoàn thiện giao diện.</p></div></article></div>
        <form className="contact-form" onSubmit={sendMessage}>
          <span className="eyebrow"><MessageCircle size={14} /> GỬI LỜI NHẮN</span><h2>Điều bạn muốn A Sỉn biết?</h2>{sent ? <div className="contact-success"><CheckCircle2 size={38} /><h3>A Sỉn đã nhận được lời nhắn.</h3><p>Thông tin được lưu an toàn trong hệ thống để đội ngũ phản hồi.</p><button className="text-link" type="button" onClick={() => setSent(false)}>Gửi thêm một lời nhắn</button></div> : <><label htmlFor="contact-name">Tên của bạn</label><input id="contact-name" name="name" required placeholder="Nguyễn An Nhiên" /><label htmlFor="contact-email">Email</label><input id="contact-email" name="email" type="email" required placeholder="an.nhien@vi-du.vn" /><label htmlFor="contact-message">Lời nhắn</label><textarea id="contact-message" name="message" required rows={5} placeholder="Mình muốn được A Sỉn tư vấn…" /><button className="button button-green" type="submit" disabled={sending}>{sending ? "Đang gửi…" : <>Gửi lời nhắn <ArrowRight size={17} /></>}</button>{error && <p role="alert">{error}</p>}<small>Lời nhắn được lưu để A Sỉn phản hồi; không hiển thị công khai.</small></>}</form>
      </section>
  );
}

export function ContactPage() {
  return <main><PageIntro eyebrow="KẾT NỐI CÙNG A SỈN" title="Mình luôn ở đây để lắng nghe.">Các kênh liên hệ dưới đây là dữ liệu minh họa; biểu mẫu không gửi thông tin đi bất cứ đâu.</PageIntro><ContactSection /></main>;
}
