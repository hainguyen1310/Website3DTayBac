/** Định dạng giá theo giao diện A SỈN: "320.000 ₫". */
export const money = (value: number): string =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);

/** Định dạng giá trong giỏ hàng và hộp quà (commerce.js): số + " ₫". */
export const fmt = (value: number): string => `${new Intl.NumberFormat("vi-VN").format(value)} ₫`;

/** Chuẩn hóa tiếng Việt để tìm kiếm không dấu. */
export { normalizeSearch as foldVietnamese } from "../search.ts";
