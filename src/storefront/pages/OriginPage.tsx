import { useState } from "react";
import { useDocumentSeo } from "../../hooks/useDocumentSeo";
import { originMeta } from "../../seo/meta";
import { CERTIFICATES, MEDIA } from "../content";
import { Contours, Eyebrow } from "../ui";

const PRODUCERS = [
  {
    place: "Bắc Hà, Lào Cai",
    name: "HTX sản xuất rượu ngô Bản Phố",
    products: "Rượu ngô Bản Phố",
    text: "Hợp tác xã giữ cách nấu rượu ngô men lá truyền thống của người Mông Bản Phố: ngô hạt địa phương, men lá rừng và nồi chưng cất bằng củi.",
    image: MEDIA.originRuou,
    alt: "Người phụ nữ Mông đổ ngô vào nồi nấu rượu",
  },
  {
    place: "Bát Xát, Lào Cai",
    name: "Xưởng sản xuất thịt gác bếp Lèo Thị Thúy",
    products: "Trâu, lợn, ba chỉ, lạp xưởng gác bếp",
    text: "Xưởng sản xuất có hơn 12 năm kinh nghiệm, từ việc chọn lọc những con trâu con lợn cho đến chế biến bằng các kỹ thuật tốt nhất.",
    image: MEDIA.originXuong,
    alt: "Thợ xưởng treo thịt lên gác bếp",
  },
];

export default function OriginPage() {
  useDocumentSeo((ctx) => originMeta(ctx), []);
  const [playing, setPlaying] = useState(false);
  return (
    <main className="sf-page">
      <section className="sf-hero sf-page-hero is-bleed">
        <img className="sf-hero-bg" src={MEDIA.originHero} alt="" width={1800} height={1200} fetchPriority="high" />
        <Contours src={MEDIA.contours.pageHero} className="sf-hero-contours" />
        <div className="sf-container">
          <Eyebrow>Nguồn gốc</Eyebrow>
          <h1 className="sf-script-display is-xl">
            Từ miền núi tới
            <br />
            hộp quà của bạn
          </h1>
          <p className="sf-lead">
            Chúng tôi làm việc trực tiếp với các hộ đồng bào và xưởng sản xuất tại các bản vùng cao, không qua trung gian thu mua.
          </p>
        </div>
      </section>

      <section className="sf-section sf-container">
        <Eyebrow>Đơn vị sản xuất</Eyebrow>
        <h2 className="sf-garamond-title is-wine is-semibold">Các bên góp phần tạo nên A Sỉn</h2>
        <div className="sf-producers">
          {PRODUCERS.map((producer) => (
            <article key={producer.name} className="sf-producer">
              <figure className="sf-media-frame">
                <img src={producer.image} alt={producer.alt} loading="lazy" width={954} height={492} />
              </figure>
              <div>
                <Eyebrow>{producer.place}</Eyebrow>
                <h3 className="sf-script-subtitle">{producer.name}</h3>
                <p className="sf-gold-note">{producer.products}</p>
                <p className="sf-body is-muted">{producer.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="sf-section sf-container">
        <Eyebrow>Chứng nhận</Eyebrow>
        <h2 className="sf-garamond-title is-wine is-semibold is-large">Giấy chứng nhận và kiểm định</h2>
        <p className="sf-body is-muted">Bản gốc của các giấy tờ được lưu tại văn phòng A SỈN và gửi kèm khi khách yêu cầu.</p>
        <ul className="sf-certificates">
          {CERTIFICATES.map((item) => (
            <li key={item.title}>
              <span className="sf-cert-icon" aria-hidden="true">{item.icon}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
              <span className="sf-cert-seal" aria-hidden="true">✧</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="sf-origin-cta">
        <Contours src={MEDIA.contours.bottom} className="sf-bottom-contours" />
        <div className="sf-container sf-split">
          <div>
            <Eyebrow>Hành trình trải nghiệm</Eyebrow>
            <h2 className="sf-garamond-title is-wine is-semibold is-large">Cách chế biến món ăn</h2>
            <p className="sf-body is-muted">
              Bạn không biết cách nấu sao cho ngon miệng? Không biết kết hợp với những nguyên liệu nấu ăn nào khác? Hãy để A Sỉn giúp bạn!
            </p>
            <button type="button" className="sf-button is-primary is-tall" onClick={() => setPlaying(true)}>
              Xem cách chế biến <span aria-hidden="true">→</span>
            </button>
          </div>
          <div className="sf-video">
            {playing ? (
              <video src={MEDIA.originVideo} poster={MEDIA.originVideoPoster} controls autoPlay playsInline preload="metadata" />
            ) : (
              <button type="button" className="sf-video-poster" onClick={() => setPlaying(true)} aria-label="Phát video cách chế biến">
                <img src={MEDIA.originVideoPoster} alt="" loading="lazy" width={850} height={532} />
                <span aria-hidden="true">▶</span>
              </button>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
