import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import {
  ALL_CATEGORY,
  buildCategories,
  products as staticProducts,
} from "./catalog";
import type { Deal, Product } from "./catalog";
import { deals as staticDeals } from "./shopData";
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
  source: "static" | "database";
};

type Catalog = CatalogData & {
  loading: boolean;
  reload: () => Promise<void>;
};

const fallbackDeals: Deal[] = staticDeals.map((deal) => ({ ...deal }));

const CatalogContext = createContext<Catalog | null>(null);
export const useCatalog = () => useContext(CatalogContext)!;

/**
 * Danh mục, ưu đãi và câu thông báo của cửa hàng lấy từ Supabase.
 * Nếu cơ sở dữ liệu chưa sẵn sàng, cửa hàng vẫn chạy bằng dữ liệu tĩnh.
 */
export function CatalogProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<CatalogData>({
    products: staticProducts,
    categories: buildCategories(staticProducts),
    deals: fallbackDeals,
    notice: DEFAULT_NOTICE,
    source: "static",
  });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [productResult, categoryResult, dealResult, noticeResult] =
      await Promise.allSettled([
        listStorefrontProducts(),
        listStorefrontCategories(),
        listStorefrontDeals(),
        getStorefrontNotice(),
      ]);

    const hasLiveProducts =
      productResult.status === "fulfilled" && productResult.value.length > 0;
    const liveProducts = hasLiveProducts
      ? productResult.value
      : staticProducts;
    const liveCategories =
      categoryResult.status === "fulfilled" && categoryResult.value.length > 0
        ? [ALL_CATEGORY, ...categoryResult.value]
        : buildCategories(liveProducts);

    setData({
      products: liveProducts,
      categories: liveCategories,
      deals:
        dealResult.status === "fulfilled" && dealResult.value.length > 0
          ? dealResult.value
          : fallbackDeals,
      notice:
        noticeResult.status === "fulfilled" && noticeResult.value
          ? noticeResult.value
          : DEFAULT_NOTICE,
      source: hasLiveProducts ? "database" : "static",
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const value = useMemo<Catalog>(
    () => ({ ...data, loading, reload: load }),
    [data, loading, load],
  );

  return (
    <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
  );
}
