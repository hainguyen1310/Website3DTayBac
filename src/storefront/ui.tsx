import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link } from "react-router-dom";
import { money } from "../catalog";
import { useShop } from "../ShopContext";
import { submitContactMessage } from "../services/storeApi";
import { trackEvent } from "../analytics";
import type { StorefrontProduct } from "./products";
import { MEDIA, REASONS_PRODUCTS } from "./content";

/** Họa tiết đường núi & ruộng bậc thang (SVG xuất từ Figma). */
export function Contours({ src, className = "" }: { src: string; className?: string }) {
  return <img className={`sf-contours ${className}`} src={src} alt="" aria-hidden="true" loading="lazy" />;
}

/** Nhãn vàng có gạch đầu dòng, dùng trước mọi tiêu đề section. */
export function Eyebrow({ children, script = false }: { children: ReactNode; script?: boolean }) {
  return (
    <p className={`sf-eyebrow${script ? " is-script" : ""}`}>
      <span aria-hidden="true" />
      {children}
    </p>
  );
}

type SplitHeroProps = {
  contours: string;
  image: string;
  alt: string;
  caption?: string;
  className?: string;
  children: ReactNode;
};

/** Hero hai cột: chữ bên trái, ảnh 3:2 trọn khung bên phải (xếp chồng trên mobile). */
export function SplitHero({ contours, image, alt, caption, className = "", children }: SplitHeroProps) {
  return (
    <section className={`sf-hero sf-split-hero ${className}`}>
      <Contours src={contours} className="sf-hero-contours" />
      <div className="sf-container sf-split-hero-grid">
        <div className="sf-split-hero-copy">{children}</div>
        <figure className="sf-split-hero-media">
          <div className="sf-split-hero-frame">
            <img src={image} alt={alt} width={1800} height={1200} fetchPriority="high" />
          </div>
          {caption && <figcaption>{caption}</figcaption>}
        </figure>
      </div>
    </section>
  );
}

type ButtonProps ={ to: string; children: ReactNode; variant?: "primary" | "outline"; className?: string };

export function ButtonLink({ to, children, variant = "primary", className = "" }: ButtonProps) {
  return (
    <Link to={to} className={`sf-button is-${variant} ${className}`}>
      {children} <span aria-hidden="true">→</span>
    </Link>
  );
}

export function ProductCard({ product }: { product: StorefrontProduct }) {
  const { addProduct } = useShop();
  const soldOut = product.inStock === false;
  return (
    <article className="sf-product-card">
      <Link to={`/san-pham/${product.id}`} className="sf-product-media" aria-label={product.name}>
        <img src={product.image} alt="" loading="lazy" width={460} height={374} />
        {product.label && <span className="sf-product-label">{product.label}</span>}
      </Link>
      <div className="sf-product-body">
        <h3>
          <Link to={`/san-pham/${product.id}`}>{product.name}</Link>
        </h3>
        <p>{product.description}</p>
        <div className="sf-product-foot">
          <strong>{money(product.price)}</strong>
          <button type="button" onClick={() => addProduct(product.id)} disabled={soldOut} aria-label={`Thêm ${product.name} vào giỏ`}>
            {soldOut ? "TẠM HẾT HÀNG" : "+ THÊM VÀO GIỎ"}
          </button>
        </div>
      </div>
    </article>
  );
}

/** Dải đỏ "Hương vị thật từ núi rừng thật" (Sản phẩm, chi tiết sản phẩm, chi tiết tin). */
export function WhyBand() {
  return (
    <section className="sf-band sf-why is-compact">
      <div className="sf-container sf-why-row">
        <div>
          <Eyebrow>Vì sao chọn A SỈN</Eyebrow>
          <h2 className="sf-script-title is-light">
            Hương vị thật
            <br />
            từ núi rừng thật
          </h2>
        </div>
        <ul className="sf-reasons">
          {REASONS_PRODUCTS.map((reason) => (
            <li key={reason.title}>
              <span aria-hidden="true">{reason.icon}</span>
              <h3>{reason.title}</h3>
              <p>{reason.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Stars() {
  return <span className="sf-stars" aria-label="5 trên 5 sao">★★★★★</span>;
}

export function Testimonial({ quote, name, compact = false }: { quote: string; name: string; compact?: boolean }) {
  return (
    <figure className={`sf-testimonial${compact ? " is-compact" : ""}`}>
      {!compact && <span className="sf-quote-mark" aria-hidden="true">❝</span>}
      <blockquote>{quote}</blockquote>
      <figcaption>
        {name} <Stars />
      </figcaption>
    </figure>
  );
}

/** Dải "Cập nhật những câu chuyện từ núi rừng Tây Bắc" (Tin tức, chi tiết tin). */
export function NewsletterBand() {
  return (
    <section className="sf-newsletter-band">
      <Contours src={MEDIA.contours.bottom} className="sf-bottom-contours" />
      <div className="sf-container sf-newsletter-band-grid">
        <div>
          <Eyebrow>Đăng ký nhận tin</Eyebrow>
          <h2 className="sf-display-sc is-band">
            Cập nhật những câu chuyện
            <br />
            từ núi rừng Tây Bắc
          </h2>
          <p className="sf-body is-muted">Đừng bỏ lỡ các bài viết mới nhất, ưu đãi và hoạt động đặc biệt từ A SỈN.</p>
        </div>
        <NewsletterForm variant="band" />
      </div>
    </section>
  );
}

type NewsletterState ="idle" | "sending" | "success" | "error";

/** Form nhận tin dùng chung cho footer và dải đăng ký ở trang Tin tức. */
export function NewsletterForm({ variant }: { variant: "footer" | "band" }) {
  const [state, setState] = useState<NewsletterState>("idle");
  async function subscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const email = String(new FormData(form).get("email") ?? "");
    setState("sending");
    try {
      await submitContactMessage({
        name: "Đăng ký nhận tin",
        email,
        message: "Tôi đăng ký nhận những câu chuyện, sản phẩm mới và ưu đãi từ A Sỉn qua email.",
        topic: "newsletter",
        subject: "Đăng ký bản tin A Sỉn",
        marketingConsent: true,
      });
      setState("success");
      trackEvent("newsletter_signup", { method: variant });
      form.reset();
    } catch {
      setState("error");
    }
  }
  const sending = state === "sending";
  return (
    <form className={`sf-newsletter is-${variant}`} onSubmit={subscribe}>
      <div className="sf-newsletter-row">
        <input type="email" name="email" autoComplete="email" required aria-label="Email nhận tin" placeholder="Email của bạn" disabled={sending} />
        <button type="submit" disabled={sending} aria-label={sending ? "Đang gửi đăng ký" : "Đăng ký nhận tin"}>
          {variant === "band" ? (sending ? "Đang gửi…" : "Đăng ký  →") : "➜"}
        </button>
      </div>
      {state === "success" && <p role="status">A SỈN đã nhận đăng ký của bạn. Cảm ơn bạn!</p>}
      {state === "error" && <p role="alert">Chưa gửi được đăng ký. Vui lòng thử lại.</p>}
    </form>
  );
}
