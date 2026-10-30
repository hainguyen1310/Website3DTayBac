import { sizeOf } from "../../catalog";
import type { GiftDesign, GiftSlotId } from "../../catalog";
import type { StorefrontProduct } from "../products";
import type { StageItem } from "../three/ModelStage";
import { GIFT_LAYOUT } from "./layout.generated";

type Size3 = readonly [number, number, number];
type SlotLayout = { x: number; z: number; floor: number; size: Size3 };

const MODEL_ROOT = "/models/gift";
/** Biên độ co giãn khi đặt một món vào ngăn không phải ngăn gốc của nó. */
const FIT_RANGE: [number, number] = [0.85, 1.1];
/** Các món lần lượt rơi vào hộp ở chế độ "Xem trong hộp". */
const DROP_STAGGER_MS = 120;
const DROP_LIFT = 14;

const modelKey = (url: string) => url.split("/").pop()!.replace(/\.glb$/, "");

function fitScale(slot: SlotLayout, product: Size3 | undefined) {
  if (!product) return 1;
  const ratio = Math.min(slot.size[0] / product[0], slot.size[2] / product[2]);
  return Math.min(FIT_RANGE[1], Math.max(FIT_RANGE[0], ratio));
}

export type TrayItem = {
  key: string;
  slotId: GiftSlotId;
  product: StorefrontProduct;
  /** Món cố định đã gồm trong giá vỏ hộp. */
  included: boolean;
};

/** Các món trong hộp theo thứ tự ngăn: món tự chọn trước, món cố định sau. */
export function trayItems(design: GiftDesign, products: StorefrontProduct[]): TrayItem[] {
  const slots = sizeOf(design.size).slots;
  const ordered = [...slots.filter((slot) => !("fixed" in slot && slot.fixed)), ...slots.filter((slot) => "fixed" in slot && slot.fixed)];
  return ordered.flatMap((slot) => {
    const included = Boolean("fixed" in slot && slot.fixed);
    const productId = included && "fixed" in slot ? slot.fixed : design.slots[slot.id];
    const product = products.find((item) => item.id === productId);
    return product ? [{ key: `${slot.id}:${product.id}`, slotId: slot.id, product, included }] : [];
  });
}

/**
 * Vỏ hộp, có hoặc không kèm món. `contents: "all"` đặt mọi món vào đúng ngăn
 * (toạ độ lấy từ file combo gốc) và cho chúng rơi xuống lần lượt.
 */
export function giftStageItems(design: GiftDesign, products: StorefrontProduct[], contents: "none" | "all"): StageItem[] {
  const boxKey = design.size === "large" ? "large" : "small";
  const box = GIFT_LAYOUT.boxes[boxKey];
  const items: StageItem[] = [{ key: `box-${boxKey}`, url: `${MODEL_ROOT}/${box.model}`, position: [0, 0, 0], isBox: true }];
  if (contents === "none") return items;
  const slotLayouts = box.slots as Record<string, SlotLayout>;
  const sizes = GIFT_LAYOUT.products as Record<string, { size: Size3 }>;
  trayItems(design, products).forEach(({ slotId, product }, index) => {
    const layout = slotLayouts[slotId];
    if (!product.giftModel || !layout) return;
    items.push({
      key: `${boxKey}-${slotId}`,
      url: product.giftModel,
      position: [layout.x, layout.floor, layout.z],
      scale: fitScale(layout, sizes[modelKey(product.giftModel)]?.size),
      appearDelay: 180 + index * DROP_STAGGER_MS,
      appearLift: DROP_LIFT,
    });
  });
  return items;
}

/** Một món đứng riêng giữa sân khấu (đã chuẩn hoá tâm và đáy khi xuất mô hình). */
export function focusStageItems(product: StorefrontProduct | undefined): StageItem[] {
  return product?.giftModel ? [{ key: `focus-${product.id}`, url: product.giftModel, position: [0, 0, 0] }] : [];
}
