import { useState } from "react";
import { useDocumentSeo } from "../../hooks/useDocumentSeo";
import { originMeta } from "../../seo/meta";
import { ZoomIn } from "lucide-react";
import { CERTIFICATES, MEDIA } from "../content";
import type { Certificate } from "../content";
import { Eyebrow, Lightbox, SplitHero } from "../ui";

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
  const [zoomed, setZoomed] = useState<Certificate | null>(null);
  return (
    <main className="sf-page sf-origin-page">
      <SplitHero className="sf-origin-hero" image={MEDIA.originHero} focus="center 37%" alt="Phụ nữ Mông thu hái trên đồi chè giữa núi rừng Tây Bắc trong sương sớm">
        <Eyebrow>Nguồn gốc</Eyebrow>
        <h1 className="sf-script-display is-xl">
          Từ nương rẫy tới
          <br />
          hộp quà của bạn
        </h1>
        <p className="sf-lead">
          Chúng tôi làm việc trực tiếp với các hộ đồng bào và xưởng sản xuất tại các bản vùng cao, không qua trung gian thu mua, để mang đến những đặc sản nguyên bản, chất lượng và bền vững.
        </p>
      </SplitHero>

      <section className="sf-section sf-container sf-origin-producers sf-deco is-sides">
        <Eyebrow>Đơn vị sản xuất</Eyebrow>
        <h2 className="sf-garamond-title is-wine is-semibold">Các bên góp phần tạo nên A Sỉn</h2>
        <div className="sf-producers">
          {PRODUCERS.map((producer) => (
            <article key={producer.name} className="sf-producer" data-reveal="rise">
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

      <section className="sf-section sf-container sf-deco is-terraces">
        <Eyebrow>Chứng nhận</Eyebrow>
        <h2 className="sf-garamond-title is-wine is-semibold is-large">Giấy chứng nhận và kiểm định</h2>
        <p className="sf-body is-muted">Bản gốc của các giấy tờ được lưu tại văn phòng A SỈN và gửi kèm khi khách yêu cầu.</p>
        <ol className="sf-certificates">
          {CERTIFICATES.map((item, index) => (
            <li key={item.title} data-reveal="rise">
              <button type="button" className="sf-cert-thumb" onClick={() => setZoomed(item)} aria-label={`Xem ảnh ${item.title}`}>
                <img src={item.thumb} alt={item.title} loading="lazy" width={480} height={678} />
                <ZoomIn size={18} aria-hidden="true" />
              </button>
              <span className="sf-cert-no" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <h3>{item.title}</h3>
              <p className="sf-cert-issuer">{item.issuer}</p>
              <p>{item.text}</p>
            </li>
          ))}
        </ol>
        {zoomed && <Lightbox src={zoomed.image} alt={zoomed.title} onClose={() => setZoomed(null)} />}
      </section>

      <section className="sf-origin-cta">
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
