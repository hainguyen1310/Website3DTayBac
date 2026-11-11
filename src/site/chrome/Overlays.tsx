import { useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { useWebsite } from "../../WebsiteContext";
import { submitContactMessage } from "../../services/storeApi";
import { trackEvent } from "../../analytics";
import { Icon } from "../icons";
import { foldVietnamese } from "../format";
import { useSiteProducts } from "../data";
import { ProductCard } from "../ProductCard";
import { useSiteUi } from "./SiteUiContext";

/** Giữ Tab trong hộp thoại (vòng lặp đầu ↔ cuối). */
function trapTab(event: KeyboardEvent<HTMLElement>) {
  if (event.key !== "Tab") return;
  const items = [...event.currentTarget.querySelectorAll<HTMLElement>("button,a,input,textarea")].filter((item) => !item.hasAttribute("disabled"));
  const first = items[0];
  const last = items[items.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
}

/** Bảng tìm đặc sản (showSearch của app.js). */
export function SearchPanel() {
  const { searchOpen, setSearchOpen } = useSiteUi();
  const products = useSiteProducts();
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!searchOpen) return;
    setQuery("");
    input.current?.focus();
    return () => (document.querySelector("[data-search]") as HTMLElement | null)?.focus();
  }, [searchOpen]);

  if (!searchOpen) return null;
  const folded = foldVietnamese(query);
  const items = products.filter((product) => foldVietnamese(`${product.name} ${product.category}`).includes(folded));
  const close = () => setSearchOpen(false);
  return createPortal(
    <section
      className="search-panel"
      role="dialog"
      aria-modal="true"
      aria-label="Tìm đặc sản"
      onKeyDown={(event) => {
        if (event.key === "Escape") close();
        trapTab(event);
      }}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("a[href]")) close();
      }}
    >
      <button className="icon-button search-close" type="button" aria-label="Đóng tìm kiếm" onClick={close}><Icon name="close" /></button>
      <span className="eyebrow">TÌM MỘT CHÚT HƯƠNG VỊ TÂY BẮC</span>
      <div className="search-field">
        <input ref={input} type="search" placeholder="Bạn đang tìm món gì?" aria-label="Tên đặc sản" value={query} onChange={(event) => setQuery(event.target.value)} />
        <Icon name="search" />
      </div>
      <p className="search-result-label">{items.length} đặc sản</p>
      <div className="search-results">
        {items.length
          ? items.map((product) => <ProductCard key={product.slug} product={product} />)
          : <p>Chưa có đặc sản phù hợp. Thử “trâu”, “lợn xé” hoặc “chẩm chéo”.</p>}
      </div>
    </section>,
    document.body,
  );
}

/** Hộp thoại <dialog> dùng chung cho chính sách và đăng ký nhận tin. */
function SiteDialog({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => {
      dialog?.close();
      previous?.focus?.();
    };
  }, []);
  return createPortal(
    <dialog
      ref={ref}
      className="policy-dialog"
      onCancel={(event) => {
        event.preventDefault();
        closeRef.current();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) closeRef.current();
      }}
    >
      <button className="icon-button" type="button" aria-label="Đóng" onClick={() => closeRef.current()}><Icon name="close" /></button>
      {children}
    </dialog>,
    document.body,
  );
}

export function PolicyDialog() {
  const { policy, setPolicy } = useSiteUi();
  const { content } = useWebsite();
  if (!policy) return null;
  return (
    <SiteDialog onClose={() => setPolicy(null)}>
      <span className="eyebrow">THÔNG TIN MUA HÀNG</span>
      <h2>{policy === "privacy" ? "Quyền riêng tư" : "Giao hàng & đổi trả"}</h2>
      {policy === "privacy" ? (
        <>
          <p>A SỈN chỉ dùng thông tin bạn cung cấp khi đặt hàng hoặc gửi lời nhắn để xác nhận đơn, giao hàng và hỗ trợ bạn.</p>
          <p>Khi bạn đăng nhập chương trình mảnh ghép, A SỈN lưu email và các mảnh đã mở để giữ tiến độ trên mọi thiết bị. Giỏ hàng và bản thử được lưu trên trình duyệt của bạn.</p>
          <p>A SỈN không chia sẻ thông tin cá nhân cho bên thứ ba ngoài đơn vị vận chuyển đơn hàng.</p>
        </>
      ) : (
        <>
          <p>{content["faq.shipping"]}</p>
          <p>{content["faq.returns"]}</p>
        </>
      )}
      <a className="text-link" href="/lien-he" onClick={() => setPolicy(null)}>Liên hệ A SỈN <Icon name="diagonal" /></a>
    </SiteDialog>
  );
}

type NewsletterState = "idle" | "sending" | "success" | "error";

/** Đăng ký nhận tin (thay cho liên kết ra website ngoài của bản khách duyệt). */
export function NewsletterDialog() {
  const { newsletterOpen, setNewsletterOpen } = useSiteUi();
  const [state, setState] = useState<NewsletterState>("idle");
  if (!newsletterOpen) return null;
  const subscribe = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const email = String(new FormData(form).get("email") ?? "").trim();
    setState("sending");
    try {
      await submitContactMessage({
        name: "Đăng ký nhận tin",
        email,
        message: "Tôi đăng ký nhận những câu chuyện, sản phẩm mới và ưu đãi từ A SỈN qua email.",
        topic: "newsletter",
        subject: "Đăng ký bản tin A SỈN",
        marketingConsent: true,
      });
      setState("success");
      trackEvent("newsletter_signup", { method: "footer" });
      form.reset();
    } catch {
      setState("error");
    }
  };
  return (
    <SiteDialog onClose={() => { setNewsletterOpen(false); setState("idle"); }}>
      <span className="eyebrow">CÂU CHUYỆN CÒN TIẾP</span>
      <h2>Nhận tin từ A SỈN.</h2>
      <p>Nhận tin về mùa vụ mới, hộp quà giới hạn và ưu đãi dành cho khách quen.</p>
      <form className="site-newsletter-form" onSubmit={subscribe}>
        <div className="form-field">
          <label htmlFor="newsletter-email">Email của bạn</label>
          <input id="newsletter-email" type="email" name="email" autoComplete="email" required maxLength={254} placeholder="ten@email.com" disabled={state === "sending"} />
        </div>
        <button className="btn dark" type="submit" disabled={state === "sending"}>
          {state === "sending" ? "Đang gửi…" : "Đăng ký"} <Icon name="arrow" />
        </button>
        {state === "success" && <p role="status">A SỈN đã nhận đăng ký của bạn. Cảm ơn bạn!</p>}
        {state === "error" && <p role="alert">Chưa gửi được đăng ký. Vui lòng thử lại.</p>}
      </form>
    </SiteDialog>
  );
}
