import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { applyPromotions } from "./pricing";
import {
  ALL_CATEGORY,
  buildCategories,
} from "./catalog";
import type { Deal, Product } from "./catalog";
import {
  getStorefrontNotice,
  listStorefrontCategories,
  listStorefrontDeals,
  listStorefrontProducts,
} from "./services/catalogApi";

export const DEFAULT_NOTICE = "Từ bản làng, gửi đến bạn.";

type CatalogData = {
  products: Product[];
  categories: string[];
  deals: Deal[];
  notice: string;
  source: "unavailable" | "database";
};

type Catalog = CatalogData & {
  loading: boolean;
  error: boolean;
  reload: () => Promise<void>;
};

const CatalogContext = createContext<Catalog | null>(null);
export const useCatalog = () => useContext(CatalogContext)!;

/**
 * Danh mục, ưu đãi và câu thông báo của cửa hàng lấy từ Supabase.
 * Không thay dữ liệu trống hoặc lỗi bằng sản phẩm và ưu đãi minh họa.
 */
export function CatalogProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<CatalogData>({
    products: [],
    categories: [ALL_CATEGORY],
    deals: [],
    notice: DEFAULT_NOTICE,
    source: "unavailable",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const [productResult, categoryResult, dealResult, noticeResult] =
      await Promise.allSettled([
        listStorefrontProducts(),
        listStorefrontCategories(),
        listStorefrontDeals(),
        getStorefrontNotice(),
      ]);

    const hasLiveProducts =
      productResult.status === "fulfilled";
    const liveProducts = hasLiveProducts
      ? productResult.value
      : [];
    const liveCategories =
      categoryResult.status === "fulfilled" && categoryResult.value.length > 0
        ? [ALL_CATEGORY, ...categoryResult.value]
        : buildCategories(liveProducts);

    setData({
      products: applyPromotions(liveProducts, dealResult.status === "fulfilled" ? dealResult.value : []),
      categories: liveCategories,
      deals:
        dealResult.status === "fulfilled"
          ? dealResult.value
          : [],
      notice:
        noticeResult.status === "fulfilled" && noticeResult.value
          ? noticeResult.value
          : DEFAULT_NOTICE,
      source: hasLiveProducts ? "database" : "unavailable",
    });
    setError(!hasLiveProducts);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const value = useMemo<Catalog>(
    () => ({ ...data, loading, error, reload: load }),
    [data, loading, error, load],
  );

  return (
    <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
  );
}
