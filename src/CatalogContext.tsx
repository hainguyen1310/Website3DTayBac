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
  listStorefrontCategoryRecords,
  listStorefrontDeals,
  listStorefrontProducts,
} from "./services/catalogApi";
import type { StorefrontCategory } from "./services/catalogApi";
import { readBootstrap } from "./seo/bootstrap";

export const DEFAULT_NOTICE = "Từ bản làng, gửi đến bạn.";

type CatalogData = {
  products: Product[];
  categories: string[];
  categoryRecords: StorefrontCategory[];
  deals: Deal[];
  notice: string;
  source: "unavailable" | "database" | "prerender";
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
  const seeded = useMemo(() => {
    const payload = readBootstrap();
    return payload?.products?.length ? payload.products : null;
  }, []);
  const seededComplete = useMemo(() => readBootstrap()?.productsComplete === true, []);
  const [data, setData] = useState<CatalogData>({
    products: seeded ?? [],
    categories: seeded ? buildCategories(seeded) : [ALL_CATEGORY],
    categoryRecords: [],
    deals: [],
    notice: DEFAULT_NOTICE,
    source: seeded ? "prerender" : "unavailable",
  });
  const [loading, setLoading] = useState(!seededComplete);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(!seededComplete);
    setError(false);
    const [productResult, categoryResult, categoryRecordsResult, dealResult, noticeResult] =
      await Promise.allSettled([
        listStorefrontProducts(),
        listStorefrontCategories(),
        listStorefrontCategoryRecords(),
        listStorefrontDeals(),
        getStorefrontNotice(),
      ]);

    const hasLiveProducts = productResult.status === "fulfilled" && dealResult.status === "fulfilled";
    const liveProducts = productResult.status === "fulfilled" ? productResult.value : [];
    const categoryRecords =
      categoryRecordsResult.status === "fulfilled" ? categoryRecordsResult.value : [];
    const liveCategories =
      categoryResult.status === "fulfilled" && categoryResult.value.length > 0
        ? [ALL_CATEGORY, ...categoryResult.value]
        : buildCategories(liveProducts);

    setData((current) => {
      if (!hasLiveProducts && current.products.length > 0) return current;
      return {
        products: applyPromotions(
          hasLiveProducts ? liveProducts : [],
          dealResult.status === "fulfilled" ? dealResult.value : [],
        ),
        categories: liveCategories,
        categoryRecords,
        deals: dealResult.status === "fulfilled" ? dealResult.value : [],
        notice:
          noticeResult.status === "fulfilled" && noticeResult.value
            ? noticeResult.value
            : DEFAULT_NOTICE,
        source: hasLiveProducts ? "database" : "unavailable",
      };
    });
    setError(!hasLiveProducts && !seeded);
    setLoading(false);
  }, [seeded, seededComplete]);

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
