import { useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { submitContactMessage } from "./services/storeApi";
import { ContentHeading, useWebsite } from "./WebsiteContext";

export default function Newsletter() {
  const { content } = useWebsite();
  const [state, setState] = useState<"idle" | "sending" | "success" | "error">("idle");
  async function subscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const email = String(new FormData(form).get("email") ?? "");
    setState("sending");
    try {
      await submitContactMessage({ name: "Đăng ký nhận tin", email, message: "Tôi đăng ký nhận những câu chuyện, sản phẩm mới và ưu đãi từ A Sỉn qua email.", topic: "newsletter", subject: "Đăng ký bản tin A Sỉn", marketingConsent: true });
      setState("success");
      form.reset();
    } catch { setState("error"); }
  }
  return <section className="moc-newsletter-section" id="ban-tin" aria-labelledby="newsletter-title">
    <div className="moc-newsletter-edge" aria-hidden="true" />
    <div className="moc-container moc-newsletter-content">
      <div className="moc-newsletter-left" data-reveal="rise">
        <span className="moc-eyebrow">CÙNG A SỈN GIỮ TRỌN ĐIỀU THUẦN KHIẾT</span>
        <h2 id="newsletter-title"><ContentHeading text={content["newsletter.title"]} /></h2>
      </div>
      <div className="moc-newsletter-form-col" data-reveal="soft">
        <p>Đăng ký nhận tin để không bỏ lỡ những câu chuyện,<br className="moc-desktop-break" /> sản phẩm mới và ưu đãi đặc biệt từ A Sỉn.</p>
        <form className="moc-newsletter-form" onSubmit={subscribe}>
          <input type="email" name="email" autoComplete="email" required aria-label="Email nhận tin" placeholder="Nhập email của bạn" disabled={state === "sending"} />
          <button type="submit" disabled={state === "sending"}>{state === "sending" ? "Đang gửi…" : "Đăng ký"}<ArrowRight size={15} /></button>
        </form>
        {state === "success" && <p className="moc-form-message" role="status">A Sỉn đã nhận đăng ký của bạn. Cảm ơn bạn!</p>}
        {state === "error" && <p className="moc-form-message" role="alert">Chưa gửi được đăng ký. Vui lòng thử lại.</p>}
      </div>
      <span className="moc-newsletter-script">Sống chậm hơn<br />Để cảm nhận nhiều hơn...</span>
    </div>
  </section>;
}
