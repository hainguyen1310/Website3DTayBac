import { useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, CheckCircle2, Mail, MapPin, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { useWebsite } from "./WebsiteContext";
import { CONTACT_TOPICS } from "./operations";
import type { ContactTopic } from "./operations";
import { submitContactMessage } from "./services/storeApi";
import { PageHero } from "./PageElements";
import { resolveZaloUrl } from "./support";
import { ZaloIcon } from "./SupportWidget";
import { useDocumentSeo } from "./hooks/useDocumentSeo";
import { contactMeta } from "./seo/meta";
import { trackEvent } from "./analytics";
export function ContactSection() {
  const { content: c, support } = useWebsite();
  const zalo = support.zaloEnabled ? resolveZaloUrl(support.zaloUrl) : null;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await submitContactMessage({
        name: String(data.get("name")),
        email: String(data.get("email")),
        phone: String(data.get("phone")),
        subject: String(data.get("subject")),
        topic: String(data.get("topic")) as ContactTopic,
        orderReference: String(data.get("orderReference")),
        message: String(data.get("message")),
        marketingConsent: data.get("marketing") === "on",
        website: String(data.get("website") ?? ""),
      });
      setSent(true);
      trackEvent("generate_lead", { topic: String(data.get("topic")) });
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Chưa gửi được lời nhắn. Vui lòng thử lại.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <section id="lien-he" className="asin-contact">
      <div className="moc-container asin-contact-grid">
        <div className="asin-contact-copy" data-reveal="rise">
          <span className="moc-eyebrow">KẾT NỐI CÙNG A SỈN</span>
          <h2>{c["contact.title"]}</h2>
          <p>{c["contact.description"]}</p>
          <div className="asin-contact-details">
            {zalo && <p><ZaloIcon /><span><b>Zalo</b><a href={zalo} target="_blank" rel="noopener noreferrer" onClick={() => trackEvent("zalo_click", { placement: "contact_page" })}>Nhắn tin với A Sỉn</a></span></p>}
            {c["contact.phone"] && (
              <p>
                <Phone size={20} />
                <span>
                  <b>Hotline</b>
                  <a href={`tel:${c["contact.phone"].replace(/[^+\d]/g, "")}`} onClick={() => trackEvent("phone_click", { placement: "contact_page" })}>
                    {c["contact.phone"]}
                  </a>
                </span>
              </p>
            )}
            {c["contact.email"] && (
              <p>
                <Mail size={20} />
                <span>
                  <b>Email</b>
                  <a href={`mailto:${c["contact.email"]}`}>{c["contact.email"]}</a>
                </span>
              </p>
            )}
            {c["contact.address"] && (
              <p>
                <MapPin size={20} />
                <span>
                  <b>Địa chỉ</b>
                  {c["contact.address"]}
                </span>
              </p>
            )}
            {c["contact.hours"] && <p>{c["contact.hours"]}</p>}
          </div>
          <small>
            Thông tin của bạn chỉ được dùng để tư vấn và xử lý yêu cầu. Bạn
            không cần tạo tài khoản.
          </small>
        </div>
        {sent ? (
          <div className="asin-contact-success" role="status">
            <CheckCircle2 size={42} />
            <h3>A Sỉn đã nhận được lời nhắn.</h3>
            <p>
              Đội ngũ sẽ phản hồi qua email bạn đã cung cấp. Bạn có thể trả lời
              trực tiếp email đó để tiếp tục trao đổi.
            </p>
            <button className="moc-btn-dark" onClick={() => setSent(false)}>
              Gửi yêu cầu khác
            </button>
          </div>
        ) : (
          <form className="asin-contact-form" data-reveal="soft" onSubmit={submit}>
            <h3>Gửi lời nhắn cho A Sỉn</h3>
            <div className="asin-contact-fields">
              <label>
                Họ và tên *
                <input
                  name="name"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={80}
                />
              </label>
              <label>
                Email nhận phản hồi *
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                />
              </label>
              <label>
                Số điện thoại
                <input
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  pattern="(0[0-9]{9}|\+84[0-9]{9})"
                  placeholder="0901234567"
                />
              </label>
              <label>
                Bạn cần hỗ trợ về
                <select name="topic" defaultValue="product">
                  {Object.entries(CONTACT_TOPICS)
                    .filter(([v]) => v !== "newsletter")
                    .map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                </select>
              </label>
              <label className="full">
                Tiêu đề *
                <input
                  name="subject"
                  required
                  minLength={3}
                  maxLength={160}
                  placeholder="Ví dụ: Tư vấn hộp quà cho đối tác"
                />
              </label>
              <label className="full">
                Mã đơn hàng (nếu có)
                <input
                  name="orderReference"
                  maxLength={80}
                  placeholder="ASIN-…"
                />
              </label>
              <label className="full">
                Nội dung *
                <textarea
                  name="message"
                  required
                  minLength={5}
                  maxLength={5000}
                  rows={5}
                  placeholder="Chia sẻ thêm để A Sỉn có thể hỗ trợ bạn…"
                />
              </label>
            </div>
            <label className="contact-honeypot" aria-hidden="true">
              Website
              <input name="website" tabIndex={-1} autoComplete="off" />
            </label>
            <label className="asin-contact-consent">
              <input type="checkbox" name="marketing" /> Tôi muốn nhận thêm câu
              chuyện, sản phẩm mới và ưu đãi qua email (không bắt buộc).
            </label>
            {error && (
              <p role="alert" className="asin-contact-error">
                {error}
              </p>
            )}
            <button className="moc-btn-dark" disabled={busy}>
              {busy ? "Đang gửi…" : "Gửi lời nhắn"}
              <ArrowRight size={17} />
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
export default function ContactPage() {
  const { content: c } = useWebsite();
  useDocumentSeo((ctx) => contactMeta(ctx), []);
  return (
    <main className="moc-page asin-contact-page">
      <PageHero current="Liên hệ" eyebrow="KẾT NỐI CÙNG A SỈN" title={"Một lời nhắn nhỏ.\nMở đầu một câu chuyện."} description={c["contact.description"]} image="/images/asin/journey-handover.webp" alt="Minh họa trao gửi hộp quà A Sỉn"><a className="asin-read-link" href="#lien-he">Gửi lời nhắn <ArrowRight size={17}/></a></PageHero>
      <ContactSection />
      <section className="asin-container asin-contact-guide"><span className="asin-eyebrow">CÓ THỂ BẠN ĐANG QUAN TÂM</span><h2>Mua hàng cùng A Sỉn.</h2>{[["Đặt hàng & thanh toán", "faq.order"], ["Giao hàng", "faq.shipping"], ["Hỗ trợ đổi trả", "faq.returns"]].map(([title, key]) => <details key={key}><summary>{title}</summary><p>{c[key]}</p></details>)}<Link className="asin-read-link" to="/san-pham">Trở lại chọn sản phẩm <ArrowRight size={16}/></Link></section>
    </main>
  );
}
