import { sizeOf } from "../../catalog";
import type { GiftDesign } from "../../catalog";
import type { StorefrontProduct } from "../products";
import type { StageItem } from "../three/ModelStage";
import { GIFT_LAYOUT } from "./layout.generated";

type Size3 = readonly [number, number, number];
type SlotLayout = { x: number; z: number; floor: number; size: Size3 };

const MODEL_ROOT = "/models/gift";
/** Biên độ co giãn khi đặt một món vào ngăn không phải ngăn gốc của nó. */
const FIT_RANGE: [number, number] = [0.85, 1.1];

const modelKey = (url: string) => url.split("/").pop()!.replace(/\.glb$/, "");

function fitScale(slot: SlotLayout, product: Size3 | undefined) {
  if (!product) return 1;
  const ratio = Math.min(slot.size[0] / product[0], slot.size[2] / product[2]);
  return Math.min(FIT_RANGE[1], Math.max(FIT_RANGE[0], ratio));
}

/** Vỏ hộp + từng món theo ngăn, đúng toạ độ lấy từ file combo gốc. */
export function giftStageItems(design: GiftDesign, products: StorefrontProduct[]): StageItem[] {
  const boxKey = design.size === "large" ? "large" : "small";
  const box = GIFT_LAYOUT.boxes[boxKey];
  const slotLayouts = box.slots as Record<string, SlotLayout>;
  const sizes = GIFT_LAYOUT.products as Record<string, { size: Size3 }>;
  const items: StageItem[] = [{ key: `box-${boxKey}`, url: `${MODEL_ROOT}/${box.model}`, position: [0, 0, 0], isBox: true }];
  for (const slot of sizeOf(design.size).slots) {
    const productId = "fixed" in slot && slot.fixed ? slot.fixed : design.slots[slot.id];
    const product = products.find((item) => item.id === productId);
    const layout = slotLayouts[slot.id];
    if (!product?.giftModel || !layout) continue;
    items.push({
      key: `${boxKey}-${slot.id}`,
      url: product.giftModel,
      position: [layout.x, layout.floor, layout.z],
      scale: fitScale(layout, sizes[modelKey(product.giftModel)]?.size),
    });
  }
  return items;
}
