/**
 * Bộ icon nét mảnh của giao diện A SỈN (bản khách duyệt). Đường vẽ là hằng số trong mã,
 * không nhận dữ liệu ngoài, nên có thể chèn thẳng vào SVG.
 */

const UI_PATHS = {
  arrow: '<path d="M4 12h15M13 5l7 7-7 7"/>',
  diagonal: '<path d="M5 19 19 5M5 5h14v14"/>',
  bag: '<path d="M5 7h14l1 14H4L5 7Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  menu: '<path d="M3 7h18M3 16h18"/>',
  close: '<path d="m5 5 14 14M19 5 5 19"/>',
  gift: '<path d="M3 9h18v5H3zM5 14v7h14v-7M12 9v12"/><path d="M12 9C2 9 5 0 9 4l3 5Zm0 0c10 0 7-9 3-5l-3 5Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  chevron: '<path d="m8 4 8 8-8 8"/>',
  leaf: '<path d="M20 3C8 2 2 9 5 16c6 6 15-1 15-13Z"/><path d="M4 21 16 8"/>',
  fire: '<path d="M12 2c2 6-4 7-2 11 1-1 3-3 3-5 6 5 7 10 2 13C3 24 0 14 6 10c-1 4 0 5 1 6-1-6 6-7 5-14Z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  play: '<path d="m7 4 14 8-14 8V4Z"/>',
  check: '<path d="m5 12 4 4L20 5"/>',
  down: '<path d="M12 3v18m-6-6 6 6 6-6"/>',
  box: '<path d="m3 7 9-5 9 5v10l-9 5-9-5V7Zm0 0 9 5 9-5M12 12v10M7 4l10 5"/>',
} as const;

export type IconName = keyof typeof UI_PATHS;

/** Icon dùng chung (ui.js): kích thước theo CSS của ngữ cảnh. */
export function Icon({ name }: { name: IconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: UI_PATHS[name] ?? UI_PATHS.arrow }}
    />
  );
}

const COMMERCE_PATHS = {
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  bag: '<path d="M5 7h14l1 14H4L5 7Z"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  rotate: '<path d="M20 7v5h-5M20 12a8 8 0 1 0-2 6"/>',
  gift: '<path d="M4 10h16v11H4zM3 6h18v4H3zM12 6v15"/><path d="M12 6C4 7 5 0 9 2c2 1 3 4 3 4Zm0 0c8 1 7-6 3-4-2 1-3 4-3 4Z"/>',
} as const;

export type CommerceIconName = keyof typeof COMMERCE_PATHS;

/** Icon của giỏ hàng, thanh toán và hộp quà (commerce.js): có kích thước cố định. */
export function CommerceIcon({ name, size = 20 }: { name: CommerceIconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: COMMERCE_PATHS[name] ?? "" }}
    />
  );
}
