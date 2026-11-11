import { useState, useRef, useEffect } from "react";
import { Icon } from "../../../icons";
import { motionAllowed } from "../../../motion/preference";

const arrow = () => <Icon name="diagonal" />;

const feedbackTopics = [
  [
    "Hương vị gác bếp",
    "Bạn đã thử món nào? Hãy kể về hương vị và cách bạn thưởng thức.",
  ],
  [
    "Trải nghiệm hộp quà",
    "Hộp quà được trao trong dịp nào? Bạn có góp ý gì về cách gói hoặc tấm thiệp?",
  ],
  [
    "Khi nhận đơn hàng",
    "Bạn thấy cách đóng gói, thời gian giao hàng và hướng dẫn bảo quản thế nào?",
  ],
  [
    "Tư vấn chọn đặc sản",
    "Điều gì giúp bạn chọn món phù hợp? A SỈN còn có thể hỗ trợ bạn ở đâu?",
  ],
];

const formatNumber = (value: number) => String(value).padStart(2, "0");

/** Điều hướng thẻ gợi ý (initHomeReviews): điểm dừng theo thẻ, kéo chuột, phím mũi tên. */
function useReviewRail(rail: React.RefObject<HTMLDivElement | null>) {
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [range, setRange] = useState(`01 / ${formatNumber(feedbackTopics.length)}`);
  const [status, setStatus] = useState("");
  const move = useRef<(direction: number) => void>(() => undefined);

  useEffect(() => {
    const element = rail.current;
    if (!element) return;
    const controller = new AbortController();
    const { signal } = controller;
    const cards = [...element.children] as HTMLElement[];
    const scrollLimit = () => Math.max(0, element.scrollWidth - element.clientWidth);
    const offsetOf = (card: HTMLElement) => card.offsetLeft - cards[0].offsetLeft;
    const stops = () => [0, ...cards.slice(1).map(offsetOf).filter((left) => left < scrollLimit() - 2), scrollLimit()];
    const scrollTo = (left: number) => element.scrollTo({ left, behavior: motionAllowed() ? "smooth" : "instant" });
    let label = range;
    const sync = () => {
      const offset = element.scrollLeft;
      setAtStart(offset < 2);
      setAtEnd(scrollLimit() - offset < 2);
      const displayed = cards.filter((card) => offsetOf(card) >= offset - 2 && offsetOf(card) + card.offsetWidth <= offset + element.clientWidth + 2);
      if (!displayed.length) return;
      const first = cards.indexOf(displayed[0]) + 1;
      const last = cards.indexOf(displayed[displayed.length - 1]) + 1;
      label = `${first === last ? formatNumber(first) : `${formatNumber(first)}–${formatNumber(last)}`} / ${formatNumber(cards.length)}`;
      setRange(label);
    };
    move.current = (direction: number) => {
      const offset = element.scrollLeft;
      const positions = stops();
      const target = direction > 0 ? positions.find((left) => left > offset + 2) : [...positions].reverse().find((left) => left < offset - 2);
      if (target !== undefined) scrollTo(target);
    };
    element.addEventListener("scroll", sync, { signal, passive: true });
    element.addEventListener("scrollend", () => setStatus(`Đang xem thẻ ${label}.`), { signal });
    element.addEventListener("keydown", (event) => {
      if (event.target !== element || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      if (event.key === "Home" || event.key === "End") scrollTo(event.key === "Home" ? 0 : scrollLimit());
      else move.current(event.key === "ArrowLeft" ? -1 : 1);
    }, { signal });
    let drag: { id: number; startX: number; startY: number; startOffset: number; active: boolean } | null = null;
    element.addEventListener("pointerdown", (event) => {
      if (event.pointerType !== "mouse" || event.button !== 0 || event.shiftKey || !scrollLimit()) return;
      drag = { id: event.pointerId, startX: event.clientX, startY: event.clientY, startOffset: element.scrollLeft, active: false };
    }, { signal });
    element.addEventListener("pointermove", (event) => {
      if (drag?.id !== event.pointerId) return;
      const movement = drag.startX - event.clientX;
      if (!drag.active) {
        if (Math.abs(event.clientY - drag.startY) > 7) { drag = null; return; }
        if (Math.abs(movement) < 7) return;
        drag.active = true;
        element.classList.add("is-dragging");
        element.setPointerCapture(event.pointerId);
        const selection = window.getSelection();
        if (selection?.anchorNode && element.contains(selection.anchorNode)) selection.removeAllRanges();
      }
      event.preventDefault();
      element.scrollLeft = drag.startOffset + movement;
    }, { signal });
    for (const type of ["pointerup", "pointercancel", "pointerleave"] as const) {
      element.addEventListener(type, (event) => { if (drag?.id === event.pointerId && !drag.active) drag = null; }, { signal });
    }
    element.addEventListener("lostpointercapture", (event) => {
      if (drag?.id !== event.pointerId) return;
      const current = element.scrollLeft;
      drag = null;
      element.classList.remove("is-dragging");
      scrollTo(stops().reduce((closest, left) => (Math.abs(left - current) < Math.abs(closest - current) ? left : closest), 0));
    }, { signal });
    window.addEventListener("resize", sync, { signal });
    sync();
    return () => controller.abort();
  }, [rail]); // eslint-disable-line react-hooks/exhaustive-deps

  return { atStart, atEnd, range, status, move: (direction: number) => move.current(direction) };
}

export function ReviewsSection() {
  const railRef = useRef<HTMLDivElement>(null);
  const { atStart, atEnd, range: displayRange, status, move } = useReviewRail(railRef);
  const canScrollBack = !atStart;
  const canScrollForward = !atEnd;
  const scroll = move;

  return (
    <section
      className="ph-section ph-reviews ph-editorial-feedback"
      id="danh-gia"
      aria-labelledby="ph-reviews-title"
    >
      <div className="ph-wrap ph-review-layout">
        <header className="ph-review-heading" data-ph-reveal>
          <h2 id="ph-reviews-title">
            Kể A SỈN <em>nghe nhé.</em>
          </h2>
          <p id="ph-reviews-context">
            Từ vị món gác bếp đến khoảnh khắc mở hộp quà, bạn nhớ nhất điều gì? Lướt qua các gợi
            ý rồi viết lời nhắn của bạn.
          </p>
          <div className="ph-review-contact">
            <a className="ph-text-link" href="/lien-he?chu-de=chia-se-trai-nghiem#eu-contact-form">
              Viết chia sẻ của bạn {arrow()}
            </a>
          </div>
        </header>

        <div className="ph-review-carousel">
          <div className="ph-review-toolbar">
            <span className="ph-review-hint">Kéo ngang để xem thêm</span>
            <div className="ph-review-controls" role="group" aria-label="Điều hướng gợi ý chia sẻ">
              <button
                type="button"
                data-ph-review-step="-1"
                aria-controls="ph-review-rail"
                aria-label="Xem thẻ trước"
                aria-disabled={!canScrollBack}
                onClick={() => scroll(-1)}
              >
                <Icon name="arrow" />
              </button>
              <span className="ph-review-range" data-ph-review-range aria-hidden="true">
                {displayRange}
              </span>
              <button
                type="button"
                data-ph-review-step="1"
                aria-controls="ph-review-rail"
                aria-label="Xem thẻ tiếp theo"
                aria-disabled={!canScrollForward}
                onClick={() => scroll(1)}
              >
                <Icon name="arrow" />
              </button>
            </div>
          </div>

          <div
            className="ph-review-rail"
            id="ph-review-rail"
            ref={railRef}
            role="region"
            aria-label="Các chủ đề chia sẻ trải nghiệm"
            aria-describedby="ph-reviews-context"
            tabIndex={0}
          >
            {feedbackTopics.map(([title, copy], index) => (
              <article key={index} className="ph-review-card">
                <div className="ph-review-card-top">
                  <span aria-hidden="true">{formatNumber(index + 1)}</span>
                  <span>Gợi ý chia sẻ</span>
                </div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>

          <span
            className="sr-only"
            data-ph-review-status
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {status}
          </span>
        </div>
      </div>
    </section>
  );
}
