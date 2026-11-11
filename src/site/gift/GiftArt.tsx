/**
 * Hoạ tiết nắp hộp cắt từ atlas màu gốc của mô hình hộp A SỈN (gift-design.js).
 * Dùng cho các mặt hộp dựng bằng CSS ở khối xem trước.
 */

const atlas = (artKey: "small" | "large") => `/assets/original/models__gift__box-${artKey}-color.webp`;

const ARTWORK = {
  small: { outer: ["10 6 384 360", "translate(1024 0) rotate(90)"], inner: ["634 382 378 189", "translate(0 1024) rotate(-90)"] },
  large: { outer: ["8 648 348 366", ""], inner: ["667 96 343 194", "translate(0 1024) rotate(-90)"] },
} as const;

type Props = { artKey: "small" | "large"; face: "outer" | "inner" };

export function GiftArt({ artKey, face }: Props) {
  const [viewBox, transform] = ARTWORK[artKey][face];
  return (
    <svg className="gift-design-art" viewBox={viewBox} preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
      <image href={atlas(artKey)} width="1024" height="1024" transform={transform || undefined} />
    </svg>
  );
}

/**
 * Trạng thái tải atlas cho phần tử sân khấu (class gift-art-loading / gift-art-unavailable),
 * giống updateGiftArt của bản gốc. Trả về hàm huỷ.
 */
export function trackGiftArt(stage: HTMLElement, artKey: "small" | "large"): () => void {
  let active = true;
  stage.dataset.giftArtwork = artKey;
  stage.classList.add("gift-art-loading");
  stage.classList.remove("gift-art-unavailable");
  const image = new Image();
  const settle = (failed: boolean) => {
    if (!active || !stage.isConnected || stage.dataset.giftArtwork !== artKey) return;
    stage.classList.remove("gift-art-loading");
    stage.classList.toggle("gift-art-unavailable", failed);
  };
  image.onload = () => settle(false);
  image.onerror = () => settle(true);
  image.src = atlas(artKey);
  return () => {
    active = false;
  };
}
