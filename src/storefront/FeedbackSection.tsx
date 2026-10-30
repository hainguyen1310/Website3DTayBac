import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useWebsite } from "../WebsiteContext";
import { Eyebrow, Testimonial } from "./ui";

export type Feedback = {
  quote: string;
  name: string;
  location?: string;
  avatar?: string;
  rating?: number;
};

export default function FeedbackSection({ reviews, compact = false }: { reviews: readonly Feedback[]; compact?: boolean }) {
  const { content } = useWebsite();
  const mode = content["reviews.mode"] || "sample";
  const items: readonly Feedback[] = mode === "published"
    ? [1, 2, 3].map((id) => ({
        quote: content[`reviews.${id}.quote`] || "",
        name: content[`reviews.${id}.name`] || "",
        location: content[`reviews.${id}.location`],
        avatar: content[`reviews.${id}.avatar`],
        rating: Math.min(5, Math.max(1, Number(content[`reviews.${id}.rating`]) || 5)),
      })).filter((item) => item.quote && item.name)
    : reviews;
  const trackRef = useRef<HTMLUListElement>(null);
  const [position, setPosition] = useState({ index: 0, count: 1 });

  function syncPosition() {
    const track = trackRef.current;
    if (!track) return;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    const width = track.clientWidth + gap;
    if (!width) return;
    const count = Math.max(1, Math.ceil((track.scrollWidth + gap) / width));
    const atEnd = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
    setPosition({ index: atEnd ? count - 1 : Math.min(count - 1, Math.round(track.scrollLeft / width)), count });
  }

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const observer = new ResizeObserver(syncPosition);
    observer.observe(track);
    syncPosition();
    return () => observer.disconnect();
  }, [items.length, mode]);

  function showPage(index: number) {
    const track = trackRef.current;
    if (!track) return;
    const width = track.clientWidth + (parseFloat(getComputedStyle(track).columnGap) || 0);
    track.scrollTo({
      left: Math.min(position.count - 1, Math.max(0, index)) * width,
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  }

  if (mode === "hidden" || !items.length) return null;

  return (
    <section className={`sf-section sf-container sf-feedback sf-deco is-sides${compact ? " sf-products-testimonials" : ""}`} role="region" aria-label="Phản hồi khách hàng" aria-roledescription="carousel">
      <div className="sf-feedback-heading">
        <div>
          <Eyebrow>Khách hàng nói về A SỈN</Eyebrow>
          <h2 className={compact ? "sf-garamond-title is-wine" : "sf-script-title"}>Những trải nghiệm thật từ khách hàng</h2>
        </div>
        {position.count > 1 && <button type="button" className="sf-text-link" onClick={() => showPage((position.index + 1) % position.count)}>Xem thêm đánh giá <span aria-hidden="true">→</span></button>}
      </div>
      <div className="sf-feedback-carousel">
        <button type="button" className="sf-feedback-arrow is-previous" aria-label="Phản hồi trước" disabled={position.index === 0} onClick={() => showPage(position.index - 1)}><ArrowLeft aria-hidden="true" size={18} /></button>
        <ul ref={trackRef} className="sf-feedback-track" aria-label="Các phản hồi khách hàng" tabIndex={0} onScroll={syncPosition} onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            showPage(position.index + (event.key === "ArrowRight" ? 1 : -1));
          }
        }}>
          {items.map((item) => <li key={item.name + item.quote}><Testimonial {...item} compact={compact} /></li>)}
        </ul>
        <button type="button" className="sf-feedback-arrow is-next" aria-label="Phản hồi tiếp theo" disabled={position.index === position.count - 1} onClick={() => showPage(position.index + 1)}><ArrowRight aria-hidden="true" size={18} /></button>
        {position.count > 1 && <div className="sf-feedback-dots" role="group" aria-label="Trang phản hồi">
          {Array.from({ length: position.count }, (_, index) => <button key={index} type="button" aria-label={`Trang phản hồi ${index + 1}`} aria-current={position.index === index ? "page" : undefined} onClick={() => showPage(index)} />)}
        </div>}
      </div>
      {mode !== "published" && <p className="sf-feedback-note">Nội dung phản hồi minh họa.</p>}
    </section>
  );
}
