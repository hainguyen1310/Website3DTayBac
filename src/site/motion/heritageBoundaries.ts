/**
 * Dải núi trang trí nối các chương (heritage-boundaries.js). Chèn một phần tử aria-hidden
 * ngay trước section chương, không chiếm chỗ trong bố cục; tự gỡ khi rời trang.
 */
import { motionAllowed } from "./preference";

type Chapter = [selector: string, tone: "cream" | "paper", scene: "terrace" | "ridge"];

const CHAPTERS: Chapter[] = [
  [".ph-collection", "cream", "terrace"],
  [".ph-news", "cream", "terrace"],
  [".pg-catalog-section", "cream", "ridge"],
  [".pg-gift-banner", "cream", "terrace"],
  [".gift-page-header + .gift-builder", "cream", "ridge"],
  [".og-producers", "cream", "ridge"],
  [".og-certificates", "paper", "terrace"],
  [".og-preparation", "cream", "terrace"],
  [".about-name", "cream", "ridge"],
  [".about-values", "cream", "ridge"],
  [".about-end", "cream", "terrace"],
  [".about-journey", "paper", "terrace"],
  [".pg-news-list", "cream", "ridge"],
  [".pg-related-articles", "cream", "terrace"],
  [".cp-how", "cream", "ridge"],
  [".cp-discover", "cream", "ridge"],
  [".cp-rules", "cream", "terrace"],
  [".sc-contact-grid", "cream", "ridge"],
];

const CURVE = "M-24 54C150 27 239 23 381 48S661 88 818 56 1106 12 1249 36 1381 55 1464 37";
const DISTANT_RIDGE = "M-24 77 76 62Q123 56 183 40L251 52 335 29 413 47 486 42 564 57 647 38 745 56 867 26 928 37 1026 20 1114 48 1240 29 1311 45 1464 21V98H-24Z";
const NEAR_RIDGE = "M-24 87 90 69 197 54 298 65 392 45 482 58 591 63 678 52 792 60 886 44 951 54 1048 39 1115 53 1247 42 1326 58 1464 44V98H-24Z";

let rootObserver: MutationObserver | null = null;
let viewObserver: IntersectionObserver | null = null;
let decorateFrame = 0;
let frame = 0;
const active = new Set<HTMLElement>();
const inserted = new Set<HTMLElement>();
const marked = new Set<HTMLElement>();

function bridgeMarkup(tone: string, scene: string) {
  const ridges = scene === "ridge" ? `<path class="rh-ridge-far" d="${DISTANT_RIDGE}"/><path class="rh-ridge-near" d="${NEAR_RIDGE}"/>` : "";
  const contours = [0, 7, 15, 24].map((offset, index) => `<path d="${CURVE}" transform="translate(0 ${offset})" pathLength="1" style="--rh-line-order:${index}"/>`).join("");
  return `<div class="rh-boundary rh-boundary--${scene}" data-tone="${tone}" aria-hidden="true">
    <svg viewBox="0 0 1440 96" preserveAspectRatio="none" focusable="false">${ridges}<path class="rh-ground" d="${CURVE}V98H-24Z"/><g class="rh-contours">${contours}</g></svg>
    ${scene === "ridge" ? '<div class="rh-mist"></div>' : ""}
  </div>`;
}

function decorate(root: HTMLElement) {
  for (const [selector, tone, scene] of CHAPTERS) {
    const chapter = root.querySelector<HTMLElement>(selector);
    const previous = chapter?.previousElementSibling as HTMLElement | null | undefined;
    if (!chapter || !previous || chapter.hasAttribute("data-heritage-chapter")) continue;
    chapter.dataset.heritageChapter = "";
    previous.dataset.heritageLead = "";
    marked.add(chapter);
    marked.add(previous);
    chapter.insertAdjacentHTML("beforebegin", bridgeMarkup(tone, scene));
    const boundary = chapter.previousElementSibling as HTMLElement;
    inserted.add(boundary);
    if (viewObserver) viewObserver.observe(boundary);
    else boundary.classList.add("is-visible");
  }
}

export function initHeritageBoundaries(root: HTMLElement | null) {
  destroyHeritageBoundaries();
  if (!root) return;
  if ("IntersectionObserver" in window) {
    viewObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const target = entry.target as HTMLElement;
        if (entry.isIntersecting) {
          active.add(target);
          target.classList.add("is-visible");
        } else {
          active.delete(target);
          if (!target.isConnected) viewObserver?.unobserve(target);
        }
      }
      updateHeritageBoundaries();
    }, { rootMargin: "80px 0px" });
  }
  decorate(root);
  // Nội dung trang có thể render muộn (dữ liệu tải về), nên theo dõi cả cây con.
  rootObserver = new MutationObserver(() => {
    if (decorateFrame) return;
    decorateFrame = requestAnimationFrame(() => {
      decorateFrame = 0;
      decorate(root);
    });
  });
  rootObserver.observe(root, { childList: true, subtree: true });
}

export function updateHeritageBoundaries() {
  if (!active.size || frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    if (!motionAllowed()) return;
    const center = Math.max(1, innerHeight / 2);
    for (const element of active) {
      if (!element.isConnected) {
        active.delete(element);
        viewObserver?.unobserve(element);
        continue;
      }
      const position = Math.max(-1, Math.min(1, (element.getBoundingClientRect().top - center) / center));
      element.style.setProperty("--rh-drift", `${(position * 7).toFixed(2)}px`);
    }
  });
}

export function destroyHeritageBoundaries() {
  rootObserver?.disconnect();
  viewObserver?.disconnect();
  rootObserver = viewObserver = null;
  if (frame) cancelAnimationFrame(frame);
  if (decorateFrame) cancelAnimationFrame(decorateFrame);
  frame = decorateFrame = 0;
  active.clear();
  // Gỡ phần trang trí đã chèn để React tiếp tục quản lý đúng cây DOM của trang.
  inserted.forEach((element) => element.remove());
  inserted.clear();
  marked.forEach((element) => {
    delete element.dataset.heritageChapter;
    delete element.dataset.heritageLead;
  });
  marked.clear();
}
