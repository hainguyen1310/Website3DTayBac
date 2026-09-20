import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  cleanCart,
  cleanDesign,
  products,
  readSaved,
  saveLocal,
} from "./catalog";
import type { CartLine, GiftDesign, Product } from "./catalog";

type Shop = {
  cart: CartLine[];
  setQuantity: (key: string, quantity: number) => void;
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
  const [cart, setCart] = useState<CartLine[]>(() =>
    cleanCart(readSaved("moc-cart-v1")),
  );
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    const value = readSaved("moc-favorites-v1");
    return Array.isArray(value)
      ? value.filter((id) => products.some((p) => p.id === id))
      : [];
  });
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
    saveLocal("moc-cart-v1", cart);
  }, [cart]);
  useEffect(() => {
    saveLocal("moc-favorites-v1", favoriteIds);
  }, [favoriteIds]);
  useEffect(() => () => clearTimeout(timer.current), []);
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
    if (!products.some((p) => p.id === id)) return;
    add({
      key: id,
      productId: id,
      quantity: Math.max(1, Math.min(20, quantity)),
    });
    notify("Đã thêm vào giỏ. Một chút hương rừng đang chờ bạn!");
  };
  const addGift = (input: GiftDesign) => {
    const design = cleanDesign(input);
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
  const toggleFavorite = (id: string) =>
    setFavoriteIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  return (
    <ShopContext.Provider
      value={{
        cart,
        setQuantity,
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
