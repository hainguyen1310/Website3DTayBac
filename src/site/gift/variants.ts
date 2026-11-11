import { boxSizes } from "../../catalog.ts";
import type { GiftSize } from "../../catalog.ts";

/**
 * Hai mẫu hộp quà theo bản khách duyệt. Khóa dùng `GiftSize` của cửa hàng
 * ("medium" = Sinh Lộc, bản khách gọi là "small"); giá lấy từ `boxSizes`.
 */
export type GiftVariant = {
  size: GiftSize;
  /** Khóa "small" | "large" của bộ ảnh hoạ tiết hộp (models__gift__box-<key>-color.webp). */
  artKey: "small" | "large";
  name: string;
  dimensions: string;
  finish: string;
  price: number;
  /** Màu vải bọc dùng để nhuộm texture hộp 3D (null = giữ texture xanh rêu gốc). */
  tint: string | null;
};

const priceOf = (size: GiftSize) => boxSizes.find((box) => box.value === size)?.price ?? 0;

export const GIFT_VARIANTS: Record<GiftSize, GiftVariant> = {
  medium: { size: "medium", artKey: "small", name: "Sinh Lộc", dimensions: "22 × 22 × 10 cm", finish: "Xanh rêu", price: priceOf("medium"), tint: null },
  large: { size: "large", artKey: "large", name: "Thịnh Đỉnh", dimensions: "32 × 32 × 14 cm", finish: "Đỏ đô", price: priceOf("large"), tint: "#681b22" },
};

export const GIFT_SIZES: GiftSize[] = ["medium", "large"];

export const GIFT_PHOTO = "/assets/original/asin-open-gift-v27.webp";
export const THINH_DINH_PHOTO = "/assets/original/asin-thinh-dinh.webp";

export const giftPhotoFor = (size: GiftSize): string => (size === "large" ? THINH_DINH_PHOTO : GIFT_PHOTO);

/** Ô sản phẩm khách tự chọn và tên hiển thị (theo thứ tự ngăn của hộp). */
export const GIFT_SLOT_NAMES = {
  bagA: "Túi đặc sản thứ nhất",
  bagB: "Túi đặc sản thứ hai",
  jar: "Hũ thịt xé",
} as const;

export type ChoosableSlot = keyof typeof GIFT_SLOT_NAMES;
export const CHOOSABLE_SLOTS = Object.keys(GIFT_SLOT_NAMES) as ChoosableSlot[];

/** Món gói sẵn theo từng mẫu hộp (đã gồm trong giá). */
export const fixedItemsLabel = (size: GiftSize): string =>
  size === "large" ? "Chẩm chéo · Rượu ngô Bản Phố" : "Chẩm chéo";

/** Bản nháp từ khối xem hộp quà ở trang chủ sang trang /thiet-ke. */
export const GIFT_DRAFT_KEY = "asin-premium-gift-draft-v31";
export const DEFAULT_CARD_MESSAGE = "Một chút hương vị vùng cao, gửi cùng những điều chân thành.";
