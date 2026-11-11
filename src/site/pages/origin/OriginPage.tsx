import { useEffect, useRef, useState } from "react";
import { useDocumentSeo } from "../../../hooks/useDocumentSeo";
import { originMeta } from "../../../seo/meta";
import { Icon } from "../../icons";
import { CERTIFICATES, CERTIFICATE_GROUPS, PRODUCERS } from "./originData";
import type { Certificate, Producer } from "./originData";

function ProducerItem({ item, index }: { item: Producer; index: number }) {
  return (
    <article className={`og-producer${index === 1 ? " og-producer-reverse" : ""}`}>
      <details className="og-workshop" open={index === 0 || undefined}>
        <summary className="og-workshop-summary">
          <h3>
            <span className="og-producer-number" aria-hidden="true">{item.number}</span>
            <span className="og-workshop-title"><span className="eyebrow">{item.location}</span>{item.title}</span>
            <span className="og-workshop-toggle" aria-hidden="true"><Icon name="plus" /></span>
          </h3>
        </summary>
        <div className="og-workshop-panel">
          <figure className="og-producer-photo" data-uh-reveal><img src={item.image} alt={item.alt} loading="lazy" width={item.width ?? 1800} height={item.height ?? 1200} /><figcaption>{item.caption}</figcaption></figure>
          <div className="og-producer-copy" data-uh-reveal>
            <ul className="og-product-tags" aria-label="Sản phẩm được giới thiệu">{item.products.map((name) => <li key={name}>{name}</li>)}</ul>
            <p>{item.copy}</p>
            <a className="text-link" href={item.href} {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{item.cta} <Icon name="diagonal" /></a>
          </div>
        </div>
      </details>
    </article>
  );
}

function CertificateCard({ item, onOpen }: { item: Certificate; onOpen: (item: Certificate, trigger: HTMLElement) => void }) {
  return (
    <li className="og-cert-card">
      <button type="button" className="og-cert-preview" data-og-certificate={item.key} aria-label={`Xem ảnh ${item.title}`} aria-haspopup="dialog" onClick={(event) => onOpen(item, event.currentTarget)}>
        <img src={item.thumb} alt={item.title} loading="lazy" width="600" height="800" />
        <span>Phóng to giấy chứng nhận <Icon name="plus" /></span>
      </button>
      <div className="og-cert-body">
        <div className="og-cert-meta"><span className="eyebrow">{item.kind}</span>{item.year && <span className="og-cert-year">{item.year}</span>}</div>
        <h3>{item.title}</h3><p className="og-cert-issuer">{item.issuer}</p><p>{item.copy}</p>
      </div>
    </li>
  );
}

/** Hộp thoại xem giấy chứng nhận, có phóng to (og-proof-dialog). */
function ProofDialog({ item, onClose }: { item: Certificate | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const [zoomed, setZoomed] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (item) {
      setZoomed(false);
      if (!element.open) element.showModal();
      closeButton.current?.focus({ preventScroll: true });
    } else if (element.open) element.close();
  }, [item]);
  useEffect(() => {
    viewport.current?.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [zoomed, item]);
  return (
    <dialog
      ref={ref}
      className="og-proof-dialog"
      aria-labelledby="og-proof-title"
      aria-describedby="og-proof-caption"
      onClose={onClose}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.currentTarget.close();
      }}
    >
      <div className="og-proof-header">
        <div><span className="eyebrow">HỒ SƠ ĐƯỢC A SỈN CÔNG BỐ</span><h2 className="og-proof-title" id="og-proof-title">{item?.title}</h2></div>
        <div className="og-proof-actions">
          <button type="button" className="og-proof-close og-proof-zoom icon-button" aria-label="Phóng to giấy chứng nhận" aria-pressed={zoomed} aria-controls="og-proof-viewport" onClick={() => setZoomed((value) => !value)}><Icon name={zoomed ? "minus" : "plus"} /></button>
          <button ref={closeButton} type="button" className="og-proof-close icon-button" data-og-proof-close aria-label="Đóng giấy chứng nhận" onClick={() => ref.current?.close()}><Icon name="close" /></button>
        </div>
      </div>
      <div ref={viewport} className={`og-proof-viewport${zoomed ? " is-zoomed" : ""}`} id="og-proof-viewport" tabIndex={0} role="region" aria-label="Ảnh giấy chứng nhận">
        <img className="og-proof-image" src={item?.image} alt={item?.title ?? ""} />
      </div>
      <div className="og-proof-footer">
        <p className="og-proof-caption" id="og-proof-caption">Bản chụp được A SỈN công bố. Hồ sơ áp dụng cho sản phẩm hoặc cơ sở được ghi trên giấy tờ.</p>
        <a className="og-proof-original text-link" href={item?.image} target="_blank" rel="noopener noreferrer">Mở ảnh đầy đủ <Icon name="diagonal" /></a>
      </div>
    </dialog>
  );
}

/** Trang Nguồn gốc (renderOriginPage). */
export function OriginPage() {
  useDocumentSeo((ctx) => originMeta(ctx), []);
  const [proof, setProof] = useState<Certificate | null>(null);
  const lastTrigger = useRef<HTMLElement | null>(null);
  const page = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = page.current;
    return () => element?.querySelectorAll("video").forEach((video) => video.pause());
  }, []);
  const openProof = (item: Certificate, trigger: HTMLElement) => {
    lastTrigger.current = trigger;
    setProof(item);
  };
  const closeProof = () => {
    setProof(null);
    if (lastTrigger.current?.isConnected) lastTrigger.current.focus({ preventScroll: true });
    lastTrigger.current = null;
  };
  return (
    <div className="og-page" ref={page}>
      <section className="og-hero eu-hero uh-hero" aria-labelledby="og-title">
        <img className="eu-hero-image uh-scene-img" src="/assets/origin/thit-gac-bep-hero.webp" alt="Những miếng thịt gác bếp treo trên thanh tre trong gian bếp" fetchPriority="high" width="1536" height="1024" />
        <div className="wrap">
          <nav className="og-breadcrumb" aria-label="Đường dẫn"><a href="/">Trang chủ</a><span aria-hidden="true">/</span><span aria-current="page">Nguồn gốc</span></nav>
          <div className="og-hero-grid">
            <div className="og-hero-copy uh-hero-copy" data-uh-reveal>
              <span className="eyebrow">NGUỒN GỐC SẢN VẬT</span>
              <h1 id="og-title"><span>Mang góc bếp của người bản địa</span> <em>về mâm cơm của bạn.</em></h1>
              <p>A SỈN kết nối trực tiếp với các hộ đồng bào và xưởng sản xuất tại những bản vùng cao, để đưa đặc sản cùng câu chuyện của người làm đến gần bạn hơn.</p>
              <nav className="og-section-nav" aria-label="Khám phá nguồn gốc"><a href="#nguoi-lam">Người làm <Icon name="down" /></a><a href="#giay-chung-nhan">Giấy chứng nhận</a><a href="#cach-thuong-thuc">Cách thưởng thức</a></nav>
            </div>
          </div>
        </div>
      </section>

      <section className="og-producers" id="nguoi-lam" aria-labelledby="og-producers-title">
        <div className="wrap">
          <div className="og-section-heading"><div><span className="eyebrow">01 / ĐƠN VỊ SẢN XUẤT</span><h2 id="og-producers-title">Những người làm nên<br /><em>hương vị A SỈN.</em></h2></div><p>Mỗi sản vật có một nơi bắt đầu.<br />Mỗi người làm giữ một cách riêng.</p></div>
          <div className="og-producer-list">{PRODUCERS.map((item, index) => <ProducerItem key={item.number} item={item} index={index} />)}</div>
          <p className="og-producer-note">Địa điểm xưởng và cơ sở được giới thiệu tại đây. Xuất xứ, thành phần và thông tin của từng sản phẩm được ghi riêng trên trang sản phẩm và bao bì.</p>
        </div>
      </section>

      <section className="og-certificates" id="giay-chung-nhan" aria-labelledby="og-certificates-title">
        <div className="wrap">
          <div className="og-section-heading"><div><span className="eyebrow">02 / HỒ SƠ SẢN PHẨM</span><h2 id="og-certificates-title">Giấy chứng nhận<br /><em>được A SỈN công bố.</em></h2></div><p>Hồ sơ gắn với từng sản phẩm và cơ sở được nêu. Liên hệ A SỈN để đối chiếu bản gốc.</p></div>
          <div className="og-cert-groups">
            {CERTIFICATE_GROUPS.map((group) => {
              const documents = CERTIFICATES.filter((item) => item.group === group.key);
              const titleId = `og-cert-group-${group.key}`;
              return (
                <details key={group.key} className="og-cert-group">
                  <summary className="og-cert-group-summary">
                    <span className="og-cert-group-title" id={titleId}>{group.title}</span>
                    <span className="og-cert-group-count">{documents.length} giấy tờ</span>
                    <span className="og-cert-group-toggle" aria-hidden="true"><Icon name="plus" /><Icon name="minus" /></span>
                  </summary>
                  <ul className="og-cert-grid" aria-labelledby={titleId}>{documents.map((item) => <CertificateCard key={item.key} item={item} onOpen={openProof} />)}</ul>
                </details>
              );
            })}
          </div>
          <div className="og-cert-note"><p>Theo thông tin của A SỈN, bản gốc được lưu tại văn phòng và cung cấp khi khách hàng yêu cầu.</p><a href="/lien-he" className="text-link">Hỏi về hồ sơ sản phẩm <Icon name="diagonal" /></a></div>
        </div>
      </section>

      <section className="og-preparation" id="cach-thuong-thuc" aria-labelledby="og-preparation-title">
        <div className="wrap og-preparation-grid">
          <div className="og-preparation-copy">
            <span className="eyebrow" data-uh-reveal>03 / TỪ CÁCH LÀM ĐẾN HƯƠNG VỊ</span>
            <h2 id="og-preparation-title">Một cách làm.<br /><em>Một hương vị.</em></h2>
            <p>Video rượu ngô Bản Phố được A SỈN giới thiệu trên trang Nguồn gốc. Mời bạn xem thêm câu chuyện phía sau món đặc sản này.</p>
            <a className="text-link" href="/san-pham/ruou-ngo-ban-pho" data-uh-reveal>Xem rượu ngô Bản Phố <Icon name="diagonal" /></a>
          </div>
          <figure className="og-video-card" data-uh-reveal>
            <video controls playsInline preload="none" aria-label="Video rượu ngô Bản Phố từ A SỈN" poster="/media/products/ruou/img-2153.webp">
              <source src="/media/video/ruou-ngo-ban-pho.mp4" type="video/mp4" />
              Trình duyệt của bạn chưa hỗ trợ video. <a href="/media/video/ruou-ngo-ban-pho.mp4">Mở video rượu ngô Bản Phố</a>.
            </video>
            <figcaption><span>RƯỢU NGÔ BẢN PHỐ</span><span>VIDEO TỪ A SỈN</span></figcaption>
          </figure>
        </div>
      </section>

      <section className="og-end">
        <div className="wrap">
          <span className="eyebrow">HIỂU NGƯỜI LÀM · THÊM YÊU MÓN QUÀ</span>
          <h2>Mang một chút Tây Bắc<br /><em>đến người bạn thương.</em></h2>
          <div className="og-end-actions"><a className="btn dark" href="/san-pham">Khám phá đặc sản <Icon name="arrow" /></a><a className="text-link" href="/thiet-ke">Tự tay chọn hộp quà <Icon name="diagonal" /></a></div>
          <a className="og-source" href="/gioi-thieu">Câu chuyện A SỈN <Icon name="diagonal" /></a>
        </div>
      </section>

      <ProofDialog item={proof} onClose={closeProof} />
    </div>
  );
}
