import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Star, X } from "lucide-react";
import { useWebsite } from "./WebsiteContext";

type Review = { id: number; name: string; location: string; quote: string; avatar: string; rating: number };

function ReviewCard({ review, sample }: { review: Review; sample: boolean }) {
  return (
    <figure className="asin-review-card">
      <blockquote><span aria-hidden="true">“</span><p>{review.quote}</p></blockquote>
      <figcaption>
        <span className="asin-review-avatar" aria-hidden="true">
          {review.avatar ? <img src={review.avatar} alt="" loading="lazy" width={40} height={40} /> : sample ? (
            <img className={`asin-sample-avatar avatar-${review.id}`} src="/images/asin/review-portraits.webp" alt="" loading="lazy" width={120} height={40} />
          ) : review.name.trim().split(/\s+/).slice(-1)[0]?.charAt(0)}
        </span>
        <span className="asin-review-author"><b>{review.name}</b><small>{review.location}</small></span>
        <span className="asin-review-stars" role="img" aria-label={`${review.rating} trên 5 sao`}>
          {Array.from({ length: 5 }, (_, i) => <Star key={i} size={13} strokeWidth={1.3} fill={i < review.rating ? "currentColor" : "none"} aria-hidden="true" />)}
        </span>
      </figcaption>
    </figure>
  );
}

export default function LandingReviews() {
  const { content: c } = useWebsite();
  const rail = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [scrollable, setScrollable] = useState(false);
  const sample = c["reviews.mode"] !== "published";
  const reviews: Review[] = [1, 2, 3].map((id) => ({
    id,
    name: c[`reviews.${id}.name`],
    location: c[`reviews.${id}.location`],
    quote: c[`reviews.${id}.quote`],
    avatar: c[`reviews.${id}.avatar`],
    rating: Number(c[`reviews.${id}.rating`]) || 5,
  })).filter((review) => review.quote.trim());

  useEffect(() => {
    const element = rail.current;
    if (!element) return;
    const update = () => setScrollable(element.scrollWidth > element.clientWidth + 4);
    const observer = new ResizeObserver(update);
    observer.observe(element);
    update();
    return () => observer.disconnect();
  }, [c["reviews.mode"], reviews.length]);

  if (c["reviews.mode"] === "hidden" || !reviews.length) return null;

  const move = (direction: number) => {
    const element = rail.current;
    if (!element) return;
    const atEnd = element.scrollLeft + element.clientWidth >= element.scrollWidth - 4;
    const atStart = element.scrollLeft <= 4;
    const card = element.firstElementChild?.getBoundingClientRect().width ?? element.clientWidth;
    element.scrollTo({
      left: direction > 0 && atEnd ? 0 : direction < 0 && atStart ? element.scrollWidth : element.scrollLeft + direction * (card + 14),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  };

  return (
    <section className="asin-reviews" id="danh-gia" aria-labelledby="reviews-title">
      <div className="asin-container asin-reviews-grid">
        <div className="asin-reviews-copy">
          <span className="asin-eyebrow">KHÁCH HÀNG NÓI GÌ VỀ A SỈN?</span>
          <h2 id="reviews-title">Từ những người<br />đã chọn A Sỉn.</h2>
          <button className="asin-button asin-button-light" onClick={() => dialog.current?.showModal()}>Xem các đánh giá <ArrowRight size={16} /></button>
          {sample && <span className="asin-review-sample">Đánh giá minh họa</span>}
        </div>
        <div className="asin-reviews-carousel" role="region" aria-label="Các đánh giá khách hàng">
          <div className="asin-review-rail" ref={rail} tabIndex={0} aria-label="Danh sách đánh giá, vuốt hoặc dùng phím mũi tên để xem">
            {reviews.map((review) => <ReviewCard key={review.id} review={review} sample={sample} />)}
          </div>
          <div className="asin-review-nav">
            <button className="asin-review-arrow previous" onClick={() => move(-1)} disabled={!scrollable} aria-label="Đánh giá trước"><ArrowLeft size={19} /></button>
            <button className="asin-review-arrow next" onClick={() => move(1)} disabled={!scrollable} aria-label="Đánh giá tiếp theo"><ArrowRight size={19} /></button>
          </div>
        </div>
      </div>
      <dialog className="asin-reviews-dialog" ref={dialog} aria-labelledby="review-dialog-title" onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close(); }}>
        <div className="asin-reviews-dialog-inner">
          <button className="asin-review-close" onClick={() => dialog.current?.close()} aria-label="Đóng đánh giá"><X size={22} /></button>
          <span className="asin-eyebrow">LỜI NHẮN GỬI A SỈN</span>
          <h2 id="review-dialog-title">Những câu chuyện được sẻ chia.</h2>
          {sample && <p className="asin-review-disclosure">Các nhận xét và chân dung dưới đây là nội dung minh họa cho mẫu thiết kế.</p>}
          <div>{reviews.map((review) => <ReviewCard key={review.id} review={review} sample={sample} />)}</div>
        </div>
      </dialog>
    </section>
  );
}
