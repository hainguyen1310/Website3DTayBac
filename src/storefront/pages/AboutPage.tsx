import { useDocumentSeo } from "../../hooks/useDocumentSeo";
import { aboutMeta } from "../../seo/meta";
import { JOURNEY, MEDIA, VALUES } from "../content";
import { ButtonLink, Contours, Eyebrow, SplitHero } from "../ui";

export default function AboutPage() {
  useDocumentSeo((ctx) => aboutMeta(ctx), []);
  return (
    <main className="sf-page">
      <SplitHero contours={MEDIA.contours.pageHero} image={MEDIA.aboutHero} alt="Bàn tay người phụ nữ Mông cầm bánh dày" caption="Phiên chợ vùng cao · Lào Cai">
        <Eyebrow>Về chúng tôi</Eyebrow>
        <h1 className="sf-script-display is-xl">
          Câu chuyện
          <br />
          doanh nghiệp
        </h1>
        <p className="sf-lead">
          Một người con miền núi, một cái tên nhỏ, và một hành trình dài đưa đặc sản quê hương xuống phố.
        </p>
      </SplitHero>

      <section className="sf-section sf-container sf-split is-text-first">
        <div>
          <Eyebrow>Ý nghĩa tên gọi</Eyebrow>
          <h2 className="sf-serif-title">Vì sao là A SỈN?</h2>
          <p className="sf-body">
            “A” là tên đệm phổ biến trong cách đặt tên của nam giới người Mông, thường xuất hiện trong những tên gọi thân thuộc như A Phủ, A Páo. Lấy cảm hứng từ nét văn hóa ấy, A SỈN lựa chọn chữ “A” để gợi hình ảnh một người con của bản làng, mang trong mình sự mộc mạc, chân thành và tình yêu với núi rừng Tây Bắc.
          </p>
          <p className="sf-body">
            Chúng tôi không chọn XỈN để nói về một cơn say. Chúng tôi chọn SỈN để kể về một niềm say mê – say hương vị, say bản sắc và say cả một vùng Tây Bắc.
          </p>
        </div>
        <figure className="sf-media-frame is-tall">
          <img src={MEDIA.aboutCraft} alt="Người con Tây Bắc giới thiệu hộp quà A SỈN" loading="lazy" width={954} height={732} />
        </figure>
      </section>

      <section className="sf-band sf-mission">
        <div className="sf-container">
          <Eyebrow>Sứ mệnh</Eyebrow>
          <div className="sf-mission-quote">
            <span aria-hidden="true">❝</span>
            <div>
              <p>
                A SỈN mang trong mình sứ mệnh đưa những hương vị đặc trưng của núi rừng Tây Bắc đến gần hơn với cuộc sống hiện đại, gìn giữ nét tinh túy trong văn hóa ẩm thực vùng cao và nâng tầm giá trị đặc sản địa phương.
              </p>
              <p>
                Không chỉ mang đến những sản phẩm chất lượng, A SỈN mong muốn mỗi món quà trở thành một cầu nối văn hóa, nơi hương vị truyền thống được trân trọng và trao gửi bằng sự chỉn chu, tinh tế.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="sf-section sf-container">
        <Eyebrow>Về chúng tôi</Eyebrow>
        <h2 className="sf-script-title is-medium">Giá trị chúng tôi theo đuổi</h2>
        <ol className="sf-values">
          {VALUES.map((value, index) => (
            <li key={value.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{value.title}</h3>
                <p>{value.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="sf-section sf-container sf-journey">
        <div>
          <Eyebrow>Hành trình</Eyebrow>
          <h2 className="sf-script-title is-medium">Từ bản nhỏ tới thành phố</h2>
          <ol className="sf-timeline">
            {JOURNEY.map((step) => (
              <li key={step.tag}>
                <small>{step.tag}</small>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
        <figure className="sf-media-frame is-portrait">
          <img src={MEDIA.aboutJourney} alt="Thợ xưởng A SỈN bên gác bếp" loading="lazy" width={702} height={878} />
        </figure>
      </section>

      <section className="sf-container sf-about-cta-wrap">
        <Contours src={MEDIA.contours.bottom} className="sf-bottom-contours" />
        <div className="sf-about-cta">
          <div>
            <h2>Mang miền núi về nhà</h2>
            <p>Mỗi hộp quà A SỈN là một lời mời bạn nếm thử miền núi theo cách chậm rãi và trọn vẹn nhất.</p>
          </div>
          <ButtonLink to="/san-pham">Khám phá sản phẩm</ButtonLink>
        </div>
      </section>
    </main>
  );
}
