import { patterns, sizeOf } from "../../catalog";
import type { GiftDesign, GiftSize } from "../../catalog";
import { giftStageItems } from "../../storefront/gift/giftScene";
import type { StageItem } from "../../storefront/three/ModelStage";
import type { RiseOffsets } from "../../storefront/three/lidRig";
import type { SiteProduct } from "../data";
import type { GiftBuilderState } from "./giftStore";
import { DEFAULT_CARD_MESSAGE } from "./variants";

/**
 * Độ dời các món khi mở hộp (tính theo thân hộp: rộng, cao, sâu), mô phỏng các kiểu
 * "Trượt mở" và "Bung hương vị" của bản khách duyệt.
 */
const RISE: Record<string, RiseOffsets> = {
  bagA: { slide: [0, 0.3, 0], bloom: [-0.07, 1.45, -0.05] },
  bagB: { slide: [0, 0.3, 0], bloom: [0, 1.75, -0.1] },
  jar: { slide: [0, 0.3, 0], bloom: [0.08, 1.35, -0.05] },
  cham: { slide: [0, 0.3, 0], bloom: [0.05, 0.8, 0.12] },
  bottle: { slide: [0, 0.3, 0], bloom: [0, 1, 0] },
};

/** Thiết kế hộp quà theo định dạng giỏ hàng của cửa hàng. */
export function giftDesignOf(state: GiftBuilderState): GiftDesign {
  const slots = { bagA: state.items.bagA, bagB: state.items.bagB, jar: state.items.jar };
  return {
    size: state.size,
    includeCard: true,
    productIds: [slots.bagA, slots.bagB, slots.jar].filter(Boolean),
    slots: Object.fromEntries(Object.entries(slots).filter(([, id]) => id)),
    color: sizeOf(state.size).color,
    pattern: patterns[0],
    message: state.message.trim() || DEFAULT_CARD_MESSAGE,
    recipient: state.recipient.trim(),
  };
}

/** Vỏ hộp + các món đã chọn đặt đúng ngăn, kèm độ dời khi mở nắp. */
export function giftSceneItems(state: GiftBuilderState, products: SiteProduct[]): StageItem[] {
  return giftStageItems(giftDesignOf(state), products, "all").map((item) => {
    if (item.isBox) return item;
    const slot = item.key.split("-").pop() ?? "";
    return { ...item, rise: RISE[slot] };
  });
}

export const boxKeyOf = (size: GiftSize) => (size === "large" ? "large" : "small");
