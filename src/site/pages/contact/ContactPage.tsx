import { useState } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useDocumentSeo } from "../../../hooks/useDocumentSeo";
import { contactMeta } from "../../../seo/meta";
import { useWebsite } from "../../../WebsiteContext";
import { submitContactMessage } from "../../../services/storeApi";
import type { ContactTopic } from "../../../operations";
import { trackEvent } from "../../../analytics";
import { Icon } from "../../icons";

/** Chủ đề của bản khách duyệt và chủ đề tương ứng trong hộp thư của admin. */
const TOPICS: [value: string, label: string, topic: ContactTopic][] = [
  ["tu-van-san-pham", "Tư vấn sản phẩm", "product"],
  ["don-hang", "Đơn hàng & giao nhận", "order"],
  ["qua-tang-doanh-nghiep", "Quà tặng doanh nghiệp", "gift"],
  ["hop-tac", "Hợp tác", "partnership"],
  ["chia-se-trai-nghiem", "Chia sẻ trải nghiệm", "other"],
  ["gop-y", "Góp ý / hỗ trợ khác", "other"],
];
const BUSINESS = "qua-tang-doanh-nghiep";
const PRESET_SUBJECTS: Record<string, string> = { [BUSINESS]: "Tư vấn quà tặng doanh nghiệp", "chia-se-trai-nghiem": "Chia sẻ trải nghiệm với A SỈN" };

type Status = "idle" | "sending" | "sent" | "error";

/** Nội dung gửi đi: số hộp và ngày nhận (quà doanh nghiệp) ghép vào đầu lời nhắn như formatInquiry. */
function composeMessage(data: FormData, business: boolean) {
  const field = (name: string) => String(data.get(name) ?? "").trim();
  const details = business ? [field("quantity") && `Số hộp dự kiến: ${field("quantity")}`, field("deadline") && `Ngày dự kiến nhận quà: ${field("deadline").split("-").reverse().join("/")}`].filter(Boolean) : [];
  return `${details.length ? `${details.join("\n")}\n\n` : ""}${field("message")}`;
}

/** Trang Liên hệ (renderContact): biểu mẫu gửi thẳng vào hộp thư hỗ trợ của A SỈN. */
export function ContactPage() {
  useDocumentSeo((ctx) => contactMeta(ctx), []);
  const { content } = useWebsite();
  const [params] = useSearchParams();
  const chosen = params.get("chu-de") ?? "";
  const [topic, setTopic] = useState(() => (TOPICS.some(([value]) => value === chosen) ? chosen : TOPICS[0][0]));
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const business = topic === BUSINESS;
  const phone = content["contact.phone"];
  const email = content["contact.email"];

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const empty = ["name", "subject", "message"].map((name) => form.elements.namedItem(name) as HTMLInputElement).find((input) => !input.value.trim());
    if (empty) {
      empty.setCustomValidity("Vui lòng nhập thông tin này.");
      empty.reportValidity();
      return;
    }
    if (!form.reportValidity()) return;
    setStatus("sending");
    setError("");
    try {
      await submitContactMessage({
        name: String(data.get("name")).trim(),
        email: String(data.get("email")).trim(),
        phone: String(data.get("phone") ?? "").trim() || undefined,
        subject: String(data.get("subject")).trim(),
        topic: TOPICS.find(([value]) => value === topic)?.[2] ?? "other",
        orderReference: String(data.get("order") ?? "").trim() || undefined,
        message: composeMessage(data, business),
        website: String(data.get("website") ?? ""),
      });
      trackEvent("generate_lead", { topic });
      setStatus("sent");
      form.reset();
    } catch (caught) {
      setStatus("error");
      setError(caught instanceof Error && caught.message ? caught.message : "Chưa gửi được lời nhắn. Vui lòng thử lại.");
    }
  };

  return (
    <>
      <section className="eu-contact-hero eu-hero uh-hero">
        <img className="eu-hero-image uh-scene-img" src="/assets/original/media__hero__about.webp" alt="Núi rừng và bản làng Tây Bắc" fetchPriority="high" />
        <div className="wrap">
          <nav className="pg-crumb" aria-label="Đường dẫn"><a href="/">Trang chủ</a><span> / </span><span aria-current="page">Liên hệ</span></nav>
          <div className="sc-contact-heading uh-hero-copy" data-uh-reveal>
            <span className="eyebrow">KẾT NỐI VỚI A SỈN</span>
            <h1>Một lời nhắn nhỏ.<br /><em>Mở đầu một câu chuyện.</em></h1>
            <p>Tư vấn đặc sản, chọn quà hay chia sẻ một lời góp ý. Câu chuyện của bạn bắt đầu từ đây.</p>
            <a className="btn dark" href="#eu-contact-form">Soạn lời nhắn <Icon name="arrow" /></a>
          </div>
        </div>
      </section>
      <section className="sc-contact section">
        <div className="wrap">
          <div className="sc-contact-grid">
            <aside>
              <img src="/assets/original/media__hero__about.webp" alt="Núi rừng và bản làng Tây Bắc" loading="lazy" />
              <h2>Ngồi lại.<br />Kể nhau nghe.</h2>
              <p>Tư vấn đặc sản, chọn quà hay chia sẻ một lời góp ý. A SỈN luôn có một chỗ dành cho câu chuyện của bạn.</p>
              {phone && <a className="text-link" href={`tel:${phone.replace(/[^+\d]/g, "")}`} onClick={() => trackEvent("phone_click", { placement: "contact_page" })}>Gọi {phone} <Icon name="diagonal" /></a>}
              {email && <a className="text-link" href={`mailto:${email}`}>{email} <Icon name="diagonal" /></a>}
            </aside>
            <div>
              <form className="sc-contact-form" id="eu-contact-form" onSubmit={(event) => void submit(event)} onInput={(event) => (event.target as HTMLInputElement).setCustomValidity?.("")}>
                <div className="sc-form-title"><h2>Soạn lời nhắn cho A SỈN</h2><span>Phản hồi trong giờ làm việc</span></div>
                <div className="sc-form-row">
                  <label>Họ và tên *<input name="name" autoComplete="name" required maxLength={80} placeholder="Tên của bạn" /></label>
                  <label>Email nhận phản hồi *<input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="Email của bạn" /></label>
                </div>
                <div className="sc-form-row">
                  <label>Số điện thoại<input name="phone" type="tel" autoComplete="tel" maxLength={20} placeholder="Số điện thoại" /></label>
                  <label>Bạn cần hỗ trợ về<select name="topic" value={topic} onChange={(event) => setTopic(event.target.value)}>{TOPICS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                </div>
                <div className="sc-form-row" data-contact-gift hidden={!business}>
                  <label>Số hộp dự kiến<input name="quantity" type="number" min="1" step="1" inputMode="numeric" placeholder="Ví dụ 30" disabled={!business} /></label>
                  <label>Ngày dự kiến nhận quà<input name="deadline" type="date" disabled={!business} /></label>
                </div>
                <label>Tiêu đề *<input name="subject" required maxLength={160} placeholder="Bạn muốn chia sẻ điều gì?" defaultValue={PRESET_SUBJECTS[chosen] ?? ""} key={chosen} /></label>
                <label>Mã đơn hàng (nếu có)<input name="order" maxLength={60} placeholder="Mã đơn của bạn" /></label>
                <label>Nội dung *<textarea name="message" rows={5} required maxLength={4000} placeholder={business ? "Bạn muốn tặng quà dịp nào? Hãy cho A SỈN biết mức ngân sách và mong muốn về hộp, thiệp hoặc lời nhắn." : "Viết lời nhắn của bạn…"} /></label>
                <input className="sr-only" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
                <p className="sc-form-note">Lời nhắn được gửi thẳng tới A SỈN. Chúng tôi phản hồi qua email hoặc số điện thoại bạn để lại.</p>
                <button className="btn dark" type="submit" disabled={status === "sending"}>{status === "sending" ? "Đang gửi…" : "Gửi lời nhắn"} <Icon name="arrow" /></button>
                <div className="sc-form-result" hidden={status !== "sent" && status !== "error"}>
                  <h3>{status === "error" ? "Chưa gửi được lời nhắn" : "Lời nhắn đã được gửi"}</h3>
                  <p className="sc-copy-status" role="status">{status === "error" ? error : "Cảm ơn bạn. A SỈN sẽ liên hệ lại trong thời gian sớm nhất."}</p>
                </div>
              </form>
              <div className="sc-contact-faq">
                <h3>Một chút thông tin trước khi gửi</h3>
                <details><summary>Đặt hàng &amp; thanh toán <Icon name="plus" /></summary><p>{content["faq.order"]}</p></details>
                <details><summary>Giao hàng <Icon name="plus" /></summary><p>{content["faq.shipping"]}</p></details>
                <details><summary>Hỗ trợ đổi trả <Icon name="plus" /></summary><p>{content["faq.returns"]}</p></details>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
