import type { CartLine } from "./catalog.ts";

/** Gift choices are order metadata; prices are calculated by the checkout RPC. */
export function checkoutItems(lines: CartLine[]) {
  return lines.map(line => line.design ? {
    kind: "gift_box",
    product_ids: line.design.productIds,
    quantity: line.quantity,
    design: {
      size: line.design.size,
      includeCard: line.design.includeCard,
      color: line.design.color,
      pattern: line.design.pattern,
      recipient: line.design.includeCard ? line.design.recipient : "",
      message: line.design.includeCard ? line.design.message : "",
    },
  } : {
    kind: "product",
    product_id: line.productId,
    quantity: line.quantity,
  });
}
