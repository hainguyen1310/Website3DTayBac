import { boxSizes, choosableSlots, includedProductIds } from "../../catalog.ts";
import type { GiftSize } from "../../catalog.ts";

/**
 * Hai mẫu hộp quà theo bản khách duyệt. Khóa dùng `GiftSize` của cửa hàng
 * ("medium" = Sinh Lộc, bản khách gọi là "small"); giá lấy từ `boxSizes`.
 * Hộp chứa những ngăn nào do `boxSizes` quyết định; các câu chữ ở đây chỉ diễn đạt lại cho khách.
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
  /** Một dòng trên thẻ chọn cỡ hộp: hộp gồm những gì. */
  contents: string;
  /** Lời dẫn ở bước chọn hương vị. */
  pickHint: string;
  /** Lời nhắc khi khách sang bước viết thiệp mà chưa chọn đủ món. */
  incompleteHint: string;
};

const priceOf = (size: GiftSize) => boxSizes.find((box) => box.value === size)?.price ?? 0;

export const GIFT_VARIANTS: Record<GiftSize, GiftVariant> = {
  medium: {
    size: "medium", artKey: "small", name: "Sinh Lộc", dimensions: "22 × 22 × 10 cm", finish: "Xanh rêu", price: priceOf("medium"), tint: null,
    contents: "3 món tự chọn + chẩm chéo",
    pickHint: "Chọn hai túi đặc sản và một hũ thịt xé. Chẩm chéo được gói sẵn.",
    incompleteHint: "Hãy chọn đủ hai túi đặc sản và một hũ thịt xé trước khi viết thiệp.",
  },
  // Mô hình Thịnh Đỉnh mới (11/2026) có sẵn vỏ đỏ đô hoạ tiết vàng, không cần nhuộm lại texture;
  // hộp gồm hai túi và bình rượu ngô, không có ngăn hũ và không kèm chẩm chéo.
  large: {
    size: "large", artKey: "large", name: "Thịnh Đỉnh", dimensions: "32 × 32 × 14 cm", finish: "Đỏ đô", price: priceOf("large"), tint: null,
    contents: "2 túi tự chọn + rượu ngô Bản Phố",
    pickHint: "Chọn hai túi đặc sản. Rượu ngô Bản Phố được gói sẵn.",
    incompleteHint: "Hãy chọn đủ hai túi đặc sản trước khi viết thiệp.",
  },
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
/** Mọi ô tự chọn mà trình tạo hộp biết tới. Trạng thái giữ đủ cả ba để lựa chọn không mất khi khách đổi cỡ hộp. */
export const CHOOSABLE_SLOTS = Object.keys(GIFT_SLOT_NAMES) as ChoosableSlot[];

/** Các ô khách tự chọn của một mẫu hộp, theo thứ tự ngăn (hộp Thịnh Đỉnh không có ngăn hũ). */
export const choosableSlotsOf = (size: GiftSize): ChoosableSlot[] => {
  const ids: readonly string[] = choosableSlots(size).map((slot) => slot.id);
  return CHOOSABLE_SLOTS.filter((slot) => ids.includes(slot));
};

/** Tên ngắn của các món gói sẵn (đã gồm trong giá hộp). */
const FIXED_ITEM_NAMES: Record<string, string> = {
  "cham-cheo": "Chẩm chéo",
  "ruou-ngo-ban-pho": "Rượu ngô Bản Phố",
};

/** Món gói sẵn theo từng mẫu hộp (đã gồm trong giá). */
export const fixedItemsLabel = (size: GiftSize): string =>
  includedProductIds(size).map((id) => FIXED_ITEM_NAMES[id] ?? id).join(" · ");

/** Bản nháp từ khối xem hộp quà ở trang chủ sang trang /thiet-ke. */
export const GIFT_DRAFT_KEY = "asin-premium-gift-draft-v31";
export const DEFAULT_CARD_MESSAGE = "Một chút hương vị vùng cao, gửi cùng những điều chân thành.";
