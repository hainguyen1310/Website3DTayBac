import { useEffect, useRef } from "react";

/**
 * Gọi `callback` (gộp theo khung hình) khi cuộn hoặc đổi kích thước cửa sổ, và một lần khi gắn.
 * Dùng cho các hiệu ứng bám theo vị trí cuộn của từng trang.
 */
export function useScrollFrame(callback: () => void, enabled = true) {
  const latest = useRef(callback);
  latest.current = callback;
  useEffect(() => {
    if (!enabled) return;
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        latest.current();
      });
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    schedule();
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [enabled]);
}
