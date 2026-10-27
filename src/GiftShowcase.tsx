import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, RotateCcw } from "lucide-react";
import { colors, defaultDesign, money } from "./catalog";
import { useCatalog } from "./CatalogContext";
import { useWebsite } from "./WebsiteContext";
import GiftPreview from "./GiftPreview";
import { giftComponents } from "./giftSelection";

export default function GiftShowcase() {
  const { content: c } = useWebsite();
  const { products, deals, loading, error } = useCatalog();
  const [color, setColor] = useState(colors[0].value);
  const [angle, setAngle] = useState(-18);
  const offers = !loading && !error ? deals.flatMap(deal => {
    const product = giftComponents(products).find(item => item.id === deal.productId);
    return product && product.inStock !== false && deal.originalPrice > product.price
      ? [{ deal, product }] : [];
  }).slice(0, 3) : [];

  return <section className="asin-gift-showcase" aria-labelledby="gift-showcase-title">
    <div className="asin-container asin-gift-showcase-grid">
      <div className="asin-gift-showcase-copy">
        <nav className="moc-page-breadcrumb" aria-label="Đường dẫn"><Link to="/">Trang chủ</Link><span aria-hidden="true">/</span><span aria-current="page">Sản phẩm</span></nav>
        <span className="asin-eyebrow">HỘP QUÀ 3D A SỈN</span>
        <h1 id="gift-showcase-title">Ghép hương vị.<br />Gửi món quà riêng.</h1>
        <p>{c["gift.description"]}</p>
        <div className="asin-actions">
          <Link className="asin-button" to="/thiet-ke">Khám phá hộp quà tặng <ArrowRight size={17} /></Link>
          <a className="asin-read-link" href="#danh-muc">Các sản phẩm bán lẻ <ArrowRight size={17} /></a>
        </div>
        {offers.length > 0 && <div className="asin-gift-offers" aria-labelledby="gift-offers-title">
          <h2 id="gift-offers-title">Ưu đãi cho từng mảnh ghép</h2>
          {offers.map(({ deal, product }) => <Link key={deal.id} to={`/san-pham/${product.id}`}>
            <img src={product.image} alt="" width={48} height={48} />
            <span><b>{product.name}</b><small>{deal.label} · {money(product.price)}</small></span>
            <ArrowRight size={16} />
          </Link>)}
        </div>}
      </div>
      <div className="asin-gift-preview">
        <GiftPreview design={{ ...defaultDesign, color, productIds: [] }} products={products} rotation={angle} />
        <div className="asin-gift-preview-controls">
          <div className="asin-gift-swatches" role="group" aria-label="Màu hộp quà">
            {colors.map(item => <button key={item.value} style={{ backgroundColor: item.value }} aria-label={item.name} aria-pressed={color === item.value} onClick={() => setColor(item.value)} />)}
          </div>
          <label>Xoay hộp<input type="range" min={-45} max={45} value={angle} onChange={event => setAngle(Number(event.target.value))} aria-label="Góc xoay hộp quà" /></label>
          <button className="asin-gift-reset" aria-label="Đặt lại góc xoay" onClick={() => setAngle(-18)}><RotateCcw size={18} /></button>
        </div>
        <p className="asin-gift-preview-caption">Bản xem trước hộp quà · Chọn màu và xoay để khám phá</p>
      </div>
    </div>
  </section>;
}
