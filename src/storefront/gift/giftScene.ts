import { sizeOf } from "../../catalog.ts";
import type { GiftDesign, GiftSlotId } from "../../catalog.ts";
import type { StorefrontProduct } from "../products.ts";
import type { StageItem } from "../three/ModelStage";
import { GIFT_LAYOUT } from "./layout.generated.ts";

type Vec3 = readonly [number, number, number];
/** Cách đặt một món vào ngăn: `seat` là vị trí so với điểm neo; túi có thêm hộp giấy con (`pack`). */
type ProductLayout = { size: Vec3; seat: Vec3; pack?: string };

const MODEL_ROOT = "/models/gift";
const ORIGIN: Vec3 = [0, 0, 0];
/** Các món lần lượt rơi vào hộp ở chế độ "Xem trong hộp". */
const DROP_STAGGER_MS = 120;
const DROP_LIFT = 14;

const modelKey = (url: string) => url.split("/").pop()!.replace(/\.glb$/, "");
const boxKeyOf = (design: GiftDesign) => (design.size === "large" ? "large" : "small");

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

/** Món dựng được trong vỏ hộp: có mô hình 3D và mô hình vỏ hộp có điểm neo cho ngăn của nó. */
function isDrawn(design: GiftDesign, { slotId, product }: TrayItem): boolean {
  const slots: readonly string[] = GIFT_LAYOUT.boxes[boxKeyOf(design)].slots;
  return Boolean(product.giftModel) && slots.includes(slotId);
}

/**
 * Các món có trong hộp nhưng khung 3D không dựng (hộp Thịnh Đỉnh mới chỉ có ngăn cho hai túi và
 * bình rượu), để giao diện nói rõ với khách thay vì lặng lẽ bỏ qua.
 */
export function undrawnItems(design: GiftDesign, products: StorefrontProduct[]): TrayItem[] {
  return trayItems(design, products).filter((item) => !isDrawn(design, item));
}

/**
 * Vỏ hộp, có hoặc không kèm món. `contents: "all"` gắn mọi món vào điểm neo của ngăn trong vỏ hộp
 * (nút `slot_*` của GLB, đi theo animation đóng/mở) và cho chúng rơi xuống lần lượt. Món mà mô hình
 * hộp không có ngăn chứa không được dựng (xem `undrawnItems`).
 */
export function giftStageItems(design: GiftDesign, products: StorefrontProduct[], contents: "none" | "all"): StageItem[] {
  const boxKey = boxKeyOf(design);
  const box = GIFT_LAYOUT.boxes[boxKey];
  const items: StageItem[] = [{ key: `box-${boxKey}`, url: `${MODEL_ROOT}/${box.model}`, position: ORIGIN, isBox: true }];
  if (contents === "none") return items;
  const layouts: Record<string, ProductLayout> = GIFT_LAYOUT.products;
  trayItems(design, products).forEach((item, index) => {
    const { slotId, product } = item;
    if (!product.giftModel || !isDrawn(design, item)) return;
    const layout = layouts[modelKey(product.giftModel)];
    const drop = { anchor: slotId, appearDelay: 180 + index * DROP_STAGGER_MS, appearLift: DROP_LIFT };
    if (layout?.pack) items.push({ key: `${boxKey}-${slotId}-pack`, url: `${MODEL_ROOT}/${layout.pack}.glb`, position: ORIGIN, ...drop });
    items.push({ key: `${boxKey}-${slotId}`, url: product.giftModel, position: layout?.seat ?? ORIGIN, ...drop });
  });
  return items;
}
