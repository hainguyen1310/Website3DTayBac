import { patterns, sizeOf } from "../../catalog";
import type { GiftDesign, GiftSize } from "../../catalog";
import { giftStageItems } from "../../storefront/gift/giftScene";
import type { StageItem } from "../../storefront/three/ModelStage";
import type { RiseOffsets } from "../../storefront/three/lidRig";
import type { SiteProduct } from "../data";
import type { GiftBuilderState } from "./giftStore";
import { DEFAULT_CARD_MESSAGE } from "./variants";

/**
 * "Bung hương vị": mọi món cùng nhấc lên vừa đủ khỏi miệng hộp rồi bay chéo lên về phía trước hộp
 * theo một hướng cố định (giữ nguyên bố cục trong khay, cùng một độ cao), mặt món ngả ra phía trước.
 * [x × rộng, lên trên × cao, ra phía trước × sâu] của thân hộp.
 */
const BLOOM_RISE: RiseOffsets = { bloom: [0, 1, 0.35] };

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
  return giftStageItems(giftDesignOf(state), products, "all").map((item) => (item.isBox ? item : { ...item, rise: BLOOM_RISE }));
}

export const boxKeyOf = (size: GiftSize) => (size === "large" ? "large" : "small");
