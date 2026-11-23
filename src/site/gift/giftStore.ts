import type { GiftSize } from "../../catalog";
import type { LidMode } from "../../storefront/three/boxRig.ts";
import type { SiteProduct } from "../data";
import { GIFT_DRAFT_KEY, GIFT_SIZES, choosableSlotsOf } from "./variants.ts";
import type { ChoosableSlot } from "./variants.ts";

/** Trạng thái trình tạo hộp quà (giftState của commerce.js). */
export type GiftBuilderState = {
  size: GiftSize;
  step: 1 | 2 | 3;
  activeSlot: ChoosableSlot;
  items: Record<ChoosableSlot, string>;
  recipient: string;
  message: string;
  /** Mức mở nắp 0–1 (1 = mở hết). */
  opening: number;
  openMode: LidMode;
  /** Góc xoay ngang của hộp (độ). */
  rotation: number;
  view: "3d" | "2d";
};

/** Hũ thịt xé gói sẵn trong hộp Sinh Lộc, khách không phải tự chọn. */
export const DEFAULT_JAR = "thit-lon-xe";

export const INITIAL_GIFT_STATE: GiftBuilderState = {
  size: "medium",
  step: 1,
  activeSlot: "bagA",
  items: { bagA: "", bagB: "", jar: DEFAULT_JAR },
  recipient: "",
  message: "",
  opening: 1,
  openMode: "hinge",
  rotation: -28,
  view: "3d",
};

/** Giữ lựa chọn khi khách rời trang rồi quay lại trong cùng phiên (như biến module của bản gốc). */
let remembered: GiftBuilderState = INITIAL_GIFT_STATE;
export const rememberedGift = (): GiftBuilderState => remembered;
export const rememberGift = (state: GiftBuilderState) => {
  remembered = state;
};

export const RECIPIENT_MAX = 30;
export const MESSAGE_MAX = 90;

/** Món đặt được vào từng ngăn: hai ngăn túi nhận đặc sản đóng túi, ngăn hũ nhận thịt xé. */
export function slotProducts(products: SiteProduct[], slot: ChoosableSlot): SiteProduct[] {
  const type = slot === "jar" ? "jar" : "bag";
  return products.filter((product) => product.giftSlot === type && product.inStock !== false);
}

/** Hộp đủ món khi mọi ô tự chọn của mẫu hộp đang chọn đều có món còn hàng (ô của mẫu hộp khác không tính). */
export const giftReady = (state: GiftBuilderState, products: SiteProduct[]): boolean =>
  choosableSlotsOf(state.size).every((slot) => slotProducts(products, slot).some((product) => product.slug === state.items[slot]));

/** Ô đang mở phải thuộc mẫu hộp hiện tại: đổi sang Thịnh Đỉnh khi đang ở ô hũ thì quay về ô đầu tiên. */
export function withValidSlot(state: GiftBuilderState): GiftBuilderState {
  const slots = choosableSlotsOf(state.size);
  return slots.includes(state.activeSlot) ? state : { ...state, activeSlot: slots[0] };
}

/** Bản nháp từ khối xem hộp 360° ở trang chủ (?nguon=trang-chu). */
function readHomeDraft(state: GiftBuilderState): GiftBuilderState {
  try {
    const raw = sessionStorage.getItem(GIFT_DRAFT_KEY);
    sessionStorage.removeItem(GIFT_DRAFT_KEY);
    if (!raw) return state;
    const draft = JSON.parse(raw) as { size?: unknown; recipient?: unknown; message?: unknown } | null;
    if (!draft || typeof draft !== "object" || !["small", "large"].includes(String(draft.size))) return state;
    return {
      ...state,
      size: draft.size === "large" ? "large" : "medium",
      recipient: typeof draft.recipient === "string" ? draft.recipient.slice(0, RECIPIENT_MAX) : "",
      message: typeof draft.message === "string" ? draft.message.slice(0, MESSAGE_MAX) : "",
      step: 1,
      opening: 1,
    };
  } catch {
    return state;
  }
}

/** Áp tham số URL: bản nháp trang chủ và món chọn sẵn từ trang sản phẩm (?san-pham=slug). */
export function applyGiftPrefill(state: GiftBuilderState, search: string, products: SiteProduct[]): GiftBuilderState {
  const params = new URLSearchParams(search);
  let next = params.get("nguon") === "trang-chu" ? readHomeDraft(state) : state;
  const slug = params.get("san-pham");
  if (!slug) return next;
  const slot: ChoosableSlot | null = slotProducts(products, "bagA").some((product) => product.slug === slug)
    ? "bagA"
    : slotProducts(products, "jar").some((product) => product.slug === slug) ? "jar" : null;
  if (!slot) return next;
  // Món không có ngăn trong mẫu hộp đang chọn (hũ thịt xé với hộp Thịnh Đỉnh): chuyển sang mẫu hộp chứa được nó.
  const size = choosableSlotsOf(next.size).includes(slot) ? next.size : GIFT_SIZES.find((option) => choosableSlotsOf(option).includes(slot)) ?? next.size;
  next = { ...next, size, items: { ...next.items, [slot]: slug }, step: 2, activeSlot: slot, opening: 1 };
  return next;
}
