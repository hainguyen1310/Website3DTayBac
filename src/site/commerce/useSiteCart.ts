import { useShop } from "../../ShopContext";
import { linePrice, productLineKey, resolveVariant } from "../../catalog";
import type { CartLine } from "../../catalog";
import { findProduct, useSiteProducts } from "../data";
import type { SiteProduct } from "../data";
import { motionAllowed } from "../motion/preference";
import { GIFT_VARIANTS, giftPhotoFor } from "../gift/variants";

/** Số lượng tối đa mỗi dòng giỏ hàng (ràng buộc của cửa hàng). */
export const MAX_LINE_QUANTITY = 20;

/** Một dòng giỏ hàng ở dạng hiển thị (ngăn kéo giỏ, trang giỏ hàng, thanh toán). */
export type CartView = {
  key: string;
  href: string;
  name: string;
  image: string;
  weight: string;
  unitPrice: number;
  quantity: number;
  total: number;
  /** Tên các món đã chọn trong hộp quà. */
  giftItems: string[];
  isGift: boolean;
  /** Món đã lưu nhưng không còn bán. */
  isUnavailable: boolean;
};

export function cartView(line: CartLine, products: SiteProduct[]): CartView {
  const unitPrice = linePrice(line, products);
  if (line.design) {
    const variant = GIFT_VARIANTS[line.design.size];
    const giftItems = line.design.productIds.map((id) => findProduct(products, id)?.name).filter((name): name is string => Boolean(name));
    return {
      key: line.key,
      href: "/thiet-ke",
      name: `Hộp quà ${variant.name}`,
      image: giftPhotoFor(line.design.size),
      weight: variant.dimensions,
      unitPrice,
      quantity: line.quantity,
      total: unitPrice * line.quantity,
      giftItems,
      isGift: true,
      isUnavailable: false,
    };
  }
  const product = findProduct(products, line.productId);
  const variant = line.variantId ? resolveVariant(product, line.variantId) : undefined;
  return {
    key: line.key,
    href: `/san-pham/${encodeURIComponent(line.productId ?? "")}`,
    name: product?.name ?? "Đặc sản A SỈN",
    image: product?.image ?? "",
    weight: variant?.label ?? product?.weight ?? "",
    unitPrice,
    quantity: line.quantity,
    total: unitPrice * line.quantity,
    giftItems: [],
    isGift: false,
    isUnavailable: !product || product.inStock === false || Boolean(line.variantId && !variant),
  };
}

/** Nhịp phóng nhẹ của huy hiệu số lượng sau khi thêm món (commerce.js). */
function animateCartCount() {
  if (!motionAllowed()) return;
  document.querySelectorAll<HTMLElement>(".cart-count, #drawer-count").forEach((badge) => {
    badge.getAnimations?.().find((animation) => animation.id === "cart-count-update")?.cancel();
    const motion = badge.animate?.(
      [{ transform: "scale(1)" }, { transform: "scale(1.22)", offset: 0.45 }, { transform: "scale(1)" }],
      { duration: 280, easing: "cubic-bezier(.22, .7, .25, 1)" },
    );
    if (motion) motion.id = "cart-count-update";
  });
}

/** Phản hồi nhẹ trên nút thêm nhanh khi giỏ không mở ra (data-cart-peek="false"). */
export function pulseQuickAdd(button: HTMLElement | null) {
  if (!button || !motionAllowed()) return;
  button.getAnimations?.().find((animation) => animation.id === "quick-cart-add")?.cancel();
  const animation = button.animate?.([{ opacity: 0.7, transform: "scale(.94)" }, { opacity: 1, transform: "scale(1)" }], { duration: 260, easing: "ease-out" });
  if (animation) animation.id = "quick-cart-add";
}

export function useSiteCart() {
  const shop = useShop();
  const products = useSiteProducts();
  const lines = shop.cart.map((line) => cartView(line, products));
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = lines.reduce((sum, line) => sum + line.total, 0);

  /**
   * Thêm một đặc sản; `openCart` mở ngăn kéo giỏ như bản gốc.
   * `variantId`: quy cách khách chọn trên trang chi tiết; bỏ trống thì dùng quy cách mặc định.
   */
  const addToCart = (slug: string, quantity = 1, { openCart = true, variantId }: { openCart?: boolean; variantId?: string } = {}): boolean => {
    const product = findProduct(products, slug);
    if (!product) return false;
    if (product.inStock === false) {
      shop.notify(`${product.name} tạm hết hàng.`);
      return false;
    }
    const variant = resolveVariant(product, variantId);
    const label = variant ? `${product.name} (${variant.label})` : product.name;
    const current = shop.cart.find((line) => line.key === productLineKey(slug, variant?.id))?.quantity ?? 0;
    if (current >= MAX_LINE_QUANTITY) {
      shop.notify(`${label} đã đạt tối đa ${MAX_LINE_QUANTITY} trong giỏ.`);
      if (openCart) shop.setCartOpen(true);
      return false;
    }
    const added = shop.addProduct(slug, quantity, `${label} đã được thêm vào giỏ hàng.`, variant?.id);
    if (!added) return false;
    if (openCart) shop.setCartOpen(true);
    requestAnimationFrame(animateCartCount);
    return true;
  };

  return {
    lines,
    count,
    subtotal,
    hasUnavailable: lines.some((line) => line.isUnavailable),
    addToCart,
    setQuantity: shop.setQuantity,
    remove: (key: string) => shop.setQuantity(key, 0),
    clear: shop.clearCart,
    isOpen: shop.cartOpen,
    open: () => shop.setCartOpen(true),
    close: () => shop.setCartOpen(false),
    toast: shop.notify,
  };
}
