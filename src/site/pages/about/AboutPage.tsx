import { useDocumentSeo } from "../../../hooks/useDocumentSeo";
import { aboutMeta } from "../../../seo/meta";
import { Icon } from "../../icons";
import type { IconName } from "../../icons";
import { ASSETS } from "../../data";

const VALUES: [IconName, string, string][] = [
  ["leaf", "Gìn giữ bản sắc", "Giữ lại hương vị và cách thưởng thức đã làm nên nét riêng của ẩm thực Tây Bắc."],
  ["check", "Chất lượng tạo niềm tin", "Chọn lựa sản vật kỹ lưỡng và giúp người mua dễ dàng tìm hiểu nguồn gốc từng món."],
  ["gift", "Nâng tầm giá trị đặc sản", "Gói ghém những thức quà của bản làng trong bao bì chỉn chu để trao tặng."],
  ["box", "Kết nối truyền thống và hiện đại", "Đưa khách hàng đến gần đặc sản vùng cao qua thông tin truy xuất và trải nghiệm hộp quà 3D."],
];

const JOURNEY: [string, string, string][] = [
  ["Khởi nguồn", "Tình yêu từ núi rừng", "A SỈN bắt đầu từ mong muốn gìn giữ và chia sẻ những hương vị quen thuộc của quê nhà."],
  ["Kết nối", "Đồng hành cùng bản làng", "Cùng các đơn vị sản xuất địa phương chọn đặc sản có chất lượng và nguồn gốc rõ ràng."],
  ["Chuyển mình", "Nâng tầm giá trị truyền thống", "Chăm chút bao bì và đưa trải nghiệm số vào cách chọn mua, tìm hiểu và trao tặng đặc sản."],
  ["Lan tỏa", "Mang bản sắc vươn xa", "Gửi hương vị Tây Bắc và câu chuyện của người làm đến nhiều nơi hơn qua từng món quà."],
];

/** Trang Về chúng tôi (renderAboutStory của story-pages.js). */
export function AboutPage() {
  useDocumentSeo((ctx) => aboutMeta(ctx), []);
  return (
    <div className="story-page st-about st-about-ref">
      <section className="about-hero uh-hero" aria-labelledby="about-title">
        <img className="about-hero-photo uh-scene-img" src={ASSETS.about} alt="Năm thành viên A SỈN mặc áo đồng phục nâu" width="1365" height="2047" fetchPriority="high" />
        <div className="about-hero-layout">
          <div className="about-hero-copy">
            <span className="eyebrow">Về chúng tôi</span>
            <h1 id="about-title">Câu chuyện<br /><em>doanh nghiệp</em></h1>
            <p>Từ một người con miền núi, A SỈN bắt đầu hành trình mang những thức quà quê hương đến gần hơn với phố thị.</p>
          </div>
        </div>
      </section>
      <section className="about-name" aria-labelledby="about-name-title">
        <div className="wrap about-name-grid">
          <div className="about-name-copy">
            <span className="eyebrow">Ý nghĩa tên gọi</span>
            <h2 id="about-name-title">Vì sao là A SỈN?</h2>
            <p>Chữ “A” lấy cảm hứng từ cách đặt tên của nam giới người Mông, qua những cái tên thân thuộc như A Phủ, A Páo. Đó là cách thương hiệu gợi nhớ về một người con của bản làng, lớn lên cùng núi rừng Tây Bắc.</p>
            <p>Với A SỈN, chữ “SỈN” gợi một niềm say mê với hương vị quê nhà, với văn hóa bản làng và với vùng đất đã nuôi dưỡng những hương vị ấy.</p>
          </div>
          <figure className="about-name-photo" data-uh-reveal>
            <img src="/assets/original/media__home__img-2118.webp" alt="Bàn tay người phụ nữ Mông cầm bánh dày" width="1800" height="1200" loading="lazy" />
          </figure>
        </div>
      </section>
      <section className="about-mission" aria-labelledby="about-mission-title">
        <div className="wrap about-mission-grid">
          <div className="about-mission-label">
            <h2 className="eyebrow" id="about-mission-title">Sứ mệnh</h2>
            <span aria-hidden="true">“</span>
          </div>
          <div className="about-mission-copy" data-uh-reveal>
            <p>A SỈN muốn đưa đặc sản Tây Bắc vào đời sống hôm nay, để hương vị vùng cao được gìn giữ và sản vật địa phương được trân trọng hơn.</p>
            <p>Mỗi món quà được gói ghém chỉn chu là một dịp để chia sẻ văn hóa ẩm thực của vùng đất này với người nhận.</p>
          </div>
        </div>
      </section>
      <section className="about-values" aria-labelledby="about-values-title">
        <div className="wrap">
          <span className="eyebrow">Về chúng tôi</span>
          <h2 id="about-values-title">Giá trị chúng tôi theo đuổi</h2>
          <ol className="about-values-list">
            {VALUES.map(([symbol, title, copy], index) => (
              <li key={title} data-uh-reveal>
                <span className="about-value-number" aria-hidden="true">0{index + 1}</span>
                <span className="about-value-icon"><Icon name={symbol} /></span>
                <div><h3>{title}</h3><p>{copy}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section className="about-journey" aria-labelledby="about-journey-title">
        <div className="wrap">
          <span className="eyebrow">Hành trình</span>
          <h2 id="about-journey-title">Từ bản nhỏ tới thành phố</h2>
          <ol className="about-journey-list">
            {JOURNEY.map(([label, title, copy]) => (
              <li key={label} data-uh-reveal><span className="eyebrow">{label}</span><h3>{title}</h3><p>{copy}</p></li>
            ))}
          </ol>
        </div>
      </section>
      <section className="about-end" aria-labelledby="about-end-title">
        <div className="wrap">
          <div className="about-end-card">
            <h2 id="about-end-title">Mang miền núi về nhà</h2>
            <p>Mở một hộp quà A SỈN và dành chút thời gian để thưởng thức hương vị Tây Bắc theo cách của bạn.</p>
            <a className="btn dark" href="/san-pham">Khám phá sản phẩm <Icon name="arrow" /></a>
          </div>
        </div>
      </section>
    </div>
  );
}
