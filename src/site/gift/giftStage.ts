import { patterns, sizeOf } from "../../catalog.ts";
import type { GiftDesign, GiftSize } from "../../catalog.ts";
import { giftStageItems, undrawnItems } from "../../storefront/gift/giftScene.ts";
import type { StageItem } from "../../storefront/three/ModelStage";
import type { SiteProduct } from "../data";
import type { GiftBuilderState } from "./giftStore.ts";
import { DEFAULT_CARD_MESSAGE, choosableSlotsOf } from "./variants.ts";

/**
 * Thiết kế hộp quà theo định dạng giỏ hàng của cửa hàng. Chỉ những ô của mẫu hộp đang chọn mới vào đơn:
 * lựa chọn cho ô hũ vẫn được giữ trong trạng thái khi khách đổi sang Thịnh Đỉnh, nhưng hộp đó không có ngăn hũ.
 */
export function giftDesignOf(state: GiftBuilderState): GiftDesign {
  const chosen = choosableSlotsOf(state.size).flatMap((slot) => (state.items[slot] ? [[slot, state.items[slot]] as const] : []));
  return {
    size: state.size,
    includeCard: true,
    productIds: chosen.map(([, productId]) => productId),
    slots: Object.fromEntries(chosen),
    color: sizeOf(state.size).color,
    pattern: patterns[0],
    message: state.message.trim() || DEFAULT_CARD_MESSAGE,
    recipient: state.recipient.trim(),
  };
}

/** Vỏ hộp + các món đã chọn gắn vào đúng ngăn; chuyển động khi mở hộp nằm sẵn trong animation của vỏ. */
export function giftSceneItems(state: GiftBuilderState, products: SiteProduct[]): StageItem[] {
  return giftStageItems(giftDesignOf(state), products, "all");
}

/**
 * Tên các món có trong hộp nhưng khung 3D không dựng được (món chưa có mô hình 3D, hoặc mô hình vỏ hộp
 * thiếu ngăn). Với hai mẫu hộp hiện tại danh sách này rỗng; nó tồn tại để một món đã bán không bao giờ
 * lặng lẽ biến mất khỏi khung xem trước.
 */
export function giftUndrawnNames(state: GiftBuilderState, products: SiteProduct[]): string[] {
  return undrawnItems(giftDesignOf(state), products).map((item) => item.product.name);
}

export const boxKeyOf = (size: GiftSize) => (size === "large" ? "large" : "small");
