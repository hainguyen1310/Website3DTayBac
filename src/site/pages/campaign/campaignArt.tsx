/** Hình hoạ của trang chương trình (campaign.js): icon hành trình, sóng ngăn chương, đường cắt mảnh ghép. */
import { Icon } from "../../icons";
import type { IconName } from "../../icons";

const JOURNEY_PATHS = {
  cart: '<path d="M2 3h3l3 12h11l3-9H6M9 19a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm9 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"/>',
  puzzle: '<path d="M3 3h6c-2-5 8-5 6 0h6v6c5-2 5 8 0 6v6h-6c2-5-8-5-6 0H3v-6c5 2 5-8 0-6Z"/>',
  plane: '<path d="m22 2-7 20-4-9-9-4 20-7ZM11 13 22 2"/>',
  book: '<path d="M12 5v15M3 4h4a5 5 0 0 1 5 3 5 5 0 0 1 5-3h4v15h-4a5 5 0 0 0-5 2 5 5 0 0 0-5-2H3Z"/>',
  code: '<path d="M4 4h5v5H4Zm11 0h5v5h-5ZM4 15h5v5H4Zm10 0h2v5h-2m4-5h2v2m0 3h-2M4 12h5m3-8v7m2 1h6"/>',
  laptop: '<path d="M4 5h16v12H4ZM2 20h20M10 9l6 4-3 1-1 3-2-8Z"/>',
  leaf: '<path d="M20 3C11 2 4 5 4 13a6 6 0 0 0 6 6c8 0 11-7 10-16ZM3 22 16 9"/>',
  ticket: '<path d="M3 5h18v5a2 2 0 0 0 0 4v5H3v-5a2 2 0 0 0 0-4V5ZM15 5v2m0 3v2m0 3v4"/><path d="m8 9 1 2 2 .3-1.5 1.5.4 2.2L8 14l-2 1 .4-2.2L5 11.3 7 11Z"/>',
  star: '<path d="m12 2 3 6.5 7 .9-5.2 5 .9 7L12 18l-5.7 3.4.9-7-5.2-5 7-.9L12 2Z"/>',
  mountain: '<path d="m1 20 8-14 4 6 3-4 7 12H1ZM6 11l3 2 3-3m1 10 4-6"/>',
} as const;

export type JourneyIconName = keyof typeof JOURNEY_PATHS;

/** Icon hành trình; tên không có trong bộ riêng thì dùng bộ icon chung. */
export function JourneyIcon({ name }: { name: JourneyIconName | IconName }) {
  const path = (JOURNEY_PATHS as Record<string, string>)[name];
  if (!path) return <Icon name={name as IconName} />;
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: path }} />;
}

export function CampaignWave({ position }: { position: "start" | "end" }) {
  return (
    <svg className={`cp-editorial-wave cp-editorial-wave--${position}`} viewBox="0 0 1440 52" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 32C107 50 183 47 297 30S487 12 634 24 859 49 1000 30 1239 10 1440 35V52H0Z" />
      <path d="M0 32C107 50 183 47 297 30S487 12 634 24 859 49 1000 30 1239 10 1440 35" />
    </svg>
  );
}

/** Số mảnh dạng 2 chữ số: 0 → "01". */
export const pieceNumber = (index: number) => String(index + 1).padStart(2, "0");

/* Mép răng cưa dùng chung được lật đối xứng ở mảnh kề bên. */
export const PIECE_WIDTH = 100;
export const PIECE_HEIGHT = 70;
export const BOARD_WIDTH = 6 * PIECE_WIDTH;
export const BOARD_HEIGHT = 4 * PIECE_HEIGHT;

function edge(x: number, y: number, dx: number, dy: number, sign = 0, length = PIECE_WIDTH) {
  const point = (percent: number, normal = 0) => {
    const along = (percent * length) / 100;
    return `${+(x + dx * along - dy * normal * 0.8).toFixed(2)} ${+(y + dy * along + dx * normal * 0.8).toFixed(2)}`;
  };
  if (!sign) return `L${point(100)}`;
  return `L${point(30)} C${point(38)} ${point(40)} ${point(40, -4 * sign)} C${point(40, -8 * sign)} ${point(35, -9 * sign)} ${point(38, -14 * sign)} C${point(41, -21 * sign)} ${point(59, -21 * sign)} ${point(62, -14 * sign)} C${point(65, -9 * sign)} ${point(60, -8 * sign)} ${point(60, -4 * sign)} C${point(60)} ${point(62)} ${point(70)} L${point(100)}`;
}

export function piecePath(index: number) {
  const row = Math.floor(index / 6), column = index % 6, x = column * PIECE_WIDTH, y = row * PIECE_HEIGHT;
  const horizontal = (r: number, c: number) => ((r + c) % 2 ? 1 : -1);
  const vertical = (r: number, c: number) => ((r + c) % 2 ? -1 : 1);
  return `M${x} ${y}${edge(x, y, 1, 0, row ? horizontal(row, column) : 0)}${edge(x + PIECE_WIDTH, y, 0, 1, column < 5 ? vertical(row, column + 1) : 0, PIECE_HEIGHT)}${edge(x + PIECE_WIDTH, y + PIECE_HEIGHT, -1, 0, row < 3 ? -horizontal(row + 1, column) : 0)}${edge(x, y + PIECE_HEIGHT, 0, -1, column ? -vertical(row, column) : 0, PIECE_HEIGHT)}Z`;
}
