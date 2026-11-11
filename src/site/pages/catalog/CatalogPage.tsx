import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Icon } from "../../icons";
import type { SiteProduct } from "../../data";
import { useSiteProducts } from "../../data";
import { ProductCard } from "../../ProductCard";
import { motionAllowed } from "../../motion/preference";
import { useCatalog } from "../../../CatalogContext";
import { useDocumentSeo } from "../../../hooks/useDocumentSeo";
import { categoryMeta, noindexMeta, productsMeta } from "../../../seo/meta";
import { toSeoProductInput } from "../../../seo/product";
import { trackEvent } from "../../../analytics";
import { productAnalyticsItem } from "../../../analyticsItems";

const categoryMatches = (p: SiteProduct, value: string): boolean => {
  if (value === "all") return true;
  if (value === "shredded") return p.giftSlot === "jar";
  if (value === "meat") return p.categorySlug === "dac-san-gac-bep" && p.giftSlot !== "jar";
  if (value === "spice") return p.categorySlug === "gia-vi-nui-rung";
  if (value === "gift") return p.categorySlug === "hop-qua";
  return p.categorySlug === "ruou";
};

/** Map product categorySlug to filter value for /danh-muc/:categorySlug route. */
const categorySlugToFilter = (categorySlug: string | undefined): string => {
  if (categorySlug === "dac-san-gac-bep") return "meat";
  if (categorySlug === "gia-vi-nui-rung") return "spice";
  if (categorySlug === "hop-qua") return "gift";
  if (categorySlug === "ruou") return "wine";
  return "all";
};

const normal = (value: string): string =>
  value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");

const animateCatalogSwap = (target: HTMLElement): Animation | undefined => {
  if (!motionAllowed()) return undefined;
  return target.animate?.(
    [
      { opacity: 0.35, transform: "translateY(7px)" },
      { opacity: 1, transform: "translateY(0)" },
    ],
    { duration: 300, easing: "cubic-bezier(.22, .7, .25, 1)" }
  );
};

export function CatalogPage() {
  const { categorySlug } = useParams<{ categorySlug?: string }>();
  const products = useSiteProducts();
  const { categoryRecords, loading } = useCatalog();
  const categoryItems = useMemo(() => (categorySlug ? products.filter((product) => product.categorySlug === categorySlug) : []), [products, categorySlug]);
  const categoryRecord = categorySlug ? categoryRecords.find((record) => record.slug === categorySlug) ?? (categoryItems[0] ? { slug: categorySlug, name: categoryItems[0].category } : null) : null;
  useDocumentSeo(
    (ctx) => {
      if (!categorySlug) return productsMeta(ctx, products.map((product) => toSeoProductInput(product)));
      if (categoryRecord) return categoryMeta(ctx, { slug: categoryRecord.slug, name: categoryRecord.name, products: categoryItems.map((product) => toSeoProductInput(product)) });
      return loading ? null : noindexMeta(ctx, "Danh mục chưa có — A Sỉn");
    },
    [categorySlug, categoryRecord?.name, categoryItems, products, loading],
    !loading || !categorySlug,
  );
  useEffect(() => {
    if (!loading && categorySlug && categoryItems.length) trackEvent("view_item_list", { item_list_id: `danh-muc-${categorySlug}`, items: categoryItems.map((item, index) => productAnalyticsItem(item, 1, index)) });
  }, [loading, categoryItems, categorySlug]);
  const [category, setCategory] = useState<string>(() => categorySlugToFilter(categorySlug));
  const [searchQuery, setSearchQuery] = useState<string>(
    new URLSearchParams(typeof window !== "undefined" ? window.location.search : "").get("q") || ""
  );
  const [sortOption, setSortOption] = useState<string>("featured");
  const gridRef = useRef<HTMLDivElement>(null);
  const emptyRef = useRef<HTMLDivElement>(null);
  const resultMotionRef = useRef<Animation | undefined>(undefined);
  const previousItemsRef = useRef<SiteProduct[]>([]);

  // Update category when categorySlug route parameter changes
  useEffect(() => {
    setCategory(categorySlugToFilter(categorySlug));
  }, [categorySlug]);

  const filteredAndSortedProducts = useMemo(() => {
    const query = normal(searchQuery);
    let items = products.filter(
      (p) =>
        categoryMatches(p, category) &&
        normal(`${p.name} ${p.description || ""} ${p.category || ""}`).includes(query)
    );

    if (sortOption === "price-asc") items.sort((a, b) => a.price - b.price);
    if (sortOption === "price-desc") items.sort((a, b) => b.price - a.price);
    if (sortOption === "name") items.sort((a, b) => a.name.localeCompare(b.name, "vi"));

    return items;
  }, [products, category, searchQuery, sortOption]);

  // Animation effect
  useEffect(() => {
    if (!gridRef.current || !emptyRef.current) return;

    const isSameItems =
      previousItemsRef.current.length === filteredAndSortedProducts.length &&
      previousItemsRef.current.every((item, index) => item === filteredAndSortedProducts[index]);

    if (isSameItems) return;

    resultMotionRef.current?.cancel();

    const targetElement =
      filteredAndSortedProducts.length > 0 ? gridRef.current : emptyRef.current;
    if (previousItemsRef.current.length > 0) {
      resultMotionRef.current = animateCatalogSwap(targetElement);
    }

    previousItemsRef.current = filteredAndSortedProducts;
  }, [filteredAndSortedProducts]);

  return (
    <>
      <section className="catalog-intro catalog-intro--sinh-loc uh-hero" aria-labelledby="catalog-hero-title">
        <div className="catalog-photo uh-hero-photo">
          <img
            className="uh-scene-img"
            src="/assets/original/asin-sinh-loc-poster-v27.webp"
            alt="Hộp quà Sinh Lộc A SỈN — Gửi lộc lành, trao yêu thương"
            width={1638}
            height={2048}
            fetchPriority="high"
            loading="eager"
          />
        </div>
        <div className="catalog-hero-veil" aria-hidden="true" />
        <div className="wrap">
          <div className="catalog-hero-copy uh-hero-copy" data-uh-reveal>
            <nav className="pg-crumb" aria-label="Đường dẫn">
              <a href="/">Trang chủ</a>
              <span>/</span>
              <span aria-current="page">Đặc sản Tây Bắc</span>
            </nav>
            <div className="catalog-title-row">
              <div>
                <p className="eyebrow">ĐẶC SẢN A SỈN</p>
                <h1 className="pg-title" id="catalog-hero-title">
                  Hương vị núi rừng.
                  <br />
                  <em>Gói ghém gửi trao.</em>
                </h1>
              </div>
              <p className="catalog-intro-copy">
                Từ từng thớ thịt đượm hương khói đến một hộp quà chỉn chu. Chọn chút Tây Bắc cho bữa ăn và những người thương.
              </p>
              <a className="btn dark catalog-hero-cta" href="#catalog-san-pham">
                Khám phá đặc sản
                <Icon name="arrow" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="section pg-catalog-section" id="catalog-san-pham">
        <div className="wrap">
          <div className="catalog-toolbar">
            <div className="catalog-filter-list" role="group" aria-label="Lọc danh mục">
              {[
                ["all", "Tất cả"],
                ["shredded", "Thịt xé"],
                ["meat", "Thịt gác bếp"],
                ["spice", "Gia vị"],
                ["gift", "Combo quà"],
                ["wine", "Rượu"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  data-category={value}
                  aria-pressed={value === category}
                  onClick={() => setCategory(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="catalog-tools">
              <label className="catalog-search">
                <Icon name="search" />
                <input
                  type="search"
                  placeholder="Tìm món bạn thích"
                  aria-label="Tìm sản phẩm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </label>
              <label className="catalog-sort">
                <span className="pg-sr">Sắp xếp sản phẩm</span>
                <select
                  aria-label="Sắp xếp sản phẩm"
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value)}
                >
                  <option value="featured">Được tuyển chọn</option>
                  <option value="price-asc">Giá: thấp đến cao</option>
                  <option value="price-desc">Giá: cao đến thấp</option>
                  <option value="name">Tên: A – Z</option>
                </select>
              </label>
            </div>
          </div>

          <div className="catalog-count" aria-live="polite">
            {String(filteredAndSortedProducts.length).padStart(2, "0")} đặc sản được chọn lọc
          </div>

          <div className="catalog-grid" ref={gridRef}>
            {filteredAndSortedProducts.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>

          <div className="catalog-empty" hidden={filteredAndSortedProducts.length > 0} ref={emptyRef}>
            <p>Chưa tìm thấy món phù hợp.</p>
            <button
              className="pg-text-link"
              type="button"
              onClick={() => {
                setSearchQuery("");
                setCategory("all");
              }}
            >
              Xem tất cả đặc sản <Icon name="arrow" />
            </button>
          </div>
        </div>
      </section>

      <section className="pg-gift-banner pg-gift-banner--sinh-loc" aria-labelledby="catalog-gift-title">
        <div className="wrap pg-gift-banner-grid">
          <div className="pg-gift-banner-copy" data-uh-reveal>
            <p className="eyebrow">MỘT HỘP QUÀ, NHIỀU ĐIỀU MUỐN NÓI</p>
            <h2 id="catalog-gift-title">
              Gói một miền.
              <br />
              <em>Gửi một người.</em>
            </h2>
            <p className="pg-gift-banner-description">
              Tuyển chọn những hương vị thân quen, đặt trong một hộp quà chỉn chu. Thêm lời nhắn riêng để mỗi lần trao tặng đều mang theo tâm ý.
            </p>
            <a href="/thiet-ke" className="btn dark">
              Tự tay chọn hộp quà <Icon name="arrow" />
            </a>
            <span className="pg-gift-banner-note">Sinh Lộc · Gửi lộc lành, trao yêu thương</span>
          </div>
          <div className="pg-gift-art" data-uh-reveal>
            <img
              src="/assets/original/asin-open-gift-v27.webp"
              alt="Hộp quà xanh A SỈN mở nắp, gồm thịt lợn gác bếp, thịt trâu gác bếp, thịt lợn xé và chẩm chéo"
              width={2048}
              height={2012}
              loading="lazy"
            />
          </div>
        </div>
      </section>
    </>
  );
}
