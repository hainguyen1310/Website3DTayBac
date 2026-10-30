import { useState } from "react";
import { Link } from "react-router-dom";
import { Play } from "lucide-react";
import { useShop } from "../../ShopContext";
import { useDocumentSeo } from "../../hooks/useDocumentSeo";
import { homeMeta } from "../../seo/meta";
import { MEDIA, REASONS_HOME, STATS, TESTIMONIALS_HOME } from "../content";
import { usePublishedArticleFeed } from "../../hooks/usePublishedArticles";
import { HOME_PRODUCT_IDS } from "../products";
import type { StorefrontProduct } from "../products";
import { ButtonLink, Eyebrow, ProductCard, ReasonsBand, SplitHero } from "../ui";
import FeedbackSection from "../FeedbackSection";

export default function HomePage() {
  const [storyPlaying, setStoryPlaying] = useState(false);
  useDocumentSeo((ctx) => homeMeta(ctx), []);
  const { products } = useShop();
  const featured = HOME_PRODUCT_IDS.flatMap((id) => {
    const product = products.find((item) => item.id === id);
    return product ? [product as StorefrontProduct] : [];
  });
  const { articles, loading: articlesLoading, error: articlesError, reload: reloadArticles } = usePublishedArticleFeed(3);

  return (
    <main className="sf-page sf-home">
      <SplitHero className="sf-home-hero" scene="painted" image={MEDIA.homeHero} focus="center" alt="Hộp quà A SỈN, thịt gác bếp và gia vị giữa núi rừng Tây Bắc trong sương sớm">
        <Eyebrow script>Đặc Sản Vùng Cao</Eyebrow>
        <h1 className="sf-display-sc">
          Đặc sản miền núi,
          <br />
          nâng niu như
          <br />
          một món quà quý
        </h1>
        <p className="sf-lead">
          Tuyển chọn tinh hoa ẩm thực Tây Bắc, mang trọn hương vị núi rừng đến gần hơn với cuộc sống hiện đại.
        </p>
        <div className="sf-actions">
          <ButtonLink to="/san-pham">Khám phá sản phẩm</ButtonLink>
          <ButtonLink to="/thiet-ke" variant="outline">Tạo hộp quà 3D</ButtonLink>
        </div>
        <dl className="sf-stats">
          {STATS.map((stat) => (
            <div key={stat.value}>
              <dt>{stat.value}</dt>
              <dd>{stat.label}</dd>
            </div>
          ))}
        </dl>
      </SplitHero>

      <div className="sf-home-surface">
      <section className="sf-section sf-container sf-split sf-story sf-deco is-sides">
        <div className="sf-story-film sf-media-frame" data-reveal="photo">
          {storyPlaying ? <video src={MEDIA.originVideo} poster={MEDIA.homeStory} controls autoPlay playsInline preload="metadata" aria-label="Câu chuyện A SỈN" /> : (
            <button type="button" className="sf-story-poster" onClick={() => setStoryPlaying(true)} aria-label="Xem câu chuyện A SỈN">
              <img src={MEDIA.homeStory} alt="Thung lũng núi rừng Tây Bắc trong ánh chiều" loading="lazy" width={960} height={600} />
              <span className="sf-story-play" aria-hidden="true"><Play fill="currentColor" /></span>
              <span className="sf-story-caption"><strong>Hành trình của A SỈN</strong><span>Khám phá hương vị, nguồn gốc và câu chuyện phía sau mỗi món quà.</span></span>
            </button>
          )}
        </div>
        <div data-reveal="side">
          <Eyebrow>Câu chuyện A SỈN</Eyebrow>
          <h2 className="sf-script-title">
            Từ bếp lửa miền núi
            <br />
            tới bàn tiệc thành thị
          </h2>
          <p className="sf-body">
            A SỈN ra đời từ tình yêu với núi rừng và khát vọng đưa những hương vị Tây Bắc chân thật nhất đến gần hơn với mọi người – một cách chỉn chu, minh bạch và hiện đại.
          </p>
          <p className="sf-body is-muted">
            Chúng tôi tin rằng mỗi đặc sản không chỉ là món ăn, mà còn là câu chuyện về con người, văn hóa và vùng đất. Và A SỈN là cầu nối để những câu chuyện ấy được lan tỏa xa hơn.
          </p>
          <ButtonLink to="/gioi-thieu" variant="outline">Khám phá câu chuyện</ButtonLink>
        </div>
      </section>

      <section className="sf-section sf-container sf-deco is-terraces">
        <div data-reveal="soft">
          <Eyebrow>Sản phẩm</Eyebrow>
          <div className="sf-section-head">
            <h2 className="sf-script-title">Đặc sản được chọn lọc kỹ lưỡng</h2>
            <Link to="/san-pham" className="sf-text-link">Xem tất cả sản phẩm →</Link>
          </div>
        </div>
        <div className="sf-product-grid is-wide">
          {featured.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      </section>

      <ReasonsBand
        titleClassName="sf-garamond-title"
        title="Bốn lý do quay lại với A Sỉn"
        reasons={REASONS_HOME}
      />

      <FeedbackSection reviews={TESTIMONIALS_HOME} />

      <section className="sf-section sf-container sf-home-news sf-deco is-clouds">
        <div data-reveal="soft">
          <Eyebrow>Tin tức</Eyebrow>
          <div className="sf-section-head">
            <h2 className="sf-script-title">Chuyện mùa vụ và câu chuyện núi rừng</h2>
            <Link to="/tin-tuc" className="sf-text-link">Xem tất cả tin tức →</Link>
          </div>
        </div>
        {articlesLoading && <p role="status">Đang tải câu chuyện…</p>}
        {articlesError && <p role="status">Chưa tải được bài viết. <button type="button" className="sf-chip" onClick={reloadArticles}>Thử lại</button></p>}
        <div className="sf-mini-news">
          {articles.map((article) => (
            <Link key={article.slug} to={`/tin-tuc/${article.slug}`} className="sf-home-news-card" data-reveal="rise">
              <div className="sf-home-news-media"><img src={article.image} alt="" loading="lazy" width={620} height={388} /><span>{article.tag}</span></div>
              <div className="sf-home-news-copy"><small>{article.date}</small><span>{article.title}</span><b>Đọc bài <span aria-hidden="true">→</span></b></div>
            </Link>
          ))}
        </div>
      </section>
      </div>
    </main>
  );
}
