import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowRight, ArrowLeft, Check, Eye, Heart, HeartHandshake, Leaf, Minus, Mountain, Plus, Search, ShoppingBag, Sprout, Truck, X } from "lucide-react";
import { ALL_CATEGORY, money } from "./catalog";
import type { Deal, Product } from "./catalog";
import { useCatalog } from "./CatalogContext";
import { useShop } from "./ShopContext";
import CircularSeal from "./CircularSeal";
import Newsletter from "./Newsletter";
import { PageHero, ShopAssurances } from "./PageElements";
import { normalizeSearch } from "./search";
import { ContentHeading, useWebsite } from "./WebsiteContext";
import ProductViewer from "./ProductViewer";
import { useDocumentSeo } from "./hooks/useDocumentSeo";
import { aboutMeta, categoryMeta, noindexMeta, productMeta, productsMeta } from "./seo/meta";
import { toSeoProductInput } from "./seo/product";
import { trackEvent } from "./analytics";
import { ecommerceParams, productAnalyticsItem } from "./analyticsItems";

function ContentState({ loading, error, emptyText, reload }: { loading: boolean; error: boolean; emptyText: string; reload: () => void }) {
  return <div className="moc-page-state" role={error ? "alert" : "status"}>
    <Leaf size={32} strokeWidth={1.2} />
    <p>{loading ? "A Sỉn đang chuẩn bị nội dung…" : error ? "Chưa tải được nội dung. Bạn thử lại nhé." : emptyText}</p>
    {error && <button className="moc-text-arrow-link" onClick={reload}>Thử lại <ArrowRight size={16} /></button>}
  </div>;
}

function GiftInvitation() {
  const {content:c}=useWebsite();
  return <section className="moc-page-gift" aria-labelledby="gift-invitation-title">
    <div className="moc-container moc-page-gift-inner">
      <img src={c["gift.image"]} alt="Minh họa hộp quà đặc sản và gia vị Tây Bắc của A Sỉn" loading="lazy" width={720} height={480} />
      <div data-reveal="rise"><span className="moc-eyebrow">MỘT MÓN QUÀ, NHIỀU THƯƠNG MẾN</span><h2 id="gift-invitation-title"><ContentHeading text={c["gift.title"]}/></h2><p>{c["gift.description"]}</p><Link to="/thiet-ke" className="moc-btn-dark">Thiết kế hộp quà <ArrowRight size={16} /></Link></div>
      <span className="moc-page-handwritten" aria-hidden="true">Trao giá trị,<br />gửi yêu thương.</span>
    </div>
  </section>;
}

function ProductCard({ product, deal, position = 0 }: { product: Product; deal?: Deal; position?: number }) {
  const { addProduct, setSelectedProduct, favoriteIds, toggleFavorite } = useShop();
  const saved = favoriteIds.includes(product.id);
  const promotion = deal && deal.originalPrice > product.price ? deal : undefined;
  const outOfStock = product.inStock === false;
  const select = () => trackEvent("select_item", { item_list_id: "san-pham", items: [productAnalyticsItem(product, 1, position)] });
  return <article className="moc-shop-card" data-reveal="rise">
    <div className="moc-shop-card-photo">
      <Link to={`/san-pham/${product.id}`} aria-label={`Xem ${product.name}`} onClick={select}><img src={product.image} alt={product.name} loading="lazy" width={480} height={480} /></Link>
      {promotion && <span className="moc-shop-discount" title={promotion.label}>−{promotion.discount}%</span>}
      <button className="moc-shop-quickview" onClick={() => setSelectedProduct(product)} aria-label={`Xem nhanh ${product.name}`}><Eye size={17} strokeWidth={1.5} /></button>
      <button className={`moc-shop-save${saved ? " is-saved" : ""}`} aria-pressed={saved} onClick={() => toggleFavorite(product.id)} aria-label={`${saved ? "Bỏ yêu thích" : "Yêu thích"} ${product.name}`}><Heart size={18} fill={saved ? "currentColor" : "none"} strokeWidth={1.5} /></button>
    </div>
    <div className="moc-shop-card-body">
      <span className="moc-shop-origin">{product.origin || product.category}</span>
      <h2><Link to={`/san-pham/${product.id}`} onClick={select}>{product.name}</Link></h2>
      <p>{product.tag || product.description}</p>
      {product.weight && <span className="moc-shop-weight">{product.weight}</span>}
      {outOfStock && <span className="moc-shop-stock is-out">Tạm hết hàng — xem sản vật thay thế</span>}
      <div className="moc-shop-card-bottom"><div>{promotion && <del>{money(promotion.originalPrice)}</del>}<strong>{money(product.price)}</strong></div><button className="moc-shop-add" disabled={outOfStock} onClick={() => { addProduct(product.id); }} aria-label={`Thêm ${product.name} vào giỏ`}><ShoppingBag size={16} strokeWidth={1.5} /><span>{outOfStock ? "Tạm hết hàng" : "Thêm vào giỏ"}</span></button></div>
    </div>
  </article>;
}

export function ProductsPage() {
  const {content:c}=useWebsite();
  const { products, categories, deals, loading, error, reload } = useCatalog();
  const { setSelectedProduct } = useShop();
  const [params] = useSearchParams();
  const linkedProductId = params.get("product");
  useEffect(() => {
    if (loading) return;
    setSelectedProduct(linkedProductId ? products.find(product => product.id === linkedProductId) ?? null : null);
    return () => setSelectedProduct(null);
  }, [linkedProductId, products, loading, setSelectedProduct]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(ALL_CATEGORY);
  const [sort, setSort] = useState("default");
  const visibleProducts = useMemo(() => {
    const filtered = products.filter(product => (category === ALL_CATEGORY || product.category === category) && normalizeSearch(`${product.name} ${product.category} ${product.origin}`).includes(normalizeSearch(query.trim())));
    if (sort === "price-asc") filtered.sort((a, b) => a.price - b.price);
    if (sort === "price-desc") filtered.sort((a, b) => b.price - a.price);
    return filtered;
  }, [products, category, query, sort]);
  const linkedProduct = useMemo(
    () => (linkedProductId ? products.find(product => product.id === linkedProductId) : undefined),
    [linkedProductId, products],
  );
  const dealFor = (product: Product) => deals.find(deal => deal.productId === product.id);

  useDocumentSeo(
    (ctx) =>
      linkedProduct
        ? productMeta(ctx, toSeoProductInput(linkedProduct, dealFor(linkedProduct)))
        : productsMeta(ctx, visibleProducts.map(product => toSeoProductInput(product, dealFor(product)))),
    [linkedProduct, visibleProducts, loading],
    !loading,
  );
  useEffect(() => {
    if (loading || error || !visibleProducts.length) return;
    trackEvent("view_item_list", { item_list_id: "san-pham", items: visibleProducts.map((item, index) => productAnalyticsItem(item, 1, index)) });
  }, [loading, error, visibleProducts]);

  return <main className="moc-page moc-shop-page">
    <PageHero current="Sản phẩm" eyebrow="SẢN VẬT A SỈN" title={c["shop.title"]} description={c["shop.intro"]} image={c["shop.image"]} alt="Đặc sản gác bếp và gia vị Tây Bắc"><a className="asin-read-link" href="#danh-muc">Chọn hương vị của bạn <ArrowRight size={17}/></a></PageHero>
    <div className="asin-container"><ShopAssurances/></div>
    <section id="danh-muc" className="moc-container moc-shop-catalog" aria-label="Danh mục sản phẩm">
      {linkedProductId && !loading && !error && !products.some(product => product.id === linkedProductId) && <p className="admin-alert note" role="status">Sản phẩm trong liên kết không còn trong danh mục đang bán. Bạn có thể chọn sản phẩm khác bên dưới.</p>}
      <div className="moc-shop-toolbar">
        <label className="moc-page-search"><Search size={19} strokeWidth={1.5} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm hương vị bạn yêu…" aria-label="Tìm sản phẩm" />{query && <button onClick={() => setQuery("")} aria-label="Xóa từ khóa tìm kiếm"><X size={17} /></button>}</label>
        <label className="moc-shop-sort">Sắp xếp theo<select value={sort} onChange={event => setSort(event.target.value)}><option value="default">Mặc định</option><option value="price-asc">Giá tăng dần</option><option value="price-desc">Giá giảm dần</option></select></label>
      </div>
      <div className="moc-page-tabs" role="group" aria-label="Danh mục sản phẩm">{categories.map(item => <button key={item} aria-pressed={category === item} className={category === item ? "is-active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div>
      <div className="moc-shop-result" aria-live="polite"><span>{loading ? "Đang tải sản vật…" : error ? "Chưa tải được danh mục" : `${visibleProducts.length} sản vật dành cho bạn`}</span><span>Chắt chiu từ những điều mộc mạc.</span></div>
      {loading || error ? <ContentState loading={loading} error={error} emptyText="" reload={() => void reload()} /> : visibleProducts.length ? <div className="moc-shop-grid">{visibleProducts.map(product => <ProductCard key={product.id} product={product} deal={deals.find(deal => deal.productId === product.id)} />)}</div> : <div className="moc-page-state" role="status"><Search size={30} strokeWidth={1.2} /><h2>Chưa tìm thấy sản vật phù hợp.</h2><p>Thử một từ khóa hoặc danh mục khác nhé.</p>{(query || category !== ALL_CATEGORY) && <button className="moc-text-arrow-link" onClick={() => { setQuery(""); setCategory(ALL_CATEGORY); }}>Xem tất cả sản phẩm <ArrowRight size={16} /></button>}</div>}
    </section>
    <GiftInvitation />
    <Newsletter />
  </main>;
}

export function AboutPage() {
  const { content:c }=useWebsite();
  useDocumentSeo((ctx) => aboutMeta(ctx), []);
  return <main className="moc-page moc-about-page">
    <PageHero current="Về A Sỉn" eyebrow="CÂU CHUYỆN A SỈN" title={c["about.title"]} description={c["about.intro"]} image={c["about.heroImage"]} alt="Bản làng giữa núi rừng Tây Bắc"><a className="asin-read-link" href="#cau-chuyen-moc">Nơi câu chuyện bắt đầu <ArrowRight size={17}/></a></PageHero>
    <section id="cau-chuyen-moc" className="moc-container moc-about-origin">
      <div className="moc-about-photo" data-reveal="photo"><img src={c["about.storyImage"]} alt="Những triền ruộng bậc thang ôm lấy bản làng Tây Bắc" loading="lazy" width={700} height={600} /><span>Tây Bắc, nơi A Sỉn bắt đầu.</span><CircularSeal variant="story" size={118} /></div>
      <div className="moc-about-copy" data-reveal="rise"><span className="moc-eyebrow">TỪ MIỀN ĐẤT THƯƠNG NHỚ</span><h2><ContentHeading text={c["about.heading"]}/></h2><p>{c["about.body1"]}</p><p>{c["about.body2"]}</p><span className="moc-about-signature">Từ núi rừng, bằng cả tấm lòng.</span></div>
    </section>
    <section className="moc-about-values" aria-labelledby="values-title"><div className="moc-container"><div className="moc-page-section-heading" data-reveal="soft"><span className="moc-eyebrow">NHỮNG ĐIỀU A SỈN TRÂN QUÝ</span><h2 id="values-title">Giữ điều lành.<br /><em>Gửi điều thật.</em></h2><p>Những giá trị giản dị dẫn lối cho cách A Sỉn lựa chọn, kể chuyện và trao gửi.</p></div><div className="moc-about-value-grid">{[
      { Icon: Sprout, number: "01", title: "Trân quý tự nhiên", text: "Trân trọng hương vị vốn có của nguyên liệu, vẻ đẹp của mùa vụ và nhịp sống của núi rừng." },
      { Icon: HeartHandshake, number: "02", title: "Đặt con người ở giữa", text: "Kể câu chuyện về những đôi tay, những nếp sống và sự tận tâm phía sau mỗi sản vật." },
      { Icon: Mountain, number: "03", title: "Gìn giữ bản sắc", text: "Mang hương vị và nét đẹp Tây Bắc vào những món quà, để mỗi lần trao là một lần kết nối." },
    ].map(({ Icon, number, title, text }) => <article key={number} data-reveal="rise"><div><Icon size={36} strokeWidth={1.1} /><span>{number}</span></div><h3>{title}</h3><p>{text}</p></article>)}</div></div></section>
    <section className="moc-container moc-about-craft"><div className="moc-about-copy" data-reveal="rise"><span className="moc-eyebrow">TỪ MỘT SẢN VẬT ĐẾN MỘT MÓN QUÀ</span><h2>Thêm chút chăm chút.<br /><em>Thành nhiều yêu thương.</em></h2><p>Một hương vị gác bếp thân quen, một hũ gia vị núi rừng, một lời nhắn viết riêng. Món quà ý nghĩa đôi khi bắt đầu từ những điều nhỏ như thế.</p><p>A Sỉn dành một khoảng không để bạn tự chọn, tự phối và gửi gắm câu chuyện của mình trong từng hộp quà.</p><Link className="moc-text-arrow-link" to="/thiet-ke">Gói món quà của bạn <ArrowRight size={16} /></Link></div><figure className="moc-about-craft-photo" data-reveal="photo"><img src="/images/asin/journey-handover.webp" alt="Minh họa món quà đặc sản được trao gửi tận tay" loading="lazy" width={650} height={520} /><figcaption>Món quà nhỏ, gửi những điều lớn lao.</figcaption></figure></section>
    <section className="moc-about-quote"><div className="moc-container"><Leaf size={30} strokeWidth={1.2} /><blockquote data-reveal="soft">“{c["about.quote"]}”</blockquote><Link className="moc-btn-dark" to="/san-pham">Khám phá sản vật của A Sỉn <ArrowRight size={16} /></Link></div></section>
    <Newsletter />
  </main>;
}

/** Trang chi tiết sản phẩm có URL riêng `/san-pham/:slug` (B05). */
export function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { products, loading, error, reload } = useCatalog();
  const { addProduct, setSelectedProduct } = useShop();
  const [quantity, setQuantity] = useState(1);
  const product = useMemo(() => products.find(item => item.id === slug), [products, slug]);
  const related = useMemo(
    () => (product ? products.filter(item => item.id !== product.id && item.categorySlug && item.categorySlug === product.categorySlug).slice(0, 4) : []),
    [product, products],
  );

  useDocumentSeo(
    (ctx) => {
      if (product) return productMeta(ctx, toSeoProductInput(product));
      return loading ? null : noindexMeta(ctx, "Sản vật chưa có — A Sỉn");
    },
    [product, loading],
    !loading,
  );
  useEffect(() => {
    if (!product) return;
    trackEvent("view_item", ecommerceParams([productAnalyticsItem(product)]));
  }, [product]);

  if (!product) {
    const waiting = loading || error;
    return <main className="moc-page moc-shop-page"><div className="asin-container">
      <Link className="asin-read-link asin-article-back" to="/san-pham"><ArrowLeft size={16} /> Trở về danh mục</Link>
      {waiting ? <ContentState loading={loading} error={error} emptyText="" reload={() => void reload()} /> : <div className="moc-page-state" role="status"><Leaf size={30} strokeWidth={1.2} /><h1>Sản vật này chưa có ở đây.</h1><p>Sản vật có thể đã được gỡ hoặc ngừng bán.</p><Link className="asin-button" to="/san-pham">Khám phá sản vật khác <ArrowRight size={16} /></Link></div>}
    </div></main>;
  }

  const outOfStock = product.inStock === false;
  return <main className="moc-page moc-shop-page asin-product-page">
    <div className="asin-container">
      <nav className="asin-product-breadcrumb" aria-label="Breadcrumb"><Link to="/">Trang chủ</Link><span aria-hidden="true">›</span><Link to="/san-pham">Sản phẩm</Link>{product.categorySlug && <><span aria-hidden="true">›</span><Link to={`/danh-muc/${product.categorySlug}`}>{product.category}</Link></>}<span aria-hidden="true">›</span><span aria-current="page">{product.name}</span></nav>
      <section className="asin-product-detail">
        <div className="asin-product-media">
          {product.modelUrl ? <ProductViewer src={product.modelUrl} poster={product.image} name={product.name} /> : <img src={product.image} alt={product.name} width={720} height={720} fetchPriority="high" />}
        </div>
        <div className="asin-product-info">
          <span className="asin-eyebrow">{product.origin}{product.weight ? ` · ${product.weight}` : ""}</span>
          <h1>{product.name}</h1>
          <p className="asin-product-price"><strong>{money(product.price)}</strong><small>Giá đã gồm thuế · Thanh toán khi nhận hàng</small></p>
          <p>{product.description}</p>
          {product.tag && <p className="asin-product-tag">{product.tag}</p>}
          <p className={`asin-product-stock${outOfStock ? " is-out" : ""}`}>{outOfStock ? <X size={15} /> : <Check size={15} />} {outOfStock ? "Tạm hết hàng. A Sỉn sẽ liên hệ khi có hàng hoặc gợi ý sản vật thay thế." : product.inStock === true ? "Còn hàng, sẵn sàng gửi đi." : "Liên hệ A Sỉn để xác nhận tồn kho."}</p>
          <div className="asin-product-actions">
            <div className="quantity-control">
              <button aria-label="Giảm số lượng" disabled={quantity <= 1} onClick={() => setQuantity(value => value - 1)}><Minus size={14} /></button>
              <span aria-label={`Số lượng ${quantity}`}>{quantity}</span>
              <button aria-label="Tăng số lượng" disabled={quantity >= 20} onClick={() => setQuantity(value => value + 1)}><Plus size={14} /></button>
            </div>
            <button className="button button-green" disabled={outOfStock} onClick={() => { addProduct(product.id, quantity); }}><ShoppingBag size={17} /> {outOfStock ? "Tạm hết hàng" : "Thêm vào giỏ"}</button>
          </div>
          <p className="asin-product-links"><Link className="text-link" to="/thiet-ke" onClick={() => setSelectedProduct(null)}>Gói thành hộp quà <ArrowRight size={15} /></Link><Link className="text-link" to="/lien-he">Hỏi A Sỉn về sản vật này <ArrowRight size={15} /></Link></p>
          <p className="asin-product-note"><Truck size={15} /> Phí giao hàng được tính ở bước đặt hàng; miễn phí cho đơn đủ ngưỡng.</p>
        </div>
      </section>
      <ShopAssurances />
      {related.length > 0 && <section className="asin-product-related" aria-labelledby="asin-related-title">
        <div className="asin-editorial-heading"><h2 id="asin-related-title">Sản vật <em>cùng nhóm.</em></h2><Link className="asin-read-link" to="/san-pham">Xem tất cả <ArrowRight size={16} /></Link></div>
        <div className="moc-shop-grid">{related.map((item, index) => <ProductCard key={item.id} product={item} deal={undefined} position={index} />)}</div>
      </section>}
    </div>
    <Newsletter />
  </main>;
}

/** Trang danh mục có URL riêng `/danh-muc/:slug` (B05). */
export function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const { products, categoryRecords, loading, error, reload } = useCatalog();
  const items = useMemo(() => products.filter(product => product.categorySlug === slug), [products, slug]);
  const category = useMemo(() => {
    const record = categoryRecords.find(item => item.slug === slug);
    if (record) return { slug: record.slug, name: record.name };
    const match = items[0];
    return match ? { slug: slug ?? "", name: match.category } : null;
  }, [categoryRecords, items, slug]);

  useDocumentSeo(
    (ctx) => {
      if (category) return categoryMeta(ctx, { slug: category.slug, name: category.name, products: items.map(product => toSeoProductInput(product)) });
      return loading ? null : noindexMeta(ctx, "Danh mục chưa có — A Sỉn");
    },
    [category, loading, items],
    !loading,
  );
  useEffect(() => {
    if (!loading && items.length) trackEvent("view_item_list", { item_list_id: `danh-muc-${slug}`, items: items.map((item, index) => productAnalyticsItem(item, 1, index)) });
  }, [loading, items, slug]);

  return <main className="moc-page moc-shop-page asin-category-page">
    <PageHero current="Danh mục" eyebrow="SẢN VẬT A SỈN" title={category ? category.name : "Danh mục sản vật"} description={`Các sản vật ${category ? category.name : "A Sỉn"} — nguồn gốc rõ ràng, giao toàn quốc và thanh toán khi nhận hàng.`} image="/images/asin/journey-panorama.webp" alt="Sản vật Tây Bắc của A Sỉn"><Link className="asin-read-link" to="/san-pham">Xem tất cả sản vật <ArrowRight size={17} /></Link></PageHero>
    <section className="asin-container asin-category-catalog" aria-label="Sản phẩm trong danh mục">
      {loading || error ? <ContentState loading={loading} error={error} emptyText="" reload={() => void reload()} /> : !category || !items.length ? <div className="moc-page-state" role="status"><Leaf size={30} strokeWidth={1.2} /><h2>Danh mục này chưa có sản vật.</h2><p>A Sỉn đang chuẩn bị thêm. Bạn có thể xem tất cả sản vật đang bán.</p><Link className="asin-button" to="/san-pham">Xem tất cả sản vật <ArrowRight size={16} /></Link></div> : <>
        <p className="asin-category-intro">Nhóm <strong>{category.name}</strong> gồm {items.length} sản vật đang bán. Mỗi sản vật đều có nguồn gốc, quy cách và hướng dẫn sử dụng rõ ràng; liên hệ A Sỉn nếu bạn cần tư vấn chọn quà.</p>
        <div className="moc-shop-grid">{items.map((product, index) => <ProductCard key={product.id} product={product} deal={undefined} position={index} />)}</div>
      </>}
    </section>
    <GiftInvitation />
    <Newsletter />
  </main>;
}

export { NewsPage, NewsDetailPage } from "./Journal";
