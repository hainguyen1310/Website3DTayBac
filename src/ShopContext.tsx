import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cleanCart, cleanDesign, readSaved, saveLocal } from "./catalog";
import type { CartLine, GiftDesign, Product } from "./catalog";
import { useCatalog } from "./CatalogContext";
import { trackEvent } from "./analytics";
import { cartAnalyticsItems, ecommerceParams } from "./analyticsItems";

type Shop = {
  products: Product[];
  cart: CartLine[];
  setQuantity: (key: string, quantity: number) => void;
  clearCart: () => void;
  /** Trả về `true` khi đã thêm; `message` thay câu thông báo mặc định. */
  addProduct: (id: string, quantity?: number, message?: string) => boolean;
  addGift: (design: GiftDesign, message?: string) => boolean;
  favoriteIds: string[];
  toggleFavorite: (id: string) => void;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  selectedProduct: Product | null;
  setSelectedProduct: (product: Product | null) => void;
  notify: (message: string) => void;
  notification: string;
};
const ShopContext = createContext<Shop | null>(null);
export const useShop = () => useContext(ShopContext)!;

export function ShopProvider({ children }: { children: ReactNode }) {
  const { products: catalogProducts, loading, source } = useCatalog();
  const [cart, setCart] = useState<CartLine[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [restored, setRestored] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [notification, setNotification] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const notify = (message: string) => {
    clearTimeout(timer.current);
    setNotification(message);
    timer.current = setTimeout(() => setNotification(""), 3400);
  };
  useEffect(() => {
    if (restored) saveLocal("moc-cart-v1", cart);
  }, [cart, restored]);
  useEffect(() => {
    if (restored) saveLocal("moc-favorites-v1", favoriteIds);
  }, [favoriteIds, restored]);
  useEffect(() => () => clearTimeout(timer.current), []);
  // Danh mục có thể đổi sau khi đọc từ cơ sở dữ liệu: loại bỏ món không còn bán.
  useEffect(() => {
    if (loading || source !== "database") return;
    if (!restored) {
      setCart(cleanCart(readSaved("moc-cart-v1"), catalogProducts));
      const savedFavorites = readSaved("moc-favorites-v1");
      setFavoriteIds(Array.isArray(savedFavorites)
        ? savedFavorites.filter((id) => catalogProducts.some((p) => p.id === id)) : []);
      setRestored(true);
      return;
    }
    setCart((current) => cleanCart(current, catalogProducts));
    setFavoriteIds((current) =>
      current.filter((id) => catalogProducts.some((p) => p.id === id)),
    );
  }, [catalogProducts, loading, source, restored]);
  const add = (line: CartLine) =>
    setCart((current) => {
      const existing = current.find((item) => item.key === line.key);
      return existing
        ? current.map((item) =>
            item.key === line.key
              ? {
                  ...item,
                  quantity: Math.min(20, item.quantity + line.quantity),
                }
              : item,
          )
        : [...current, line];
    });
  const addProduct = (id: string, quantity = 1, message?: string) => {
    if (!catalogProducts.some((p) => p.id === id && p.inStock !== false)) return false;
    const actualQuantity = Math.min(20 - (cart.find(item => item.key === id)?.quantity ?? 0), Math.max(1, Math.min(20, quantity)));
    if (actualQuantity <= 0) return false;
    add({
      key: id,
      productId: id,
      quantity: Math.max(1, Math.min(20, quantity)),
    });
    trackEvent("add_to_cart", ecommerceParams(cartAnalyticsItems([{ key: id, productId: id, quantity: actualQuantity }], catalogProducts)));
    notify(message ?? "Đã thêm vào giỏ. Một chút hương rừng đang chờ bạn!");
    return true;
  };
  const addGift = (input: GiftDesign, message?: string) => {
    const design = cleanDesign(input, catalogProducts);
    if (!design.productIds.length || (design.includeCard && !design.message.trim()) || design.productIds.some(id => catalogProducts.find(product => product.id === id)?.inStock === false)) return false;
    const line = { key: `gift:${JSON.stringify(design)}`, design, quantity: 1 };
    if ((cart.find(item => item.key === line.key)?.quantity ?? 0) >= 20) return false;
    add(line);
    trackEvent("add_to_cart", ecommerceParams(cartAnalyticsItems([line], catalogProducts)));
    notify(message ?? "Đã thêm hộp quà mang dấu ấn của bạn vào giỏ.");
    setCartOpen(true);
    return true;
  };
  const setQuantity = (key: string, quantity: number) => {
    const line = cart.find(item => item.key === key);
    if (!line) return;
    const delta = Math.max(0, Math.min(20, quantity)) - line.quantity;
    if (delta) trackEvent(delta > 0 ? "add_to_cart" : "remove_from_cart", ecommerceParams(cartAnalyticsItems([{ ...line, quantity: Math.abs(delta) }], catalogProducts)));
    setCart((current) =>
      quantity <= 0
        ? current.filter((item) => item.key !== key)
        : current.map((item) =>
            item.key === key
              ? { ...item, quantity: Math.min(20, quantity) }
              : item,
          ),
    );
  };
  const clearCart = () => setCart([]);
  const toggleFavorite = (id: string) =>
    setFavoriteIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  return (
    <ShopContext.Provider
      value={{
        products: catalogProducts,
        cart,
        setQuantity,
        clearCart,
        addProduct,
        addGift,
        favoriteIds,
        toggleFavorite,
        cartOpen,
        setCartOpen,
        selectedProduct,
        setSelectedProduct,
        notify,
        notification,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
}
