/** Chuyển động của trang chương trình (animateCampaign, setupReveals trong campaign.js). */
import { motionAllowed } from "../../motion/preference";

const EASE = "cubic-bezier(.22,.7,.25,1)";
const animations = new Set<Animation>();

export function animateCampaign(element: Element | null | undefined, keyframes: Keyframe[], options: KeyframeAnimationOptions) {
  if (!motionAllowed() || !element?.animate) return;
  const animation = element.animate(keyframes, { easing: EASE, ...options });
  animations.add(animation);
  animation.finished.then(() => animations.delete(animation), () => animations.delete(animation));
}

export function cancelCampaignMotion() {
  animations.forEach((animation) => animation.cancel());
  animations.clear();
}

/** Hiện dần các khối `[data-cp-reveal]` một lần khi cuộn tới. Trả về hàm huỷ. */
export function setupReveals(page: HTMLElement): () => void {
  if (!motionAllowed()) return () => undefined;
  const observer = new IntersectionObserver((entries) => {
    if (!page.isConnected) return;
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      const target = entry.target as HTMLElement;
      const hero = target.classList.contains("cp-hero-copy");
      const layers = hero ? [...target.querySelectorAll(":scope > .cp-kicker, :scope > h1 > *, :scope > p, :scope > .cp-hero-actions, :scope > .cp-hero-meta")] : [target];
      const group = target.parentElement?.closest(".cp-how-grid,.cp-experience-grid,.cp-discover-grid,.cp-rewards-grid");
      const index = group ? [...group.children].indexOf(target) : 0;
      layers.forEach((layer, layerIndex) => animateCampaign(layer, [
        { opacity: hero ? 0.6 : 0.48, translate: hero ? "0 7px" : "0 14px" },
        { opacity: 1, translate: "0 0" },
      ], { duration: hero ? 540 : 600, delay: hero ? layerIndex * 44 : Math.min(index, 3) * 56, fill: "backwards" }));
    });
  }, { threshold: 0.1 });
  page.querySelectorAll("[data-cp-reveal]").forEach((element) => observer.observe(element));
  return () => observer.disconnect();
}
