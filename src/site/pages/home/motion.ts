/**
 * Chuyên chuyển động trang chủ: scroll reveal, hero depth, curtain.
 * Port từ scroll-reveal-v33.js, hero-curtain-v34.js, premium-home.js
 */

let controller: AbortController | null = null;
let frameId = 0;
let scrollObserver: IntersectionObserver | null = null;
let motionObserver: MutationObserver | null = null;
let scrollTargets: Element[] = [];
let parallaxFrames = new Set<Element>();
let activePhotos = new Set<Element>();

function isReduced(): boolean {
  return (
    matchMedia("(prefers-reduced-motion: reduce)").matches ||
    document.body.classList.contains("motion-paused")
  );
}

function syncMotionState(home: HTMLElement) {
  const allowed = !isReduced();
  home.classList.toggle("gs-reduced-motion", !allowed);

  if (!allowed) {
    // Khôi phục lại các phần tử khi giảm chuyển động
    scrollTargets.forEach((el) => {
      el.classList.add("gs-in-view", "gs-reveal-instant");
    });
    parallaxFrames.forEach((el) => {
      (el as HTMLElement).style.setProperty("--gs-image-shift", "0px");
    });
  } else if (scrollObserver) {
    home.classList.add("gs-motion-ready");
  }
}

function prepareTargets(home: HTMLElement) {
  scrollTargets = [];
  const selected = new Map<Element, string>();

  const choose = (selector: string, kind: string) => {
    home.querySelectorAll(selector).forEach((el) => {
      if (
        el.closest(
          ".ph-hero,.ph-program,.ph-product-card,.ph-editorial-story,.ph-review-rail,[aria-hidden=true]"
        )
      )
        return;
      if (
        [...selected.keys()].some((parent) => parent === el || parent.contains(el))
      )
        return;
      selected.set(el, kind);
    });
  };

  // Chọn các phần tử cần reveal
  choose(".rf-value-list>li", "value");
  choose(".ph-editorial-article", "journal");
  choose(".ph-gift-card-copy", "text");
  choose(".ph-gift-card-art,.ph-editorial-corporate-image,.ph-story-grid>figure,.ph-corporate-art", "image");
  choose(".ph-product-controls,.ph-preview-steps,.ph-corporate-detail", "text");
  choose(".ph-section .ph-eyebrow,.ph-section h2,.ph-section h3,.ph-section p,.ph-section .ph-btn,.ph-section .ph-text-link", "text");

  const counters = new Map<Element, number>();
  scrollTargets = [...selected.keys()];
  scrollTargets.forEach((el) => {
    const group = el.closest(".rf-value-list,.ph-news-grid") || el.parentElement;
    if (group) {
      const index = counters.get(group) || 0;
      counters.set(group, index + 1);
      (el as HTMLElement).dataset.gsKind = selected.get(el);
      el.classList.add("gs-reveal");
      (el as HTMLElement).style.setProperty("--gs-delay", `${Math.min(index, 3) * 65}ms`);
    }
  });

  // Tìm phần tử parallax (hình ảnh)
  parallaxFrames = new Set(
    [...home.querySelectorAll(".ph-story-grid>figure,.ph-corporate-art")].filter((el) =>
      selected.has(el)
    )
  );
  parallaxFrames.forEach((el) => {
    el.classList.add("gs-image-frame");
  });
}

export function initHomeMotion() {
  destroyHomeMotion();
  controller = new AbortController();
  const { signal } = controller;

  const home = document.querySelector(".gs-home") as HTMLElement;
  if (!home) return;

  try {
    // Chuẩn bị các phần tử để scroll reveal
    prepareTargets(home);

    if ("IntersectionObserver" in window) {
      scrollObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (parallaxFrames.has(entry.target)) {
              if (entry.isIntersecting) {
                activePhotos.add(entry.target);
              } else {
                activePhotos.delete(entry.target);
              }
            }
            if (entry.isIntersecting) {
              entry.target.classList.add("gs-in-view");
              if (!parallaxFrames.has(entry.target)) {
                scrollObserver?.unobserve(entry.target);
              }
            }
          });
          updateHomeMotion();
        },
        { threshold: 0.08, rootMargin: "0px 0px -7% 0px" }
      );

      scrollTargets.forEach((el) => scrollObserver?.observe(el));
    } else {
      // Fallback nếu không có IntersectionObserver
      scrollTargets.forEach((el) => el.classList.add("gs-in-view", "gs-reveal-instant"));
    }

    // Đồng bộ trạng thái chuyển động ban đầu
    syncMotionState(home);

    // Lắng nghe thay đổi class body (motion-paused)
    motionObserver = new MutationObserver(() => syncMotionState(home));
    motionObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });

    // Lắng nghe thay đổi prefers-reduced-motion
    matchMedia("(prefers-reduced-motion: reduce)").addEventListener(
      "change",
      () => {
        syncMotionState(home);
      },
      { signal }
    );

    // Lắng nghe transitionend để đánh dấu reveal settled
    home.addEventListener(
      "transitionend",
      (event) => {
        const element = event.target as Element;
        if (
          (event as TransitionEvent).propertyName === "clip-path" &&
          element.matches?.(".gs-reveal[data-gs-kind=image].gs-in-view")
        ) {
          element.classList.add("gs-reveal-settled");
        }
      },
      { signal }
    );

    // Lắng nghe focusin để hiển thị phần tử chưa reveal khi focus
    home.addEventListener(
      "focusin",
      (event) => {
        const element = (event.target as Element).closest?.(".gs-reveal");
        if (
          element &&
          home.contains(element) &&
          !element.classList.contains("gs-in-view")
        ) {
          element.classList.add("gs-in-view", "gs-reveal-instant");
        }
      },
      { signal }
    );
  } catch (e) {
    // Khôi phục nếu có lỗi
    home.classList.remove("gs-motion-ready");
    scrollTargets.forEach((el) => el.classList.add("gs-in-view", "gs-reveal-instant"));
    scrollObserver?.disconnect();
    scrollObserver = null;
  }

  updateHomeMotion();
}

export function updateHomeMotion() {
  if (frameId) return;
  frameId = requestAnimationFrame(() => {
    frameId = 0;
    const home = document.querySelector(".gs-home") as HTMLElement;
    if (!home) return;

    // Cập nhật parallax images khi cuộn
    if (isReduced()) {
      activePhotos.forEach((el) => {
        (el as HTMLElement).style.setProperty("--gs-image-shift", "0px");
      });
    } else {
      activePhotos.forEach((el) => {
        if (!el.isConnected) {
          activePhotos.delete(el);
          return;
        }
        const rect = el.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > innerHeight) return;
        const progress = Math.max(
          -1,
          Math.min(
            1,
            (rect.top + rect.height / 2 - innerHeight / 2) /
              Math.max(1, innerHeight / 2)
          )
        );
        (el as HTMLElement).style.setProperty(
          "--gs-image-shift",
          `${(-progress * 8).toFixed(2)}px`
        );
      });
    }

    // Cập nhật page progress
    const scrollProgress = Math.max(
      0,
      Math.min(
        1,
        (typeof scrollY !== "undefined" ? scrollY : 0) /
          Math.max(1, document.documentElement.scrollHeight - innerHeight)
      )
    );
    document.documentElement.style.setProperty("--page-progress", String(scrollProgress));
  });
}

export function destroyHomeMotion() {
  controller?.abort();
  controller = null;
  motionObserver?.disconnect();
  scrollObserver?.disconnect();
  scrollObserver = null;
  motionObserver = null;

  if (frameId) cancelAnimationFrame(frameId);
  frameId = 0;

  const home = document.querySelector(".gs-home");
  if (home) {
    home.classList.remove("gs-motion-ready", "gs-reduced-motion");
  }

  scrollTargets.forEach((el) => {
    el.classList.remove(
      "gs-reveal",
      "gs-in-view",
      "gs-reveal-instant",
      "gs-reveal-settled"
    );
    (el as HTMLElement).removeAttribute("data-gs-kind");
    (el as HTMLElement).style.removeProperty("--gs-delay");
  });

  parallaxFrames.forEach((el) => {
    el.classList.remove("gs-image-frame");
    (el as HTMLElement).style.removeProperty("--gs-image-shift");
  });

  scrollTargets = [];
  parallaxFrames.clear();
  activePhotos.clear();
}
