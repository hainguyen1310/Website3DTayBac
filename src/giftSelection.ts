import type { GiftSlotId, Product } from "./catalog.ts";

/** Ready-made gift boxes are sold separately, never nested inside a custom box. */
export function giftComponents<T extends Product>(products: T[]): T[] {
  return products.filter(product => product.categorySlug !== "hop-qua" &&
    !/^hộp quà(?:\s|$)/iu.test(product.category.trim()));
}

const BAG_EXCLUSIONS = ["cham-cheo", "combo-thit-gac-bep"];
const JAR_EXCLUSIONS = [...BAG_EXCLUSIONS, "trau-gac-bep-tay-bac", "thit-lon-gac-bep", "lap-xuong-gac-bep", "ba-chi-gac-bep"];

export function giftSlotProducts<T extends Product>(products: T[], slot: GiftSlotId): T[] {
  const excluded = slot === "jar" ? JAR_EXCLUSIONS : slot === "bagA" || slot === "bagB" ? BAG_EXCLUSIONS : [];
  return giftComponents(products).filter(product => !excluded.includes(product.id));
}
