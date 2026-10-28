import { Link } from "react-router-dom";
import { useShop } from "../../ShopContext";
import { useDocumentSeo } from "../../hooks/useDocumentSeo";
import { homeMeta } from "../../seo/meta";
import { MEDIA, REASONS_HOME, STATS, TESTIMONIALS_HOME } from "../content";
import { usePublishedArticleFeed } from "../../hooks/usePublishedArticles";
import { HOME_PRODUCT_IDS } from "../products";
import type { StorefrontProduct } from "../products";
import { ButtonLink, Contours, Eyebrow, ProductCard, SplitHero, Testimonial } from "../ui";

export default function HomePage() {
  useDocumentSeo((ctx) => homeMeta(ctx), []);
  const { products } = useShop();
  const featured = HOME_PRODUCT_IDS.flatMap((id) => {
    const product = products.find((item) => item.id === id);
    return product ? [product as StorefrontProduct] : [];
  });
  const { articles, loading: articlesLoading, error: articlesError, reload: reloadArticles } = usePublishedArticleFeed(3);

  return (
    <main className="sf-page sf-home">
      <SplitHero className="sf-home-hero" contours={MEDIA.contours.hero} image={MEDIA.homeHero} alt="Người con Tây Bắc giới thiệu hộp quà đặc sản A SỈN" caption="Hộp quà Sinh Lộc · Đặc sản Tây Bắc">
        <Eyebrow script>Đặc Sản Vùng Cao</Eyebrow>
        <h1 className="sf-display-sc">
          Nâng niu bản sắc
          <br />
          nâng tầm trải nghiệm
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

      <section className="sf-section sf-container sf-split sf-story">
        <figure className="sf-media-frame is-tall">
          <img src={MEDIA.homeStory} alt="Bà con vùng cao bên bếp lửa" loading="lazy" width={952} height={724} />
        </figure>
        <div>
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
            Chúng tôi tin rằng mỗi đặc sản không chỉ là món ăn, mà còn là câu chuyện về con người, văn hóa và vùng đất.
          </p>
          <ButtonLink to="/gioi-thieu" variant="outline">Khám phá câu chuyện</ButtonLink>
        </div>
      </section>

      <section className="sf-section sf-container">
        <Eyebrow>Sản phẩm</Eyebrow>
        <div className="sf-section-head">
          <h2 className="sf-script-title">Đặc sản được chọn lọc kỹ lưỡng</h2>
          <Link to="/san-pham" className="sf-text-link">Xem tất cả sản phẩm →</Link>
        </div>
        <div className="sf-product-grid is-wide">
          {featured.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      </section>

      <section className="sf-band sf-why">
        <div className="sf-container">
          <Eyebrow>Vì sao chọn A SỈN</Eyebrow>
          <div className="sf-why-head">
            <h2 className="sf-garamond-title">Bốn lý do quay lại với A Sỉn</h2>
            <ButtonLink to="/nguon-goc" variant="outline">Khám phá nguồn gốc</ButtonLink>
          </div>
          <ul className="sf-reasons">
            {REASONS_HOME.map((reason) => (
              <li key={reason.title}>
                <span aria-hidden="true">{reason.icon}</span>
                <h3>{reason.title}</h3>
                <p>{reason.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="sf-section sf-container">
        <Eyebrow>Khách hàng nói về A SỈN</Eyebrow>
        <h2 className="sf-script-title">Những trải nghiệm thật từ khách hàng</h2>
        <div className="sf-testimonials">
          {TESTIMONIALS_HOME.map((item) => <Testimonial key={item.name} {...item} />)}
        </div>
      </section>

      <section className="sf-section sf-container sf-home-news">
        <Contours src={MEDIA.contours.homeBottom} className="sf-bottom-contours" />
        <Eyebrow>Tin tức</Eyebrow>
        <h2 className="sf-script-title">Chuyện mùa vụ và câu chuyện núi rừng</h2>
        {articlesLoading && <p role="status">Đang tải câu chuyện…</p>}
        {articlesError && <p role="status">Chưa tải được bài viết. <button type="button" className="sf-chip" onClick={reloadArticles}>Thử lại</button></p>}
        <div className="sf-mini-news">
          {articles.map((article) => (
            <Link key={article.slug} to={`/tin-tuc/${article.slug}`}>
              <img src={article.image} alt="" loading="lazy" width={620} height={388} />
              <span>{article.title}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
