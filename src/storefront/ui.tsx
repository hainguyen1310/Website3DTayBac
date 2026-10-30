import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { Feather, Flame, Gift, Heart, MountainSnow, ShieldCheck, X } from "lucide-react";
import { money } from "../catalog";
import { useShop } from "../ShopContext";
import { submitContactMessage } from "../services/storeApi";
import { trackEvent } from "../analytics";
import type { StorefrontProduct } from "./products";
import { REASONS_PRODUCTS } from "./content";
import type { ReasonIcon } from "./content";

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
  image: string;
  alt: string;
  /** Điểm lấy nét khi nền toàn cảnh cần cắt theo khung màn hình. */
  focus?: string;
  /**
   * painted: cả hero là tranh núi thuỷ mặc, ảnh sản phẩm hoà vào nửa phải (Trang chủ, Sản phẩm).
   * photo: ảnh thật nửa phải tan dần sang nền kem có nét chì núi đồi bên trái.
   */
  scene?: "painted" | "photo";
  className?: string;
  /** Hàng trải rộng bên dưới phần chữ, ví dụ các chủ đề tin tức. */
  footer?: ReactNode;
  children: ReactNode;
};

/** Hero tràn màn hình: chữ trên nền giấy bên trái, ảnh hoà dần vào tranh núi đồi phía sau. */
export function SplitHero({ image, alt, focus = "center", scene = "photo", className = "", footer, children }: SplitHeroProps) {
  return (
    <section className={`sf-hero sf-scene-hero is-${scene} ${className}`}>
      <div className="sf-scene-media">
        <img src={image} alt={alt} width={1800} height={1300} fetchPriority="high" style={{ objectPosition: focus }} />
      </div>
      <div className="sf-container sf-scene-inner">
        <div className="sf-scene-copy">{children}</div>
        {footer}
      </div>
    </section>
  );
}

const REASON_ICONS: Record<ReasonIcon, ReactNode> = {
  mountain: <MountainSnow strokeWidth={1.2} />,
  leaf: <Feather strokeWidth={1.2} />,
  gift: <Gift strokeWidth={1.2} />,
  heart: <Heart strokeWidth={1.2} />,
  flame: <Flame strokeWidth={1.2} />,
  shield: <ShieldCheck strokeWidth={1.2} />,
};

type ReasonsBandProps = {
  title: ReactNode;
  titleClassName: string;
  reasons: readonly { icon: ReasonIcon; title: string; text: string }[];
  className?: string;
  showLink?: boolean;
};

/** Dải đỏ "Vì sao chọn A SỈN": nền núi khắc, icon nét vàng, cột ngăn mảnh, nút vàng. */
export function ReasonsBand({ title, titleClassName, reasons, className = "", showLink = true }: ReasonsBandProps) {
  return (
    <section className={`sf-band sf-why ${className}`}>
      <div className="sf-container">
        <div data-reveal="soft">
          <Eyebrow>Vì sao chọn A SỈN</Eyebrow>
          <h2 className={titleClassName}>{title}</h2>
        </div>
        <ul className="sf-reasons">
          {reasons.map((reason) => (
            <li key={reason.title} data-reveal="rise">
              <span className="sf-reason-icon" aria-hidden="true">{REASON_ICONS[reason.icon]}</span>
              <h3>{reason.title}</h3>
              <p>{reason.text}</p>
            </li>
          ))}
        </ul>
        {showLink && <Link to="/nguon-goc" className="sf-gold-button is-inline" data-reveal="soft">
          Khám phá nguồn gốc <span aria-hidden="true">→</span>
        </Link>}
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
    <article className="sf-product-card" data-reveal="rise">
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
    <ReasonsBand
      className="is-compact"
      showLink={false}
      titleClassName="sf-script-title is-light"
      title={<>Hương vị thật<br />từ núi rừng thật</>}
      reasons={REASONS_PRODUCTS}
    />
  );
}

export function Stars({ rating = 5 }: { rating?: number } = {}) {
  return <span className="sf-stars" aria-label={`${rating} trên 5 sao`}>{"★".repeat(rating)}{"☆".repeat(5 - rating)}</span>;
}

export function Testimonial({ quote, name, location, avatar, rating = 5, compact = false }: { quote: string; name: string; location?: string; avatar?: string; rating?: number; compact?: boolean }) {
  return (
    <figure className={`sf-testimonial${compact ? " is-compact" : ""}`}>
      <span className="sf-quote-mark" aria-hidden="true">❝</span>
      <blockquote>{quote}</blockquote>
      <figcaption>
        <span className="sf-review-person">
          <span className="sf-review-avatar" aria-hidden="true">{avatar ? <img src={avatar} alt="" loading="lazy" width={38} height={38} /> : name.trim().split(/\s+/).at(-1)?.charAt(0)}</span>
          <span><strong>{name}</strong>{location && <small>{location}</small>}</span>
        </span>
        <Stars rating={rating} />
      </figcaption>
    </figure>
  );
}

/** Dải "Cập nhật những câu chuyện từ núi rừng Tây Bắc" (Tin tức, chi tiết tin). */
export function NewsletterBand() {
  return (
    <section className="sf-newsletter-band">
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

/** Ảnh phóng to trong <dialog> modal; bấm nền, nút đóng hoặc Esc để thoát. */
export function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return createPortal(
    <dialog ref={ref} className="sf-lightbox" aria-label={alt} onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => event.target === event.currentTarget && onClose()}>
      <img src={src} alt={alt} />
      <button type="button" aria-label="Đóng" onClick={onClose}><X size={22} /></button>
    </dialog>,
    document.body,
  );
}
