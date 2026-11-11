/** Chuyển động được phép khi thiết bị không giảm chuyển động và khách chưa bấm "Tạm dừng chuyển động". */

export const MOTION_STORAGE_KEY = "asin-scrolling-experience-motion";

const reducedQuery = () => matchMedia("(prefers-reduced-motion: reduce)");

export const prefersReducedMotion = (): boolean => reducedQuery().matches;

export const isMotionPaused = (): boolean => document.body.classList.contains("motion-paused");

export const motionAllowed = (): boolean => !prefersReducedMotion() && !isMotionPaused();

/** Gọi `callback` khi tùy chọn chuyển động (thiết bị hoặc nút tạm dừng) thay đổi. */
export function onMotionPreferenceChange(callback: () => void, signal: AbortSignal): void {
  reducedQuery().addEventListener("change", callback, { signal });
  const observer = new MutationObserver(callback);
  observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
  signal.addEventListener("abort", () => observer.disconnect(), { once: true });
}
