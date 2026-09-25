import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cleanCart, cleanDesign, readSaved, saveLocal } from "./catalog";
import type { CartLine, GiftDesign, Product } from "./catalog";
import { useCatalog } from "./CatalogContext";

type Shop = {
  products: Product[];
  cart: CartLine[];
  setQuantity: (key: string, quantity: number) => void;
  clearCart: () => void;
  addProduct: (id: string, quantity?: number) => void;
  addGift: (design: GiftDesign) => void;
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
  const addProduct = (id: string, quantity = 1) => {
    if (!catalogProducts.some((p) => p.id === id)) return;
    add({
      key: id,
      productId: id,
      quantity: Math.max(1, Math.min(20, quantity)),
    });
    notify("Đã thêm vào giỏ. Một chút hương rừng đang chờ bạn!");
  };
  const addGift = (input: GiftDesign) => {
    const design = cleanDesign(input, catalogProducts);
    if (!design.productIds.length) return;
    add({ key: `gift:${JSON.stringify(design)}`, design, quantity: 1 });
    notify("Đã thêm hộp quà mang dấu ấn của bạn vào giỏ.");
    setCartOpen(true);
  };
  const setQuantity = (key: string, quantity: number) =>
    setCart((current) =>
      quantity <= 0
        ? current.filter((item) => item.key !== key)
        : current.map((item) =>
            item.key === key
              ? { ...item, quantity: Math.min(20, quantity) }
              : item,
          ),
    );
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
